"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Trophy,
  MapPin,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Users,
  Plus,
  Calendar,
  ChevronRight,
  Send,
  MessageSquare,
  Edit2,
  Download,
  Eye,
  RotateCcw,
  FileText,
} from "lucide-react";
import FileUpload from "@/components/common/FileUpload";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";
const AVAILABLE_CATEGORIES = ["Mini Sub Junior", "Sub Junior", "Cadet", "Junior", "Senior"];

/** Format an ISO / yyyy-mm-dd date string as DD/MM/YYYY for display. */
function formatDDMMYYYY(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d || y.length !== 4) return "";
  return `${d}/${m}/${y}`;
}

/**
 * The real <input type="date"> behind our formatted overlay is invisible, so a user
 * typing digits directly into it gets no feedback on segment boundaries (day/month/year)
 * and can end up with garbage like a 6-digit year. Force every interaction through the
 * native calendar popup instead, and block manual digit entry.
 */
function openDatePicker(e: React.FocusEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>) {
  const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
  try {
    el.showPicker?.();
  } catch {
    // showPicker can throw if the browser blocks it outside a user gesture; safe to ignore.
  }
}
function blockDateTyping(e: React.KeyboardEvent<HTMLInputElement>) {
  if (/^[0-9]$/.test(e.key)) e.preventDefault();
}

function MarsIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="10" cy="14" r="6" />
      <path d="M15 9l6-6M15 3h6v6" />
    </svg>
  );
}

function VenusIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="9" r="6" />
      <path d="M12 15v7M9 19h6" />
    </svg>
  );
}

function GenderIcon({ gender, size = 18, className = "" }: { gender: string; size?: number; className?: string }) {
  if (gender === "MALE") return <MarsIcon size={size} className={className} />;
  if (gender === "FEMALE") return <VenusIcon size={size} className={className} />;
  return <Users size={size} className={className} />;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "NOT_REQUIRED";

/** Coerce null / undefined from the API to "PENDING" so comparisons are safe */
function safeStatus(val: ApprovalStatus | null | undefined): ApprovalStatus {
  return val ?? "PENDING";
}

/** Normalise the role string regardless of casing / separator from the backend */
function normaliseRole(raw: string): string {
  return raw.toUpperCase().replace(/[- ]/g, "_");
}

interface Tournament {
  id: string;
  title: string;
  date: string;
  dateTo?: string;
  location: string;
  level: string;
  entryFee: number;
  totalSlots: number;
  registrationCount?: number;
  ageFrom: number;
  ageTo: number;
  category?: string;
  gender: string;
  beltEligibility?: string;
  allowBPL: boolean;
  status: string;
  districtApproval: ApprovalStatus;
  stateApproval: ApprovalStatus;
  superAdminApproval: ApprovalStatus;
  ceoApproval: ApprovalStatus;
  rejectionRemark?: string;
  hasPendingPlayers?: boolean;
  club?: { name: string; district?: { name: string } };
  bannerImage?: string;
}

// ─── Role configuration ───────────────────────────────────────────────────────
/**
 * Maps each admin role to the approval field they manage.
 * null = this role creates but doesn't sit in an approval queue.
 */
const APPROVAL_LEVEL_MAP: Record<string, string | null> = {
  DISTRICT_PRESIDENT: "district",
  DISTRICT_SECRETARY: "district",
  ZONE_PRESIDENT: null,   // creator only, no approval seat
  ZONE_SECRETARY: null,
  STATE_PRESIDENT: "state",
  STATE_SECRETARY: "state",
  SUPER_ADMIN: "superAdmin",
  CEO: "ceo",
};

/** Roles that are allowed to create tournaments. */
const CAN_CREATE_ROLES = [
  "DISTRICT_PRESIDENT",
  "DISTRICT_SECRETARY",
  "ZONE_PRESIDENT",
  "ZONE_SECRETARY",
  "STATE_PRESIDENT",
  "STATE_SECRETARY",
  "SUPER_ADMIN",
  "CEO",
];

const ROLE_LABEL: Record<string, string> = {
  DISTRICT_PRESIDENT: "District President",
  DISTRICT_SECRETARY: "District Secretary",
  ZONE_PRESIDENT: "Zone President",
  ZONE_SECRETARY: "Zone Secretary",
  STATE_PRESIDENT: "State President",
  STATE_SECRETARY: "State Secretary",
  SUPER_ADMIN: "Super Admin",
  CEO: "CEO",
};

/**
 * Returns true if the tournament belongs in this role's approval queue.
 *
 * Approval chain:
 *   Club created     → District → State → (SuperAdmin OR CEO)
 *   District created →            State → (SuperAdmin OR CEO)  (district auto-skipped)
 *   Zone created     →            State → (SuperAdmin OR CEO)  (district auto-skipped)
 *   State created    →                    (SuperAdmin OR CEO)  (district+state auto-skipped)
 *
 * SuperAdmin and CEO are PARALLEL final approvers.
 * Only ONE of them needs to approve — whichever acts first closes the tournament.
 */
function inApprovalQueue(t: Tournament, role: string): boolean {
  // Coerce null/undefined fields from the API into proper status strings
  const district = safeStatus(t.districtApproval);
  const state = safeStatus(t.stateApproval);
  const superAdmin = safeStatus(t.superAdminApproval);
  const ceo = safeStatus(t.ceoApproval);

  switch (normaliseRole(role)) {
    case "DISTRICT_PRESIDENT":
    case "DISTRICT_SECRETARY":
      return district === "PENDING";

    case "STATE_PRESIDENT":
    case "STATE_SECRETARY":
      // District step must already be resolved (APPROVED or NOT_REQUIRED / auto-skipped)
      return (
        (district === "APPROVED" || district === "NOT_REQUIRED") &&
        state === "PENDING"
      );

    case "SUPER_ADMIN":
      // Super Admin sees their own queue + CEO's queue combined
      return superAdmin === "PENDING" || ceo === "PENDING";

    case "CEO":
      // CEO sees their own queue + Super Admin's queue combined
      return ceo === "PENDING" || superAdmin === "PENDING";

    default:
      console.warn("[Tournaments] unrecognised role in inApprovalQueue:", role);
      return false;
  }
}

// ─── Empty form ───────────────────────────────────────────────────────────────
const emptyForm = {
  title: "", dateFrom: "", dateTo: "", location: "", description: "",
  entryFee: "", totalSlots: "", numberOfMats: "1", ageFrom: "0", ageTo: "100", category: [] as string[],
  gender: "BOTH", allowBPL: false, beltEligibility: "", level: "DISTRICT", zoneId: "", districtId: "", clubId: "",
  bannerImage: "",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminTournamentsPage() {
  const searchParams = useSearchParams();
  const [userRole, setUserRole] = useState<string>("");

  // "approval" = show pending approvals for this role
  // "mine"     = show tournaments created by this role
  // "approved" = show fully approved tournaments
  const [activeTab, setActiveTab] = useState<"approval" | "mine" | "approved">("approval");

  const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [approvedByMeList, setApprovedByMeList] = useState<Tournament[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [districts, setDistricts] = useState<Array<{ id: string; name: string; zoneName?: string }>>([]);
  const [clubs, setClubs] = useState<Array<{ id: string; clubName?: string; name?: string; districtId?: string; district?: any }>>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({});
  const [tMessages, setTMessages] = useState<Record<string, { id: string; senderRole: string; senderName: string; message: string; createdAt: string }[]>>({});

  const fetchTournamentMessages = useCallback(async (tournamentId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTMessages((prev) => ({ ...prev, [tournamentId]: data }));
      }
    } catch (err) {
      console.error("Failed to fetch tournament messages", err);
    }
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [districtFilter, setDistrictFilter] = useState("ALL");

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [submitLoading, setSubmitLoading] = useState(false);

  // Edit modal
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [editFormData, setEditFormData] = useState({ ...emptyForm });
  const [editLoading, setEditLoading] = useState(false);

  // Reject modal
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectRemark, setRejectRemark] = useState("");

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Initialise role & active tab ─────────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem("userRole") || "";
    const role = normaliseRole(raw);
    console.log("[Tournaments] resolved role:", role, "(raw from localStorage:", raw, ")");
    setUserRole(role);

    const tabParam = searchParams.get("tab");
    if (tabParam === "approval" || tabParam === "mine" || tabParam === "approved") {
      setActiveTab(tabParam);
    } else {
      const isCreatorOnly = role === "ZONE_PRESIDENT" || role === "ZONE_SECRETARY";
      setActiveTab(isCreatorOnly ? "mine" : "approval");
    }

    // Fetch districts, zones, and clubs for tournament creation
    fetch(`${API_BASE}/districts`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setDistricts(data);
          const uniqueZones = Array.from(new Set(data.map((d: any) => d.zoneName).filter(Boolean))) as string[];
          if (uniqueZones.length > 0) setZones(uniqueZones);
        }
      })
      .catch(err => console.error("Failed to fetch districts", err));

    const token = localStorage.getItem("token");
    fetch(`${API_BASE}/clubs`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) setClubs(data);
      })
      .catch(err => console.error("Failed to fetch clubs", err));
  }, [searchParams]);

  // ── Per-tab fetch — fires whenever activeTab or userRole changes ─────────────
  const fetchTabData = useCallback(async (tab: "approval" | "mine" | "approved", role: string) => {
    if (!role) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const _approvalLevel = APPROVAL_LEVEL_MAP[role] ?? null;
      const _canCreate = CAN_CREATE_ROLES.includes(role);
      const _hasApprovalRole = _approvalLevel !== null;

      const [adminRes, myRes, approvedRes] = await Promise.all([
        _hasApprovalRole ? fetch(`${API_BASE}/tournaments/admin`, { headers }) : Promise.resolve(null),
        _canCreate ? fetch(`${API_BASE}/tournaments/official/my`, { headers }) : Promise.resolve(null),
        fetch(`${API_BASE}/tournaments/admin/approved`, { headers })
      ]);

      if (adminRes?.ok) {
        const data = await adminRes.json();
        setAllTournaments(data);
        if (tab === "approval") data.forEach((t: any) => fetchTournamentMessages(t.id));
      }
      if (myRes?.ok) {
        const data = await myRes.json();
        setMyTournaments(data);
        if (tab === "mine") data.forEach((t: any) => fetchTournamentMessages(t.id));
      }
      if (approvedRes?.ok) {
        const data = await approvedRes.json();
        setApprovedByMeList(data);
        if (tab === "approved") data.forEach((t: any) => fetchTournamentMessages(t.id));
      }
    } catch (err) {
      console.error("[Tournaments] fetchTabData error:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchTournamentMessages]);

  useEffect(() => {
    if (!userRole || !activeTab) return;
    fetchTabData(activeTab, userRole);
  }, [activeTab, userRole, fetchTabData]);

  // ── Derived values ───────────────────────────────────────────────────────────
  const approvalLevel = APPROVAL_LEVEL_MAP[userRole] ?? null;
  const canCreate = CAN_CREATE_ROLES.includes(userRole);
  const hasApprovalRole = approvalLevel !== null;

  const approvalQueue = allTournaments.filter(t => inApprovalQueue(t, userRole));

  const displayedApproval = approvalQueue.filter(
    t => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedMine = myTournaments
    .filter(t => filter === "ALL" || t.status === filter)
    .filter(t => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const displayedApproved = approvedByMeList.filter(
    t => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);

  const handleDownloadReport = async (tId: string, title: string) => {
    setDownloadingReportId(tId);
    try {
      const token = localStorage.getItem("tnja_token") || localStorage.getItem("token") || "";
      const res = await fetch(`${API_BASE}/tournaments/${tId}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to download report", "error");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeTitle = title?.replace(/[^a-zA-Z0-9_-]/g, "_") || tId;
      a.download = `Tournament_Report_${safeTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast("Tournament report downloaded!", "success");
    } catch (err) {
      console.error("Error downloading report:", err);
      showToast("Error downloading report", "error");
    } finally {
      setDownloadingReportId(null);
    }
  };

  // ── Approve / Reject action ──────────────────────────────────────────────────
  const handleAction = async (id: string, status: "APPROVED" | "REJECTED", remark?: string) => {
    const message = replyTexts[id]?.trim() || remark || "";
    if (status === "REJECTED" && !message) {
      setRejectModal({ id });
      return;
    }
    setActionLoading(id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, remark: message, message, approvalLevel }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update");
      showToast(`Tournament ${status.toLowerCase()} successfully`, "success");
      setReplyTexts(prev => { const n = { ...prev }; delete n[id]; return n; });
      setRejectModal(null);
      setRejectRemark("");
      fetchTabData("approval", userRole);
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendTournamentReply = async (id: string) => {
    const message = replyTexts[id]?.trim();
    if (!message) return;
    setReplyLoading(prev => ({ ...prev, [id]: true }));
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("Failed to send reply");
      setReplyTexts(prev => { const n = { ...prev }; delete n[id]; return n; });
      await fetchTournamentMessages(id);
      showToast("Reply sent to creator.", "success");
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setReplyLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // ── Open edit modal pre-filled ────────────────────────────────────────────
  const openEditModal = (t: Tournament) => {
    setEditingTournament(t);
    const dateFrom = t.date ? new Date(t.date).toISOString().split("T")[0] : "";
    const dateTo = t.dateTo ? new Date(t.dateTo).toISOString().split("T")[0] : "";
    const categoryArr = t.category ? t.category.split(", ").map(s => s.trim()).filter(Boolean) : [];
    setEditFormData({
      title: t.title || "",
      dateFrom,
      dateTo,
      location: t.location || "",
      description: "",
      entryFee: String(t.entryFee ?? ""),
      totalSlots: String((t as any).totalSlots ?? ""),
      numberOfMats: String((t as any).numberOfMats ?? "1"),
      ageFrom: String(t.ageFrom ?? "0"),
      ageTo: String(t.ageTo ?? "100"),
      category: categoryArr,
      gender: t.gender || "BOTH",
      allowBPL: t.allowBPL ?? false,
      beltEligibility: t.beltEligibility || "",
      level: t.level || "DISTRICT",
      zoneId: (t as any).zoneId || "",
      districtId: (t as any).districtId || (t as any).district?.id || "",
      clubId: (t as any).clubId || (t as any).club?.id || "",
      bannerImage: t.bannerImage || "",
    });
  };

  // ── Edit tournament ──────────────────────────────────────────────────────────
  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTournament) return;

    if (editFormData.level === "ZONE" && !editFormData.zoneId) {
      showToast("Please select a zone for zonal tournament.", "error");
      return;
    }
    if (editFormData.level === "DISTRICT" && !editFormData.districtId) {
      showToast("Please select a district for district tournament.", "error");
      return;
    }
    if (editFormData.level === "CLUB" && !editFormData.clubId) {
      showToast("Please select a club for club tournament.", "error");
      return;
    }

    setEditLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/${editingTournament.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...editFormData,
          category: editFormData.category.join(", "),
          entryFee: Number(editFormData.entryFee),
          totalSlots: Number(editFormData.totalSlots),
          numberOfMats: Number(editFormData.numberOfMats),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update");
      showToast("Tournament updated successfully!", "success");
      setEditingTournament(null);
      fetchTabData("mine", userRole);
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setEditLoading(false);
    }
  };

  // ── Create tournament ────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.level === "ZONE" && !formData.zoneId) {
      showToast("Please select a zone for zonal tournament.", "error");
      return;
    }
    if (formData.level === "DISTRICT" && !formData.districtId) {
      showToast("Please select a district for district tournament.", "error");
      return;
    }
    if (formData.level === "CLUB" && !formData.clubId) {
      showToast("Please select a club for club tournament.", "error");
      return;
    }

    setSubmitLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/official/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          category: formData.category.join(", "),
          entryFee: Number(formData.entryFee),
          totalSlots: Number(formData.totalSlots),
          numberOfMats: Number(formData.numberOfMats),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create");
      showToast("Tournament created! Awaiting approvals.", "success");
      setIsCreateOpen(false);
      setFormData({ ...emptyForm });
      fetchTabData("mine", userRole);
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Approval chain preview inside Create modal ────────────────────────────────
  // ── Stat cards ───────────────────────────────────────────────────────────────
  const totalMine = myTournaments.length;
  const approvedMine = myTournaments.filter(t => t.status === "APPROVED").length;
  const pendingQueue = approvalQueue.length;
  const draftMine = myTournaments.filter(t => t.status === "DRAFT" || t.status === "PENDING").length;

  const currentTabTournaments = activeTab === "approval"
    ? displayedApproval
    : activeTab === "mine"
      ? displayedMine
      : displayedApproved;

  const tournamentDistricts = Array.from(new Set(
    [...allTournaments, ...myTournaments, ...approvedByMeList]
      .map(t => t.club?.district?.name || t.location)
      .filter(Boolean)
  )).sort();

  const tableTournaments = currentTabTournaments.filter(t => {
    if (levelFilter !== "ALL" && t.level !== levelFilter) return false;
    if (districtFilter !== "ALL" && (t.club?.district?.name || t.location) !== districtFilter) return false;
    return true;
  });

  const isExpired = (t: { date?: string; dateTo?: string }): boolean => {
    const endDate = t.dateTo || t.date;
    if (!endDate) return false;
    const d = new Date(endDate);
    d.setHours(23, 59, 59, 999);
    return d < new Date();
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 relative">

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-200 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
              }`}
          >
            {toast.type === "success" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page header ── */}
      {/* Page header */}
      <section className="overflow-hidden rounded-2xl border border-orange-100 bg-[linear-gradient(120deg,#fffaf5_0%,#ffffff_58%,#ffe9df_100%)] px-5 py-5 shadow-sm sm:px-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-orange-100 text-[#ff6b00] shadow-sm"><Trophy size={28} /></span><div><p className="text-xs font-semibold text-slate-400">Dashboard / Tournaments</p><h1 className="mt-1 text-3xl font-black tracking-tight text-[#ff6b00]">Tournaments</h1><p className="mt-1 text-sm text-slate-500">Manage, monitor and approve judo tournaments across your jurisdiction.</p></div></div>
          {canCreate && <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#ff4d00,#ff7900)] px-7 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5"><Plus size={18} />Create Tournament</button>}
        </div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Pending My Approval", value: pendingQueue, icon: AlertCircle, wrap: "border-orange-200 bg-orange-50/70", iconStyle: "bg-orange-100 text-orange-600" },
          { label: "My Tournaments", value: totalMine, icon: CheckCircle2, wrap: "border-emerald-200 bg-emerald-50/70", iconStyle: "bg-emerald-100 text-emerald-600" },
          { label: "Fully Approved", value: approvedByMeList.length || approvedMine, icon: Trophy, wrap: "border-amber-200 bg-amber-50/70", iconStyle: "bg-amber-100 text-amber-600" },
          { label: "Draft / Pending", value: draftMine, icon: FileText, wrap: "border-blue-200 bg-blue-50/70", iconStyle: "bg-blue-100 text-blue-600" },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05 }} className={`flex items-center gap-4 rounded-2xl border p-5 shadow-sm ${stat.wrap}`}><span className={`grid size-14 shrink-0 place-items-center rounded-full ${stat.iconStyle}`}><Icon size={25} /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-500">{stat.label}</p><p className="mt-1 text-3xl font-black leading-none text-[#111b3a]">{stat.value}</p></div><ChevronRight size={20} className="text-slate-400" /></motion.div>;
        })}
      </section>

      {/* Tabs */}
      <section className="overflow-x-auto border-b border-slate-200">
        <div className="flex min-w-max gap-1">
          {[
            ...(hasApprovalRole ? [{ key: "approval" as const, label: "Approval Queue", count: pendingQueue }] : []),
            ...(canCreate ? [{ key: "mine" as const, label: "My Tournaments", count: totalMine }] : []),
            { key: "approved" as const, label: "Approved Tournaments", count: approvedByMeList.length },
          ].map((tab) => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`border-b-2 px-5 py-3 text-sm font-extrabold transition ${activeTab === tab.key ? "border-[#ff6b00] text-[#ff6b00]" : "border-transparent text-slate-400 hover:text-slate-700"}`}>{tab.label}<span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${activeTab === tab.key ? "bg-orange-50" : "bg-slate-100"}`}>{tab.count}</span></button>)}
        </div>
      </section>

      {/* Filters */}
      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(260px,1fr)_160px_190px_170px_auto]">
        <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-inset ring-slate-100 focus-within:ring-orange-200"><Search size={17} className="text-slate-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by name, location or type..." className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400" /></label>
        <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none focus:border-orange-300"><option value="ALL">All Types</option><option value="DISTRICT">District</option><option value="ZONE">Zone</option><option value="STATE">State</option><option value="NATIONAL">National</option></select>
        <select value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none focus:border-orange-300"><option value="ALL">All Districts</option>{tournamentDistricts.map((district) => <option key={district} value={district}>{district}</option>)}</select>
        <select value={filter} onChange={(event) => setFilter(event.target.value)} disabled={activeTab !== "mine"} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none disabled:bg-slate-50 disabled:text-slate-300"><option value="ALL">All Status</option><option value="APPROVED">Approved</option><option value="PENDING">Pending</option><option value="REJECTED">Rejected</option><option value="DRAFT">Draft</option><option value="CLOSED">Closed</option></select>
        <button onClick={() => { setSearchQuery(""); setFilter("ALL"); setLevelFilter("ALL"); setDistrictFilter("ALL"); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 px-4 py-2.5 text-xs font-extrabold text-[#ff6b00] transition hover:bg-orange-50"><RotateCcw size={15} />Reset</button>
      </section>

      {/* Tournament table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-80 items-center justify-center"><Loader2 size={36} className="animate-spin text-[#ff6b00]" /></div>
        ) : tableTournaments.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-center"><span className="grid size-16 place-items-center rounded-full bg-slate-50 text-slate-300"><Trophy size={29} /></span><div><h3 className="font-extrabold text-slate-600">No tournaments found</h3><p className="mt-1 text-sm text-slate-400">Try changing the filters or choose another tournament view.</p></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-xs">
              <thead className="border-b border-slate-100 bg-[#f8fafc] text-slate-500"><tr><th className="w-14 px-5 py-4 font-bold">#</th><th className="px-3 py-4 font-bold">Tournament Details</th><th className="px-3 py-4 font-bold">Type</th><th className="px-3 py-4 font-bold">Location</th><th className="px-3 py-4 font-bold">Event Dates</th><th className="px-3 py-4 font-bold">Registrations</th><th className="px-3 py-4 font-bold">Status</th><th className="px-3 py-4 font-bold">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {tableTournaments.map((tournament, index) => {
                  const registrations = tournament.registrationCount || 0;
                  const capacity = tournament.totalSlots || 0;
                  const progress = capacity ? Math.min(100, (registrations / capacity) * 100) : 0;
                  const expired = isExpired(tournament);
                  const displayStatus = expired ? "EXPIRED" : tournament.status || "PENDING";
                  const statusClass = displayStatus === "APPROVED" ? "bg-emerald-50 text-emerald-700" : displayStatus === "PENDING" ? "bg-amber-50 text-amber-700" : displayStatus === "REJECTED" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600";
                  const dotClass = displayStatus === "APPROVED" ? "bg-emerald-500" : displayStatus === "PENDING" ? "bg-amber-500" : displayStatus === "REJECTED" ? "bg-red-500" : "bg-slate-400";
                  return (
                    <React.Fragment key={tournament.id}>
                      <motion.tr initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="hover:bg-orange-50/20">
                        <td className="px-5 py-4 font-black text-slate-500">{index + 1}</td>
                        <td className="px-3 py-4"><div className="flex items-center gap-3"><span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[linear-gradient(135deg,#3b176d,#a23be5)] text-white shadow-sm">{tournament.bannerImage ? <img src={tournament.bannerImage} alt="" className="size-full object-cover" /> : <Trophy size={22} />}</span><div className="min-w-0"><p className="max-w-[250px] truncate text-sm font-extrabold text-slate-800">{tournament.title}</p><p className="mt-1 max-w-[250px] truncate text-[10px] text-slate-400">{tournament.club?.name || `${ROLE_LABEL[userRole] || "TNJA"} Tournament`}</p></div></div></td>
                        <td className="px-3 py-4"><span className="rounded-lg bg-blue-50 px-2.5 py-1 font-extrabold text-blue-600">{tournament.level}</span></td>
                        <td className="px-3 py-4"><span className="inline-flex items-center gap-1.5 font-semibold text-slate-600"><MapPin size={14} className="text-slate-400" />{tournament.club?.district?.name || tournament.location}</span></td>
                        <td className="px-3 py-4"><p className="inline-flex items-center gap-2 font-semibold text-slate-600"><Calendar size={14} className="text-slate-400" />{new Date(tournament.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>{tournament.dateTo && <p className="mt-1 pl-5 text-[10px] text-slate-400">to {new Date(tournament.dateTo).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>}</td>
                        <td className="px-3 py-4"><p className="font-bold text-slate-700">{registrations} <span className="text-slate-400">/ {capacity || "—"}</span></p><div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} /></div></td>
                        <td className="px-3 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-extrabold ${statusClass}`}><span className={`size-2 rounded-full ${dotClass}`} />{displayStatus}</span></td>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-2">
                            <Link href={`/dashboard/admin/tournaments/${tournament.id}`} title="View tournament" className="grid size-9 place-items-center rounded-lg bg-slate-50 text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"><Eye size={16} /></Link>
                            {activeTab === "mine" && <button onClick={() => openEditModal(tournament)} title="Edit tournament" className="grid size-9 place-items-center rounded-lg bg-slate-50 text-slate-600 transition hover:bg-orange-50 hover:text-[#ff6b00]"><Edit2 size={15} /></button>}
                            {activeTab === "approved" && <button onClick={() => handleDownloadReport(tournament.id, tournament.title)} disabled={downloadingReportId === tournament.id} title="Download report" className="grid size-9 place-items-center rounded-lg bg-slate-50 text-slate-600 transition hover:bg-orange-50 hover:text-[#ff6b00] disabled:opacity-50">{downloadingReportId === tournament.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}</button>}
                            {activeTab === "approval" && <><button onClick={() => handleAction(tournament.id, "APPROVED")} disabled={actionLoading === tournament.id} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 font-extrabold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50">{actionLoading === tournament.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}Approve</button><button onClick={() => setRejectModal({ id: tournament.id })} disabled={!!actionLoading} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 font-extrabold text-red-600 transition hover:bg-red-100 disabled:opacity-50"><XCircle size={13} />Reject</button></>}
                          </div>
                        </td>
                      </motion.tr>
                      {activeTab === "approval" && (
                        <tr className="bg-slate-50/60"><td colSpan={8} className="px-5 py-3"><div className="flex flex-col gap-3 md:flex-row md:items-center"><div className="flex min-w-0 flex-1 items-center gap-2"><MessageSquare size={15} className="shrink-0 text-[#ff6b00]" /><input value={replyTexts[tournament.id] || ""} onChange={(event) => setReplyTexts(previous => ({ ...previous, [tournament.id]: event.target.value }))} onKeyDown={(event) => event.key === "Enter" && handleSendTournamentReply(tournament.id)} placeholder="Send a note or request changes..." className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-orange-300" /><button onClick={() => handleSendTournamentReply(tournament.id)} disabled={!replyTexts[tournament.id]?.trim() || replyLoading[tournament.id]} className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#ff6b00] text-white disabled:opacity-40">{replyLoading[tournament.id] ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}</button></div><p className="text-[10px] font-semibold text-slate-400">{tMessages[tournament.id]?.length || 0} communication message(s)</p></div></td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between"><p>Showing {tableTournaments.length ? 1 : 0} to {tableTournaments.length} of {tableTournaments.length} tournaments</p><span className="grid size-9 place-items-center rounded-lg bg-[#ff6b00] font-black text-white">1</span></div>
      </section>
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl lg:max-w-4xl bg-white rounded-[1.75rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">Create Tournament</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    As {ROLE_LABEL[userRole]} — approvals will be routed automatically.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-2 bg-slate-100 text-slate-400 hover:text-red-500 rounded-full transition-all"
                >
                  <XCircle size={26} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tournament Title *</label>
                    <input
                      required type="text" value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. District Championship 2026"
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div className="md:col-span-2 mt-2">
                    <FileUpload 
                      label="Banner Image (Optional)" 
                      value={formData.bannerImage} 
                      onChange={(url) => setFormData({ ...formData, bannerImage: url })} 
                      accept="image/*" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Level</label>
                    <select
                      value={formData.level}
                      onChange={e => setFormData({ ...formData, level: e.target.value, zoneId: "", districtId: "", clubId: "" })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 font-semibold text-slate-900"
                    >
                      <option value="CLUB">Club</option>
                      <option value="DISTRICT">District</option>
                      <option value="ZONE">Zonal</option>
                      <option value="STATE">State</option>
                      <option value="NATIONAL">National</option>
                    </select>
                  </div>

                  {formData.level === "ZONE" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Zone</label>
                      <select
                        required
                        value={formData.zoneId || ""}
                        onChange={e => setFormData({ ...formData, zoneId: e.target.value })}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 font-semibold text-slate-900"
                      >
                        <option value="" disabled>Select a Zone</option>
                        {zones.map((zone) => (
                          <option key={zone} value={zone}>{zone}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.level === "DISTRICT" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">District</label>
                      <select
                        required
                        value={formData.districtId || ""}
                        onChange={e => setFormData({ ...formData, districtId: e.target.value })}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 font-semibold text-slate-900"
                      >
                        <option value="" disabled>Select a District</option>
                        {districts.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.level === "CLUB" && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">District</label>
                        <select
                          value={formData.districtId || ""}
                          onChange={e => setFormData({ ...formData, districtId: e.target.value, clubId: "" })}
                          className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 font-semibold text-slate-900"
                        >
                          <option value="">Select a District</option>
                          {districts.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Club</label>
                        <select
                          required
                          value={formData.clubId || ""}
                          onChange={e => setFormData({ ...formData, clubId: e.target.value })}
                          className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 font-semibold text-slate-900"
                        >
                          <option value="" disabled>Select a Club</option>
                          {clubs
                            .filter(c => !formData.districtId || c.districtId === formData.districtId || (c as any).district?.id === formData.districtId)
                            .map((c) => (
                              <option key={c.id} value={c.id}>{c.clubName || (c as any).name}</option>
                            ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div className={formData.level !== "ZONE" ? "md:col-span-1" : ""}>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Gender</label>
                    <div className="relative">
                      <GenderIcon gender={formData.gender} size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <select
                        value={formData.gender}
                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 font-semibold"
                      >
                        <option value="BOTH">Both</option>
                        <option value="MALE">Male Only</option>
                        <option value="FEMALE">Female Only</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Start Date *</label>
                    <div className="relative">
                      <input
                        required type="date" min={new Date().toISOString().split('T')[0]} value={formData.dateFrom}
                        onChange={e => setFormData({ ...formData, dateFrom: e.target.value })}
                        onFocus={openDatePicker} onClick={openDatePicker} onKeyDown={blockDateTyping}
                        className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between peer-focus:ring-2 peer-focus:ring-[#FF7400]/50">
                        <span className={formData.dateFrom ? "text-slate-800 font-medium" : "text-slate-400"}>
                          {formData.dateFrom ? formatDDMMYYYY(formData.dateFrom) : "DD/MM/YYYY"}
                        </span>
                        <Calendar size={18} className="text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">End Date (optional)</label>
                    <div className="relative">
                      <input
                        type="date" min={formData.dateFrom || new Date().toISOString().split('T')[0]} value={formData.dateTo}
                        onChange={e => setFormData({ ...formData, dateTo: e.target.value })}
                        onFocus={openDatePicker} onClick={openDatePicker} onKeyDown={blockDateTyping}
                        className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between peer-focus:ring-2 peer-focus:ring-[#FF7400]/50">
                        <span className={formData.dateTo ? "text-slate-800 font-medium" : "text-slate-400"}>
                          {formData.dateTo ? formatDDMMYYYY(formData.dateTo) : "DD/MM/YYYY"}
                        </span>
                        <Calendar size={18} className="text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Category</label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-[#FF7400]/30 transition-all">
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-[#FF7400]"
                          checked={Array.isArray(formData.category) && formData.category.length === AVAILABLE_CATEGORIES.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, category: [...AVAILABLE_CATEGORIES] });
                            } else {
                              setFormData({ ...formData, category: [] });
                            }
                          }} 
                        />
                        All
                      </label>
                      {AVAILABLE_CATEGORIES.map((cat) => (
                        <label key={cat} className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-[#FF7400]/30 transition-all">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 accent-[#FF7400]" 
                            checked={Array.isArray(formData.category) && formData.category.includes(cat)} 
                            onChange={(e) => {
                              const currentCategories = Array.isArray(formData.category) ? formData.category : [];
                              if (e.target.checked) {
                                setFormData({ ...formData, category: [...currentCategories, cat] });
                              } else {
                                setFormData({ ...formData, category: currentCategories.filter((c: string) => c !== cat) });
                              }
                            }} 
                          />
                          {cat}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Venue / Location *</label>
                    <input
                      required type="text" value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value.replace(/[^a-zA-Z0-9\s,.'-]/g, '') })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Belt Eligibility</label>
                    <input
                      type="text" value={formData.beltEligibility}
                      onChange={e => setFormData({ ...formData, beltEligibility: e.target.value })}
                      placeholder="e.g. Yellow belt and above"
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Entry Fee (₹)</label>
                    <input
                      required type="text" maxLength={5} value={formData.entryFee}
                      onChange={e => setFormData({ ...formData, entryFee: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>


                  <div className="md:col-span-2 flex items-center gap-3">
                    <input
                      type="checkbox" id="bpl_create" checked={formData.allowBPL}
                      onChange={e => {
                        setFormData({ 
                          ...formData, 
                          allowBPL: e.target.checked
                        });
                      }}
                      className="w-5 h-5 accent-[#FF7400]"
                    />
                    <label htmlFor="bpl_create" className="text-sm font-bold text-slate-700">
                      Allow BPL Students to Register for Free
                    </label>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description *</label>
                    <textarea
                      required value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full h-24 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button" onClick={() => setIsCreateOpen(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                  >
                    Discard
                  </button>
                  <button
                    type="submit" disabled={submitLoading}
                    className="flex-1 py-4 bg-[#FF7400] text-white font-bold rounded-xl shadow-xl shadow-[#FF7400]/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 transition-all"
                  >
                    {submitLoading
                      ? <Loader2 size={20} className="animate-spin" />
                      : <><Calendar size={18} /> Submit Tournament</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════════════ EDIT TOURNAMENT MODAL ════════════ */}
      <AnimatePresence>
        {editingTournament && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl lg:max-w-4xl bg-white rounded-[1.75rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">Edit Tournament</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Update details for <span className="font-bold text-[#FF7400]">{editingTournament.title}</span>
                  </p>
                </div>
                <button
                  onClick={() => setEditingTournament(null)}
                  className="p-2 bg-slate-100 text-slate-400 hover:text-red-500 rounded-full transition-all"
                >
                  <XCircle size={26} />
                </button>
              </div>

              <form onSubmit={handleEdit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tournament Title *</label>
                    <input
                      required type="text" value={editFormData.title}
                      onChange={e => setEditFormData({ ...editFormData, title: e.target.value })}
                      placeholder="e.g. District Championship 2026"
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Level</label>
                    <select
                      value={editFormData.level}
                      onChange={e => setEditFormData({ ...editFormData, level: e.target.value, zoneId: "", districtId: "", clubId: "" })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 font-semibold text-slate-900"
                    >
                      <option value="CLUB">Club</option>
                      <option value="DISTRICT">District</option>
                      <option value="ZONE">Zonal</option>
                      <option value="STATE">State</option>
                      <option value="NATIONAL">National</option>
                    </select>
                  </div>

                  {editFormData.level === "ZONE" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Zone</label>
                      <select
                        required
                        value={editFormData.zoneId || ""}
                        onChange={e => setEditFormData({ ...editFormData, zoneId: e.target.value })}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 font-semibold text-slate-900"
                      >
                        <option value="" disabled>Select a Zone</option>
                        {zones.map((zone) => (
                          <option key={zone} value={zone}>{zone}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {editFormData.level === "DISTRICT" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">District</label>
                      <select
                        required
                        value={editFormData.districtId || ""}
                        onChange={e => setEditFormData({ ...editFormData, districtId: e.target.value })}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 font-semibold text-slate-900"
                      >
                        <option value="" disabled>Select a District</option>
                        {districts.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {editFormData.level === "CLUB" && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">District</label>
                        <select
                          value={editFormData.districtId || ""}
                          onChange={e => setEditFormData({ ...editFormData, districtId: e.target.value, clubId: "" })}
                          className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 font-semibold text-slate-900"
                        >
                          <option value="">Select a District</option>
                          {districts.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Club</label>
                        <select
                          required
                          value={editFormData.clubId || ""}
                          onChange={e => setEditFormData({ ...editFormData, clubId: e.target.value })}
                          className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 font-semibold text-slate-900"
                        >
                          <option value="" disabled>Select a Club</option>
                          {clubs
                            .filter(c => !editFormData.districtId || c.districtId === editFormData.districtId || (c as any).district?.id === editFormData.districtId)
                            .map((c) => (
                              <option key={c.id} value={c.id}>{c.clubName || (c as any).name}</option>
                            ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Gender</label>
                    <div className="relative">
                      <GenderIcon gender={editFormData.gender} size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <select
                        value={editFormData.gender}
                        onChange={e => setEditFormData({ ...editFormData, gender: e.target.value })}
                        className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 font-semibold"
                      >
                        <option value="BOTH">Both</option>
                        <option value="MALE">Male Only</option>
                        <option value="FEMALE">Female Only</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Start Date *</label>
                    <div className="relative">
                      <input
                        required type="date" value={editFormData.dateFrom}
                        onChange={e => setEditFormData({ ...editFormData, dateFrom: e.target.value })}
                        onFocus={openDatePicker} onClick={openDatePicker} onKeyDown={blockDateTyping}
                        className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between peer-focus:ring-2 peer-focus:ring-[#FF7400]/50">
                        <span className={editFormData.dateFrom ? "text-slate-800 font-medium" : "text-slate-400"}>
                          {editFormData.dateFrom ? formatDDMMYYYY(editFormData.dateFrom) : "DD/MM/YYYY"}
                        </span>
                        <Calendar size={18} className="text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">End Date (optional)</label>
                    <div className="relative">
                      <input
                        type="date" min={editFormData.dateFrom} value={editFormData.dateTo}
                        onChange={e => setEditFormData({ ...editFormData, dateTo: e.target.value })}
                        onFocus={openDatePicker} onClick={openDatePicker} onKeyDown={blockDateTyping}
                        className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between peer-focus:ring-2 peer-focus:ring-[#FF7400]/50">
                        <span className={editFormData.dateTo ? "text-slate-800 font-medium" : "text-slate-400"}>
                          {editFormData.dateTo ? formatDDMMYYYY(editFormData.dateTo) : "DD/MM/YYYY"}
                        </span>
                        <Calendar size={18} className="text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Category</label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-[#FF7400]/30 transition-all">
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-[#FF7400]"
                          checked={Array.isArray(editFormData.category) && editFormData.category.length === AVAILABLE_CATEGORIES.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditFormData({ ...editFormData, category: [...AVAILABLE_CATEGORIES] });
                            } else {
                              setEditFormData({ ...editFormData, category: [] });
                            }
                          }}
                        />
                        All
                      </label>
                      {AVAILABLE_CATEGORIES.map((cat) => (
                        <label key={cat} className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-[#FF7400]/30 transition-all">
                          <input
                            type="checkbox"
                            className="w-5 h-5 accent-[#FF7400]"
                            checked={Array.isArray(editFormData.category) && editFormData.category.includes(cat)}
                            onChange={(e) => {
                              const current = Array.isArray(editFormData.category) ? editFormData.category : [];
                              if (e.target.checked) {
                                setEditFormData({ ...editFormData, category: [...current, cat] });
                              } else {
                                setEditFormData({ ...editFormData, category: current.filter((c: string) => c !== cat) });
                              }
                            }}
                          />
                          {cat}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Venue / Location *</label>
                    <input
                      required type="text" value={editFormData.location}
                      onChange={e => setEditFormData({ ...editFormData, location: e.target.value.replace(/[^a-zA-Z0-9\s,.'-]/g, '') })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Belt Eligibility</label>
                    <input
                      type="text" value={editFormData.beltEligibility}
                      onChange={e => setEditFormData({ ...editFormData, beltEligibility: e.target.value })}
                      placeholder="e.g. Yellow belt and above"
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Entry Fee (₹)</label>
                    <input
                      required type="text" maxLength={5} value={editFormData.entryFee}
                      onChange={e => setEditFormData({ ...editFormData, entryFee: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>


                  <div className="md:col-span-2 flex items-center gap-3">
                    <input
                      type="checkbox" id="bpl_edit" checked={editFormData.allowBPL}
                      onChange={e => {
                        setEditFormData({
                          ...editFormData,
                          allowBPL: e.target.checked
                        });
                      }}
                      className="w-5 h-5 accent-[#FF7400]"
                    />
                    <label htmlFor="bpl_edit" className="text-sm font-bold text-slate-700">
                      Allow BPL Students to Register for Free
                    </label>
                  </div>

                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button" onClick={() => setEditingTournament(null)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit" disabled={editLoading}
                    className="flex-1 py-4 bg-[#FF7400] text-white font-bold rounded-xl shadow-xl shadow-[#FF7400]/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 transition-all"
                  >
                    {editLoading
                      ? <Loader2 size={20} className="animate-spin" />
                      : <><Edit2 size={18} /> Save Changes</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════════════ REJECT MODAL ════════════ */}
      <AnimatePresence>
        {rejectModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Reject Tournament</h2>
              <p className="text-slate-500 text-sm mb-5">
                Provide a reason — it will be visible to the creator.
              </p>
              <textarea
                value={rejectRemark}
                onChange={e => setRejectRemark(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none mb-5"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => { setRejectModal(null); setRejectRemark(""); }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(rejectModal.id, "REJECTED", rejectRemark)}
                  disabled={!rejectRemark.trim() || !!actionLoading}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {actionLoading
                    ? <Loader2 size={16} className="animate-spin" />
                    : "Confirm Reject"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
