"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Download, Filter, Gavel, Loader2, MapPin, Monitor, RefreshCw, Search, Trophy, UsersRound } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";
const PAGE_SIZE = 5;

interface Tournament { id: string; title: string; date: string; status: string; location: string; }
interface MatAssignment { tournamentId: string; matNumber: number; tournament: Tournament; }
type AssignmentStatus = "UPCOMING" | "ACTIVE" | "COMPLETED";

const formatDate = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const assignmentStatus = (item: MatAssignment): AssignmentStatus => {
  const status = item.tournament.status?.toUpperCase();
  if (["COMPLETED", "CLOSED", "FINISHED"].includes(status)) return "COMPLETED";
  if (["ONGOING", "ACTIVE", "LIVE"].includes(status)) return "ACTIVE";
  if (new Date(item.tournament.date).getTime() < new Date().setHours(0, 0, 0, 0)) return "COMPLETED";
  return "UPCOMING";
};

const statusStyle: Record<AssignmentStatus, string> = {
  UPCOMING: "bg-blue-50 text-blue-600",
  ACTIVE: "bg-emerald-50 text-emerald-600",
  COMPLETED: "bg-slate-100 text-slate-600",
};

export default function MyMatsPage() {
  const [assignments, setAssignments] = useState<MatAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tournamentFilter, setTournamentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const fetchMats = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/referees/my-mats`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load referee assignments.");
      setAssignments(Array.isArray(data.mats) ? data.mats : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load referee assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchMats(); }, []);

  const tournamentOptions = useMemo(() => Array.from(new Map(assignments.map((item) => [item.tournamentId, item.tournament.title])).entries()), [assignments]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const today = new Date();
    return assignments.filter((item) => {
      const status = assignmentStatus(item);
      const date = new Date(item.tournament.date);
      const matchesSearch = !query || [item.tournament.title, item.tournament.location, `mat ${item.matNumber}`].some((value) => value?.toLowerCase().includes(query));
      const matchesTournament = tournamentFilter === "ALL" || item.tournamentId === tournamentFilter;
      const matchesStatus = statusFilter === "ALL" || status === statusFilter;
      const matchesDate = dateFilter === "ALL" || (dateFilter === "7_DAYS" && date >= today && date <= new Date(Date.now() + 7 * 86400000)) || (dateFilter === "30_DAYS" && date >= today && date <= new Date(Date.now() + 30 * 86400000));
      return matchesSearch && matchesTournament && matchesStatus && matchesDate;
    }).sort((a, b) => new Date(a.tournament.date).getTime() - new Date(b.tournament.date).getTime());
  }, [assignments, dateFilter, search, statusFilter, tournamentFilter]);

  const upcoming = assignments.filter((item) => assignmentStatus(item) === "UPCOMING");
  const active = assignments.filter((item) => assignmentStatus(item) === "ACTIVE");
  const completed = assignments.filter((item) => assignmentStatus(item) === "COMPLETED");
  const nextAssignment = [...upcoming, ...active].sort((a, b) => new Date(a.tournament.date).getTime() - new Date(b.tournament.date).getTime())[0];
  const activeDays = new Set([...upcoming, ...active].map((item) => new Date(item.tournament.date).toDateString())).size;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, tournamentFilter, statusFilter, dateFilter]);

  const reset = () => { setSearch(""); setTournamentFilter("ALL"); setStatusFilter("ALL"); setDateFilter("ALL"); };
  const downloadSchedule = () => {
    const rows = [["Tournament", "Date", "Venue", "Mat", "Status"], ...assignments.map((item) => [item.tournament.title, formatDate(item.tournament.date), item.tournament.location || "Venue TBA", `Mat ${item.matNumber}`, assignmentStatus(item)])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "my-mat-assignments.csv"; anchor.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="size-10 animate-spin text-[#ff6b00]" /></div>;

  return <div className="mx-auto w-full max-w-[1500px] space-y-4 pb-8">
    <motion.section initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-r from-white via-[#fffaf5] to-[#ffead9] p-5 shadow-sm sm:p-6">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 bg-[url('/homepage/whatjudo/judo1.png')] bg-contain bg-right bg-no-repeat opacity-[0.12] md:block" />
      <div className="relative flex items-center gap-4"><span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#ff7a00] to-[#ff5600] text-white shadow-lg shadow-orange-200"><Gavel size={32} /></span><div><h1 className="text-2xl font-black text-[#10244b] sm:text-3xl">My Referee Assignments</h1><p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">Tournaments and mats where you have been assigned as a Mat Referee</p></div></div>
    </motion.section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: "Total Assignments", value: assignments.length, note: "All assigned mats", icon: UsersRound, tone: "border-orange-100 bg-orange-50/60 text-orange-600" },
        { label: "Upcoming Mats", value: upcoming.length, note: "Scheduled ahead", icon: CalendarDays, tone: "border-blue-100 bg-blue-50/60 text-blue-600" },
        { label: "Completed Assignments", value: completed.length, note: "Finished duties", icon: CheckCircle2, tone: "border-emerald-100 bg-emerald-50/60 text-emerald-600" },
        { label: "Active Tournament Days", value: activeDays, note: `${active.length} currently active`, icon: Clock3, tone: "border-violet-100 bg-violet-50/60 text-violet-600" },
      ].map((item) => <article key={item.label} className={`flex items-center gap-4 rounded-2xl border p-4 shadow-sm ${item.tone}`}><span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/75"><item.icon size={23} /></span><div><p className="text-[10px] font-bold text-slate-500">{item.label}</p><p className="text-2xl font-black text-[#10244b]">{item.value}</p><p className="text-[9px] font-semibold opacity-75">{item.note}</p></div></article>)}
    </section>

    <section className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-2 xl:grid-cols-[minmax(260px,1.5fr)_1fr_0.8fr_0.8fr_auto_auto]">
      <label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tournaments, venues, or mat number..." className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-xs font-semibold outline-none focus:border-orange-400" /></label>
      <select value={tournamentFilter} onChange={(event) => setTournamentFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 text-xs font-bold text-slate-600 outline-none focus:border-orange-400"><option value="ALL">All Tournaments</option>{tournamentOptions.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select>
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 text-xs font-bold text-slate-600 outline-none focus:border-orange-400"><option value="ALL">All Status</option><option value="UPCOMING">Upcoming</option><option value="ACTIVE">Active</option><option value="COMPLETED">Completed</option></select>
      <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 text-xs font-bold text-slate-600 outline-none focus:border-orange-400"><option value="ALL">All Dates</option><option value="7_DAYS">Next 7 Days</option><option value="30_DAYS">Next 30 Days</option></select>
      <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff6500] px-4 py-3 text-xs font-black text-white"><Filter size={15} />Filter</button>
      <button type="button" onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-300 px-4 py-3 text-xs font-black text-orange-600"><RefreshCw size={15} />Reset</button>
    </section>

    {error ? <section className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center"><p className="font-bold text-red-700">{error}</p><button onClick={() => void fetchMats()} className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white">Try Again</button></section> : assignments.length === 0 ? <section className="grid min-h-72 place-items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><div><span className="mx-auto grid size-16 place-items-center rounded-full bg-slate-50 text-slate-300"><Trophy size={30} /></span><h2 className="mt-4 text-lg font-black text-slate-700">No Assignments Yet</h2><p className="mt-1 max-w-md text-xs text-slate-500">Your tournament mat assignments will appear here after an administrator assigns you.</p></div></section> : <section className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-4"><h2 className="flex items-center gap-2 text-sm font-black text-[#10244b]"><Monitor size={17} className="text-[#ff6500]" />Assigned Mats</h2><p className="text-[10px] font-semibold text-slate-400">Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</p></header>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400"><tr><th className="px-4 py-3">Tournament</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Venue</th><th className="px-3 py-3">Mat</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((item) => { const status = assignmentStatus(item); return <tr key={`${item.tournamentId}-${item.matNumber}`} className="text-[10px] font-semibold text-slate-600 hover:bg-orange-50/30"><td className="px-4 py-3"><p className="max-w-48 font-black text-slate-700">{item.tournament.title}</p></td><td className="whitespace-nowrap px-3 py-3"><span className="flex items-center gap-1.5"><CalendarDays size={12} className="text-slate-400" />{formatDate(item.tournament.date)}</span></td><td className="px-3 py-3"><span className="flex items-center gap-1.5"><MapPin size={12} className="text-orange-500" />{item.tournament.location || "Venue TBA"}</span></td><td className="px-3 py-3"><span className="rounded-lg bg-blue-50 px-2.5 py-1.5 font-black text-blue-600">Mat {item.matNumber}</span></td><td className="px-3 py-3"><span className="rounded-lg bg-violet-50 px-2.5 py-1.5 font-black text-violet-600">Referee</span></td><td className="px-3 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 font-black ${statusStyle[status]}`}>{status === "COMPLETED" ? <CheckCircle2 size={11} /> : <Clock3 size={11} />}{status}</span></td><td className="px-4 py-3 text-right"><Link href={`/dashboard/coach/mats/${item.tournamentId}?mat=${item.matNumber}`} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 font-black text-blue-600 hover:bg-blue-50">View Details <ChevronRight size={12} /></Link></td></tr>; })}</tbody></table></div>
        <div className="divide-y divide-slate-100 md:hidden">{visible.map((item) => { const status = assignmentStatus(item); return <article key={`${item.tournamentId}-${item.matNumber}`} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-slate-700">{item.tournament.title}</h3><p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500"><MapPin size={11} />{item.tournament.location || "Venue TBA"}</p></div><span className="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-black text-blue-600">Mat {item.matNumber}</span></div><div className="flex flex-wrap items-center gap-2 text-[10px]"><span className="flex items-center gap-1 text-slate-500"><CalendarDays size={11} />{formatDate(item.tournament.date)}</span><span className={`rounded-full px-2 py-1 font-black ${statusStyle[status]}`}>{status}</span></div><Link href={`/dashboard/coach/mats/${item.tournamentId}?mat=${item.matNumber}`} className="flex items-center justify-center gap-1 rounded-xl border border-orange-300 py-2.5 text-xs font-black text-orange-600">View Assignment <ArrowRight size={13} /></Link></article>; })}</div>
        {filtered.length === 0 && <div className="grid min-h-48 place-items-center text-center"><div><Search className="mx-auto text-slate-300" /><p className="mt-2 text-sm font-bold text-slate-500">No matching assignments</p></div></div>}
        <footer className="flex items-center justify-between border-t border-slate-100 px-4 py-3"><p className="text-[10px] font-semibold text-slate-500">{filtered.length} assignments</p><div className="flex items-center gap-2"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="grid size-8 place-items-center rounded-lg border disabled:opacity-30"><ChevronLeft size={14} /></button><span className="grid size-8 place-items-center rounded-lg bg-[#ff6500] text-xs font-black text-white">{page}</span><button disabled={page === pageCount} onClick={() => setPage((value) => value + 1)} className="grid size-8 place-items-center rounded-lg border disabled:opacity-30"><ChevronRight size={14} /></button></div></footer>
      </div>

      <aside className="space-y-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><header className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-black text-[#10244b]"><CalendarDays size={17} className="text-[#ff6500]" />Next Assignment</h2></header>{nextAssignment ? <><div className="rounded-xl bg-gradient-to-br from-blue-50 to-orange-50 p-4"><h3 className="text-sm font-black text-slate-700">{nextAssignment.tournament.title}</h3><div className="mt-3 space-y-2 text-[10px] font-semibold text-slate-500"><p className="flex items-center gap-2"><CalendarDays size={13} className="text-orange-500" />{formatDate(nextAssignment.tournament.date)}</p><p className="flex items-center gap-2"><MapPin size={13} className="text-orange-500" />{nextAssignment.tournament.location || "Venue TBA"}</p><p className="flex items-center gap-2"><Monitor size={13} className="text-orange-500" />Mat {nextAssignment.matNumber}</p><p className="flex items-center gap-2"><Gavel size={13} className="text-orange-500" />Mat Referee</p></div></div><Link href={`/dashboard/coach/mats/${nextAssignment.tournamentId}?mat=${nextAssignment.matNumber}`} className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#ff6500] py-3 text-xs font-black text-white">View Assignment <ArrowRight size={13} /></Link></> : <p className="rounded-xl bg-slate-50 p-5 text-center text-xs font-semibold text-slate-500">No upcoming assignments.</p>}</section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="flex items-center gap-2 text-sm font-black text-[#10244b]"><BarChart3 size={17} className="text-[#ff6500]" />Assignment Summary</h2><div className="mt-3 grid grid-cols-3 gap-2">{[{ label: "Upcoming", value: upcoming.length, tone: "bg-blue-50 text-blue-600" }, { label: "Active", value: active.length, tone: "bg-emerald-50 text-emerald-600" }, { label: "Completed", value: completed.length, tone: "bg-orange-50 text-orange-600" }].map((item) => <div key={item.label} className={`rounded-xl p-3 text-center ${item.tone}`}><p className="text-[8px] font-bold">{item.label}</p><p className="mt-1 text-lg font-black">{item.value}</p></div>)}</div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-sm font-black text-[#10244b]">Quick Actions</h2><div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-1"><button onClick={downloadSchedule} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-50 px-3 py-3 text-[10px] font-black text-orange-600"><Download size={14} />Download Schedule</button><Link href="/dashboard/member/events" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-3 text-[10px] font-black text-blue-600"><CalendarDays size={14} />View Events</Link><Link href="/dashboard/grievance" className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-3 text-[10px] font-black text-rose-600"><Trophy size={14} />Raise Grievance</Link></div></section>
      </aside>
    </section>}
  </div>;
}
