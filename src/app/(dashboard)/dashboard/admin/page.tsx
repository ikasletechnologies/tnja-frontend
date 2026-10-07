"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Loader2,
  MapPin,
  ShieldCheck,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";

type Counts = { STUDENT: number; COACH: number; MEMBER: number; CLUB: number };
type Pending = Counts & { total: number };
type RecentApproval = { id?: string; name: string; type: string; createdAt: string };
type DashboardStats = { counts: Counts; pending: Pending; recentApprovals: RecentApproval[] };
type Profile = {
  fullName?: string;
  role?: string;
  assignedDistrict?: { name?: string };
  district?: { name?: string };
  state?: { name?: string };
};
type EventItem = {
  id?: string;
  title?: string;
  name?: string;
  date?: string;
  startDate?: string;
  location?: string;
  venue?: string;
  imageUrl?: string;
};
type Grievance = { id?: string; status?: string };
type ApiCollection<T> = T[] | { events?: T[]; grievances?: T[] };

const EMPTY_STATS: DashboardStats = {
  counts: { STUDENT: 0, COACH: 0, MEMBER: 0, CLUB: 0 },
  pending: { STUDENT: 0, COACH: 0, MEMBER: 0, CLUB: 0, total: 0 },
  recentApprovals: [],
};

function roleLabel(role: string) {
  return role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "Date to be announced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date to be announced";
  return new Intl.DateTimeFormat("en-IN", options || { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function PanelTitle({ icon: Icon, title, href }: { icon: typeof UsersRound; title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl bg-orange-50 text-[#ff6b00]"><Icon size={18} /></span>
        <h2 className="text-[15px] font-extrabold text-[#101b3b]">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 transition hover:text-blue-700">
          View all <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [profile, setProfile] = useState<Profile>({});
  const [events, setEvents] = useState<EventItem[]>([]);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const token = localStorage.getItem("token");
        const storedRole = localStorage.getItem("userRole");

        if (!token) {
          router.replace("/login");
          return;
        }
        if (storedRole === "PLAYER") {
          router.replace("/dashboard/player");
          return;
        }
        if (["MEMBER", "COACH", "CLUB"].includes(storedRole || "")) {
          router.replace("/dashboard/member");
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        const [statsResponse, profileResponse, grievanceResponse, eventResponse] = await Promise.all([
          fetch(`${API_BASE}/admin/stats`, { headers }),
          fetch(`${API_BASE}/auth/profile`, { headers }),
          fetch(`${API_BASE}/grievances`, { headers }).catch(() => null),
          fetch(`${API_BASE}/events`, { headers }).catch(() => null),
        ]);

        if (statsResponse.status === 401 || profileResponse.status === 401) {
          localStorage.removeItem("token");
          router.replace("/login");
          return;
        }
        if (!statsResponse.ok || !profileResponse.ok) {
          throw new Error("Dashboard data could not be loaded. Please try again.");
        }

        const statsData = (await statsResponse.json()) as DashboardStats;
        const profileData = (await profileResponse.json()) as { user: Profile; role: string };
        if (!active) return;

        setStats(statsData);
        setProfile({ ...profileData.user, role: profileData.role });

        if (grievanceResponse?.ok) {
          const data = (await grievanceResponse.json()) as ApiCollection<Grievance>;
          setGrievances(Array.isArray(data) ? data : data.grievances || []);
        }
        if (eventResponse?.ok) {
          const data = (await eventResponse.json()) as ApiCollection<EventItem>;
          setEvents((Array.isArray(data) ? data : data.events || []).slice(0, 4));
        }
      } catch (reason: unknown) {
        if (active) setError(reason instanceof Error ? reason.message : "Failed to connect to the server.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDashboard();
    return () => { active = false; };
  }, [router]);

  const role = profile.role || "SUPER_ADMIN";
  const displayName = profile.fullName || roleLabel(role);
  const jurisdiction = profile.assignedDistrict?.name || profile.district?.name || profile.state?.name || "Tamil Nadu";
  const canSeeGrievances = ["STATE_PRESIDENT", "STATE_SECRETARY", "SUPER_ADMIN", "CEO"].includes(role);
  const counts = stats.counts || EMPTY_STATS.counts;
  const pending = stats.pending || EMPTY_STATS.pending;
  const totalUsers = counts.MEMBER + counts.STUDENT + counts.COACH + counts.CLUB;
  const activeEvents = events.length;

  const chartValues = useMemo(() => {
    const base = [counts.MEMBER, counts.STUDENT, counts.COACH, counts.CLUB, totalUsers];
    const max = Math.max(...base, 1);
    return base.map((value, index) => Math.max(18, Math.round((value / max) * 75) + index * 2));
  }, [counts, totalUsers]);

  const distribution = [
    { label: "Members", value: counts.MEMBER, color: "#ff6b00" },
    { label: "Players", value: counts.STUDENT, color: "#1f64e8" },
    { label: "Coaches", value: counts.COACH, color: "#fbbf24" },
    { label: "Clubs", value: counts.CLUB, color: "#12b981" },
  ];
  let cursor = 0;
  const donutStops = distribution.map((item) => {
    const start = cursor;
    cursor += totalUsers ? (item.value / totalUsers) * 100 : 25;
    return `${item.color} ${start}% ${cursor}%`;
  }).join(", ");

  const statCards = [
    { label: "Members", value: counts.MEMBER, icon: UsersRound, tone: "orange", href: "/dashboard/admin/members" },
    { label: "Players", value: counts.STUDENT, icon: UserRound, tone: "amber", href: "/dashboard/admin/members" },
    { label: "Coaches", value: counts.COACH, icon: ShieldCheck, tone: "blue", href: "/dashboard/admin/members" },
    { label: "Events", value: activeEvents, icon: CalendarDays, tone: "emerald", href: "/dashboard/admin/events" },
  ] as const;

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center gap-3 text-slate-500">
        <Loader2 size={34} className="animate-spin text-[#ff6b00]" />
        <span className="text-sm font-semibold">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-red-50 text-red-500"><ShieldCheck size={28} /></span>
        <div><h2 className="font-extrabold text-slate-800">Unable to load dashboard</h2><p className="mt-1 text-sm text-slate-500">{error}</p></div>
        <button onClick={() => window.location.reload()} className="rounded-xl bg-[#ff6b00] px-6 py-2.5 text-sm font-bold text-white">Retry</button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f5f8fc] p-4 sm:p-6 xl:p-7">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold text-slate-400">{roleLabel(role)} / Dashboard</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-[#0e1838] sm:text-[30px]">Welcome back, {displayName}!</h1>
            <p className="mt-1 text-sm text-slate-500">Here&apos;s what&apos;s happening in Tamil Nadu Judo Association.</p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm">
            <CalendarDays size={16} className="text-slate-500" />
            {formatDate(new Date().toISOString(), { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            const tones = {
              orange: "border-orange-200 bg-orange-50/70 text-orange-600",
              amber: "border-amber-200 bg-amber-50/70 text-amber-500",
              blue: "border-blue-200 bg-blue-50/70 text-blue-600",
              emerald: "border-emerald-200 bg-emerald-50/70 text-emerald-600",
            };
            return (
              <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className={`rounded-2xl border p-4 shadow-sm ${tones[card.tone]}`}>
                <div className="flex items-center gap-4">
                  <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white/70"><Icon size={27} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                    <p className="text-3xl font-black leading-tight text-[#101b3b]">{card.value}</p>
                  </div>
                  <Link href={card.href} aria-label={`View ${card.label}`} className="grid size-9 place-items-center rounded-full border border-current/20 bg-white/50 transition hover:translate-x-0.5"><ArrowRight size={18} /></Link>
                </div>
              </motion.div>
            );
          })}
        </section>

        <section className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.35fr_.85fr]">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <PanelTitle icon={UsersRound} title="Membership Overview" />
                <div className="mt-5 h-56 rounded-xl bg-[linear-gradient(to_right,#e8edf5_1px,transparent_1px),linear-gradient(to_bottom,#e8edf5_1px,transparent_1px)] bg-[size:20%_25%] p-3">
                  <svg viewBox="0 0 500 180" className="h-full w-full" role="img" aria-label="Membership activity overview">
                    <defs><linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff6b00" stopOpacity=".28" /><stop offset="1" stopColor="#ff6b00" stopOpacity=".02" /></linearGradient></defs>
                    <path d={`M 15 ${165-chartValues[0]} L 130 ${165-chartValues[1]} L 245 ${165-chartValues[2]} L 360 ${165-chartValues[3]} L 485 ${165-chartValues[4]} L 485 170 L 15 170 Z`} fill="url(#activityFill)" />
                    <path d={`M 15 ${165-chartValues[0]} L 130 ${165-chartValues[1]} L 245 ${165-chartValues[2]} L 360 ${165-chartValues[3]} L 485 ${165-chartValues[4]}`} fill="none" stroke="#ff6b00" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {chartValues.map((value, index) => <circle key={index} cx={[15,130,245,360,485][index]} cy={165-value} r="5" fill="white" stroke="#ff6b00" strokeWidth="3" />)}
                  </svg>
                </div>
                <div className="mt-2 grid grid-cols-5 text-center text-[10px] font-bold text-slate-400"><span>Members</span><span>Players</span><span>Coaches</span><span>Clubs</span><span>Total</span></div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <PanelTitle icon={UsersRound} title="User Distribution" />
                <div className="mt-7 flex flex-col items-center gap-7 sm:flex-row sm:justify-center xl:flex-col 2xl:flex-row">
                  <div className="relative grid size-40 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${donutStops})` }}>
                    <div className="grid size-[102px] place-items-center rounded-full bg-white text-center shadow-inner"><div><p className="text-3xl font-black text-[#101b3b]">{totalUsers}</p><p className="text-xs font-semibold text-slate-500">Total users</p></div></div>
                  </div>
                  <div className="w-full space-y-3">
                    {distribution.map((item) => (
                      <div key={item.label} className="flex items-center gap-3 text-sm">
                        <span className="size-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="flex-1 font-semibold text-slate-600">{item.label}</span>
                        <span className="font-black text-[#101b3b]">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <PanelTitle icon={UserRound} title="Recent Registrations" href="/dashboard/admin/approvals" />
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-xs">
                    <thead className="border-b border-slate-100 text-slate-400"><tr><th className="pb-3 font-semibold">Name</th><th className="pb-3 font-semibold">Role</th><th className="pb-3 font-semibold">Date</th><th className="pb-3 font-semibold">Status</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {stats.recentApprovals.length ? stats.recentApprovals.slice(0, 5).map((item, index) => (
                        <tr key={`${item.name}-${index}`}><td className="py-3 font-bold text-slate-700">{item.name}</td><td className="py-3"><span className="rounded-full bg-blue-50 px-2.5 py-1 font-bold text-blue-600">{item.type}</span></td><td className="py-3 text-slate-500">{formatDate(item.createdAt)}</td><td className="py-3"><span className="rounded-full bg-amber-50 px-2.5 py-1 font-bold text-amber-600">Pending</span></td></tr>
                      )) : <tr><td colSpan={4} className="py-10 text-center font-semibold text-slate-400">No pending registrations</td></tr>}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <PanelTitle icon={ClipboardCheck} title={canSeeGrievances ? "Grievance Summary" : "Approval Summary"} href={canSeeGrievances ? "/dashboard/admin/grievances" : "/dashboard/admin/approvals"} />
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-orange-50 p-4"><p className="text-xs font-semibold text-slate-500">Pending approvals</p><p className="mt-1 text-3xl font-black text-orange-600">{pending.total}</p></div>
                  <div className="rounded-xl bg-blue-50 p-4"><p className="text-xs font-semibold text-slate-500">Grievances</p><p className="mt-1 text-3xl font-black text-blue-600">{grievances.length}</p></div>
                </div>
                <div className="mt-4 space-y-2">
                  {[{label:"Members",value:pending.MEMBER},{label:"Players",value:pending.STUDENT},{label:"Coaches",value:pending.COACH},{label:"Clubs",value:pending.CLUB}].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5"><span className="text-xs font-semibold text-slate-600">{item.label}</span><span className="grid size-7 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-700">{item.value}</span></div>
                  ))}
                </div>
              </article>
            </div>
          </div>

          <aside className="space-y-4">
            <article className="overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_90%_10%,#562db7,transparent_40%),linear-gradient(135deg,#0e1b3c,#161d4e)] p-5 text-white shadow-lg shadow-indigo-950/10">
              <p className="text-xs font-bold text-blue-200">Your Jurisdiction</p>
              <div className="mt-4 flex items-center gap-4"><span className="grid size-12 place-items-center rounded-xl bg-white/10"><MapPin size={24} /></span><div><p className="text-xl font-black">{jurisdiction}</p><p className="text-xs text-blue-200">{roleLabel(role)}</p></div></div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <PanelTitle icon={CalendarDays} title="Upcoming Events" href="/dashboard/admin/events" />
              <div className="mt-4 space-y-3">
                {events.length ? events.slice(0, 3).map((event, index) => (
                  <Link key={event.id || index} href="/dashboard/admin/events" className="group block overflow-hidden rounded-xl border border-slate-100 transition hover:border-orange-200 hover:shadow-sm">
                    <div className="h-20 bg-[linear-gradient(135deg,#311383,#8b2ce5)] p-4 text-white"><Trophy className="ml-auto opacity-30" size={44} /></div>
                    <div className="p-3"><p className="font-extrabold text-[#101b3b]">{event.title || event.name || "Judo Event"}</p><p className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500"><CalendarDays size={13} className="text-orange-500" />{formatDate(event.date || event.startDate)}</p><p className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-500"><MapPin size={13} className="text-orange-500" />{event.location || event.venue || "Venue to be announced"}</p></div>
                  </Link>
                )) : <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center"><CalendarDays className="mx-auto text-slate-300" /><p className="mt-2 text-xs font-semibold text-slate-400">No upcoming events</p></div>}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <PanelTitle icon={Clock3} title="Pending Approvals" href="/dashboard/admin/approvals" />
              <div className="mt-4 space-y-2">
                {[{label:"Member approvals",value:pending.MEMBER,iconClass:"text-orange-500"},{label:"Player approvals",value:pending.STUDENT,iconClass:"text-amber-500"},{label:"Coach approvals",value:pending.COACH,iconClass:"text-blue-500"},{label:"Club approvals",value:pending.CLUB,iconClass:"text-emerald-500"}].map((item) => (
                  <Link key={item.label} href="/dashboard/admin/approvals" className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3 transition hover:border-orange-200 hover:bg-orange-50/30"><CheckCircle2 size={17} className={item.iconClass} /><span className="flex-1 text-xs font-bold text-slate-600">{item.label}</span><span className="grid size-7 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-700">{item.value}</span><ArrowRight size={14} className="text-slate-400" /></Link>
                ))}
              </div>
            </article>
          </aside>
        </section>
      </div>
    </div>
  );
}
