"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Users, 
  Search, 
  Download, 
  Mail, 
  Phone,
  Loader2,
  Eye,
  X,
  FileText,
  CheckCircle2,
  UserRound,
  ShieldCheck,
  MapPin,
  RotateCcw
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";

export default function MembersListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [members, setMembers] = useState<any[]>([]);
  const [districtName, setDistrictName] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        
        const [membersRes, profileRes] = await Promise.all([
          fetch(`${API_BASE}/users/all`, {
            headers: { "Authorization": `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/auth/profile`, {
            headers: { "Authorization": `Bearer ${token}` }
          })
        ]);

        const membersData = await membersRes.json();
        const profileData = await profileRes.json();

        if (membersRes.ok) {
          const approved = membersData.filter((u: any) => u.status === "APPROVED");
          setMembers(approved);
        }

        if (profileRes.ok && profileData.user?.district) {
          setDistrictName(profileData.user.district.name);
        }
      } catch (err) {
        console.error("Failed to fetch directory data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.permanentId && m.permanentId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase());
      
    const mGender = (m.gender || "MALE").toUpperCase();
    const matchesGender = genderFilter === "ALL" || mGender === genderFilter;
    const matchesRole = roleFilter === "ALL" || m.role === roleFilter;
    const memberDistrict = m.assignedDistrict?.name || m.district?.name || m.districtName || m.talukName || "";
    const matchesDistrict = districtFilter === "ALL" || memberDistrict === districtFilter;

    return matchesSearch && matchesGender && matchesRole && matchesDistrict;
  });

  const roles = Array.from(new Set(members.map(member => member.role).filter(Boolean))).sort();
  const memberDistricts = Array.from(new Set(members.map(member => member.assignedDistrict?.name || member.district?.name || member.districtName || member.talukName).filter(Boolean))).sort();
  const coachCount = members.filter(member => member.role === "COACH").length;
  const playerCount = members.filter(member => member.role === "PLAYER" || member.role === "STUDENT").length;
  const officialCount = members.filter(member => ["REFEREE", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO", "SUPER_ADMIN"].includes(member.role)).length;

  const handleExportCSV = () => {
    try {
      if (!filteredMembers || filteredMembers.length === 0) {
        alert("No data to export");
        return;
      }

      const headers = [
        "Full Name",
        "Role",
        "Gender",
        "Email",
        "Mobile Number",
        "District",
        "Taluk",
        "Permanent ID",
        "Joined Date"
      ];

      const rows = filteredMembers.map(m => {
        let createdDate = "-";
        try { createdDate = m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "-"; } catch (e) {}

        return [
          m.fullName || "-",
          m.role || "-",
          m.gender || "-",
          m.email || "-",
          m.mobileNumber || "-",
          m.districtName || "-",
          m.talukName || "-",
          m.permanentId || "-",
          createdDate
        ];
      });

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `members_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert("Export failed: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="overflow-hidden rounded-2xl border border-orange-100 bg-[linear-gradient(120deg,#fffaf5_0%,#ffffff_58%,#ffe9df_100%)] px-5 py-5 shadow-sm sm:px-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-orange-100 text-[#ff6b00] shadow-sm"><Users size={28} /></span><div><p className="text-xs font-semibold text-slate-400">Dashboard / Members List</p><h1 className="mt-1 text-3xl font-black tracking-tight text-[#ff6b00]">Members List</h1><p className="mt-1 text-sm text-slate-500">Manage registered members {districtName ? `in ${districtName}` : "within your jurisdiction"}.</p></div></div>
          <button onClick={handleExportCSV} className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-300 bg-white px-6 py-3 text-sm font-extrabold text-[#ff6b00] shadow-sm transition hover:bg-orange-50"><Download size={17} />Export CSV</button>
        </div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total Members", value: members.length, icon: Users, wrap: "border-orange-200 bg-orange-50/70", iconStyle: "bg-orange-100 text-orange-600" },
          { label: "Active Members", value: members.length, icon: CheckCircle2, wrap: "border-emerald-200 bg-emerald-50/70", iconStyle: "bg-emerald-100 text-emerald-600" },
          { label: "Coaches", value: coachCount, icon: UserRound, wrap: "border-amber-200 bg-amber-50/70", iconStyle: "bg-amber-100 text-amber-600" },
          { label: "Players", value: playerCount, icon: UserRound, wrap: "border-blue-200 bg-blue-50/70", iconStyle: "bg-blue-100 text-blue-600" },
          { label: "Officials", value: officialCount, icon: ShieldCheck, wrap: "border-purple-200 bg-purple-50/70", iconStyle: "bg-purple-100 text-purple-600" },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }} className={`flex items-center gap-3 rounded-2xl border p-4 shadow-sm ${stat.wrap}`}><span className={`grid size-12 shrink-0 place-items-center rounded-full ${stat.iconStyle}`}><Icon size={23} /></span><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-500">{stat.label}</p><p className="mt-1 text-3xl font-black leading-none text-[#111b3a]">{stat.value}</p></div></motion.div>;
        })}
      </section>

      {/* Filters */}
      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(260px,1fr)_170px_190px_auto_auto]">
        <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-inset ring-slate-100 focus-within:ring-orange-200"><Search size={17} className="text-slate-400" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by name, email, mobile or ID..." className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400" /></label>
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none focus:border-orange-300"><option value="ALL">All Roles</option>{roles.map(role => <option key={role} value={role}>{String(role).replaceAll("_", " ")}</option>)}</select>
        <select value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none focus:border-orange-300"><option value="ALL">All Districts</option>{memberDistricts.map(district => <option key={district} value={district}>{district}</option>)}</select>
        <div className="flex rounded-xl bg-slate-100 p-1">{(["ALL", "MALE", "FEMALE"] as const).map(gender => <button key={gender} onClick={() => setGenderFilter(gender)} className={`rounded-lg px-4 py-2 text-xs font-extrabold transition ${genderFilter === gender ? "bg-white text-[#ff6b00] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{gender === "ALL" ? "All" : gender === "MALE" ? "Male" : "Female"}</button>)}</div>
        <button onClick={() => { setSearchTerm(""); setGenderFilter("ALL"); setRoleFilter("ALL"); setDistrictFilter("ALL"); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 px-4 py-2.5 text-xs font-extrabold text-[#ff6b00] transition hover:bg-orange-50"><RotateCcw size={15} />Reset</button>
      </section>

      {/* Members table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3"><Loader2 size={36} className="animate-spin text-[#ff6b00]" /><p className="text-sm font-semibold text-slate-400">Loading member directory...</p></div>
        ) : filteredMembers.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-center"><span className="grid size-16 place-items-center rounded-full bg-slate-50 text-slate-300"><Users size={29} /></span><div><h3 className="font-extrabold text-slate-600">No members found</h3><p className="mt-1 text-sm text-slate-400">Try changing your filters or search term.</p></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-xs">
              <thead className="border-b border-slate-100 bg-[#f8fafc] text-slate-500"><tr><th className="w-14 px-5 py-4 font-bold">#</th><th className="px-3 py-4 font-bold">Member</th><th className="px-3 py-4 font-bold">Member ID</th><th className="px-3 py-4 font-bold">Role</th><th className="px-3 py-4 font-bold">Contact</th><th className="px-3 py-4 font-bold">Location</th><th className="px-3 py-4 font-bold">Status</th><th className="px-3 py-4 font-bold">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((member, index) => {
                  const location = member.assignedDistrict?.name || member.district?.name || member.districtName || member.talukName || "—";
                  const initials = String(member.fullName || "M").split(" ").slice(0, 2).map((part: string) => part.charAt(0)).join("").toUpperCase();
                  const role = String(member.role || "MEMBER");
                  return (
                    <motion.tr key={member.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .02 }} className="hover:bg-orange-50/20">
                      <td className="px-5 py-4 font-black text-slate-500">{index + 1}</td>
                      <td className="px-3 py-4"><div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 font-black text-slate-500">{member.profilePhoto ? <img src={member.profilePhoto} alt="" className="size-full object-cover" /> : initials}</span><div className="min-w-0"><p className="max-w-[240px] truncate text-sm font-extrabold text-slate-800">{member.fullName}</p><p className="mt-1 text-[10px] font-semibold capitalize text-slate-400">{String(member.gender || "Male").toLowerCase()}</p></div></div></td>
                      <td className="px-3 py-4 font-extrabold text-slate-700">{member.permanentId || member.tempId || "—"}</td>
                      <td className="px-3 py-4"><span className="rounded-lg bg-slate-900 px-2.5 py-1 font-black uppercase tracking-wide text-amber-300">{role.replaceAll("_", " ")}</span></td>
                      <td className="px-3 py-4"><p className="flex items-center gap-2 font-semibold text-slate-600"><Phone size={13} className="text-[#ff6b00]" />{member.mobileNumber || "—"}</p><p className="mt-1.5 flex max-w-[220px] items-center gap-2 truncate text-[10px] text-slate-500"><Mail size={13} className="shrink-0 text-[#ff6b00]" />{member.email}</p></td>
                      <td className="px-3 py-4"><span className="inline-flex items-center gap-1.5 font-semibold text-slate-600"><MapPin size={14} className="text-slate-400" />{location}</span></td>
                      <td className="px-3 py-4"><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-extrabold text-emerald-700"><span className="size-2 rounded-full bg-emerald-500" />Active</span></td>
                      <td className="px-3 py-4"><button onClick={() => { setSelectedMember(member); setIsDetailModalOpen(true); }} title="View member" className="grid size-9 place-items-center rounded-lg bg-slate-50 text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"><Eye size={16} /></button></td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between"><p>Showing {filteredMembers.length ? 1 : 0} to {filteredMembers.length} of {filteredMembers.length} members</p><span className="grid size-9 place-items-center rounded-lg bg-[#ff6b00] font-black text-white">1</span></div>
      </section>
      <AnimatePresence>
        {isDetailModalOpen && selectedMember && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl bg-white rounded-3xl p-8 shadow-2xl max-h-[80vh] overflow-y-auto scrollbar-hide"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 text-[#FF7400] rounded-2xl flex items-center justify-center font-bold text-xl overflow-hidden relative">
                    {selectedMember.profilePhoto ? (
                      <img src={selectedMember.profilePhoto} alt={selectedMember.fullName} className="w-full h-full object-cover" />
                    ) : (
                      selectedMember.fullName.charAt(0)
                    )}
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-slate-800">{selectedMember.fullName}</h3>
                    <p className="text-xs text-slate-500 font-medium">Approved {selectedMember.role.replace("_", " ")}</p>
                  </div>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">
                  <X size={22} className="text-slate-500" />
                </button>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(selectedMember)
                    .filter(([k]) => !["password", "id", "district", "taluk", "districtId", "talukId"].includes(k))
                    .map(([key, val]: any) => {
                      const isUploadUrl = typeof val === "string" && (val.startsWith("http://") || val.startsWith("https://") || val.includes("/uploads/"));
                      return (
                        <tr key={key} className="border-b border-slate-100 last:border-0">
                          <td className="py-3.5 pr-4 font-semibold text-slate-500 capitalize w-44">
                            {key.replace(/([A-Z])/g, " $1")}
                          </td>
                          <td className="py-3.5 text-slate-800 break-words">
                            {isUploadUrl ? (
                              <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-150 w-fit animate-in fade-in duration-200">
                                {val.toLowerCase().endsWith(".pdf") ? (
                                  <div className="p-2.5 bg-red-50 text-red-500 rounded-lg">
                                    <FileText size={20} />
                                  </div>
                                ) : (
                                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-white">
                                    <img src={val} alt="Preview" className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div className="flex flex-col gap-1 pr-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document File</span>
                                  <div className="flex gap-2">
                                    <a 
                                      href={val} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-600 hover:text-[#FF7400] hover:border-[#FF7400] rounded-md transition-all font-semibold text-xs shadow-sm"
                                    >
                                      <Eye size={12} />
                                      View
                                    </a>
                                    <a 
                                      href={val} 
                                      download
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FF7400] text-white hover:bg-[#E56900] rounded-md transition-all font-bold text-xs shadow-sm"
                                    >
                                      <Download size={12} />
                                      Download
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ) : typeof val === "object" && val !== null ? (
                              (val as any).name || JSON.stringify(val)
                            ) : (
                              String(val ?? "-")
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
    </div>
  );
}
