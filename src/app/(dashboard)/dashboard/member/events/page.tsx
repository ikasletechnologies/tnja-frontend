"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  Plus, 
  MapPin, 
  Clock, 
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  Video,
  User,
  Trophy,
  History,
  Filter,
  RotateCcw,
  Star,
  BarChart3
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";

export default function MemberEventsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [districts, setDistricts] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>("GUEST");
  const canProposeEvent = [
    "CLUB", "SUPER_ADMIN", "STATE_PRESIDENT", "STATE_SECRETARY",
    "ZONE_PRESIDENT", "ZONE_SECRETARY", "DISTRICT_PRESIDENT",
    "DISTRICT_SECRETARY", "CEO",
  ].includes(userRole);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [eventSections, setEventSections] = useState<string[]>([]);
  const [sectionOpen, setSectionOpen] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  
  const [activeSection, setActiveSection] = useState<"active" | "mine" | "upcoming" | "past">("active");
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [editSubmitLoading, setEditSubmitLoading] = useState(false);

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

  const [toast, setToast] = useState<{msg: string, type: "success" | "error"} | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/events/active`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
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

  const fetchMyEvents = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(`${API_BASE}/events/my`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setMyEvents(await res.json());
      }
    } catch (err) {
      console.error("Failed to load my events", err);
    }
  }, []);

  const fetchDistricts = async () => {
    try {
      const res = await fetch(`${API_BASE}/districts`);
      if (res.ok) {
        const json = await res.json();
        setDistricts(json);
      }
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
      }
    } catch (err) {
      console.error("Failed to load user profile", err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
      } catch (e) {
        console.error("Failed to decode token", e);
      }
    }
    fetchEvents();
    fetchDistricts();
    fetchProfile();
    fetchEventSections();
    fetchMyEvents();
  }, [fetchEvents, fetchMyEvents]);

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

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleApply = async (event: any) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showToast("You must be logged in to apply", "error");
        return;
      }

      if (event.isPaid) {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          showToast("Razorpay SDK failed to load. Are you offline?", "error");
          return;
        }

        const orderRes = await fetch(`${API_BASE}/events/create-payment-order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ eventId: event.id }),
        });

        const orderData = await orderRes.json();
        if (!orderRes.ok) {
          throw new Error(orderData.error || "Failed to create payment order");
        }

        const userName = localStorage.getItem("userName") || "";
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Tamil Nadu Judo Association",
          description: `Entry Fee for ${event.title}`,
          order_id: orderData.id,
          handler: async function (response: any) {
            try {
              const verifyRes = await fetch(`${API_BASE}/events/verify-payment`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                  eventId: event.id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature
                }),
              });

              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) {
                throw new Error(verifyData.error || "Verification failed");
              }

              showToast("Payment successful! Applied for the event.", "success");
              fetchEvents();
            } catch (err: any) {
              showToast("Payment verification failed: " + err.message, "error");
            }
          },
          prefill: {
            name: userName,
          },
          theme: {
            color: "#FF7400",
          },
        };

        const paymentObject = new (window as any).Razorpay(options);
        paymentObject.open();

      } else {
        const res = await fetch(`${API_BASE}/events/apply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ eventId: event.id }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to apply for event");
        
        showToast("Successfully applied for this event!", "success");
        fetchEvents();
      }
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    }
  };

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
      if (!res.ok) throw new Error(json.error || "Failed to propose event");
      
      showToast("Event created and submitted for approval! It will appear here once approved.", "success");
      setIsCreateModalOpen(false);
      setFormData({
        title: "", date: "", location: "", description: "", level: "DISTRICT", participantType: "ALL", districtId: "", zoneId: "", isPaid: false, entryFee: "", color: "#FF7400", eventSection: "", meetingLink: ""
      });
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenEdit = (event: any) => {
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
      fetchMyEvents();
      fetchEvents();
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setEditSubmitLoading(false);
    }
  };

  const now = new Date();
  const nextThirtyDays = new Date(now);
  nextThirtyDays.setDate(now.getDate() + 30);

  const registeredEvents = events.filter((event) => event.registrations?.length > 0);
  const upcomingEvents = events.filter((event) => {
    const eventDate = new Date(event.date);
    return eventDate >= now && eventDate <= nextThirtyDays;
  });
  const pastEvents = events.filter((event) => new Date(event.date) < now);
  const eventTypes = Array.from(new Set(events.map((event) => event.eventSection || event.level).filter(Boolean)));
  const eventDistricts = Array.from(new Set(events.map((event) => event.district?.name || event.location).filter(Boolean)));

  const sectionEvents = activeSection === "mine"
    ? registeredEvents
    : activeSection === "upcoming"
      ? upcomingEvents
      : activeSection === "past"
        ? pastEvents
        : events.filter((event) => new Date(event.date) >= now);

  const filteredEvents = sectionEvents.filter((event) => {
    const eventDate = new Date(event.date);
    const searchable = `${event.title || ""} ${event.location || ""} ${event.eventSection || ""}`.toLowerCase();
    if (searchQuery && !searchable.includes(searchQuery.toLowerCase())) return false;
    if (typeFilter !== "ALL" && (event.eventSection || event.level) !== typeFilter) return false;
    if (districtFilter !== "ALL" && (event.district?.name || event.location) !== districtFilter) return false;
    if (statusFilter === "OPEN" && event.registrations?.length) return false;
    if (statusFilter === "REGISTERED" && !event.registrations?.length) return false;
    if (startDate && eventDate < new Date(startDate)) return false;
    if (endDate && eventDate > new Date(`${endDate}T23:59:59`)) return false;
    return true;
  });

  const featuredEvent = events.find((event) => event.featured) || events[0];
  const resetFilters = () => {
    setSearchQuery("");
    setTypeFilter("ALL");
    setDistrictFilter("ALL");
    setStatusFilter("ALL");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="space-y-8 relative">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-200 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm ${
              toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            {toast.type === "success" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Directory hero */}
      <section className="relative overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-r from-[#fff9f3] via-[#fff4e9] to-[#fff8f1] px-5 py-5 shadow-sm sm:px-7">
        <div className="absolute -right-8 -top-20 size-64 rounded-full border-[28px] border-orange-100/50" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-orange-100 text-[#ff5a0a] shadow-sm"><Calendar size={28} /></span>
            <div><h1 className="text-2xl font-black tracking-tight text-[#ff5a0a] sm:text-3xl">Events Directory</h1><p className="mt-1 text-sm font-medium text-slate-500">Discover active events, special programs, and association activities near you.</p></div>
          </div>
          {canProposeEvent && <button onClick={() => setIsCreateModalOpen(true)} className="relative inline-flex items-center justify-center gap-2 rounded-xl bg-[#ff5a0a] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-[#ee4f00]"><Plus size={18} />Propose Event</button>}
        </div>
      </section>

      {/* Event metrics */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active Events", value: events.filter((event) => new Date(event.date) >= now).length, note: "available now", icon: Calendar, wrap: "border-orange-100 bg-orange-50/70", iconStyle: "bg-orange-100 text-orange-600" },
          { label: "Registered", value: registeredEvents.length, note: "events joined", icon: User, wrap: "border-emerald-100 bg-emerald-50/70", iconStyle: "bg-emerald-100 text-emerald-600" },
          { label: "Upcoming", value: upcomingEvents.length, note: "next 30 days", icon: Clock, wrap: "border-violet-100 bg-violet-50/70", iconStyle: "bg-violet-100 text-violet-600" },
          { label: "Closed", value: pastEvents.length, note: "completed", icon: Trophy, wrap: "border-rose-100 bg-rose-50/70", iconStyle: "bg-rose-100 text-rose-500" },
        ].map((metric) => { const Icon = metric.icon; return (
          <div key={metric.label} className={`flex items-center gap-4 rounded-2xl border p-4 shadow-sm ${metric.wrap}`}><span className={`grid size-14 shrink-0 place-items-center rounded-full ${metric.iconStyle}`}><Icon size={27} /></span><div><p className="text-xs font-extrabold text-slate-500">{metric.label}</p><p className="text-3xl font-black leading-tight text-[#10244b]">{metric.value}</p><p className="text-xs font-semibold text-slate-400">{metric.note}</p></div></div>
        ); })}
      </section>

      {/* Filters */}
      <section className="grid gap-2 lg:grid-cols-[minmax(240px,1.5fr)_150px_160px_150px_minmax(250px,1fr)_80px_80px]">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm focus-within:border-orange-300"><Search size={18} className="text-slate-400" /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search active events by name, venue, or category..." className="min-w-0 flex-1 bg-transparent text-xs font-medium text-slate-700 outline-none placeholder:text-slate-400" /></label>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none"><option value="ALL">All Types</option>{eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
        <select value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none"><option value="ALL">All Districts</option>{eventDistricts.map((district) => <option key={district} value={district}>{district}</option>)}</select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none"><option value="ALL">All Status</option><option value="OPEN">Open</option><option value="REGISTERED">Registered</option></select>
        <div className="flex items-center rounded-xl border border-slate-200 bg-white px-2 shadow-sm"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="min-w-0 flex-1 px-2 py-2 text-[11px] text-slate-500 outline-none" /><span className="text-slate-300">â€“</span><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="min-w-0 flex-1 px-2 py-2 text-[11px] text-slate-500 outline-none" /></div>
        <button className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#ff5a0a] px-3 text-xs font-extrabold text-white shadow-sm"><Filter size={15} />Filter</button>
        <button onClick={resetFilters} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-orange-300 bg-white px-3 text-xs font-extrabold text-orange-600"><RotateCcw size={15} />Reset</button>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,2.1fr)_minmax(300px,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <nav className="flex overflow-x-auto border-b border-slate-100 px-3">
            {[
              { id: "active" as const, label: "Active Events", icon: Calendar },
              { id: "mine" as const, label: "My Registrations", icon: User },
              { id: "upcoming" as const, label: "Upcoming", icon: Clock },
              { id: "past" as const, label: "Past Events", icon: History },
            ].map((tab) => { const Icon = tab.icon; const active = activeSection === tab.id; return <button key={tab.id} onClick={() => setActiveSection(tab.id)} className={`flex min-w-max items-center gap-2 border-b-2 px-5 py-3 text-xs font-extrabold transition ${active ? "border-[#ff5a0a] text-[#ff5a0a]" : "border-transparent text-slate-500 hover:text-slate-800"}`}><Icon size={16} />{tab.label}</button>; })}
          </nav>

          {loading ? <div className="grid min-h-80 place-items-center"><Loader2 size={36} className="animate-spin text-[#ff5a0a]" /></div> : filteredEvents.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center text-center"><span className="grid size-16 place-items-center rounded-full bg-orange-50 text-orange-300"><Calendar size={28} /></span><h3 className="mt-4 font-extrabold text-slate-600">No events found</h3><p className="mt-1 text-sm text-slate-400">Try changing the selected filters.</p></div>
          ) : (
            <div className="grid gap-3 p-3 md:grid-cols-2 2xl:grid-cols-3">
              {filteredEvents.map((event) => { const registered = event.registrations?.[0]; const eventDate = new Date(event.date); return (
                <motion.article key={event.id} whileHover={{ y: -3 }} onClick={() => setSelectedEvent(event)} className="group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                  <div className="relative h-28 overflow-hidden bg-gradient-to-br from-[#173b73] via-[#315f9e] to-orange-100 p-4 text-white">
                    <div className="absolute -right-4 -top-6 size-28 rounded-full border-[18px] border-white/10" /><p className="relative max-w-[75%] text-lg font-black uppercase leading-tight tracking-tight">{event.title}</p><span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-black ${registered ? "bg-emerald-100 text-emerald-700" : eventDate > nextThirtyDays ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>{registered ? "Registered" : eventDate > nextThirtyDays ? "Upcoming" : "Open"}</span>
                  </div>
                  <div className="p-4"><h3 className="line-clamp-1 text-sm font-black text-[#10244b]">{event.title}</h3><p className="mt-1 line-clamp-1 text-[10px] font-semibold text-slate-400">Organized by Tamil Nadu Judo Association</p><span className="mt-2 inline-block rounded-md bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-600">{event.eventSection || event.level || "Association Event"}</span>
                    <div className="mt-3 grid gap-1.5 text-[11px] font-medium text-slate-500"><p className="flex items-center gap-2"><Calendar size={13} />{eventDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p><p className="flex items-center gap-2"><Clock size={13} />{event.time || "09:00 AM onwards"}</p><p className="flex items-center gap-2"><MapPin size={13} /><span className="line-clamp-1">{event.location}</span></p></div>
                    {event.description && <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{event.description}</p>}
                    <div className="mt-4">{registered ? <button onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }} className="w-full rounded-lg border border-orange-400 py-2 text-xs font-extrabold text-orange-600">View Details</button> : <button onClick={(e) => { e.stopPropagation(); void handleApply(event); }} className="w-full rounded-lg bg-[#ff5a0a] py-2 text-xs font-extrabold text-white shadow-sm">Register</button>}</div>
                  </div>
                </motion.article>
              ); })}
            </div>
          )}
        </section>

        <aside className="space-y-3">
          {featuredEvent && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><h2 className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-black text-[#10244b]"><Star size={17} className="fill-amber-400 text-amber-400" />Featured Event</h2><div className="relative h-36 overflow-hidden bg-gradient-to-br from-[#183f78] via-[#426fa8] to-[#f0b278] p-5 text-white"><span className="absolute right-3 top-3 rounded-full bg-[#ff5a0a] px-3 py-1 text-[10px] font-black">Featured</span><p className="mt-6 max-w-[80%] text-xl font-black uppercase leading-tight">{featuredEvent.title}</p></div><div className="p-4"><h3 className="font-black text-[#10244b]">{featuredEvent.title}</h3><p className="mt-1 text-[11px] text-slate-500">Organized by Tamil Nadu Judo Association</p><p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Calendar size={14} />{new Date(featuredEvent.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p><p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><MapPin size={14} />{featuredEvent.location}</p><button onClick={() => setSelectedEvent(featuredEvent)} className="mt-4 w-full rounded-lg bg-[#ff5a0a] py-2.5 text-xs font-extrabold text-white">View Event â€º</button></div></section>}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="flex items-center gap-2 text-sm font-black text-[#10244b]"><BarChart3 size={17} className="text-orange-500" />My Event Status</h2><div className="mt-3 grid grid-cols-3 gap-2">{[{ label: "Registered", value: registeredEvents.length, icon: User, style: "bg-emerald-50 text-emerald-600" }, { label: "Pending", value: registeredEvents.filter((event) => event.registrations?.[0]?.status === "PENDING").length, icon: Clock, style: "bg-orange-50 text-orange-600" }, { label: "Attended", value: pastEvents.filter((event) => event.registrations?.length).length, icon: Trophy, style: "bg-blue-50 text-blue-600" }].map((item) => { const Icon = item.icon; return <div key={item.label} className={`rounded-xl p-3 text-center ${item.style}`}><Icon size={19} className="mx-auto" /><p className="mt-1 text-[9px] font-bold">{item.label}</p><p className="text-xl font-black">{item.value}</p></div>; })}</div></section>
        </aside>
      </div>
      {/* Create Event Modal */}
      <AnimatePresence>
        {canProposeEvent && isCreateModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm ">
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
                  <div className="md:col-span-2" ref={sectionRef}>
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Event Section
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setSectionOpen(o => !o)}
                        className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-[#FF7400]/60 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/40 transition-all"
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
                      <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Meeting Link</label>
                      <input 
                        type="url" 
                        required
                        value={formData.meetingLink}
                        onChange={e => setFormData({ ...formData, meetingLink: e.target.value })}
                        placeholder="e.g. https://meet.google.com/abc-defg-hij"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Event Title</label>
                    <input 
                      type="text" 
                      required
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="Enter a descriptive title"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Date</label>
                    <input 
                      type="date" 
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Location</label>
                    <input 
                      type="text" 
                      required
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      placeholder="e.g. Nehru Stadium"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Event Level</label>
                    <select
                      value={formData.level}
                      onChange={e => setFormData({...formData, level: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold"
                    >
                      <option value="DISTRICT">District Level</option>
                      <option value="ZONE">Zone Level</option>
                      <option value="STATE">State Level</option>
                    </select>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Target Audience</label>
                    <select
                      value={formData.participantType}
                      onChange={e => setFormData({...formData, participantType: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold"
                    >
                      <option value="ALL">Everyone</option>
                      <option value="STUDENT">Players Only</option>
                      <option value="COACH">Coaches/Referees Only</option>
                      <option value="MEMBER">Members Only</option>
                      <option value="CLUB">Clubs Only</option>
                    </select>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Entry Type</label>
                    <select
                      value={formData.isPaid ? "paid" : "free"}
                      onChange={e => setFormData({...formData, isPaid: e.target.value === "paid", entryFee: e.target.value === "free" ? "" : formData.entryFee})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold"
                    >
                      <option value="free">Free</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>

                  {formData.isPaid && (
                    <div className="md:col-span-1">
                      <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Entry Fee (â‚¹)</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        value={formData.entryFee}
                        onChange={e => setFormData({...formData, entryFee: e.target.value})}
                        placeholder="Enter amount in â‚¹"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold"
                      />
                    </div>
                  )}

                  {formData.level === "DISTRICT" && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Select District</label>
                      <select 
                        required
                        value={formData.districtId}
                        onChange={e => setFormData({...formData, districtId: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold"
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
                      <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Select Zone</label>
                      <select 
                        required
                        value={formData.zoneId}
                        onChange={e => setFormData({...formData, zoneId: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold"
                      >
                        <option value="">Select Zone</option>
                        {getFilteredZonesForCreation().map(z => (
                          <option key={z} value={z}>{z}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                    <textarea 
                      required
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="Detailed description of the event..."
                      className="w-full h-32 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all resize-none"
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
                  <p className="text-slate-500">Update the details of your proposed event.</p>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 bg-slate-100 text-slate-400 hover:text-red-500 rounded-full transition-all cursor-pointer"
                >
                  <XCircle size={28} />
                </button>
              </div>

              <form className="space-y-6" onSubmit={handleUpdate}>
                {/* Same form fields as Create */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2" ref={sectionRef}>
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Event Section
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setSectionOpen(o => !o)}
                        className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-[#FF7400]/60 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/40 transition-all"
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
                      <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Meeting Link</label>
                      <input 
                        type="url" 
                        required
                        value={formData.meetingLink}
                        onChange={e => setFormData({ ...formData, meetingLink: e.target.value })}
                        placeholder="e.g. https://meet.google.com/abc-defg-hij"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Event Title</label>
                    <input 
                      type="text" 
                      required
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="Enter a descriptive title"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Date</label>
                    <input 
                      type="date" 
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Location</label>
                    <input 
                      type="text" 
                      required
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      placeholder="e.g. Nehru Stadium"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Event Level</label>
                    <select
                      value={formData.level}
                      onChange={e => setFormData({...formData, level: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold"
                    >
                      <option value="DISTRICT">District Level</option>
                      <option value="ZONE">Zone Level</option>
                      <option value="STATE">State Level</option>
                    </select>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Target Audience</label>
                    <select
                      value={formData.participantType}
                      onChange={e => setFormData({...formData, participantType: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold"
                    >
                      <option value="ALL">Everyone</option>
                      <option value="STUDENT">Players Only</option>
                      <option value="COACH">Coaches/Referees Only</option>
                      <option value="MEMBER">Members Only</option>
                      <option value="CLUB">Clubs Only</option>
                    </select>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Entry Type</label>
                    <select
                      value={formData.isPaid ? "paid" : "free"}
                      onChange={e => setFormData({...formData, isPaid: e.target.value === "paid", entryFee: e.target.value === "free" ? "" : formData.entryFee})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold"
                    >
                      <option value="free">Free</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>

                  {formData.isPaid && (
                    <div className="md:col-span-1">
                      <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Entry Fee (â‚¹)</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        value={formData.entryFee}
                        onChange={e => setFormData({...formData, entryFee: e.target.value})}
                        placeholder="Enter amount in â‚¹"
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold"
                      />
                    </div>
                  )}

                  {formData.level === "DISTRICT" && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Select District</label>
                      <select 
                        required
                        value={formData.districtId}
                        onChange={e => setFormData({...formData, districtId: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold"
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
                      <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Select Zone</label>
                      <select 
                        required
                        value={formData.zoneId}
                        onChange={e => setFormData({...formData, zoneId: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold"
                      >
                        <option value="">Select Zone</option>
                        {getFilteredZonesForCreation().map(z => (
                          <option key={z} value={z}>{z}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                    <textarea 
                      required
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="Detailed description of the event..."
                      className="w-full h-32 px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all resize-none"
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
          <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
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
                  className="p-2 bg-slate-100 text-slate-400 hover:text-red-500 rounded-full transition-all"
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
                    <span className="font-bold text-md text-[#FF7400]">â‚¹</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entry Fee</p>
                    <p className="text-sm font-bold text-slate-700">{selectedEvent.isPaid ? `â‚¹ ${selectedEvent.entryFee}` : 'Free Entry'}</p>
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

              {/* Close / Action Button */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="flex-grow py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all font-semibold"
                >
                  Close Details
                </button>
                {userRole !== "CLUB" && !selectedEvent.registrations?.[0] && (
                  <button
                    onClick={() => {
                      handleApply(selectedEvent);
                      setSelectedEvent(null);
                    }}
                    className="flex-grow py-4 bg-[#FF7400] text-white font-bold rounded-2xl shadow-xl shadow-[#FF7400]/20 hover:scale-[1.02] active:scale-[0.98] transition-all font-semibold"
                  >
                    Apply Now
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
