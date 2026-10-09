"use client";

import { useEffect, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5035/api";

type LocationOption = { id: string; name: string };
type Place = {
  district: string;
  state: string;
  region: string;
  talukName?: string;
  districtId?: string;
  talukId?: string;
  taluks?: LocationOption[];
  offices: string[];
};

export type PlaceSelection = {
  city: string;
  district: string;
  state: string;
  taluk: string;
  districtId: string;
  talukId: string;
  taluks: LocationOption[];
};

export default function PincodeLookup({
  pincode,
  onPlaceChange,
}: {
  pincode: string;
  onPlaceChange?: (place: PlaceSelection) => void;
}) {
  const callbackRef = useRef(onPlaceChange);
  callbackRef.current = onPlaceChange;

  useEffect(() => {
    if (!/^\d{6}$/.test(pincode)) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE}/pincode/${pincode}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Place not found.");

        const place: Place = data;
        callbackRef.current?.({
          city: place.offices?.[0] || place.district || "",
          district: place.district,
          state: place.state,
          taluk: place.talukName || "",
          districtId: place.districtId || "",
          talukId: place.talukId || "",
          taluks: place.taluks || [],
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Pincode lookup failed:", error);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [pincode]);

  return null;
}

