"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Award,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  CreditCard,
  FileCheck2,
  Flag,
  Loader2,
  Mail,
  MapPin,
  Medal,
  Pencil,
  Phone,
  Scale,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  UsersRound,
  X,
  BriefcaseBusiness,
  Building2,
  IdCard,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";

// API response fields vary by player role and registration status.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Player = Record<string, any>;
type EditRequest = { id: string; status: string } | null;

const formatDate = (value?: string, fallback = "Not available") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const valueOr = (value: unknown, fallback = "Not provided") =>
  value === null || value === undefined || value === "" ? fallback : String(value);

function Detail({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: unknown }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#ff6b1a]" strokeWidth={1.9} />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold leading-none text-slate-400">{label}</p>
        <p className="mt-1 truncate text-xs font-semibold text-slate-700">{valueOr(value)}</p>
      </div>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-orange-50 text-[#ff6b1a]">
            <Icon size={16} />
          </span>
          <h2 className="text-xs font-bold text-slate-800">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, type = "text", readOnly, onChange }: { label: string; value: string; type?: string; readOnly?: boolean; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1.5 text-xs font-semibold text-slate-500">
      {label}
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100 read-only:cursor-not-allowed read-only:text-slate-400"
      />
    </label>
  );
}

export default function PlayerDashboard() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [settings, setSettings] = useState<Player | null>(null);
  const [editRequest, setEditRequest] = useState<EditRequest>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [requestingEdit, setRequestingEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const buildForm = (data: Player) => ({
    fullName: data.fullName || "",
    fatherName: data.fatherName || "",
    bloodGroup: data.bloodGroup || "",
    gender: data.gender || "",
    height: data.height || "",
    weight: data.weight || "",
    mobileNumber: data.mobileNumber || "",
    address: data.address || "",
    city: data.city || "",
    state: data.state || "",
    addressPincode: data.addressPincode || "",
    dob: data.dob ? new Date(data.dob).toISOString().split("T")[0] : "",
    email: data.email || "",
    tempId: data.tempId || "",
  });

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Your session has expired. Please sign in again.");
        const authHeaders = { Authorization: `Bearer ${token}` };
        const [profileResponse, settingsResponse, requestResponse, tournamentResponse] = await Promise.all([
          fetch(`${API_BASE}/auth/profile`, { headers: authHeaders }),
          fetch(`${API_BASE}/settings/global`),
          fetch(`${API_BASE}/profile-edit-requests/my`, { headers: authHeaders }),
          fetch(`${API_BASE}/tournaments/player`, { headers: authHeaders }),
        ]);
        const profileData = await profileResponse.json();
        if (!profileResponse.ok) throw new Error(profileData.error || "Failed to load your profile.");
        setPlayer(profileData.user);
        setForm(buildForm(profileData.user));
        if (settingsResponse.ok) setSettings(await settingsResponse.json());
        if (requestResponse.ok) {
          const data = await requestResponse.json();
          if (data?.id) setEditRequest({ id: data.id, status: data.status });
        }
        if (tournamentResponse.ok) {
          const tournaments = await tournamentResponse.json();
          if (Array.isArray(tournaments)) {
            const now = Date.now();
            setUpcomingEvents(tournaments.filter((item) => new Date(item.date).getTime() >= now).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
          }
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Unable to load the dashboard.");
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refreshEditPermission = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const response = await fetch(`${API_BASE}/profile-edit-requests/my`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;
        const data = await response.json();
        const nextRequest = data?.id ? { id: data.id, status: data.status } : null;
        setEditRequest(nextRequest);
      } catch {
        // The next poll or WebSocket notification will retry the permission check.
      }
    };
    const onNotification = () => refreshEditPermission();
    const onFocus = () => refreshEditPermission();
    const interval = window.setInterval(refreshEditPermission, 10000);
    window.addEventListener("tnja:notification", onNotification);
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("tnja:notification", onNotification);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const stats = useMemo(() => [
    { label: "Total wins", value: player?.wins || 0, icon: Trophy, tone: "emerald" },
    { label: "Total losses", value: player?.losses || 0, icon: X, tone: "rose" },
    { label: "Total draws", value: player?.draws || 0, icon: Scale, tone: "slate" },
    { label: "Upcoming events", value: upcomingEvents.length, icon: CalendarDays, tone: "blue" },
  ], [player, upcomingEvents]);

  const requestProfileEdit = async () => {
    setRequestingEdit(true);
    try {
      const response = await fetch(`${API_BASE}/profile-edit-requests`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to send the request.");
      setEditRequest({ id: data.id, status: "PENDING" });
    } catch (reason) {
      alert(reason instanceof Error ? reason.message : "Unable to send the request.");
    } finally {
      setRequestingEdit(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/auth/profile`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update your profile.");
      setPlayer(data.user);
      setForm(buildForm(data.user));
      setEditRequest(null);
      setIsEditing(false);
    } catch (reason) {
      alert(reason instanceof Error ? reason.message : "Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  };

  const payMembership = async () => {
    if (!player) return;
    setPaying(true);
    try {
      const scriptReady = await new Promise<boolean>((resolve) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).Razorpay) return resolve(true);
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
      if (!scriptReady) throw new Error("The secure payment service could not be loaded.");
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/application/create-order`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: player.id, type: "student" }),
      });
      const order = await response.json();
      if (!response.ok) throw new Error(order.error || "Unable to create the payment order.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Tamil Nadu Judo Association",
        description: "Membership Registration Fee",
        order_id: order.id,
        prefill: { name: player.fullName, email: player.email, contact: player.mobileNumber },
        theme: { color: "#ff6b1a" },
        handler: async (payment: Player) => {
          const verify = await fetch(`${API_BASE}/application/verify-payment`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ id: player.id, type: "student", ...payment }),
          });
          if (!verify.ok) return alert("Payment verification failed. Please contact support.");
          localStorage.clear();
          window.location.href = "/login";
        },
      }).open();
    } catch (reason) {
      alert(reason instanceof Error ? reason.message : "Payment could not be started.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div className="grid min-h-[65vh] place-items-center"><div className="text-center"><Loader2 className="mx-auto h-9 w-9 animate-spin text-[#ff6b1a]" /><p className="mt-3 text-sm font-medium text-slate-500">Preparing your dashboard…</p></div></div>;

  if (error || !player) return (
    <div className="mx-auto grid min-h-[65vh] max-w-md place-items-center text-center">
      <div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500"><AlertCircle /></span><h1 className="mt-4 text-xl font-bold text-slate-800">Unable to load dashboard</h1><p className="mt-2 text-sm text-slate-500">{error}</p><button onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-[#ff6b1a] px-5 py-2.5 text-sm font-bold text-white">Try again</button></div>
    </div>
  );

  const firstName = player.fullName?.split(" ")[0] || "Player";
  const nextEvent = upcomingEvents[0];
  const needsPayment = !player.isBPL && !player.isPaid;
  const editAction = editRequest?.status === "APPROVED" ? (
    <button onClick={() => setIsEditing(true)} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#ff6b1a]"><Pencil size={12} /> Edit</button>
  ) : null;

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_top_left,#fff7ed_0,transparent_30%),linear-gradient(180deg,#f8fbff_0%,#f4f7fb_100%)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <header>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#14213d] sm:text-3xl">Player Dashboard</h1>
          <p className="mt-0.5 text-xs font-medium text-slate-400">Welcome back, {firstName}! Here&apos;s your judo journey at a glance.</p>
        </header>

        <section className="relative overflow-hidden rounded-2xl border border-orange-200/70 bg-gradient-to-r from-[#fffaf2] via-[#fff7ed] to-[#fff0df] p-4 shadow-[0_12px_35px_rgba(255,107,26,0.08)] sm:p-5">
          <div className="pointer-events-none absolute inset-y-0 right-[8%] hidden w-[38%] bg-[url('/homepage/whatjudo/judo1.png')] bg-contain bg-center bg-no-repeat opacity-[0.10] lg:block" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative shrink-0">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#ff930f] to-[#ff5a00] text-3xl font-black text-white shadow-lg shadow-orange-200/60">
                {/* Profile photos are user-hosted URLs that are not limited to a configured image domain. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {player.profilePhoto ? <img src={player.profilePhoto} alt="" className="h-full w-full object-cover" /> : player.fullName?.charAt(0)}
              </div>
              <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-white bg-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-extrabold text-[#17213b]">{player.fullName}</h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-extrabold uppercase text-emerald-600">{player.permanentId ? "Active member" : "Approved player"}</span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><CircleUserRound size={14} className="text-[#ff6b1a]" /> Player ID: {player.permanentId || player.tempId || "Pending"}</p>
              {player.validUntil && <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-600"><CalendarDays size={13} /> Valid until: {formatDate(player.validUntil)}</span>}
            </div>
            <div className="relative z-10 sm:self-start">
              {editRequest?.status === "PENDING" ? (
                <span className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white/80 px-4 py-2 text-[10px] font-bold text-amber-600"><Loader2 size={13} className="animate-spin" /> Request pending</span>
              ) : editRequest?.status === "APPROVED" ? (
                <button onClick={() => setIsEditing(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#ff6b1a] bg-white px-4 py-2 text-[10px] font-bold text-[#ff6b1a]"><Pencil size={13} /> Edit profile</button>
              ) : player.coach ? (
                <button onClick={requestProfileEdit} disabled={requestingEdit} className="inline-flex items-center gap-2 rounded-xl border border-[#ff6b1a] bg-white px-4 py-2 text-[10px] font-bold text-[#ff6b1a] shadow-sm disabled:opacity-60">{requestingEdit ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />} Request profile edit</button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, tone }) => {
            const colors: Record<string, string> = { emerald: "border-emerald-100 bg-emerald-50/60 text-emerald-500", rose: "border-rose-100 bg-rose-50/60 text-rose-500", slate: "border-slate-200 bg-white text-slate-500", blue: "border-blue-100 bg-blue-50/60 text-blue-500" };
            return <article key={label} className={`flex items-center gap-3 rounded-2xl border p-4 shadow-[0_8px_25px_rgba(15,23,42,0.03)] ${colors[tone]}`}><span className="grid h-10 w-10 place-items-center rounded-full bg-white/70"><Icon size={19} /></span><div><p className="text-[9px] font-extrabold uppercase tracking-wide opacity-80">{label}</p><p className="mt-0.5 text-xl font-black text-[#17213b]">{value}</p></div></article>;
          })}
        </section>

        {needsPayment && (
          <section className="flex flex-col gap-4 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-white p-4 sm:flex-row sm:items-center">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#ff6b1a] shadow-sm"><CreditCard /></span><div className="flex-1"><h2 className="text-sm font-bold text-slate-800">Complete your membership</h2><p className="mt-0.5 text-xs text-slate-500">Pay ₹{settings?.playerFee || 500} to activate your Player ID and event access.</p></div><button onClick={payMembership} disabled={paying} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff6b1a] px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-200 disabled:opacity-60">{paying && <Loader2 size={14} className="animate-spin" />} Pay membership</button>
          </section>
        )}

        {isEditing ? (
          <Panel icon={Pencil} title="Edit personal information">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[ ["Full name", "fullName"], ["Father's name", "fatherName"], ["Blood group", "bloodGroup"], ["Gender", "gender"], ["Height (cm)", "height", "number"], ["Weight (kg)", "weight", "number"], ["Mobile number", "mobileNumber"], ["Date of birth", "dob", "date", true], ["Email", "email", "email", true], ["Address", "address"], ["City", "city"], ["State", "state"], ["Pincode", "addressPincode"] ].map(([label, key, type, readOnly]) => <Field key={String(key)} label={String(label)} value={form[String(key)] || ""} type={type ? String(type) : "text"} readOnly={Boolean(readOnly)} onChange={(value) => setForm((current) => ({ ...current, [String(key)]: value }))} />)}
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4"><button onClick={() => { setIsEditing(false); setForm(buildForm(player)); }} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500">Cancel</button><button onClick={saveProfile} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#ff6b1a] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">{saving && <Loader2 size={14} className="animate-spin" />} Save changes</button></div>
          </Panel>
        ) : (
          <section className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
            <Panel icon={FileCheck2} title="Basic Information" action={<Link href="/dashboard/player/profile" className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-[#ff6b1a]">View all <ArrowRight size={11} /></Link>}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"><Detail icon={UserRound} label="Name" value={player.fullName} /><Detail icon={UserRound} label="Father's Name" value={player.fatherName} /><Detail icon={CalendarDays} label="Date of Birth" value={formatDate(player.dob)} /><Detail icon={ShieldCheck} label="Blood Group" value={player.bloodGroup} /></div>
            </Panel>
            <Panel icon={MapPin} title="Contact & Address" action={editAction}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"><Detail icon={Mail} label="Email" value={player.email} /><Detail icon={Phone} label="Mobile Number" value={player.mobileNumber} /><Detail icon={MapPin} label="Address" value={player.address} /><Detail icon={Flag} label="City" value={player.city} /></div>
            </Panel>
            <Panel icon={UserRound} title="Physical Attributes" action={editAction}>
              <div className="grid grid-cols-2 gap-4"><Detail icon={Award} label="Height (CM)" value={player.height} /><Detail icon={Scale} label="Weight (KG)" value={player.weight} /><Detail icon={UserRound} label="Gender" value={player.gender} /><Detail icon={Medal} label="Belt Grade" value={player.presentGradeInJudo || player.beltGrade || "Not assigned"} /></div>
            </Panel>
            <Panel icon={BriefcaseBusiness} title="Assigned Coach">
              {player.coach ? (
                <div className="grid grid-cols-2 gap-4">
                  <Detail icon={UserRound} label="Coach Name" value={player.coach.fullName} />
                  <Detail icon={IdCard} label="Coach ID" value={player.coach.permanentId || player.coach.tempId || player.coach.coachId} />
                  <Detail icon={Phone} label="Mobile Number" value={player.coach.mobileNumber || player.coach.phone} />
                  <Detail icon={Building2} label="Academy / Club" value={player.coach.club?.name || player.coach.academy?.name || player.club?.name || "Independent"} />
                </div>
              ) : (
                <div className="flex min-h-[76px] items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-slate-300"><UsersRound size={17} /></span>
                  <div><p className="text-xs font-bold text-slate-600">No coach assigned</p><p className="mt-0.5 text-[9px] text-slate-400">Coach details will appear after assignment.</p></div>
                </div>
              )}
            </Panel>
          </section>
        )}

        <section className="grid gap-3 lg:grid-cols-[1.25fr_0.95fr]">
          <Panel icon={Activity} title="Recent Activity" action={<span className="text-[9px] font-bold text-slate-400">Your journey</span>}>
            <div className="relative space-y-1 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-slate-200">
              {[{ icon: UserRound, title: "Profile created", detail: "Your player profile is ready.", date: formatDate(player.createdAt) }, { icon: CheckCircle2, title: player.isPaid || player.isBPL ? "Membership active" : "Registration approved", detail: player.isPaid || player.isBPL ? "Your membership is in good standing." : "Complete payment to activate membership.", date: formatDate(player.updatedAt) }, { icon: FileCheck2, title: player.permanentId ? "Player ID issued" : "Documents verified", detail: player.permanentId ? `ID ${player.permanentId} is active.` : "Your submitted documents have been reviewed.", date: "Latest" }].map((item) => <div key={item.title} className="relative flex items-center gap-3 rounded-xl px-1 py-2.5"><span className="z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-4 border-white bg-emerald-50 text-emerald-500"><item.icon size={13} /></span><div className="min-w-0 flex-1"><p className="text-[11px] font-bold text-slate-700">{item.title}</p><p className="truncate text-[9px] text-slate-400">{item.detail}</p></div><span className="text-right text-[9px] font-semibold text-slate-400">{item.date}</span></div>)}
            </div>
          </Panel>
          <Panel icon={CalendarDays} title="Upcoming Events" action={<Link href="/dashboard/member/events" className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-[#ff6b1a]">View all <ArrowRight size={11} /></Link>}>
            {nextEvent ? <div className="flex h-full min-h-32 flex-col justify-between rounded-xl bg-gradient-to-br from-[#17213b] to-[#24355d] p-4 text-white"><div><span className="text-[9px] font-bold uppercase tracking-widest text-orange-300">Next tournament</span><h3 className="mt-2 text-base font-bold">{nextEvent.title}</h3><p className="mt-2 flex items-center gap-3 text-[10px] text-white/60"><span className="flex items-center gap-1"><CalendarDays size={12} />{formatDate(nextEvent.date)}</span><span className="flex items-center gap-1"><MapPin size={12} />{nextEvent.location || "Venue TBA"}</span></p></div><Link href="/dashboard/player/tournaments" className="mt-4 inline-flex w-fit items-center gap-1 text-[10px] font-bold text-orange-300">View tournament <ChevronRight size={12} /></Link></div> : <div className="grid min-h-32 place-items-center text-center"><div><span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-slate-50 text-slate-300"><CalendarDays size={19} /></span><p className="mt-2 text-xs font-bold text-slate-600">No upcoming events</p><p className="mt-1 text-[9px] text-slate-400">Stay tuned for new tournaments.</p><Link href="/dashboard/member/events" className="mt-3 inline-flex rounded-lg bg-[#ff6b1a] px-4 py-2 text-[9px] font-bold text-white">Browse events</Link></div></div>}
          </Panel>
        </section>

        <section className="grid gap-3 lg:grid-cols-[1fr_1.05fr]">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#641f38] via-[#8428a8] to-[#6818d4] p-4 text-white shadow-lg shadow-violet-200/40"><div className="absolute -right-8 -top-16 h-48 w-48 rounded-full bg-white/10" /><div className="relative flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500"><CalendarDays size={19} /></span><div className="min-w-0 flex-1"><p className="text-[8px] uppercase tracking-widest text-white/60">Next tournament</p><p className="mt-1 truncate text-xs font-bold">{nextEvent?.title || "Explore upcoming championships"}</p><p className="mt-1 text-[9px] text-white/65">{nextEvent ? `${formatDate(nextEvent.date)} · ${nextEvent.location || "Venue TBA"}` : "Discover events open for registration"}</p></div><Link href="/dashboard/player/tournaments" className="grid h-8 w-8 place-items-center rounded-full bg-white text-violet-600"><ArrowRight size={15} /></Link></div></div>
          <Panel icon={Sparkles} title="Quick Actions"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[{ href: "/dashboard/player/tournaments", icon: Trophy, label: "View tournaments", color: "orange" }, { href: "/dashboard/player/match-history", icon: Activity, label: "Match history", color: "blue" }, { href: "/dashboard/grievance", icon: Flag, label: "Raise grievance", color: "rose" }, { href: "/dashboard/player/profile", icon: UsersRound, label: "Edit profile", color: "emerald" }].map((item) => <Link key={item.label} href={item.href} className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-center text-[9px] font-bold ${item.color === "orange" ? "bg-orange-50 text-orange-600" : item.color === "blue" ? "bg-blue-50 text-blue-600" : item.color === "rose" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}><item.icon size={13} />{item.label}</Link>)}</div></Panel>
        </section>
      </div>
    </main>
  );
}
