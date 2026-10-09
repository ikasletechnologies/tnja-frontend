"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, CalendarDays, Download, Eye, FileBadge2, Loader2, MapPin, Medal, RotateCcw, Search, Trophy, XCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";

type CertificateType = "PARTICIPATION" | "ACHIEVEMENT";

type Certificate = {
  id: string;
  tournamentId: string;
  eventName: string;
  date: string;
  location: string;
  level: string;
  type: CertificateType;
  placement: "FIRST" | "SECOND" | "THIRD" | "PARTICIPATION";
  result: string;
  downloadUrl: string;
};

export default function PlayerCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [year, setYear] = useState("ALL");
  const [level, setLevel] = useState("ALL");
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const loadCertificates = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Your session has expired. Please sign in again.");
        const response = await fetch(`${API_BASE}/certificates/my`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load certificates.");
        setCertificates(Array.isArray(data) ? data : []);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Unable to load certificates.");
      } finally {
        setLoading(false);
      }
    };
    void loadCertificates();
  }, []);

  const years = useMemo(() => Array.from(new Set(certificates.map((certificate) => new Date(certificate.date).getFullYear().toString()))).sort((a, b) => Number(b) - Number(a)), [certificates]);
  const levels = useMemo(() => Array.from(new Set(certificates.map((certificate) => certificate.level).filter(Boolean))), [certificates]);
  const filtered = useMemo(() => certificates.filter((certificate) => {
    if (search && !`${certificate.eventName} ${certificate.location} ${certificate.result}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (type !== "ALL" && certificate.type !== type) return false;
    if (year !== "ALL" && new Date(certificate.date).getFullYear().toString() !== year) return false;
    if (level !== "ALL" && certificate.level !== level) return false;
    return true;
  }), [certificates, level, search, type, year]);

  const achievementCount = certificates.filter((certificate) => certificate.type === "ACHIEVEMENT").length;
  const participationCount = certificates.filter((certificate) => certificate.type === "PARTICIPATION").length;

  const openCertificate = async (certificate: Certificate, download: boolean) => {
    setDownloading(certificate.id);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}${certificate.downloadUrl}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to generate certificate.");
      }
      const url = URL.createObjectURL(await response.blob());
      if (download) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `${certificate.eventName.replace(/[^a-z0-9]+/gi, "_")}_certificate.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (reason) {
      alert(reason instanceof Error ? reason.message : "Unable to open certificate.");
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><div className="text-center"><Loader2 className="mx-auto animate-spin text-[#ff6b1a]" size={36} /><p className="mt-3 text-sm font-semibold text-slate-400">Loading your certificates...</p></div></div>;
  if (error) return <div className="grid min-h-[60vh] place-items-center text-center"><div><XCircle className="mx-auto text-rose-500" size={38} /><h2 className="mt-3 font-black text-slate-700">Unable to load certificates</h2><p className="mt-1 text-sm text-slate-500">{error}</p></div></div>;

  return (
    <div className="space-y-4 pb-8">
      <section className="relative overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-r from-[#fff9f1] via-[#fff5ea] to-[#ffe9da] px-6 py-5 shadow-sm">
        <div className="absolute -right-8 -top-20 size-64 rounded-full border-[30px] border-orange-100/50" />
        <div className="relative flex items-center gap-4"><span className="grid size-14 place-items-center rounded-full bg-orange-100 text-[#ff6b1a]"><Award size={28} /></span><div><h1 className="text-2xl font-black text-[#ff6b1a]">My Certificates</h1><p className="mt-1 text-sm font-medium text-slate-500">View and download certificates earned from concluded tournaments.</p></div></div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[{ label: "Total Certificates", value: certificates.length, note: "All certificates", icon: FileBadge2, tone: "border-orange-100 bg-orange-50/70 text-orange-600" }, { label: "Participation Certificates", value: participationCount, note: "Completed participation", icon: Trophy, tone: "border-emerald-100 bg-emerald-50/70 text-emerald-600" }, { label: "Achievement Certificates", value: achievementCount, note: "Wins and placements", icon: Medal, tone: "border-blue-100 bg-blue-50/70 text-blue-600" }].map((card) => <article key={card.label} className={`flex items-center gap-4 rounded-2xl border p-4 shadow-sm ${card.tone}`}><span className="grid size-12 place-items-center rounded-full bg-white/70"><card.icon size={24} /></span><div><p className="text-xs font-bold text-slate-500">{card.label}</p><p className="text-3xl font-black text-[#10244b]">{card.value}</p><p className="text-[10px] font-semibold opacity-75">{card.note}</p></div></article>)}
      </section>

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(260px,1fr)_150px_140px_160px_auto]">
        <label className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by tournament, result, or location..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-xs outline-none focus:border-orange-300" /></label>
        <select value={type} onChange={(event) => setType(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600"><option value="ALL">All Types</option><option value="PARTICIPATION">Participation</option><option value="ACHIEVEMENT">Achievement</option></select>
        <select value={year} onChange={(event) => setYear(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600"><option value="ALL">All Years</option>{years.map((item) => <option key={item}>{item}</option>)}</select>
        <select value={level} onChange={(event) => setLevel(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600"><option value="ALL">All Levels</option>{levels.map((item) => <option key={item}>{item}</option>)}</select>
        <button onClick={() => { setSearch(""); setType("ALL"); setYear("ALL"); setLevel("ALL"); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-orange-300 bg-white px-4 text-xs font-bold text-orange-600"><RotateCcw size={15} />Reset</button>
      </section>

      {filtered.length === 0 ? <section className="grid min-h-80 place-items-center rounded-2xl border border-slate-200 bg-white text-center shadow-sm"><div><span className="mx-auto grid size-16 place-items-center rounded-full bg-slate-50 text-slate-300"><FileBadge2 size={29} /></span><h2 className="mt-4 font-black text-slate-600">No certificates available</h2><p className="mt-1 text-sm text-slate-400">Certificates appear after your category or tournament is concluded.</p></div></section> : (
        <section className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((certificate) => { const achievement = certificate.type === "ACHIEVEMENT"; return <article key={certificate.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className={`relative h-40 overflow-hidden p-5 ${achievement ? "bg-gradient-to-br from-[#0e315e] via-[#1e5a92] to-[#d8a84e]" : "bg-gradient-to-br from-[#fff8e8] via-[#f8e5b9] to-[#d1a64c]"}`}><div className="absolute inset-3 rounded-xl border-2 border-white/45" /><div className={`relative flex h-full flex-col items-center justify-center text-center ${achievement ? "text-white" : "text-[#604516]"}`}><Award size={30} /><p className="mt-2 text-[10px] font-black uppercase tracking-[0.22em]">Certificate of</p><p className="font-serif text-xl font-black uppercase">{achievement ? "Achievement" : "Participation"}</p><p className="mt-2 max-w-[85%] truncate text-[10px] font-bold opacity-75">{certificate.eventName}</p></div></div><div className="p-4"><div className="flex items-start justify-between gap-3"><div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${achievement ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"}`}>{achievement ? certificate.result : "Participation"}</span><h2 className="mt-2 line-clamp-2 text-sm font-black text-[#10244b]">{certificate.eventName}</h2></div>{achievement && <Medal className="shrink-0 text-amber-500" size={25} />}</div><div className="mt-3 space-y-1.5 text-[11px] font-medium text-slate-500"><p className="flex items-center gap-2"><CalendarDays size={14} />{new Date(certificate.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p><p className="flex items-center gap-2"><MapPin size={14} />{certificate.location || "Venue not available"}</p></div><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => void openCertificate(certificate, false)} disabled={downloading === certificate.id} className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-300 py-2.5 text-xs font-bold text-orange-600 disabled:opacity-50"><Eye size={15} />View</button><button onClick={() => void openCertificate(certificate, true)} disabled={downloading === certificate.id} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff6b1a] py-2.5 text-xs font-bold text-white disabled:opacity-50">{downloading === certificate.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}Download</button></div></div></article>; })}
        </section>
      )}
      <p className="text-xs font-semibold text-slate-500">Showing {filtered.length} of {certificates.length} certificates</p>
    </div>
  );
}