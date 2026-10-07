"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Search,
  Loader2,
  Clock,
  Reply,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  ImageIcon,
  FileText,
  Download,
  ZoomIn,
  MapPin,
  Eye,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";

export default function AdminGrievancePage() {
  const [grievances, setGrievances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [selectedGrievance, setSelectedGrievance] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [remarkText, setRemarkText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    setUserRole(localStorage.getItem("userRole"));
    fetchGrievances();
  }, []);

  const fetchGrievances = async () => {
    try {
      const res = await fetch(`${API_BASE}/grievances`);
      const data = await res.json();
      if (res.ok) setGrievances(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/grievances/${selectedGrievance.id}/reply`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText })
      });
      if (res.ok) {
        setReplyText("");
        setSelectedGrievance(null);
        fetchGrievances();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!remarkText.trim()) return;
    setClosing(true);
    try {
      const res = await fetch(`${API_BASE}/grievances/${selectedGrievance.id}/close`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remark: remarkText })
      });
      if (res.ok) {
        setRemarkText("");
        setSelectedGrievance(null);
        fetchGrievances();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClosing(false);
    }
  };

  const filteredGrievances = grievances.filter(g => {
    const matchesSearch = 
      g.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.userId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "ALL" || g.role === roleFilter;
    const grievanceDistrict = g.district?.name || g.districtName || g.location || "";
    const matchesDistrict = districtFilter === "ALL" || grievanceDistrict === districtFilter;
    const matchesBase = matchesSearch && matchesRole && matchesDistrict;
    
    if (filter === "all") return matchesBase;
    if (filter === "pending") return matchesBase && g.status === "PENDING";
    if (filter === "replied") return matchesBase && (g.status === "REPLAY" || g.reply) && g.status !== "CLOSED";
    if (filter === "closed") return matchesBase && g.status === "CLOSED";
    return matchesBase;
  });

  const pendingCount = grievances.filter(grievance => grievance.status === "PENDING").length;
  const repliedCount = grievances.filter(grievance => (grievance.status === "REPLAY" || grievance.reply) && grievance.status !== "CLOSED").length;
  const closedCount = grievances.filter(grievance => grievance.status === "CLOSED").length;
  const grievanceRoles = Array.from(new Set(grievances.map(grievance => grievance.role).filter(Boolean))).sort();
  const grievanceDistricts = Array.from(new Set(grievances.map(grievance => grievance.district?.name || grievance.districtName || grievance.location).filter(Boolean))).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-brand-orange animate-spin" />
      </div>
    );
  }

  if (userRole && !["SUPER_ADMIN", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY"].includes(userRole)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <AlertCircle size={48} className="text-red-500" />
        <h2 className="text-2xl font-bold text-slate-800">Unauthorized Access</h2>
        <p className="text-slate-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="overflow-hidden rounded-2xl border border-orange-100 bg-[linear-gradient(120deg,#fffaf5_0%,#ffffff_58%,#ffe9df_100%)] px-5 py-5 shadow-sm sm:px-7">
        <div className="flex items-center gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-orange-100 text-[#ff6b00] shadow-sm"><MessageSquare size={27} /></span><div><p className="text-xs font-semibold text-slate-400">Dashboard / Grievances</p><h1 className="mt-1 text-3xl font-black tracking-tight text-[#ff6b00]">Grievance Management</h1><p className="mt-1 text-sm text-slate-500">Review and respond to complaints from students, coaches and referees.</p></div></div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Grievances", value: grievances.length, icon: FileText, wrap: "border-orange-200 bg-orange-50/70", iconStyle: "bg-orange-100 text-orange-600" },
          { label: "Pending", value: pendingCount, icon: Clock, wrap: "border-amber-200 bg-amber-50/70", iconStyle: "bg-amber-100 text-amber-600" },
          { label: "Replied", value: repliedCount, icon: Reply, wrap: "border-emerald-200 bg-emerald-50/70", iconStyle: "bg-emerald-100 text-emerald-600" },
          { label: "Closed", value: closedCount, icon: CheckCircle2, wrap: "border-blue-200 bg-blue-50/70", iconStyle: "bg-blue-100 text-blue-600" },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05 }} className={`flex items-center gap-4 rounded-2xl border p-5 shadow-sm ${stat.wrap}`}><span className={`grid size-14 shrink-0 place-items-center rounded-full ${stat.iconStyle}`}><Icon size={25} /></span><div className="min-w-0"><p className="text-xs font-semibold text-slate-500">{stat.label}</p><p className="mt-1 text-3xl font-black leading-none text-[#111b3a]">{stat.value}</p></div></motion.div>;
        })}
      </section>

      {/* Filters */}
      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(260px,1fr)_170px_190px_auto]">
        <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-inset ring-slate-100 focus-within:ring-orange-200"><Search size={17} className="text-slate-400" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by name, ID, subject or grievance..." className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400" /></label>
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none focus:border-orange-300"><option value="ALL">All Roles</option>{grievanceRoles.map(role => <option key={role} value={role}>{String(role).replaceAll("_", " ")}</option>)}</select>
        <select value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none focus:border-orange-300"><option value="ALL">All Districts</option>{grievanceDistricts.map(district => <option key={district} value={district}>{district}</option>)}</select>
        <button onClick={() => { setSearchTerm(""); setFilter("all"); setRoleFilter("ALL"); setDistrictFilter("ALL"); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 px-4 py-2.5 text-xs font-extrabold text-[#ff6b00] transition hover:bg-orange-50"><RotateCcw size={15} />Reset</button>
      </section>

      {/* Status tabs */}
      <section className="overflow-x-auto border-b border-slate-200">
        <div className="flex min-w-max gap-1">{[
          { id: "all", label: "All", count: grievances.length },
          { id: "pending", label: "Pending", count: pendingCount },
          { id: "replied", label: "Replied", count: repliedCount },
          { id: "closed", label: "Closed", count: closedCount },
        ].map(tab => <button key={tab.id} onClick={() => setFilter(tab.id)} className={`border-b-2 px-5 py-3 text-sm font-extrabold transition ${filter === tab.id ? "border-[#ff6b00] text-[#ff6b00]" : "border-transparent text-slate-400 hover:text-slate-700"}`}>{tab.label}<span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${filter === tab.id ? "bg-orange-50" : "bg-slate-100"}`}>{tab.count}</span></button>)}</div>
      </section>

      {/* Grievances table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {filteredGrievances.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-center"><span className="grid size-16 place-items-center rounded-full bg-slate-50 text-slate-300"><MessageSquare size={29} /></span><div><h3 className="font-extrabold text-slate-600">No grievances found</h3><p className="mt-1 text-sm text-slate-400">Try changing your filters or search term.</p></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-xs">
              <thead className="border-b border-slate-100 bg-[#f8fafc] text-slate-500"><tr><th className="w-14 px-5 py-4 font-bold">#</th><th className="px-3 py-4 font-bold">Grievance Details</th><th className="px-3 py-4 font-bold">Raised By</th><th className="px-3 py-4 font-bold">Role</th><th className="px-3 py-4 font-bold">Location</th><th className="px-3 py-4 font-bold">Date</th><th className="px-3 py-4 font-bold">Status</th><th className="px-3 py-4 font-bold">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGrievances.map((grievance, index) => {
                  const location = grievance.district?.name || grievance.districtName || grievance.location || "—";
                  const replied = (grievance.status === "REPLAY" || grievance.reply) && grievance.status !== "CLOSED";
                  const displayStatus = grievance.status === "CLOSED" ? "Closed" : replied ? "Replied" : "Pending";
                  const statusClass = displayStatus === "Closed" ? "bg-slate-100 text-slate-600" : displayStatus === "Replied" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700";
                  const dotClass = displayStatus === "Closed" ? "bg-slate-500" : displayStatus === "Replied" ? "bg-emerald-500" : "bg-amber-500";
                  const initials = String(grievance.userName || "U").split(" ").slice(0,2).map((part: string) => part.charAt(0)).join("").toUpperCase();
                  const openGrievance = () => { setSelectedGrievance(grievance); setReplyText(grievance.reply || ""); setRemarkText(grievance.remark || ""); };
                  return (
                    <motion.tr key={grievance.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .02 }} className="hover:bg-orange-50/20">
                      <td className="px-5 py-4 font-black text-slate-500">{index + 1}</td>
                      <td className="px-3 py-4"><div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 font-black text-slate-500">{initials}</span><div className="min-w-0"><p className="max-w-[260px] truncate text-sm font-extrabold text-slate-800">{grievance.subject}</p><p className="mt-1 max-w-[270px] truncate text-[10px] text-slate-400">{grievance.description}</p></div></div></td>
                      <td className="px-3 py-4"><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-full bg-slate-100 font-black text-slate-500">{initials}</span><div><p className="font-extrabold text-slate-700">{grievance.userName}</p><p className="mt-1 text-[10px] text-slate-400">{grievance.userId}</p></div></div></td>
                      <td className="px-3 py-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 font-extrabold text-blue-600">{String(grievance.role || "MEMBER").replaceAll("_", " ")}</span></td>
                      <td className="px-3 py-4"><span className="inline-flex items-center gap-1.5 font-semibold text-slate-600"><MapPin size={14} className="text-slate-400" />{location}</span></td>
                      <td className="px-3 py-4"><p className="font-semibold text-slate-600">{new Date(grievance.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p><p className="mt-1 text-[10px] text-slate-400">{new Date(grievance.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></td>
                      <td className="px-3 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-extrabold ${statusClass}`}><span className={`size-2 rounded-full ${dotClass}`} />{displayStatus}</span></td>
                      <td className="px-3 py-4"><div className="flex items-center gap-2"><button onClick={openGrievance} title="View grievance" className="grid size-9 place-items-center rounded-lg bg-slate-50 text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"><Eye size={16} /></button>{grievance.status !== "CLOSED" && <button onClick={openGrievance} title="Reply" className="grid size-9 place-items-center rounded-lg bg-slate-50 text-slate-600 transition hover:bg-orange-50 hover:text-[#ff6b00]"><Reply size={16} /></button>}</div></td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between"><p>Showing {filteredGrievances.length ? 1 : 0} to {filteredGrievances.length} of {filteredGrievances.length} grievances</p><span className="grid size-9 place-items-center rounded-lg bg-[#ff6b00] font-black text-white">1</span></div>
      </section>
      <AnimatePresence>
        {selectedGrievance && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGrievance(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 space-y-6 overflow-y-auto flex-grow">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-orange-100 text-[#FF7400] rounded text-[10px] font-bold uppercase">{selectedGrievance.role}</span>
                      <span className="text-xs text-slate-400 font-medium">#{selectedGrievance.userId}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">{selectedGrievance.subject}</h2>
                  </div>
                  <button 
                    onClick={() => setSelectedGrievance(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FF7400] rounded-xl flex items-center justify-center text-white font-bold">
                      {selectedGrievance.userName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{selectedGrievance.userName}</p>
                      <p className="text-xs text-slate-400">{selectedGrievance.userEmail}</p>
                    </div>
                  </div>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {selectedGrievance.description}
                  </p>
                </div>

                {/* Attached Images */}
                {selectedGrievance.images?.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <ImageIcon size={14} /> Attached Images ({selectedGrievance.images.length})
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedGrievance.images.map((url: string, i: number) => (
                        <div
                          key={i}
                          className="relative group rounded-2xl overflow-hidden border border-slate-200 aspect-square cursor-pointer"
                          onClick={() => setLightboxUrl(url)}
                        >
                          <img
                            src={url}
                            alt={`attachment-${i + 1}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                            <ZoomIn size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attached Documents */}
                {selectedGrievance.documents?.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={14} /> Attached Documents ({selectedGrievance.documents.length})
                    </p>
                    <div className="space-y-2">
                      {selectedGrievance.documents.map((url: string, i: number) => {
                        const fileName = url.split("/").pop() || `Document ${i + 1}`;
                        return (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
                                <FileText size={16} className="text-white" />
                              </div>
                              <span className="text-sm font-semibold text-blue-800 truncate max-w-xs">{decodeURIComponent(fileName)}</span>
                            </div>
                            <Download size={16} className="text-blue-500 shrink-0 group-hover:text-blue-700 cursor-pointer" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedGrievance.reply && (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-4">Current Reply</p>
                    <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100 italic text-slate-700">
                      {selectedGrievance.reply}
                    </div>
                  </div>
                )}

                {selectedGrievance.remark && (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-4">Remark (Closed)</p>
                    <div className="bg-red-50/50 p-6 rounded-3xl border border-red-100 italic text-slate-700">
                      {selectedGrievance.remark}
                    </div>
                  </div>
                )}

                {["SUPER_ADMIN", "CEO", "STATE_PRESIDENT", "STATE_SECRETARY", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY"].includes(userRole || "") && selectedGrievance.status !== "CLOSED" && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-4">Your Response (Reply)</label>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type your response here..."
                          className="w-full px-6 py-4 bg-slate-50 text-slate-800 placeholder:text-slate-400 border-2 border-transparent focus:border-brand-orange/20 focus:bg-white rounded-3xl outline-none transition-all min-h-[120px] resize-none"
                        />
                        <button
                          disabled={submitting || !replyText.trim()}
                          onClick={handleReply}
                          className="w-full py-4 bg-[#FF7400] text-white rounded-2xl font-bold text-lg hover:bg-[#E56900] transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
                        >
                          {submitting ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                          {selectedGrievance.reply ? "Update Reply" : "Send Reply"}
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-4">Remark (For Closing)</label>
                        <textarea
                          value={remarkText}
                          onChange={(e) => setRemarkText(e.target.value)}
                          placeholder="Type remark before closing..."
                          className="w-full px-6 py-4 bg-slate-50 text-slate-800 placeholder:text-slate-400 border-2 border-transparent focus:border-red-500/20 focus:bg-white rounded-3xl outline-none transition-all min-h-[120px] resize-none"
                        />
                        <button
                          disabled={closing || !remarkText.trim()}
                          onClick={handleClose}
                          className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold text-lg hover:bg-red-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
                        >
                          {closing ? <Loader2 className="animate-spin" /> : <X size={20} />}
                          Close with Remark
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Lightbox */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxUrl(null)}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out"
          >
            <motion.img
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              src={lightboxUrl}
              alt="full view"
              className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
              onClick={e => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
            >
              <X size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
