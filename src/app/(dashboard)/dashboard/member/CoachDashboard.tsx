"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Award, CalendarDays, Check, ClipboardEdit, FileBadge2, Loader2, Mail, MapPin, Medal, MessageSquare, Pencil, Phone, Trophy, UserPlus, Users, X } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";

type CoachDashboardProps = {
  profile: Record<string, any>;
  editRequests: any[];
  processingRequestId: string | null;
  onReview: (id: string, action: "approve" | "reject") => void;
};

type DashboardData = {
  metrics: { totalStudents: number; activeStudents: number; newJoiners: number; eventsParticipated: number; medals: number; certificatesIssued: number };
  students: any[];
  upcomingEvents: any[];
  recentResults: any[];
  certificates: any[];
};

const Panel = ({ title, icon: Icon, action, children, className = "" }: { title: string; icon: typeof Users; action?: React.ReactNode; children: React.ReactNode; className?: string }) => <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}><header className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h2 className="flex items-center gap-2 text-xs font-black text-[#10244b]"><Icon size={16} className="text-[#ff6b1a]" />{title}</h2>{action}</header>{children}</section>;

export default function CoachDashboard({ profile, editRequests, processingRequestId, onReview }: CoachDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/coach/dashboard`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (response.ok) setData(await response.json());
      } finally { setLoading(false); }
    };
    void load();
  }, []);

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin text-[#ff6b1a]" size={36} /></div>;
  const metrics = data?.metrics || { totalStudents: 0, activeStudents: 0, newJoiners: 0, eventsParticipated: 0, medals: 0, certificatesIssued: 0 };
  const pending = editRequests.filter((request) => request.status === "PENDING");

  return <div className="space-y-4 pb-8">
    <section className="relative overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-r from-white via-white to-orange-50 p-5 shadow-sm"><div className="absolute right-8 top-0 h-full w-72 bg-[url('/homepage/whatjudo/judo1.png')] bg-contain bg-right bg-no-repeat opacity-[0.08]" /><div className="relative flex flex-col gap-4 sm:flex-row sm:items-center"><div className="relative"><div className="grid size-20 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#ff8400] to-[#ff5400] text-3xl font-black text-white shadow-lg">{profile.profilePhoto ? <img src={profile.profilePhoto} alt="" className="size-full object-cover" /> : profile.fullName?.charAt(0)}</div><span className="absolute -bottom-1 -right-1 size-4 rounded-full border-[3px] border-white bg-emerald-500" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-black text-[#10244b]">{profile.fullName}</h1><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-black text-emerald-600">ACTIVE MEMBER</span></div><p className="mt-1 text-xs font-semibold text-slate-500">Coach ID: {profile.permanentId || profile.tempId}</p><div className="mt-3 grid max-w-3xl gap-2 sm:grid-cols-3"><span className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[10px] text-slate-600"><Mail size={13} className="text-orange-500" />{profile.email}</span><span className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[10px] text-slate-600"><Phone size={13} className="text-orange-500" />{profile.mobileNumber}</span><span className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[10px] text-slate-600"><MapPin size={13} className="text-orange-500" />{profile.district?.name || "Tamil Nadu"}</span></div></div><Link href="/dashboard/coach/settings" className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-400 bg-white px-4 py-2 text-xs font-bold text-orange-600 transition hover:bg-orange-50"><Pencil size={14} />Edit Profile</Link></div></section>

    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[
      { label: "Total Students", value: metrics.totalStudents, note: `${metrics.newJoiners} new this month`, icon: Users, tone: "border-orange-100 bg-orange-50/60 text-orange-600" },
      { label: "Events Participated", value: metrics.eventsParticipated, note: `${data?.upcomingEvents.length || 0} upcoming`, icon: Trophy, tone: "border-blue-100 bg-blue-50/60 text-blue-600" },
      { label: "Medals (Students)", value: metrics.medals, note: "Podium placements", icon: Medal, tone: "border-violet-100 bg-violet-50/60 text-violet-600" },
      { label: "Certificates Issued", value: metrics.certificatesIssued, note: "Concluded results", icon: FileBadge2, tone: "border-rose-100 bg-rose-50/60 text-rose-600" },
    ].map((item) => <article key={item.label} className={`flex items-center gap-4 rounded-2xl border p-4 shadow-sm ${item.tone}`}><span className="grid size-12 place-items-center rounded-full bg-white/70"><item.icon size={24} /></span><div><p className="text-[10px] font-bold text-slate-500">{item.label}</p><p className="text-2xl font-black text-[#10244b]">{item.value}</p><p className="text-[9px] font-semibold opacity-75">{item.note}</p></div></article>)}</section>

    <section className="grid gap-4 xl:grid-cols-[1.55fr_0.9fr]">
      <Panel title="Player Profile Edit Requests" icon={ClipboardEdit} action={<span className="rounded-full bg-rose-50 px-2 py-1 text-[9px] font-bold text-rose-600">{pending.length} Pending</span>}><div className="divide-y divide-slate-100">{pending.length === 0 ? <p className="p-8 text-center text-xs font-semibold text-slate-400">No pending edit requests.</p> : pending.slice(0, 4).map((request) => <div key={request.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center"><div><p className="text-xs font-black text-slate-700">{request.player?.fullName || "Student"}</p><p className="text-[9px] text-slate-400">{request.player?.permanentId || request.player?.tempId}</p></div><div><p className="line-clamp-1 text-[10px] font-semibold text-slate-500">{request.requestedFields?.join(", ") || "Profile details"}</p><p className="text-[9px] text-slate-400">{new Date(request.createdAt).toLocaleDateString("en-IN")}</p></div><div className="flex gap-2"><button onClick={() => onReview(request.id, "approve")} disabled={processingRequestId === request.id} className="inline-flex items-center gap-1 rounded-lg border border-orange-300 px-3 py-2 text-[10px] font-bold text-orange-600"><Check size={12} />Review</button><button onClick={() => onReview(request.id, "reject")} disabled={processingRequestId === request.id} className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-2 text-[10px] font-bold text-rose-600"><X size={12} />Reject</button></div></div>)}</div></Panel>
      <Panel title="Upcoming Events" icon={CalendarDays} action={<Link href="/dashboard/member/events" className="text-[9px] font-bold text-blue-600">View All →</Link>}><div className="divide-y divide-slate-100">{data?.upcomingEvents.length ? data.upcomingEvents.map((event) => <div key={event.id} className="flex items-center gap-3 p-3"><span className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-500"><CalendarDays size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-black text-slate-700">{event.title}</p><p className="mt-1 flex gap-3 text-[9px] text-slate-400"><span>{new Date(event.date).toLocaleDateString("en-IN")}</span><span>{event.location}</span></p></div><span className="rounded-full bg-blue-50 px-2 py-1 text-[8px] font-bold text-blue-600">{event.level}</span></div>) : <p className="p-8 text-center text-xs text-slate-400">No upcoming events.</p>}</div></Panel>
    </section>

    <section className="grid gap-4 xl:grid-cols-3">
      <Panel title="My Students" icon={Users} action={<Link href="/dashboard/coach/students" className="text-[9px] font-bold text-blue-600">View All →</Link>}><div className="divide-y divide-slate-100">{data?.students.map((student) => <div key={student.id} className="flex items-center gap-3 px-4 py-3"><span className="grid size-8 place-items-center rounded-full bg-orange-50 text-xs font-black text-orange-600">{student.fullName?.charAt(0)}</span><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-black text-slate-700">{student.fullName}</p><p className="text-[9px] text-slate-400">{student.permanentId || student.tempId}</p></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-600">Active</span></div>)}</div></Panel>
      <Panel title="Recent Match Results (Students)" icon={Trophy}><div className="divide-y divide-slate-100">{data?.recentResults.length ? data.recentResults.map((result) => { const win = ["FIRST", "SECOND", "THIRD"].includes(result.placement); return <div key={result.id} className="flex items-center gap-3 px-4 py-3"><span className="grid size-8 place-items-center rounded-full bg-orange-50 text-xs font-black text-orange-600">{result.studentName?.charAt(0)}</span><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-black text-slate-700">{result.studentName}</p><p className="truncate text-[9px] text-slate-400">{result.tournamentName}</p></div><span className={`rounded-full px-2 py-1 text-[8px] font-bold ${win ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>{win ? result.placement : "Participated"}</span></div>; }) : <p className="p-8 text-center text-xs text-slate-400">No completed results.</p>}</div></Panel>
      <Panel title="Certificates Issued" icon={FileBadge2}><div className="divide-y divide-slate-100">{data?.certificates.length ? data.certificates.map((certificate) => <div key={certificate.id} className="flex items-center gap-3 px-4 py-3"><span className="grid size-10 place-items-center rounded-lg bg-amber-50 text-amber-600"><Award size={18} /></span><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-black text-slate-700">{certificate.placement === "PARTICIPATION" ? "Participation Certificate" : "Achievement Certificate"}</p><p className="truncate text-[9px] text-slate-400">{certificate.studentName} · {certificate.eventName}</p></div></div>) : <p className="p-8 text-center text-xs text-slate-400">No certificates issued.</p>}</div></Panel>
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"><Panel title="Student Progress Overview" icon={Award}><div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">{[{ label: "Total Students", value: metrics.totalStudents, tone: "bg-orange-50 text-orange-600" }, { label: "Active Students", value: metrics.activeStudents, tone: "bg-emerald-50 text-emerald-600" }, { label: "New Joiners", value: metrics.newJoiners, tone: "bg-blue-50 text-blue-600" }, { label: "Inactive Students", value: Math.max(0, metrics.totalStudents - metrics.activeStudents), tone: "bg-rose-50 text-rose-600" }].map((item) => <div key={item.label} className={`rounded-xl p-3 ${item.tone}`}><p className="text-[9px] font-bold opacity-75">{item.label}</p><p className="mt-1 text-xl font-black">{item.value}</p></div>)}</div></Panel><Panel title="Quick Actions" icon={Trophy}><div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4"><Link href="/dashboard/coach/students" className="grid place-items-center gap-2 rounded-xl bg-orange-50 p-3 text-center text-[9px] font-bold text-orange-600"><UserPlus size={18} />My Students</Link><Link href="/dashboard/member/events" className="grid place-items-center gap-2 rounded-xl bg-orange-50 p-3 text-center text-[9px] font-bold text-orange-600"><CalendarDays size={18} />View Events</Link><Link href="/dashboard/coach/students" className="grid place-items-center gap-2 rounded-xl bg-orange-50 p-3 text-center text-[9px] font-bold text-orange-600"><FileBadge2 size={18} />Student Records</Link><Link href="/dashboard/grievance" className="grid place-items-center gap-2 rounded-xl bg-orange-50 p-3 text-center text-[9px] font-bold text-orange-600"><MessageSquare size={18} />Raise Grievance</Link></div></Panel></section>
  </div>;
}