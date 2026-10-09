"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  MessageSquare,
  RefreshCw,
  Loader2,
  Mail,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  X,
  Shield,
  Users,
  UserCheck,
  Award,
  Calendar,
  Search,
  SlidersHorizontal,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

type ApprovalType = "CLUB" | "STUDENT" | "COACH" | "MEMBER" | "EVENT";

interface Application {
  id: string;
  name: string;
  subtitle: string;
  date: string;
  status: string;
  email: string;
  phone: string;
  location: string;
  avatar: string;
  rawData: any;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";

const TYPE_MAP: Record<ApprovalType, string> = {
  CLUB: "club",
  STUDENT: "student",
  COACH: "coach",
  MEMBER: "member",
  EVENT: "event",
};

function resolveApplication(raw: any, type: ApprovalType): Application {
  let name = "";
  let subtitle = "";
  let email = raw.email || "";
  let phone = raw.mobileNumber || raw.contactNumber || "";
  let location = raw.district?.name || raw.city || raw.location || "—";
  const avatar = raw.profilePhoto || raw.photo || "";

  switch (type) {
    case "CLUB":
      name = raw.name;
      subtitle = `President: ${raw.president}`;
      location = raw.district?.name || "—";
      break;
    case "STUDENT":
      name = raw.fullName;
      subtitle = raw.club?.name || "No Club";
      location = raw.district?.name || raw.city || "—";
      break;
    case "COACH":
      name = raw.fullName;
      subtitle = raw.presentGradeInJudo || "Coach";
      location = raw.district?.name || "—";
      break;
    case "MEMBER":
      name = raw.fullName;
      subtitle = raw.employmentType || "Member";
      location = raw.district?.name || raw.city || "—";
      break;
    case "EVENT":
      name = raw.title;
      subtitle = `${raw.level} Level`;
      email = "—";
      phone = "—";
      location = raw.location || "—";
      break;
  }

  return {
    id: raw.id,
    name,
    subtitle,
    date: raw.createdAt ? new Date(raw.createdAt).toLocaleDateString("en-IN") : "-",
    status: raw.status || "PENDING",
    email,
    phone,
    location,
    avatar,
    rawData: raw,
  };
}

function ApprovalsContent() {
  type StatusType = "PENDING" | "APPROVED" | "REJECTED" | "REPLAY";

  const searchParams = useSearchParams();
  const initialTab = (searchParams?.get("type") as ApprovalType) || "CLUB";

  const [activeTab, setActiveTab] = useState<ApprovalType>(initialTab);
  const [activeStatus, setActiveStatus] = useState<StatusType>("PENDING");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isRequestChangesModalOpen, setIsRequestChangesModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Application | null>(null);
  const [remark, setRemark] = useState("");
  const [applications, setApplications] = useState<Application[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<StatusType, number>>({
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    REPLAY: 0,
  });
  const [categoryCounts, setCategoryCounts] = useState<Record<ApprovalType, number>>({
    CLUB: 0,
    STUDENT: 0,
    COACH: 0,
    MEMBER: 0,
    EVENT: 0,
  });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [newestFirst, setNewestFirst] = useState(true);

  const tabs: { id: ApprovalType; label: string; icon: React.ComponentType<any> }[] = [
    { id: "CLUB", label: "Clubs", icon: Shield },
    { id: "STUDENT", label: "Players", icon: Users },
    { id: "COACH", label: "Coaches", icon: UserCheck },
    { id: "MEMBER", label: "Members", icon: Award },
    { id: "EVENT", label: "Events", icon: Calendar },
  ];

  const statusTabs: { id: StatusType; label: string }[] = [
    { id: "PENDING", label: "Pending Approval" },
    { id: "APPROVED", label: "Approved" },
    { id: "REJECTED", label: "Denied" },
    { id: "REPLAY", label: "Replay" },
  ];

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const statuses: StatusType[] = ["PENDING", "APPROVED", "REJECTED", "REPLAY"];
      const responses = await Promise.all(
        statuses.map(async (status) => {
          const res = await fetch(`${API_BASE}/applications/pending?type=${activeTab}&status=${status}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error(`Failed to load ${status.toLowerCase()} applications`);
          const json = await res.json();
          return [status, Array.isArray(json.data) ? json.data : []] as const;
        })
      );
      const applicationsByStatus = Object.fromEntries(responses) as Record<StatusType, Parameters<typeof resolveApplication>[0][]>;
      setStatusCounts(
        Object.fromEntries(responses.map(([status, items]) => [status, items.length])) as Record<StatusType, number>
      );
      setApplications(applicationsByStatus[activeStatus].map((item) => resolveApplication(item, activeTab)));
    } catch {
      showToast("Failed to load applications. Is the backend running?", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeStatus]);

  const fetchCategoryCounts = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const approvalTypes: ApprovalType[] = ["CLUB", "STUDENT", "COACH", "MEMBER", "EVENT"];
      const counts = await Promise.all(
        approvalTypes.map(async (type) => {
          const res = await fetch(`${API_BASE}/applications/pending?type=${type}&status=PENDING`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error(`Failed to load ${type.toLowerCase()} pending count`);
          const json = await res.json();
          return [type, Array.isArray(json.data) ? json.data.length : 0] as const;
        })
      );
      setCategoryCounts(Object.fromEntries(counts) as Record<ApprovalType, number>);
    } catch {
      showToast("Failed to refresh approval category counts.", "error");
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    void fetchCategoryCounts();
  }, [fetchCategoryCounts]);

  const autoOpened = React.useRef(false);
  useEffect(() => {
    const id = searchParams?.get("id");
    if (id && applications.length > 0 && !autoOpened.current) {
      const item = applications.find((a) => a.id === id);
      if (item) {
        setSelectedItem(item);
        setIsDetailModalOpen(true);
        autoOpened.current = true;
      }
    }
  }, [applications, searchParams]);

  const handleApprove = async (item: Application) => {
    setActionLoading(item.id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/application/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: item.id, type: TYPE_MAP[activeTab], status: "APPROVED" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Approval failed");
      showToast(`${item.name} approved successfully!`, "success");
      void Promise.all([fetchApplications(), fetchCategoryCounts()]);
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (item: Application) => {
    setSelectedItem(item);
    setRemark("");
    setIsRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!remark.trim()) return showToast("Please enter a rejection reason", "error");
    if (!selectedItem) return;
    setActionLoading(selectedItem.id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/application/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: selectedItem.id,
          type: TYPE_MAP[activeTab],
          status: "REJECTED",
          remark,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Rejection failed");
      showToast(`${selectedItem.name} rejected.`, "success");
      setIsRejectModalOpen(false);
      void Promise.all([fetchApplications(), fetchCategoryCounts()]);
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const openRequestChangesModal = (item: Application) => {
    setSelectedItem(item);
    setRemark("");
    setIsRequestChangesModalOpen(true);
  };

  const handleRequestChanges = async () => {
    if (!remark.trim()) return showToast("Please enter the required changes", "error");
    if (!selectedItem) return;
    setActionLoading(selectedItem.id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/admin/request-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: selectedItem.id,
          type: TYPE_MAP[activeTab],
          remark,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to request changes");
      showToast(`${selectedItem.name} asked for changes.`, "success");
      setIsRequestChangesModalOpen(false);
      void Promise.all([fetchApplications(), fetchCategoryCounts()]);
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const statusConfig: Record<string, { label: string; dot: string; text: string }> = {
    PENDING:  { label: "PENDING",  dot: "bg-red-600",   text: "text-red-600" },
    ACTIVE:   { label: "ACTIVE",   dot: "bg-red-600",   text: "text-red-600" },
    APPROVED: { label: "APPROVED", dot: "bg-emerald-500",  text: "text-emerald-600" },
    REJECTED: { label: "REJECTED", dot: "bg-red-500",      text: "text-red-600" },
    REPLAY:   { label: "REPLAY",   dot: "bg-amber-500",  text: "text-amber-600" },
  };

  const districts = useMemo(
    () => Array.from(new Set(applications.map((item) => item.location).filter((location) => location && location !== "—"))).sort(),
    [applications]
  );

  const filteredApplications = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return applications
      .filter((item) => districtFilter === "ALL" || item.location === districtFilter)
      .filter((item) => !query || [item.name, item.email, item.phone, item.location, item.subtitle].some((value) => value?.toLowerCase().includes(query)))
      .sort((a, b) => {
        const first = new Date(a.rawData?.createdAt || 0).getTime();
        const second = new Date(b.rawData?.createdAt || 0).getTime();
        return newestFirst ? second - first : first - second;
      });
  }, [applications, districtFilter, newestFirst, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-200 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm ${
              toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <section className="overflow-hidden rounded-2xl border border-orange-100 bg-[linear-gradient(120deg,#fffaf5_0%,#ffffff_58%,#fff0e4_100%)] px-5 py-6 shadow-sm sm:px-8">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-orange-100 text-[#ff6b00] shadow-sm">
            <ClipboardCheck size={28} />
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-400">Dashboard / Approvals</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#ff6b00] sm:text-3xl">Pending Approvals</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Review and approve registrations. Login credentials are sent automatically after approval.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[250px_minmax(0,1fr)]">
        {/* Categories */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm xl:sticky xl:top-0">
          <p className="px-3 pb-2 pt-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Categories</p>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSearchTerm(""); setDistrictFilter("ALL"); }}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition-all ${
                    isActive ? "bg-orange-50 text-[#ff6b00] shadow-sm ring-1 ring-orange-100" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-[#ff6b00]" : "text-slate-400"} />
                  <span className="min-w-0 flex-1 truncate">{tab.label}</span>
                  <span className={`grid size-7 place-items-center rounded-full text-[11px] font-black ${isActive ? "bg-white text-[#ff6b00]" : categoryCounts[tab.id] > 0 ? "bg-orange-100 text-[#ff6b00]" : "bg-slate-50 text-slate-400"}`}>{categoryCounts[tab.id]}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          {/* Summary */}
          <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            {[
              { label: "Pending Approval", value: statusCounts.PENDING, icon: Users, wrap: "bg-orange-50 border-orange-100", iconStyle: "bg-orange-100 text-orange-600" },
              { label: "Approved view", value: statusCounts.APPROVED, icon: CheckCircle2, wrap: "bg-emerald-50/70 border-emerald-100", iconStyle: "bg-emerald-100 text-emerald-600" },
              { label: "Denied view", value: statusCounts.REJECTED, icon: XCircle, wrap: "bg-red-50/70 border-red-100", iconStyle: "bg-red-100 text-red-500" },
              { label: "Replay requests", value: statusCounts.REPLAY, icon: RefreshCw, wrap: "bg-blue-50/70 border-blue-100", iconStyle: "bg-blue-100 text-blue-600" },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className={`flex items-center gap-4 rounded-2xl border p-4 shadow-sm ${card.wrap}`}>
                  <span className={`grid size-12 shrink-0 place-items-center rounded-full ${card.iconStyle}`}><Icon size={23} /></span>
                  <div><p className="text-3xl font-black leading-none text-[#111b3a]">{card.value}</p><p className="mt-1 text-xs font-semibold text-slate-600">{card.label}</p></div>
                </div>
              );
            })}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Status navigation */}
            <div className="overflow-x-auto border-b border-slate-100 bg-slate-50/70 p-1.5">
              <div className="flex min-w-max gap-1">
                {statusTabs.map((status) => {
                  const isActive = activeStatus === status.id;
                  return (
                    <button
                      key={status.id}
                      onClick={() => setActiveStatus(status.id)}
                      className={`rounded-xl px-5 py-2.5 text-xs font-extrabold transition-all ${isActive ? "bg-[#ff6b00] text-white shadow-md shadow-orange-500/20" : "text-slate-500 hover:bg-white hover:text-slate-800"}`}
                    >
                      {status.label}
                      {isActive && <span className="ml-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] text-[#ff6b00]">{applications.length}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toolbar */}
            <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[minmax(240px,1fr)_190px_170px_auto]">
              <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-inset ring-slate-100 focus-within:ring-orange-200">
                <Search size={18} className="text-slate-400" />
                <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by name, contact, email or ID..." className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400" />
              </label>
              <select value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none focus:border-orange-300">
                <option value="ALL">All Districts</option>
                {districts.map((district) => <option key={district} value={district}>{district}</option>)}
              </select>
              <button onClick={() => setNewestFirst((value) => !value)} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
                <SlidersHorizontal size={15} /> {newestFirst ? "Newest First" : "Oldest First"}
              </button>
              <button onClick={() => void Promise.all([fetchApplications(), fetchCategoryCounts()])} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:border-orange-200 hover:text-[#ff6b00]">
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>

            {/* Results */}
            {loading ? (
              <div className="flex min-h-72 flex-col items-center justify-center gap-3"><Loader2 size={34} className="animate-spin text-[#ff6b00]" /><p className="text-sm font-semibold text-slate-400">Loading approvals...</p></div>
            ) : filteredApplications.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 text-center"><span className="grid size-16 place-items-center rounded-full bg-slate-50 text-slate-300"><ClipboardCheck size={29} /></span><div><h3 className="font-extrabold text-slate-600">No applications found</h3><p className="mt-1 text-sm text-slate-400">Try another category, status, district or search term.</p></div></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-left text-xs">
                  <thead className="bg-[#f8fafc] text-slate-500">
                    <tr><th className="w-12 px-5 py-3.5 font-bold">#</th><th className="px-3 py-3.5 font-bold">Applicant</th><th className="px-3 py-3.5 font-bold">Role</th><th className="px-3 py-3.5 font-bold">Contact</th><th className="px-3 py-3.5 font-bold">District</th><th className="px-3 py-3.5 font-bold">Submitted On</th><th className="px-3 py-3.5 font-bold">Status</th><th className="px-3 py-3.5 font-bold">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <AnimatePresence mode="popLayout">
                      {filteredApplications.map((item, index) => {
                        const status = statusConfig[item.status] || statusConfig.PENDING;
                        return (
                          <motion.tr key={item.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="group hover:bg-orange-50/20">
                            <td className="px-5 py-4 font-bold text-slate-500">{index + 1}</td>
                            <td className="px-3 py-4"><div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 font-black text-slate-500">{item.name.slice(0,2).toUpperCase()}</span><div className="min-w-0"><p className="max-w-[180px] truncate text-sm font-extrabold text-slate-800">{item.name}</p><p className="max-w-[190px] truncate text-[10px] text-slate-400">{item.email || item.subtitle}</p></div></div></td>
                            <td className="px-3 py-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 font-bold text-blue-600">{tabs.find((tab) => tab.id === activeTab)?.label.slice(0,-1) || activeTab}</span></td>
                            <td className="px-3 py-4"><p className="font-semibold text-slate-600">{item.phone || "—"}</p></td>
                            <td className="px-3 py-4 font-semibold text-slate-600">{item.location}</td>
                            <td className="px-3 py-4"><p className="font-semibold text-slate-600">{item.date}</p><p className="mt-0.5 text-[10px] text-slate-400">{item.subtitle}</p></td>
                            <td className="px-3 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 font-black ${status.text}`}><span className={`size-2 rounded-full ${status.dot}`} />{status.label}</span></td>
                            <td className="px-3 py-4">
                              <div className="flex items-center gap-2">
                                {item.status === "PENDING" && (
                                  <>
                                    <button onClick={() => void handleApprove(item)} disabled={actionLoading === item.id} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-extrabold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50">{actionLoading === item.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}Approve</button>
                                    <button onClick={() => openRejectModal(item)} disabled={actionLoading === item.id} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-extrabold text-red-600 transition hover:bg-red-100 disabled:opacity-50"><XCircle size={13} />Deny</button>
                                    <button onClick={() => openRequestChangesModal(item)} disabled={actionLoading === item.id} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-extrabold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"><RefreshCw size={13} />Replay</button>
                                  </>
                                )}
                                <button onClick={() => { setSelectedItem(item); setIsDetailModalOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 font-extrabold text-slate-600 transition hover:bg-slate-50"><Eye size={13} />View</button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p>Showing {filteredApplications.length ? 1 : 0} to {filteredApplications.length} of {filteredApplications.length} entries</p>
              <div className="flex items-center gap-2"><button disabled className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-300"><ChevronLeft size={15} /></button><span className="grid size-9 place-items-center rounded-lg bg-[#ff6b00] font-black text-white">1</span><button disabled className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-300"><ChevronRight size={15} /></button></div>
            </div>
          </section>
        </main>
      </div>
      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl bg-white rounded-3xl p-8 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-800">Application Details</h3>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(selectedItem.rawData)
                    .filter(([k]) => !["password", "id", "districtId", "talukId", "zoneId", "clubId", "coachId", "userId", "eventId"].includes(k))
                    .map(([key, val]: any) => {
                      const isUploadUrl =
                        typeof val === "string" &&
                        (val.startsWith("http://") || val.startsWith("https://") || val.includes("/uploads/"));
                      return (
                        <tr key={key} className="border-b border-slate-100 last:border-0">
                          <td className="py-3.5 pr-4 font-semibold text-slate-500 capitalize w-44 text-xs">
                            {key.replace(/([A-Z])/g, " $1")}
                          </td>
                          <td className="py-3.5 text-slate-800 break-words text-sm">
                            {isUploadUrl ? (
                              <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 w-fit">
                                {val.toLowerCase().endsWith(".pdf") ? (
                                  <div className="p-2 bg-red-50 text-red-500 rounded-lg">
                                    <FileText size={18} />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200">
                                    <img src={val} alt="doc" className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <a href={val} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-600 hover:text-[#FF7400] rounded-md font-semibold text-xs">
                                    <Eye size={11} /> View
                                  </a>
                                  <a href={val} download target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FF7400] text-white rounded-md font-bold text-xs">
                                    <Download size={11} /> Download
                                  </a>
                                </div>
                              </div>
                            ) : typeof val === "object" && val !== null ? (
                              (val as any).name || JSON.stringify(val)
                            ) : (
                              String(val ?? "—")
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {isRejectModalOpen && selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                  <MessageSquare size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Rejection Reason</h3>
                  <p className="text-slate-500 text-sm">
                    Rejecting <strong>{selectedItem.name}</strong>
                  </p>
                </div>
              </div>

              {activeTab !== "EVENT" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 mb-5 text-xs text-amber-700">
                  <Mail size={14} className="mt-0.5 shrink-0" />
                  A rejection notification will be sent to <strong>{selectedItem.email}</strong>
                </div>
              )}

              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Enter rejection reason…"
                className="w-full h-28 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all resize-none mb-6 text-sm"
              />

              <div className="flex gap-4">
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!!actionLoading}
                  className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <X size={18} />}
                  Deny & Notify
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Request Changes Modal */}
      <AnimatePresence>
        {isRequestChangesModalOpen && selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                  <RefreshCw size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Replay</h3>
                  <p className="text-slate-500 text-sm">
                    Ask <strong>{selectedItem.name}</strong> to modify their application
                  </p>
                </div>
              </div>

              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Detail what needs to be changed..."
                className="w-full h-28 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all resize-none mb-6 text-sm"
              />

              <div className="flex gap-4">
                <button
                  onClick={() => setIsRequestChangesModalOpen(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestChanges}
                  disabled={!!actionLoading}
                  className="flex-1 py-4 bg-amber-500 text-white font-bold rounded-2xl shadow-lg hover:bg-amber-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                  Send Replay
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-500 font-bold">Loading...</div>}>
      <ApprovalsContent />
    </Suspense>
  );
}
