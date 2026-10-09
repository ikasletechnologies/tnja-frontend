"use client";

import { useEffect, useState } from "react";
import { AlertCircle, BriefcaseBusiness, CheckCircle2, IdCard, Loader2, Save, ShieldCheck, UserRound } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";

type CoachForm = {
  fullName: string;
  fatherName: string;
  gender: string;
  bloodGroup: string;
  mobileNumber: string;
  alternateMobileNumber: string;
  presentGradeInJudo: string;
  historyInJudo: string;
  historyInOtherMartial: string;
  employmentType: string;
  companyName: string;
  designation: string;
  deptName: string;
  contactPersonDept: string;
  addressDept: string;
};

const EMPTY_FORM: CoachForm = {
  fullName: "", fatherName: "", gender: "", bloodGroup: "", mobileNumber: "", alternateMobileNumber: "",
  presentGradeInJudo: "", historyInJudo: "", historyInOtherMartial: "", employmentType: "", companyName: "",
  designation: "", deptName: "", contactPersonDept: "", addressDept: "",
};

function Field({ label, name, value, onChange, type = "text", required = false, inputMode, maxLength, pattern, title }: { label: string; name: keyof CoachForm; value: string; onChange: (name: keyof CoachForm, value: string) => void; type?: string; required?: boolean; inputMode?: "text" | "numeric" | "tel"; maxLength?: number; pattern?: string; title?: string }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}{required && <b className="ml-1 text-orange-500">*</b>}</span><input type={type} value={value} required={required} inputMode={inputMode} maxLength={maxLength} pattern={pattern} title={title} onChange={(event) => onChange(name, event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none transition invalid:border-red-300 invalid:bg-red-50/40 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100" /></label>;
}

function TextArea({ label, name, value, onChange }: { label: string; name: keyof CoachForm; value: string; onChange: (name: keyof CoachForm, value: string) => void }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span><textarea value={value} onChange={(event) => onChange(name, event.target.value)} rows={4} className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100" /></label>;
}

export default function CoachProfileSettingsPage() {
  const [form, setForm] = useState<CoachForm>(EMPTY_FORM);
  const [original, setOriginal] = useState<CoachForm>(EMPTY_FORM);
  const [identity, setIdentity] = useState({ id: "", email: "", tempId: "", permanentId: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/auth/profile`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load profile.");
        if (data.role !== "COACH") throw new Error("This settings page is available only for Coach/Referee accounts.");
        const user = data.user || {};
        const next = Object.fromEntries(Object.keys(EMPTY_FORM).map((key) => [key, user[key] ?? ""])) as CoachForm;
        setForm(next);
        setOriginal(next);
        setIdentity({ id: user.id || "", email: user.email || "", tempId: user.tempId || "", permanentId: user.permanentId || "" });
      } catch (error) {
        setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to load profile." });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const change = (name: keyof CoachForm, value: string) => {
    const nextValue = name === "mobileNumber" || name === "alternateMobileNumber" ? value.replace(/\D/g, "").slice(0, 10) : value;
    setForm((current) => ({ ...current, [name]: nextValue }));
  };
  const dirty = JSON.stringify(form) !== JSON.stringify(original);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    const namePattern = /^[\p{L}][\p{L}\s.'-]{1,99}$/u;
    if (!namePattern.test(form.fullName.trim())) {
      setMessage({ type: "error", text: "Full name must contain only letters, spaces, apostrophes, dots or hyphens." });
      return;
    }
    if (!namePattern.test(form.fatherName.trim())) {
      setMessage({ type: "error", text: "Father's name must contain only letters, spaces, apostrophes, dots or hyphens." });
      return;
    }
    if (!/^\d{10}$/.test(form.mobileNumber)) {
      setMessage({ type: "error", text: "Mobile number must contain exactly 10 digits." });
      return;
    }
    if (form.alternateMobileNumber && !/^\d{10}$/.test(form.alternateMobileNumber)) {
      setMessage({ type: "error", text: "Alternate mobile number must contain exactly 10 digits." });
      return;
    }
    if (form.alternateMobileNumber && form.alternateMobileNumber === form.mobileNumber) {
      setMessage({ type: "error", text: "Alternate mobile number must be different from the primary mobile number." });
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/auth/profile`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update profile.");
      const next = Object.fromEntries(Object.keys(EMPTY_FORM).map((key) => [key, data.user?.[key] ?? form[key as keyof CoachForm] ?? ""])) as CoachForm;
      setForm(next);
      setOriginal(next);
      localStorage.setItem("userName", next.fullName);
      window.dispatchEvent(new Event("tnja:profile-updated"));
      setMessage({ type: "success", text: "Coach/Referee profile updated successfully." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to update profile." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin text-orange-500" size={38} /></div>;

  return <div className="mx-auto w-full max-w-5xl space-y-5 pb-8">
    <section className="relative overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-r from-white via-orange-50/40 to-orange-100/60 p-5 shadow-sm sm:p-6">
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200"><UserRound size={28} /></span><div className="min-w-0 flex-1"><p className="text-xs font-bold text-orange-500">Coach & Referee</p><h1 className="mt-1 text-2xl font-black text-[#10244b]">Profile Settings</h1><p className="mt-1 text-sm text-slate-500">Update your professional and contact information.</p></div><span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-[10px] font-black text-emerald-700"><ShieldCheck size={14} /> ACTIVE ACCOUNT</span></div>
    </section>

    {message && <div className={`flex items-center gap-3 rounded-xl border p-4 text-sm font-bold ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{message.type === "success" ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}{message.text}</div>}

    <form onSubmit={save} className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="mb-5 flex items-center gap-2 text-sm font-black text-[#10244b]"><IdCard size={18} className="text-orange-500" />Account Identity</h2><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase text-slate-400">Coach ID</p><p className="mt-1 text-sm font-black text-slate-700">{identity.permanentId || identity.tempId}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase text-slate-400">Email</p><p className="mt-1 break-all text-sm font-black text-slate-700">{identity.email}</p></div></div></section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="mb-5 flex items-center gap-2 text-sm font-black text-[#10244b]"><UserRound size={18} className="text-orange-500" />Personal & Contact Details</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Full Name" name="fullName" value={form.fullName} onChange={change} required maxLength={100} pattern="[A-Za-zÀ-ž஀-௿ .'-]{2,100}" title="Use letters, spaces, apostrophes, dots or hyphens only" /><Field label="Father's Name" name="fatherName" value={form.fatherName} onChange={change} required maxLength={100} pattern="[A-Za-zÀ-ž஀-௿ .'-]{2,100}" title="Use letters, spaces, apostrophes, dots or hyphens only" /><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Gender</span><select value={form.gender} onChange={(event) => change("gender", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-semibold outline-none focus:border-orange-400"><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></label><Field label="Blood Group" name="bloodGroup" value={form.bloodGroup} onChange={change} /><Field label="Mobile Number" name="mobileNumber" value={form.mobileNumber} onChange={change} type="tel" inputMode="numeric" maxLength={10} pattern="[0-9]{10}" title="Enter exactly 10 digits" required /><Field label="Alternate Mobile" name="alternateMobileNumber" value={form.alternateMobileNumber} onChange={change} type="tel" inputMode="numeric" maxLength={10} pattern="[0-9]{10}" title="Enter exactly 10 digits" /></div></section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="mb-5 flex items-center gap-2 text-sm font-black text-[#10244b]"><ShieldCheck size={18} className="text-orange-500" />Judo Credentials</h2><div className="grid gap-4 sm:grid-cols-2"><Field label="Present Grade in Judo" name="presentGradeInJudo" value={form.presentGradeInJudo} onChange={change} /><div /><TextArea label="History in Judo" name="historyInJudo" value={form.historyInJudo} onChange={change} /><TextArea label="Other Martial Arts Experience" name="historyInOtherMartial" value={form.historyInOtherMartial} onChange={change} /></div></section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="mb-5 flex items-center gap-2 text-sm font-black text-[#10244b]"><BriefcaseBusiness size={18} className="text-orange-500" />Professional Details</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Employment Type" name="employmentType" value={form.employmentType} onChange={change} /><Field label="Company / Organisation" name="companyName" value={form.companyName} onChange={change} /><Field label="Designation" name="designation" value={form.designation} onChange={change} /><Field label="Department Name" name="deptName" value={form.deptName} onChange={change} /><Field label="Department Contact Person" name="contactPersonDept" value={form.contactPersonDept} onChange={change} /><Field label="Department Address" name="addressDept" value={form.addressDept} onChange={change} /></div></section>

      <div className="sticky bottom-3 flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:justify-end"><button type="button" onClick={() => { setForm(original); setMessage(null); }} disabled={!dirty || saving} className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 disabled:opacity-40">Reset</button><button type="submit" disabled={!dirty || saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}{saving ? "Saving..." : "Save Changes"}</button></div>
    </form>
  </div>;
}
