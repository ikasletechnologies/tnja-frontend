import { NextResponse } from "next/server";

type NormalizedPlace = { pincode: string; district: string; state: string; region: string; offices: string[] };

const unique = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

async function fetchGovernmentData(pincode: string, apiKey: string, resourceId: string): Promise<NormalizedPlace | null> {
  const url = new URL(`https://api.data.gov.in/resource/${resourceId}`);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "100");
  url.searchParams.set("filters[pincode]", pincode);
  const response = await fetch(url, { signal: AbortSignal.timeout(8000), next: { revalidate: 86400 } });
  if (!response.ok) throw new Error(`Government postal API returned ${response.status}`);
  const payload = await response.json();
  const records: Record<string, unknown>[] = Array.isArray(payload.records) ? payload.records : [];
  if (!records.length) return null;
  const value = (record: Record<string, unknown>, ...keys: string[]) => { for (const key of keys) { const found = record[key]; if (typeof found === "string" && found.trim()) return found.trim(); } return ""; };
  const first = records[0];
  return { pincode, district: value(first, "district", "District"), state: value(first, "statename", "state_name", "StateName"), region: value(first, "regionname", "region_name", "RegionName"), offices: unique(records.map((record) => value(record, "officename", "office_name", "OfficeName"))) };
}

async function fetchPostalFallback(pincode: string): Promise<NormalizedPlace | null> {
  const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, { signal: AbortSignal.timeout(8000), next: { revalidate: 86400 } });
  if (!response.ok) throw new Error(`Postal fallback returned ${response.status}`);
  const payload = await response.json();
  const result = Array.isArray(payload) ? payload[0] : null;
  const offices = Array.isArray(result?.PostOffice) ? result.PostOffice : [];
  if (!offices.length) return null;
  return { pincode, district: offices[0]?.District || "", state: offices[0]?.State || "", region: offices[0]?.Region || "", offices: unique(offices.map((office: { Name?: string }) => office.Name || "")) };
}

export async function GET(_request: Request, { params }: { params: Promise<{ pincode: string }> }) {
  const { pincode } = await params;
  if (!/^\d{6}$/.test(pincode)) return NextResponse.json({ error: "Enter a valid 6-digit pincode." }, { status: 400 });
  const apiKey = process.env.POSTAL_CODE_API_KEY;
  const resourceId = process.env.POSTAL_CODE_API_RESOURCE_ID;
  if (!apiKey || !resourceId) return NextResponse.json({ error: "Pincode service is not configured." }, { status: 503 });

  try {
    let place: NormalizedPlace | null = null;
    try { place = await fetchGovernmentData(pincode, apiKey, resourceId); }
    catch (primaryError) { console.warn("Government pincode API unavailable, using fallback:", primaryError); }
    if (!place) place = await fetchPostalFallback(pincode);
    if (!place) return NextResponse.json({ error: "No place found for this pincode." }, { status: 404 });
    return NextResponse.json(place);
  } catch (error) {
    console.error("Pincode lookup failed:", error);
    return NextResponse.json({ error: "Unable to fetch place details right now." }, { status: 502 });
  }
}
