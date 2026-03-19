// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../db';

export default function Leaderboard() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState({ topSourcing: '', topCloser: '' });

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      const { data: applicants } = await supabase.from('applicants').select('status, creator_email');

      const recruiterMap = {};

      applicants.forEach(app => {
        const email = app.creator_email || 'System/Unassigned';
        if (!recruiterMap[email]) {
          recruiterMap[email] = {
            email,
            total: 0,
            hired: 0,
            offerAccepted: 0,
            closingScore: 0, // Offer Accepted + Hired
            archived: 0
          };
        }

        recruiterMap[email].total += 1;
        if (app.status === 'Hired') recruiterMap[email].hired += 1;
        if (app.status === 'Offer Accepted') recruiterMap[email].offerAccepted += 1;
        
        // Calculate Closing Score
        recruiterMap[email].closingScore = recruiterMap[email].hired + recruiterMap[email].offerAccepted;

        if (['Failed Interview', 'Blacklisted', 'Rejected Offer', 'Resigned'].includes(app.status)) {
          recruiterMap[email].archived += 1;
        }
      });

      const leaderData = Object.values(recruiterMap).sort((a, b) => b.closingScore - a.closingScore);

      // Determine Challenge Winners
      const sourcingWinner = [...leaderData].sort((a, b) => b.total - a.total)[0]?.email;
      const closingWinner = [...leaderData].sort((a, b) => b.closingScore - a.closingScore)[0]?.email;

      setChallenges({ topSourcing: sourcingWinner, topCloser: closingWinner });
      setStats(leaderData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse">CALCULATING CHALLENGES...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12 font-sans pb-40">
      
      {/* HEADER */}
      <div className="border-b-8 border-slate-900 pb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-8xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Leaderboard</h1>
          <p className="text-blue-600 font-black uppercase text-xs mt-4 tracking-[0.4em] italic">Weekly Recruitment Challenges</p>
        </div>
      </div>

      {/* CHALLENGE TROPHIES SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Challenge 1: Top Resume Updated (Sourcing Volume) */}
        <div className="bg-blue-600 border-8 border-slate-900 p-10 rounded-[4rem] shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
          <div className="relative z-10">
            <span className="text-4xl">📄</span>
            <h3 className="text-white font-black uppercase italic text-2xl mt-4 tracking-tighter">Top Resume Sourcing</h3>
            <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-6">Highest Number of Uploads</p>
            <p className="text-white text-3xl font-black truncate underline decoration-4 underline-offset-8 decoration-white/30">{challenges.topSourcing}</p>
          </div>
          <div className="absolute -right-10 -bottom-10 text-[180px] font-black text-white/10 italic rotate-12 group-hover:rotate-0 transition-all">#1</div>
        </div>

        {/* Challenge 2: Highest Offer Accepted + Hired (Conversion) */}
        <div className="bg-emerald-500 border-8 border-slate-900 p-10 rounded-[4rem] shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
          <div className="relative z-10">
            <span className="text-4xl">🏆</span>
            <h3 className="text-white font-black uppercase italic text-2xl mt-4 tracking-tighter">Master Closer</h3>
            <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-6">Hired + Offer Accepted Only</p>
            <p className="text-white text-3xl font-black truncate underline decoration-4 underline-offset-8 decoration-white/30">{challenges.topCloser}</p>
          </div>
          <div className="absolute -right-10 -bottom-10 text-[180px] font-black text-white/10 italic rotate-12 group-hover:rotate-0 transition-all">WIN</div>
        </div>
      </div>

      {/* RANKING TABLE */}
      <div className="bg-white border-8 border-slate-900 rounded-[4rem] shadow-[25px_25px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-widest">
              <th className="p-8 italic">Rank</th>
              <th className="p-8 italic">Recruiter</th>
              <th className="p-8 italic text-center">Resumes Updated</th>
              <th className="p-8 italic text-center">Closing Score (Hired + OA)</th>
              <th className="p-8 italic text-center">Success %</th>
            </tr>
          </thead>
          <tbody className="divide-y-4 divide-slate-100 font-bold">
            {stats.map((recruiter, index) => (
              <tr key={recruiter.email} className="hover:bg-slate-50 transition-colors">
                <td className="p-8 text-4xl font-black italic text-slate-300">#{index + 1}</td>
                <td className="p-8">
                   <p className="text-lg font-black text-slate-900">{recruiter.email}</p>
                   {index === 0 && <span className="bg-amber-400 text-[8px] px-2 py-1 rounded font-black uppercase">Current Champion</span>}
                </td>
                <td className="p-8 text-center text-2xl font-black">{recruiter.total}</td>
                <td className="p-8 text-center">
                  <span className="bg-emerald-100 text-emerald-700 px-6 py-2 rounded-full text-2xl font-black">
                    {recruiter.closingScore}
                  </span>
                </td>
                <td className="p-8 text-center text-xl font-black text-blue-600">
                  {((recruiter.closingScore / recruiter.total) * 100 || 0).toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER STATS */}
      <div className="flex justify-center">
        <div className="bg-slate-100 border-4 border-slate-900 px-10 py-4 rounded-full font-black uppercase text-[10px] tracking-widest shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          Last Updated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}