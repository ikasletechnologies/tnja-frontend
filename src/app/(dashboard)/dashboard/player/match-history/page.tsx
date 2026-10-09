"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/immutability, react-hooks/set-state-in-effect */

import React, { useEffect, useState, useMemo } from "react";
import {
  Trophy,
  MapPin,
  Download,
  Filter,
  XCircle,
  Loader2,
  Scale,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ListChecks,
} from "lucide-react";
import { motion } from "framer-motion";
import { exportMatchToPDF } from "@/utils/pdfExport";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";

export default function MatchHistoryPage() {
  const [playerData, setPlayerData] = useState<any>(null);
  const [completedMatches, setCompletedMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState("ALL");
  const [filterResult, setFilterResult] = useState("ALL");
  const [filterYear, setFilterYear] = useState("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("No authentication token found. Please login again.");
        setLoading(false);
        return;
      }

      // Fetch profile
      const profileRes = await fetch(`${API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profileData = await profileRes.json();

      if (!profileRes.ok) throw new Error(profileData.error || "Failed to fetch profile");
      setPlayerData(profileData.user);

      // Fetch tournaments
      const trnRes = await fetch(`${API_BASE}/tournaments/player`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const pubRes = await fetch(`${API_BASE}/tournaments/player/matches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      let allTournaments: any[] = [];
      
      if (trnRes.ok) {
        const clubTournaments = await trnRes.json();
        allTournaments = [...allTournaments, ...clubTournaments];
      }
      
      if (pubRes.ok) {
        const pubData = await pubRes.json();
        allTournaments = [
          ...allTournaments,
          ...(pubData.district || []),
          ...(pubData.zonal || []),
          ...(pubData.stateAndNational || [])
        ];
      }
      
      const completed: any[] = [];

      for (const trn of allTournaments) {
        if (trn.myRegistration && (trn.myRegistration.status === "APPROVED" || trn.myRegistration.status === "PENDING")) {
          const drawRes = await fetch(`${API_BASE}/tournaments/${trn.id}/draws`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (drawRes.ok) {
            const draws = await drawRes.json();
            for (const draw of draws) {
              if (draw.rounds) {
                let roundsArr = draw.rounds;
                if (typeof roundsArr === "string") {
                  try { roundsArr = JSON.parse(roundsArr); } catch { continue; }
                }
                if (!Array.isArray(roundsArr)) continue;

                for (let rIdx = 0; rIdx < roundsArr.length; rIdx++) {
                  const round = roundsArr[rIdx];
                  if (!Array.isArray(round)) continue;
                  
                  for (const match of round) {
                    const isPlayerInvolved = match.slotA?.playerId === profileData.user.id || match.slotB?.playerId === profileData.user.id;
                    if (!isPlayerInvolved) continue;

                    if (match.status === "COMPLETED") {
                      const opponent = match.slotA.playerId === profileData.user.id ? match.slotB : match.slotA;
                      
                      completed.push({
                        tournamentId: trn.id,
                        tournamentName: trn.title,
                        tournamentDate: trn.date,
                        tournamentLocation: trn.location,
                        tournamentLevel: trn.level || "CLUB",
                        opponent,
                        roundNum: rIdx + 1,
                        matNumber: match.matNumber,
                        matchNumber: match.matchNumber,
                        rawMatch: match,
                        winnerSlot: match.winnerId === match.slotA.playerId ? match.slotA : match.slotB,
                        loserSlot: match.winnerId === match.slotA.playerId ? match.slotB : match.slotA,
                        nextMatchInfo: null,
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
      
      setCompletedMatches(completed.sort((a, b) => new Date(b.tournamentDate).getTime() - new Date(a.tournamentDate).getTime()));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Derive unique years from history for filter dropdown
  const availableYears = useMemo(() => {
    const years = new Set(completedMatches.map(m => new Date(m.tournamentDate).getFullYear().toString()));
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [completedMatches]);

  // Apply filters
  const filteredMatches = useMemo(() => {
    return completedMatches.filter(match => {
      // Search
      const searchMatch = !searchQuery || 
        match.tournamentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (match.opponent?.playerName && match.opponent.playerName.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Level
      const levelMatch = filterLevel === "ALL" || match.tournamentLevel === filterLevel;
      
      // Result
      let resultMatch = true;
      if (filterResult !== "ALL" && playerData?.id) {
        const isWin = match.rawMatch.winnerId === playerData.id;
        const isDraw = !match.rawMatch.winnerId;
        
        if (filterResult === "WIN") resultMatch = isWin;
        if (filterResult === "LOSS") resultMatch = !isWin && !isDraw;
        if (filterResult === "DRAW") resultMatch = isDraw;
      }
      
      // Year
      const yearMatch = filterYear === "ALL" || new Date(match.tournamentDate).getFullYear().toString() === filterYear;
      
      return searchMatch && levelMatch && resultMatch && yearMatch;
    });
  }, [completedMatches, searchQuery, filterLevel, filterResult, filterYear, playerData]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / itemsPerPage));
  const currentMatches = filteredMatches.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Statistics
  const stats = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let draws = 0;
    
    if (playerData?.id) {
      completedMatches.forEach(match => {
        const isWin = match.rawMatch.winnerId === playerData.id;
        const isDraw = !match.rawMatch.winnerId; // Depending on how draws are stored, adapt this if necessary
        
        if (isDraw) draws++;
        else if (isWin) wins++;
        else losses++;
      });
    }
    
    return { wins, losses, draws, total: wins + losses + draws };
  }, [completedMatches, playerData]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterLevel, filterResult, filterYear]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-[#FF7400] animate-spin" />
        <p className="text-slate-500 font-medium">Loading match history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center gap-4">
        <div className="p-4 bg-red-50 text-red-600 rounded-full">
          <XCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Unable to load history</h2>
        <p className="text-slate-500">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-2 px-6 py-2 bg-[#FF7400] text-white rounded-full font-bold">
          Try Again
        </button>
      </div>
    );
  }

  const resetFilters = () => {
    setSearchQuery(""); setFilterLevel("ALL"); setFilterResult("ALL"); setFilterYear("ALL");
  };
  const winRate = stats.total ? Math.round((stats.wins / stats.total) * 100) : 0;

  return (
    <div className="space-y-4 pb-8">
      <section className="relative overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-r from-[#fff8ef] via-[#fff4e8] to-[#ffe9da] px-5 py-4 shadow-[0_8px_28px_rgba(255,116,0,0.07)]">
        <div className="pointer-events-none absolute inset-y-0 right-8 hidden w-72 bg-[url('/homepage/whatjudo/judo2.png')] bg-contain bg-right bg-no-repeat opacity-[0.12] md:block" />
        <div className="relative flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-full bg-orange-100 text-[#ff6b1a]"><Trophy size={21} /></span><div><h1 className="text-xl font-extrabold text-[#ff6b1a]">Match History</h1><p className="mt-1 text-[10px] font-medium text-slate-400">Review your past performances, results, and download match reports.</p></div></div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total Matches", value: stats.total, icon: ListChecks, tone: "border-orange-100 bg-orange-50/60 text-orange-500", note: `${stats.total} recorded matches` },
          { label: "Wins", value: stats.wins, icon: Trophy, tone: "border-emerald-100 bg-emerald-50/60 text-emerald-500", note: `${winRate}% win rate` },
          { label: "Losses", value: stats.losses, icon: XCircle, tone: "border-rose-100 bg-rose-50/60 text-rose-500", note: stats.total ? `${Math.round((stats.losses / stats.total) * 100)}% loss rate` : "0% loss rate" },
          { label: "Draws", value: stats.draws, icon: Scale, tone: "border-blue-100 bg-blue-50/60 text-blue-500", note: stats.total ? `${Math.round((stats.draws / stats.total) * 100)}% draw rate` : "0% draw rate" },
        ].map((stat) => <article key={stat.label} className={`flex items-center gap-3 rounded-2xl border p-4 ${stat.tone}`}><span className="grid h-11 w-11 place-items-center rounded-full bg-white/70"><stat.icon size={20} /></span><div><p className="text-[9px] font-bold uppercase tracking-wide opacity-80">{stat.label}</p><p className="text-xl font-black text-[#17213b]">{stat.value}</p><p className="text-[8px] font-semibold opacity-80">{stat.note}</p></div></article>)}
      </section>

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_120px_120px_120px_auto_auto]">
        <label className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by tournament, opponent, or result..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[10px] outline-none focus:border-orange-300" /></label>
        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-600"><option value="ALL">All Levels</option><option value="CLUB">Club</option><option value="DISTRICT">District</option><option value="ZONE">Zonal</option><option value="STATE">State</option><option value="NATIONAL">National</option></select>
        <select value={filterResult} onChange={(e) => setFilterResult(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-600"><option value="ALL">All Results</option><option value="WIN">Wins</option><option value="LOSS">Losses</option><option value="DRAW">Draws</option></select>
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-600"><option value="ALL">All Years</option>{availableYears.map(year => <option key={year} value={year}>{year}</option>)}</select>
        <button className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#ff6b1a] px-4 text-[10px] font-bold text-white"><Filter size={13} /> Filter</button>
        <button onClick={resetFilters} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#ff6b1a] bg-white px-4 text-[10px] font-bold text-[#ff6b1a]"><RefreshCw size={13} /> Reset</button>
      </section>

      <div>
        {filteredMatches.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
            <Trophy size={48} className="mx-auto mb-4 text-slate-200" />
            <h3 className="text-xl font-bold text-slate-500">No matches found</h3>
            <p className="text-slate-400 mt-2">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]"><div className="overflow-x-auto"><table className="w-full min-w-[940px] border-collapse text-left"><thead className="bg-slate-50/80 text-[9px] font-bold text-slate-600"><tr><th className="px-4 py-3">#</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Tournament</th><th className="px-3 py-3">Opponent</th><th className="px-3 py-3">Level</th><th className="px-3 py-3">Result</th><th className="px-3 py-3">Score</th><th className="px-3 py-3">Round</th><th className="px-4 py-3 text-center">Action</th></tr></thead><tbody className="divide-y divide-slate-100">
            {currentMatches.map((match, idx) => {
              const isWin = match.rawMatch.winnerId === playerData?.id;
              const isDraw = !match.rawMatch.winnerId;

              return (
                <motion.tr 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  key={`${match.tournamentId}-${match.matchNumber}-${idx}`} 
                  className="text-[9px] text-slate-600 transition hover:bg-orange-50/20"
                >
                  <td className="px-4 py-3 font-bold text-slate-400">{(currentPage - 1) * itemsPerPage + idx + 1}</td><td className="px-3 py-3 font-medium">{new Date(match.tournamentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td><td className="px-3 py-3"><p className="max-w-[210px] truncate text-[10px] font-bold text-slate-700">{match.tournamentName}</p><p className="mt-0.5 flex items-center gap-1 text-[8px] text-slate-400"><MapPin size={9} />{match.tournamentLocation || "Venue not recorded"}</p></td><td className="px-3 py-3"><p className="text-[10px] font-bold text-slate-700">{match.opponent?.playerName || "Unknown"}</p><p className="text-[8px] text-slate-400">{match.opponent?.club || "Club not recorded"}</p></td><td className="px-3 py-3"><span className="rounded-lg bg-blue-50 px-2 py-1 text-[8px] font-bold text-blue-600">{match.tournamentLevel}</span></td><td className="px-3 py-3">{isWin ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 font-bold text-emerald-600"><Trophy size={10} />Win</span> : isDraw ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-bold text-slate-600"><Scale size={10} />Draw</span> : <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 font-bold text-rose-600"><XCircle size={10} />Loss</span>}</td><td className="px-3 py-3 font-semibold">{match.rawMatch.score || match.rawMatch.resultType || "—"}</td><td className="px-3 py-3">Round {match.roundNum}</td><td className="px-4 py-3 text-center"><button
                      onClick={() => {
                        exportMatchToPDF(
                          match.rawMatch,
                          match.winnerSlot,
                          match.loserSlot,
                          { title: match.tournamentName, date: match.tournamentDate, level: match.tournamentLevel, location: match.tournamentLocation },
                          match.roundNum - 1,
                          match.nextMatchInfo
                        );
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#ff6b1a] px-3 py-2 text-[8px] font-bold text-[#ff6b1a] transition hover:bg-[#ff6b1a] hover:text-white"
                    >
                      <Download size={11} /> View Details
                    </button></td>
                </motion.tr>
              );
            })}
          </tbody></table></div><div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[9px] font-medium text-slate-400"><span>Showing {filteredMatches.length ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredMatches.length)} of {filteredMatches.length} matches</span><span>{itemsPerPage} per page</span></div></div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 pt-2">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 disabled:opacity-40"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="rounded-lg bg-[#ff6b1a] px-3 py-2 text-[10px] font-bold text-white">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 disabled:opacity-40"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
