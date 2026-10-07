"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  MapPin, 
  Users, 
  Search,
  ArrowRight,
  TrendingUp,
  Loader2,
  RotateCcw,
  ShieldCheck,
  UserRound
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";

export default function LocationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [taluks, setTaluks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/admin/location-analytics`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setTaluks(data);
        }
      } catch (err) {
        console.error("Failed to fetch location analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const filteredTaluks = taluks.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDistrictMembers = taluks.reduce((acc, t) => acc + t.total, 0);
  const totalClubs = taluks.reduce((acc, taluk) => acc + taluk.clubs, 0);
  const totalMembers = taluks.reduce((acc, taluk) => acc + taluk.members, 0);
  const totalPlayers = taluks.reduce((acc, taluk) => acc + taluk.players, 0);
  const mostActiveTaluk = taluks.length > 0 ? taluks[0] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="overflow-hidden rounded-2xl border border-orange-100 bg-[linear-gradient(120deg,#fffaf5_0%,#ffffff_58%,#ffe9df_100%)] px-5 py-5 shadow-sm sm:px-7">
        <div className="flex items-center gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-full bg-orange-100 text-[#ff6b00] shadow-sm"><MapPin size={28} /></span><div><p className="text-xs font-semibold text-slate-400">Dashboard / Locations</p><h1 className="mt-1 text-3xl font-black tracking-tight text-[#ff6b00]">Location Analytics</h1><p className="mt-1 text-sm text-slate-500">Member distribution across taluks. View registration totals and location activity.</p></div></div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Taluks", value: taluks.length, icon: MapPin, wrap: "border-orange-200 bg-orange-50/70", iconStyle: "bg-orange-100 text-orange-600" },
          { label: "Clubs", value: totalClubs, icon: ShieldCheck, wrap: "border-purple-200 bg-purple-50/70", iconStyle: "bg-purple-100 text-purple-600" },
          { label: "Members", value: totalMembers, icon: Users, wrap: "border-emerald-200 bg-emerald-50/70", iconStyle: "bg-emerald-100 text-emerald-600" },
          { label: "Players", value: totalPlayers, icon: UserRound, wrap: "border-blue-200 bg-blue-50/70", iconStyle: "bg-blue-100 text-blue-600" },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05 }} className={`flex items-center gap-4 rounded-2xl border p-5 shadow-sm ${stat.wrap}`}><span className={`grid size-14 shrink-0 place-items-center rounded-full ${stat.iconStyle}`}><Icon size={25} /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-500">{stat.label}</p><p className="mt-1 text-3xl font-black leading-none text-[#111b3a]">{stat.value}</p></div><ArrowRight size={19} className="text-slate-400" /></motion.div>;
        })}
      </section>

      <section className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {/* Search */}
          <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-inset ring-slate-100 focus-within:ring-orange-200"><Search size={17} className="text-slate-400" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search taluk..." className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400" /></label>
            <button onClick={() => setSearchTerm("")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 px-4 py-2.5 text-xs font-extrabold text-[#ff6b00] transition hover:bg-orange-50"><RotateCcw size={15} />Reset</button>
          </div>

          {/* Taluk table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="flex min-h-80 flex-col items-center justify-center gap-3"><Loader2 size={36} className="animate-spin text-[#ff6b00]" /><p className="text-sm font-semibold text-slate-400">Analyzing locations...</p></div>
            ) : filteredTaluks.length === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-center"><span className="grid size-16 place-items-center rounded-full bg-slate-50 text-slate-300"><MapPin size={29} /></span><div><h3 className="font-extrabold text-slate-600">No locations found</h3><p className="mt-1 text-sm text-slate-400">Try another taluk search.</p></div></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-xs">
                  <thead className="border-b border-slate-100 bg-[#f8fafc] text-slate-500"><tr><th className="w-14 px-5 py-4 font-bold">#</th><th className="px-3 py-4 font-bold">Taluk Name</th><th className="px-3 py-4 text-center font-bold">Clubs</th><th className="px-3 py-4 text-center font-bold">Coaches</th><th className="px-3 py-4 text-center font-bold">Members</th><th className="px-3 py-4 text-center font-bold">Players</th><th className="px-3 py-4 font-bold">Status</th><th className="px-3 py-4 text-center font-bold">Action</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTaluks.map((taluk, index) => (
                      <motion.tr key={taluk.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .02 }} className="hover:bg-orange-50/20">
                        <td className="px-5 py-4 font-black text-slate-500">{index + 1}</td>
                        <td className="px-3 py-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-orange-50 font-black text-[#ff6b00]">{taluk.name.charAt(0)}</span><div><p className="text-sm font-extrabold text-slate-800">{taluk.name}</p><p className="mt-1 text-[10px] text-slate-400">{taluk.total} registrations</p></div></div></td>
                        <td className="px-3 py-4 text-center"><span className="rounded-full bg-purple-50 px-3 py-1 font-extrabold text-purple-600">{taluk.clubs}</span></td>
                        <td className="px-3 py-4 text-center"><span className="rounded-full bg-amber-50 px-3 py-1 font-extrabold text-amber-600">{taluk.coaches}</span></td>
                        <td className="px-3 py-4 text-center"><span className="rounded-full bg-emerald-50 px-3 py-1 font-extrabold text-emerald-600">{taluk.members}</span></td>
                        <td className="px-3 py-4 text-center"><span className="rounded-full bg-orange-50 px-3 py-1 font-extrabold text-orange-600">{taluk.players}</span></td>
                        <td className="px-3 py-4"><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-extrabold text-emerald-700"><span className="size-2 rounded-full bg-emerald-500" />Active</span></td>
                        <td className="px-3 py-4 text-center"><button title="Location summary" className="grid size-9 place-items-center rounded-lg bg-slate-50 text-slate-500 transition hover:bg-orange-50 hover:text-[#ff6b00]"><ArrowRight size={16} /></button></td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between"><p>Showing {filteredTaluks.length ? 1 : 0} to {filteredTaluks.length} of {filteredTaluks.length} taluks</p><span className="grid size-9 place-items-center rounded-lg bg-[#ff6b00] font-black text-white">1</span></div>
          </div>
        </div>

        {/* Insights */}
        <aside className="space-y-4">
          <article className="overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#ff5a00,#ff8500)] p-6 text-white shadow-lg shadow-orange-500/20">
            <p className="text-sm font-extrabold">Total Registrations</p><div className="mt-4 flex items-end gap-3"><span className="text-5xl font-black">{totalDistrictMembers}</span><span className="mb-1 inline-flex items-center gap-1 text-sm font-bold text-orange-100"><TrendingUp size={16} />Live</span></div>{mostActiveTaluk && <p className="mt-5 text-xs leading-relaxed text-orange-50">{mostActiveTaluk.name} is currently the most active taluk with {mostActiveTaluk.total} total registrations.</p>}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><h2 className="text-sm font-extrabold text-[#111b3a]">Top Regions</h2><span className="text-[10px] font-bold text-slate-400">By registrations</span></div>
            <div className="mt-5 space-y-5">
              {taluks.slice(0, 5).map((taluk, index) => {
                const maximum = Math.max(mostActiveTaluk?.total || 0, 1);
                const width = Math.round((taluk.total / maximum) * 100);
                const colors = ["bg-orange-500", "bg-purple-500", "bg-emerald-500", "bg-blue-500", "bg-pink-500"];
                return <div key={taluk.id}><div className="flex items-center gap-3"><span className={`h-8 w-1.5 rounded-full ${colors[index]}`} /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="truncate text-xs font-extrabold text-slate-700">{taluk.name}</p><span className="text-xs font-black text-slate-800">{taluk.total}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${colors[index]}`} style={{ width: `${width}%` }} /></div></div></div></div>;
              })}
              {!loading && taluks.length === 0 && <p className="py-8 text-center text-xs font-semibold text-slate-400">No location data available</p>}
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
