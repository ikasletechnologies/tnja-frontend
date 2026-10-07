"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Plus,
  MapPin,
  Search,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  Video,
  User,
  Eye,
  Pencil,
  RotateCcw,
  FileText
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";

export default function EventsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [districts, setDistricts] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>("GUEST");
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [eventSections, setEventSections] = useState<string[]>([]);
  const [sectionOpen, setSectionOpen] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [editSubmitLoading, setEditSubmitLoading] = useState(false);

  const EVENT_COLORS = [
    { label: "Black", value: "#000000", gradient: "from-black via-zinc-800 to-zinc-600" },
    { label: "Orange", value: "#FF7400", gradient: "from-orange-900 via-orange-600 to-[#FF7400]" },
    { label: "Indigo", value: "#4F46E5", gradient: "from-indigo-900 via-purple-700 to-[#FF7400]" },
    { label: "Green", value: "#16A34A", gradient: "from-green-900 via-emerald-700 to-emerald-400" },
    { label: "Red", value: "#DC2626", gradient: "from-red-900 via-red-700 to-rose-400" },
    { label: "Blue", value: "#2563EB", gradient: "from-blue-900 via-blue-700 to-sky-400" },
  ];

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    location: "",
    description: "",
    level: "DISTRICT",
    participantType: "ALL",
    districtId: "",
    zoneId: "",
    isPaid: false,
    entryFee: "",
    color: "#FF7400",
    eventSection: "",
    meetingLink: "",
  });

  const getFilteredDistrictsForCreation = useCallback(() => {
    if (!userProfile) return districts;
    const isAdmin = ["SUPER_ADMIN", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO"].includes(userRole);
    if (isAdmin) return districts;

    const userZone = userProfile.district?.zoneName;
    const isZoneAdmin = ["ZONE_PRESIDENT", "ZONE_SECRETARY"].includes(userRole);

    if (isZoneAdmin && userZone) {
      return districts.filter(d => d.zoneName === userZone);
    }

    return districts.filter(d => d.id === userProfile.districtId);
  }, [districts, userProfile, userRole]);

  const getFilteredZonesForCreation = useCallback(() => {
    const allZones = ["Chennai Zone", "Salem Zone", "Coimbatore Zone", "Trichy Zone", "Madurai Zone"];
    if (!userProfile) return allZones;
    const isAdmin = ["SUPER_ADMIN", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO"].includes(userRole);
    if (isAdmin) return allZones;

    const userZone = userProfile.district?.zoneName;
    if (userZone) return [userZone];
    return [];
  }, [userProfile, userRole]);

  const [toast, setToast] = useState<{ msg: string, type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/events/admin`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setEvents(json);
      }
    } catch (err) {
      console.error("Failed to load events", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDistricts = async () => {
    try {
      const res = await fetch(`${API_BASE}/districts`);
      if (res.ok) setDistricts(await res.json());
    } catch (err) {
      console.error("Failed to load districts", err);
    }
  };

  const fetchEventSections = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/events/sections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json: { name: string }[] = await res.json();
        setEventSections(
          json.map(s => s.name).filter(n => n.toLowerCase() !== "competition")
        );
      } else {
        setEventSections([]);
      }
    } catch {
      setEventSections([]);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(`${API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setUserProfile(json.user);
        setUserRole(json.role);
      }
    } catch (err) {
      console.error("Failed to load user profile", err);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchDistricts();
    fetchProfile();
    fetchEventSections();
  }, [fetchEvents]);

  useEffect(() => {
    const fd = getFilteredDistrictsForCreation();
    if (formData.level === "DISTRICT" && fd.length === 1) {
      setFormData(prev => ({ ...prev, districtId: fd[0].id }));
    }
    const fz = getFilteredZonesForCreation();
    if (formData.level === "ZONE" && fz.length === 1) {
      setFormData(prev => ({ ...prev, zoneId: fz[0] }));
    }
  }, [formData.level, districts, userProfile, getFilteredDistrictsForCreation, getFilteredZonesForCreation]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sectionRef.current && !sectionRef.current.contains(e.target as Node))
        setSectionOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/events/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create event");

      showToast("Event created and submitted for approval!", "success");
      setIsCreateModalOpen(false);
      setFormData({
        title: "", date: "", location: "", description: "", level: "DISTRICT", participantType: "ALL", districtId: "", zoneId: "", isPaid: false, entryFee: "", color: "#FF7400", eventSection: "", meetingLink: "",
      });
      fetchEvents();
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenEdit = (event: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEvent(event);
    setFormData({
      title: event.title || "",
      date: event.date ? new Date(event.date).toISOString().split('T')[0] : "",
      location: event.location || "",
      description: event.description || "",
      level: event.level || "DISTRICT",
      participantType: event.participantType || "ALL",
      districtId: event.districtId || "",
      zoneId: event.zoneId || "",
      isPaid: event.isPaid || false,
      entryFee: event.entryFee ? String(event.entryFee) : "",
      color: event.color || "#FF7400",
      eventSection: event.eventSection || "",
      meetingLink: event.meetingLink || "",
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    setEditSubmitLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/events/${editingEvent.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update event");

      showToast("Event updated successfully!", "success");
      setIsEditModalOpen(false);
      setEditingEvent(null);
      setFormData({
        title: "", date: "", location: "", description: "", level: "DISTRICT", participantType: "ALL", districtId: "", zoneId: "", isPaid: false, entryFee: "", color: "#FF7400", eventSection: "", meetingLink: ""
      });
      fetchEvents();
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setEditSubmitLoading(false);
    }
  };

  const filteredEvents = events.filter(ev => {
    if (filter !== "ALL" && ev.status !== filter) return false;
    if (levelFilter !== "ALL" && ev.level !== levelFilter) return false;
    const eventDistrict = ev.district?.name || ev.location || "";
    if (districtFilter !== "ALL" && eventDistrict !== districtFilter) return false;
    if (searchQuery && ![ev.title, ev.location, ev.level, ev.eventSection].some(value => value?.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
    return true;
  });

  const approvedCount = events.filter(e => e.status === "APPROVED").length;
  const pendingCount = events.filter(e => e.status === "PENDING").length;
  const draftCount = events.filter(e => e.status === "DRAFT" || e.status === "REPLAY").length;
  const eventDistricts = Array.from(new Set(events.map(event => event.district?.name || event.location).filter(Boolean))).sort();

  return (
    <div className="space-y-8 relative">
      {/* Toast */}
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

      {/* Header */}
      <section className="overflow-hidden rounded-2xl border border-orange-100 bg-[linear-gradient(120deg,#fffaf6_0%,#ffffff_58%,#ffe9df_100%)] px-5 py-5 shadow-sm sm:px-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-orange-100 text-[#ff6b00] shadow-sm"><Calendar size={28} /></span>
            <div><p className="text-xs font-semibold text-slate-400">Dashboard / Events</p><h1 className="mt-1 text-3xl font-black tracking-tight text-[#ff6b00]">Events</h1><p className="mt-1 text-sm text-slate-500">Create and manage events within your jurisdiction.</p></div>
          </div>
          <button onClick={() => setIsCreateModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#ff4d00,#ff7900)] px-7 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5"><Plus size={18} />Create Event</button>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Events", value: events.length, icon: Calendar, wrap: "border-orange-200 bg-orange-50/70", iconStyle: "bg-orange-100 text-orange-600" },
          { label: "Approved", value: approvedCount, icon: CheckCircle2, wrap: "border-emerald-200 bg-emerald-50/70", iconStyle: "bg-emerald-100 text-emerald-600" },
          { label: "Pending Approval", value: pendingCount, icon: AlertCircle, wrap: "border-amber-200 bg-amber-50/70", iconStyle: "bg-amber-100 text-amber-600" },
          { label: "Draft / Replay", value: draftCount, icon: FileText, wrap: "border-blue-200 bg-blue-50/70", iconStyle: "bg-blue-100 text-blue-600" },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05 }} className={`flex items-center gap-4 rounded-2xl border p-5 shadow-sm ${stat.wrap}`}><span className={`grid size-14 shrink-0 place-items-center rounded-full ${stat.iconStyle}`}><Icon size={26} /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-500">{stat.label}</p><p className="mt-1 text-3xl font-black leading-none text-[#111b3a]">{stat.value}</p></div><ChevronRight size={20} className="text-slate-400" /></motion.div>;
        })}
      </section>

      {/* Filters */}
      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(240px,1fr)_160px_190px_170px_auto]">
        <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-inset ring-slate-100 focus-within:ring-orange-200"><Search size={17} className="text-slate-400" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by name, location or type..." className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400" /></label>
        <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none focus:border-orange-300"><option value="ALL">All Types</option><option value="DISTRICT">District</option><option value="ZONE">Zone</option><option value="STATE">State</option></select>
        <select value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none focus:border-orange-300"><option value="ALL">All Districts</option>{eventDistricts.map((district) => <option key={district} value={district}>{district}</option>)}</select>
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none focus:border-orange-300"><option value="ALL">All Status</option><option value="APPROVED">Approved</option><option value="PENDING">Pending</option><option value="REJECTED">Rejected</option><option value="DRAFT">Draft</option></select>
        <button onClick={() => { setSearchQuery(""); setFilter("ALL"); setLevelFilter("ALL"); setDistrictFilter("ALL"); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 px-4 py-2.5 text-xs font-extrabold text-[#ff6b00] transition hover:bg-orange-50"><RotateCcw size={15} />Reset</button>
      </section>

      {/* Events Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-80 items-center justify-center"><Loader2 size={36} className="animate-spin text-[#ff6b00]" /></div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-center"><span className="grid size-16 place-items-center rounded-full bg-slate-50 text-slate-300"><Calendar size={29} /></span><div><h3 className="font-extrabold text-slate-600">No events found</h3><p className="mt-1 text-sm text-slate-400">Try changing your filters or create a new event.</p></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-xs">
              <thead className="border-b border-slate-100 bg-[#f8fafc] text-slate-500"><tr><th className="w-14 px-5 py-4 font-bold">#</th><th className="px-3 py-4 font-bold">Event Details</th><th className="px-3 py-4 font-bold">Type</th><th className="px-3 py-4 font-bold">Location</th><th className="px-3 py-4 font-bold">Event Date</th><th className="px-3 py-4 font-bold">Entry</th><th className="px-3 py-4 font-bold">Status</th><th className="px-3 py-4 font-bold">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((event, index) => {
                  const statusClass = event.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : event.status === "PENDING" ? "bg-amber-50 text-amber-700" : event.status === "REJECTED" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600";
                  const dotClass = event.status === "APPROVED" ? "bg-emerald-500" : event.status === "PENDING" ? "bg-amber-500" : event.status === "REJECTED" ? "bg-red-500" : "bg-slate-400";
                  return (
                    <motion.tr key={event.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="hover:bg-orange-50/20">
                      <td className="px-5 py-4 font-black text-slate-500">{index + 1}</td>
                      <td className="px-3 py-4"><div className="flex items-center gap-3"><span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl text-white shadow-sm" style={{ background: event.color ? `linear-gradient(135deg, ${event.color}, ${event.color}88)` : "linear-gradient(135deg,#3b176d,#a23be5)" }}><Calendar size={22} /></span><div className="min-w-0"><p className="max-w-[240px] truncate text-sm font-extrabold text-slate-800">{event.title}</p><p className="mt-1 max-w-[250px] truncate text-[10px] text-slate-400">{event.description || event.eventSection || "TNJA Event"}</p></div></div></td>
                      <td className="px-3 py-4"><span className="rounded-lg bg-blue-50 px-2.5 py-1 font-extrabold text-blue-600">{event.level || "DISTRICT"}</span></td>
                      <td className="px-3 py-4"><span className="inline-flex items-center gap-1.5 font-semibold text-slate-600"><MapPin size={14} className="text-slate-400" />{event.district?.name || event.location || "—"}</span></td>
                      <td className="px-3 py-4"><span className="inline-flex items-center gap-2 font-semibold text-slate-600"><Calendar size={14} className="text-slate-400" />{event.date ? new Date(event.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "TBA"}</span></td>
                      <td className="px-3 py-4"><p className="font-bold text-slate-600">{event.isPaid ? `₹ ${event.entryFee}` : "Free"}</p><p className="mt-1 text-[10px] text-slate-400">{event.participantType === "ALL" ? "Everyone" : event.participantType}</p></td>
                      <td className="px-3 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-extrabold ${statusClass}`}><span className={`size-2 rounded-full ${dotClass}`} />{event.status || "DRAFT"}</span></td>
                      <td className="px-3 py-4"><div className="flex items-center gap-2"><button onClick={() => setSelectedEvent(event)} title="View event" className="grid size-9 place-items-center rounded-lg bg-slate-50 text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"><Eye size={16} /></button><button onClick={(clickEvent) => handleOpenEdit(event, clickEvent)} title="Edit event" className="grid size-9 place-items-center rounded-lg bg-slate-50 text-slate-600 transition hover:bg-orange-50 hover:text-[#ff6b00]"><Pencil size={16} /></button>{event.meetingLink && <a href={event.meetingLink} target="_blank" rel="noopener noreferrer" title="Join meeting" className="grid size-9 place-items-center rounded-lg bg-slate-50 text-slate-600 transition hover:bg-purple-50 hover:text-purple-600"><Video size={16} /></a>}</div></td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between"><p>Showing {filteredEvents.length ? 1 : 0} to {filteredEvents.length} of {filteredEvents.length} events</p><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-lg bg-[#ff6b00] font-black text-white">1</span></div></div>
      </section>
      {/* Create Event Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl bg-white rounded-[2.5rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">Propose New Event</h2>
                  <p className="text-slate-500">Fill in the details to propose a new event.</p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 bg-slate-100 text-slate-400 hover:text-red-500 rounded-full transition-all cursor-pointer"
                >
                  <XCircle size={28} />
                </button>
              </div>

              <form className="space-y-6" onSubmit={handleCreate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* ── Event Section Dropdown ── */}
                  <div className="md:col-span-2" ref={sectionRef}>
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">
                      Event Section
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setSectionOpen(o => !o)}
                        className="w-full flex items-center justify-between px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl hover:border-[#FF7400] focus:outline-none focus:ring-2 focus:ring-[#FF7400]/40 focus:border-[#FF7400] transition-all"
                      >
                        <span className={`text-sm font-semibold ${formData.eventSection ? "text-slate-800" : "text-slate-400"}`}>
                          {formData.eventSection || "Select event section"}
                        </span>
                        <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${sectionOpen ? "rotate-180" : ""}`} />
                      </button>

                      <AnimatePresence>
                        {sectionOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full mt-1 left-0 right-0 z-150 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
                          >
                            <div className="max-h-64 overflow-y-auto py-1">
                              {eventSections.map((section) => (
                                <button
                                  key={section}
                                  type="button"
                                  onClick={() => { setFormData(f => ({ ...f, eventSection: section })); setSectionOpen(false); }}
                                  className={`w-full text-left px-6 py-3 text-sm font-semibold transition-colors ${formData.eventSection === section
                                    ? "bg-[#FF7400] text-white"
                                    : "text-slate-700 hover:bg-orange-50 hover:text-[#FF7400]"
                                    }`}
                                >
                                  {section}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {formData.eventSection === "Seminar (Online)" && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Meeting Link</label>
                      <input 
                        type="url" 
                        required
                        value={formData.meetingLink}
                        onChange={e => setFormData({ ...formData, meetingLink: e.target.value })}
                        placeholder="e.g. https://meet.google.com/abc-defg-hij"
                        className="w-full px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all text-slate-800"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Event Title</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter a descriptive title"
                      className="w-full px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Date</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Location</label>
                    <input
                      type="text"
                      required
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Nehru Stadium"
                      className="w-full px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all text-slate-800"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Event Level</label>
                    <select
                      value={formData.level}
                      onChange={e => setFormData({ ...formData, level: e.target.value })}
                      className="w-full px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all text-slate-800 font-semibold"
                    >
                      <option value="DISTRICT">District Level</option>
                      <option value="ZONE">Zone Level</option>
                      <option value="STATE">State Level</option>
                    </select>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Target Audience</label>
                    <select
                      value={formData.participantType}
                      onChange={e => setFormData({ ...formData, participantType: e.target.value })}
                      className="w-full px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all text-slate-800 font-semibold"
                    >
                      <option value="ALL">Everyone</option>
                      <option value="STUDENT">Players Only</option>
                      <option value="COACH">Coaches/Referees Only</option>
                      <option value="MEMBER">Members Only</option>
                      <option value="CLUB">Clubs Only</option>
                    </select>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Entry Type</label>
                    <select
                      value={formData.isPaid ? "paid" : "free"}
                      onChange={e => setFormData({ ...formData, isPaid: e.target.value === "paid", entryFee: e.target.value === "free" ? "" : formData.entryFee })}
                      className="w-full px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all text-slate-800 font-semibold"
                    >
                      <option value="free">Free</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>

                  {formData.isPaid && (
                    <div className="md:col-span-1">
                      <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Entry Fee (₹)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.entryFee}
                        onChange={e => setFormData({ ...formData, entryFee: e.target.value })}
                        placeholder="Enter amount in ₹"
                        className="w-full px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all text-slate-800 font-semibold"
                      />
                    </div>
                  )}

                  {formData.level === "DISTRICT" && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Select District</label>
                      <select
                        required
                        value={formData.districtId}
                        onChange={e => setFormData({ ...formData, districtId: e.target.value })}
                        className="w-full px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all text-slate-800 font-semibold"
                      >
                        <option value="">Select District</option>
                        {getFilteredDistrictsForCreation().map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.level === "ZONE" && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Select Zone</label>
                      <select 
                        required
                        value={formData.zoneId}
                        onChange={e => setFormData({ ...formData, zoneId: e.target.value })}
                        className="w-full px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all text-slate-800 font-semibold"
                      >
                        <option value="">Select Zone</option>
                        {getFilteredZonesForCreation().map(z => (
                          <option key={z} value={z}>{z}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Event Banner Color</label>
                    <div className="flex gap-3 flex-wrap">
                      {EVENT_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: c.value })}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${formData.color === c.value
                            ? "border-[#FF7400] shadow-md scale-105"
                            : "border-slate-200 hover:border-slate-300"
                            }`}
                        >
                          <span
                            className="w-5 h-5 rounded-full border border-white/30 shadow-sm shrink-0"
                            style={{ background: c.value }}
                          />
                          {c.label}
                        </button>
                      ))}
                    </div>
                    {/* Preview */}
                    <div
                      className="mt-3 h-12 rounded-xl overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${formData.color}dd, ${formData.color}88, ${formData.color}44)` }}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Description</label>
                    <textarea
                      required
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detailed description of the event..."
                      className="w-full h-32 px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all text-slate-800 resize-none"
                    ></textarea>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-grow py-5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="flex-grow py-5 bg-[#FF7400] text-white font-bold rounded-2xl shadow-xl shadow-[#FF7400]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {submitLoading ? <Loader2 size={20} className="animate-spin" /> : "Submit for Approval"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Event Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl bg-white rounded-[2.5rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">Edit Event</h2>
                  <p className="text-slate-500">Update the details of the event.</p>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 bg-slate-100 text-slate-400 hover:text-red-500 rounded-full transition-all cursor-pointer"
                >
                  <XCircle size={28} />
                </button>
              </div>

              <form className="space-y-6" onSubmit={handleUpdate}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* ── Event Section Dropdown ── */}
                  <div className="md:col-span-2" ref={sectionRef}>
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">
                      Event Section
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setSectionOpen(o => !o)}
                        className="w-full flex items-center justify-between px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl hover:border-[#FF7400] focus:outline-none focus:ring-2 focus:ring-[#FF7400]/40 focus:border-[#FF7400] transition-all"
                      >
                        <span className={`text-sm font-semibold ${formData.eventSection ? "text-slate-800" : "text-slate-400"}`}>
                          {formData.eventSection || "Select event section"}
                        </span>
                        <ChevronDown size={18} className={`text-slate-400 transition-transform duration-200 ${sectionOpen ? "rotate-180" : ""}`} />
                      </button>

                      <AnimatePresence>
                        {sectionOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full mt-1 left-0 right-0 z-[150] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
                          >
                            <div className="max-h-64 overflow-y-auto py-1">
                              {eventSections.map((section) => (
                                <button
                                  key={section}
                                  type="button"
                                  onClick={() => { setFormData(f => ({ ...f, eventSection: section })); setSectionOpen(false); }}
                                  className={`w-full text-left px-6 py-3 text-sm font-semibold transition-colors ${formData.eventSection === section
                                    ? "bg-[#FF7400] text-white"
                                    : "text-slate-700 hover:bg-orange-50 hover:text-[#FF7400]"
                                    }`}
                                >
                                  {section}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {formData.eventSection === "Seminar (Online)" && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Meeting Link</label>
                      <input 
                        type="url" 
                        required
                        value={formData.meetingLink}
                        onChange={e => setFormData({ ...formData, meetingLink: e.target.value })}
                        placeholder="e.g. https://meet.google.com/abc-defg-hij"
                        className="w-full px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all text-slate-800"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Event Title</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter a descriptive title"
                      className="w-full px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Date</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Location</label>
                    <input
                      type="text"
                      required
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Nehru Stadium"
                      className="w-full px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all text-slate-800"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Event Level</label>
                    <select
                      value={formData.level}
                      onChange={e => setFormData({ ...formData, level: e.target.value })}
                      className="w-full px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all font-semibold text-slate-800"
                    >
                      <option value="DISTRICT">District Level</option>
                      <option value="ZONE">Zone Level</option>
                      <option value="STATE">State Level</option>
                    </select>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Target Audience</label>
                    <select
                      value={formData.participantType}
                      onChange={e => setFormData({ ...formData, participantType: e.target.value })}
                      className="w-full px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all font-semibold text-slate-800"
                    >
                      <option value="ALL">Everyone</option>
                      <option value="STUDENT">Players Only</option>
                      <option value="COACH">Coaches/Referees Only</option>
                      <option value="MEMBER">Members Only</option>
                      <option value="CLUB">Clubs Only</option>
                    </select>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Entry Type</label>
                    <select
                      value={formData.isPaid ? "paid" : "free"}
                      onChange={e => setFormData({ ...formData, isPaid: e.target.value === "paid", entryFee: e.target.value === "free" ? "" : formData.entryFee })}
                      className="w-full px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all font-semibold text-slate-800"
                    >
                      <option value="free">Free</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>

                  {formData.isPaid && (
                    <div className="md:col-span-1">
                      <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Entry Fee (₹)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.entryFee}
                        onChange={e => setFormData({ ...formData, entryFee: e.target.value })}
                        placeholder="Enter amount in ₹"
                        className="w-full px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all font-semibold text-slate-800"
                      />
                    </div>
                  )}

                  {formData.level === "DISTRICT" && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Select District</label>
                      <select
                        required
                        value={formData.districtId}
                        onChange={e => setFormData({ ...formData, districtId: e.target.value })}
                        className="w-full px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all font-semibold text-slate-800"
                      >
                        <option value="">Select District</option>
                        {getFilteredDistrictsForCreation().map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.level === "ZONE" && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Select Zone</label>
                      <select
                        required
                        value={formData.zoneId}
                        onChange={e => setFormData({ ...formData, zoneId: e.target.value })}
                        className="w-full px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all font-semibold text-slate-800"
                      >
                        <option value="">Select Zone</option>
                        {getFilteredZonesForCreation().map(z => (
                          <option key={z} value={z}>{z}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-widest mb-2">Description</label>
                    <textarea
                      required
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detailed description of the event..."
                      className="w-full h-32 px-6 py-4 bg-white border-2 border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 focus:border-[#FF7400] transition-all resize-none text-slate-800"
                    ></textarea>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-grow py-5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitLoading}
                    className="flex-grow py-5 bg-[#FF7400] text-white font-bold rounded-2xl shadow-xl shadow-[#FF7400]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {editSubmitLoading ? <Loader2 size={20} className="animate-spin" /> : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Event Details Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl bg-white rounded-[2.5rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="inline-block px-3 py-1.5 bg-[#FFEEDC] text-black text-[12px] font-bold rounded-md mb-2">
                    {selectedEvent.eventSection || "Event"}
                  </span>
                  <h2 className="text-3xl font-extrabold text-slate-900 leading-tight">{selectedEvent.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-2 bg-slate-100 text-slate-400 hover:text-red-500 rounded-full transition-all cursor-pointer"
                >
                  <XCircle size={28} />
                </button>
              </div>

              {/* Event Cover / Banner Preview */}
              <div
                className="h-40 rounded-3xl mb-8 relative overflow-hidden flex items-end p-6 border-b-[4px] border-[#FFDA00]"
                style={{ background: selectedEvent.color ? `linear-gradient(135deg, ${selectedEvent.color}dd, ${selectedEvent.color}88, ${selectedEvent.color}44)` : "linear-gradient(135deg, #1e1b4b, #7c3aed, #FF7400)" }}
              >
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="absolute inset-0 backdrop-blur-[1px]"></div>
                <div className="relative z-10 text-white font-bold text-sm bg-black/30 backdrop-blur-md px-4 py-2 rounded-xl">
                  {selectedEvent.level} Level Event
                </div>
              </div>

              {/* Grid Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#FF7400] flex items-center justify-center">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</p>
                    <p className="text-sm font-bold text-slate-700">{new Date(selectedEvent.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#FF7400] flex items-center justify-center">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location / Venue</p>
                    <p className="text-sm font-bold text-slate-700">{selectedEvent.location}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#FF7400] flex items-center justify-center">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Audience</p>
                    <p className="text-sm font-bold text-slate-700">{selectedEvent.participantType === "ALL" ? "Everyone" : `${selectedEvent.participantType}s Only`}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#FF7400] flex items-center justify-center">
                    <span className="font-bold text-md text-[#FF7400]">₹</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entry Fee</p>
                    <p className="text-sm font-bold text-slate-700">{selectedEvent.isPaid ? `₹ ${selectedEvent.entryFee}` : 'Free Entry'}</p>
                  </div>
                </div>

                {selectedEvent.meetingLink && (
                  <div className="flex items-center gap-3 md:col-span-2 border-t pt-4 mt-2">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#FF7400] flex items-center justify-center">
                      <Video size={20} />
                    </div>
                    <div className="flex-grow">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Online Meeting Link</p>
                      <a
                        href={selectedEvent.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-orange-600 hover:text-orange-700 hover:underline break-all"
                      >
                        {selectedEvent.meetingLink}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="mb-8">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Event Details & Description</h4>
                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 text-sm text-slate-600 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {selectedEvent.description || "No description provided."}
                </div>
              </div>

              {/* Close Button */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all font-semibold cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
