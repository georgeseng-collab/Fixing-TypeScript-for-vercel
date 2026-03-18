// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../db';

export default function Dashboard() {
  const [applicants, setApplicants] = useState([]);
  const [offerHistory, setOfferHistory] = useState([]);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');

  const stages = ['Applied', 'Interviewing', 'Offered', 'Offer Accepted', 'Hired'];

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: apps } = await supabase.from('applicants').select('*').order('created_at', { ascending: false });
      const { data: offHist } = await supabase.from('offer_history').select('applicant_id');
      const { data: appHist } = await supabase.from('salary_approval_history').select('applicant_id');

      setApplicants(apps || []);
      setOfferHistory(offHist?.map(h => h.applicant_id) || []);
      setApprovalHistory(appHist?.map(h => h.applicant_id) || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusChange = async (id, newStatus) => {
    await supabase.from('applicants').update({ status: newStatus }).eq('id', id);
    fetchData();
  };

  const toggleContract = async (id, currentVal) => {
    await supabase.from('applicants').update({ contract_generated: !currentVal }).eq('id', id);
    fetchData();
  };

  const getStatusTheme = (status) => {
    const themes = {
      'Hired': 'bg-emerald-600 text-white',
      'Offer Accepted': 'bg-blue-600 text-white',
      'Offered': 'bg-purple-600 text-white',
      'Interviewing': 'bg-amber-500 text-white',
      'Applied': 'bg-slate-900 text-white',
    };
    return themes[status] || 'bg-slate-400 text-white';
  };

  // Stats Logic - Matches your previous clickable functionality
  const stats = {
    All: applicants.filter(a => !['Blacklisted', 'Resigned', 'Failed Interview'].includes(a.status)).length,
    Applied: applicants.filter(a => a.status === 'Applied').length,
    Interviewing: applicants.filter(a => a.status === 'Interviewing').length,
    Offered: applicants.filter(a => a.status === 'Offered').length,
    'Offer Accepted': applicants.filter(a => a.status === 'Offer Accepted').length,
    Hired: applicants.filter(a => a.status === 'Hired').length,
    Archive: applicants.filter(a => ['Failed Interview', 'Blacklisted', 'Resigned', 'Rejected Offer'].includes(a.status)).length,
  };

  const filtered = applicants.filter(a => {
    const matchesSearch = (a.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (a.job_role || "").toLowerCase().includes(searchTerm.toLowerCase());
    const isArchived = ['Failed Interview', 'Blacklisted', 'Resigned', 'Rejected Offer'].includes(a.status);
    
    if (filterStatus === 'Archive') return matchesSearch && isArchived;
    if (filterStatus === 'All') return matchesSearch && !isArchived;
    return matchesSearch && a.status === filterStatus;
  });

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 text-5xl animate-pulse italic uppercase tracking-tighter">GENIEBOOK</div>;

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-12 space-y-12 pb-40">
      
      {/* HEADER & SEARCH */}
      <div className="flex flex-col lg:flex-row justify-between items-end gap-6 border-b-[10px] border-slate-900 pb-10">
        <div>
          <h1 className="text-8xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Dashboard</h1>
          <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.4em] mt-4 ml-2">Geniebook Talent OS</p>
        </div>
        <input 
          type="text" 
          placeholder="Search Candidate..." 
          className="w-full lg:w-96 bg-white px-8 py-6 rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-bold text-sm outline-none focus:translate-y-1 focus:shadow-none transition-all"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* CLICKABLE STATS BAR */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(stats).map(([label, count]) => (
          <button 
            key={label} 
            onClick={() => setFilterStatus(label)}
            className={`flex-1 min-w-[150px] bg-white border-4 border-slate-900 p-6 rounded-[2.5rem] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-y-1 active:shadow-none ${filterStatus === label ? 'bg-slate-900 text-white' : 'text-slate-900'}`}
          >
            <p className={`text-[10px] font-black uppercase tracking-widest ${filterStatus === label ? 'text-blue-400' : 'text-slate-400'}`}>{label}</p>
            <p className="text-4xl font-black italic">{count}</p>
          </button>
        ))}
      </div>

      {/* CANDIDATE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
        {filtered.map(app => {
          const hasOfferSent = offerHistory.includes(app.id);
          const hasApprovalSent = approvalHistory.includes(app.id);
          const isContractDone = app.contract_generated;
          // Logic for "Onboard Now" button appearance
          const canOnboard = hasOfferSent && hasApprovalSent && isContractDone && app.status === 'Offer Accepted';

          return (
            <div key={app.id} className="bg-white rounded-[4rem] border-4 border-slate-900 shadow-[14px_14px_0px_0px_rgba(15,23,42,1)] overflow-hidden flex flex-col transition-all hover:translate-y-[-6px]">
              
              {/* CARD HEADER */}
              <div className={`p-10 pb-8 ${getStatusTheme(app.status)} border-b-4 border-slate-900 relative`}>
                <div className="flex justify-between items-start gap-4">
                  <div className="overflow-hidden">
                    <h2 className="text-4xl font-black tracking-tighter italic uppercase truncate leading-none mb-1">{app.name}</h2>
                    <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">{app.job_role || 'General Role'}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <a href={`mailto:${app.email}`} className="w-12 h-12 flex items-center justify-center bg-white/20 rounded-2xl hover:bg-white/40 transition-all text-xl">📧</a>
                    <a href={`https://wa.me/${app.phone?.replace(/[^0-9]/g, '')}`} target="_blank" className="w-12 h-12 flex items-center justify-center bg-white/20 rounded-2xl hover:bg-white/40 transition-all text-xl">💬</a>
                  </div>
                </div>
              </div>

              <div className="p-10 space-y-8 flex-grow">
                
                {/* TRACKER LOGIC */}
                {(app.status === 'Offered' || app.status === 'Offer Accepted') && (
                  <div className="bg-slate-50 p-8 rounded-[3rem] border-2 border-slate-200 space-y-4 shadow-inner">
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-tight">
                      <span className="text-slate-400 italic">1. Offer Hub</span>
                      <span className={hasOfferSent ? "text-emerald-600" : "text-slate-300"}>{hasOfferSent ? "● SENT" : "○ PENDING"}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-tight">
                      <span className="text-slate-400 italic">2. Approval Hub</span>
                      <span className={hasApprovalSent ? "text-blue-600" : "text-slate-300"}>{hasApprovalSent ? "● SENT" : "○ PENDING"}</span>
                    </div>
                    <button 
                      onClick={() => toggleContract(app.id, isContractDone)}
                      className={`w-full flex justify-between items-center px-6 py-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest mt-2 ${isContractDone ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'}`}
                    >
                      <span>3. Contract Done</span>
                      <span className="text-lg">{isContractDone ? '✓' : '○'}</span>
                    </button>
                  </div>
                )}

                {/* ONBOARD BUTTON */}
                {canOnboard && (
                  <button 
                    onClick={() => handleStatusChange(app.id, 'Hired')}
                    className="w-full py-6 bg-emerald-500 text-white rounded-[2rem] border-4 border-slate-900 font-black uppercase tracking-[0.2em] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-900 transition-all animate-pulse"
                  >
                    🚀 Onboard Now
                  </button>
                )}

                {/* SALARY STATS */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    <span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Current</span>
                    <span className="text-sm font-black text-slate-900">${app.current_salary || '0'}</span>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    <span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Expected</span>
                    <span className="text-sm font-black text-blue-600">${app.expected_salary || '0'}</span>
                  </div>
                </div>

                {/* STATUS SELECTOR */}
                <div className="space-y-4">
                  <div className="relative">
                    <select 
                      value={app.status} 
                      onChange={e => handleStatusChange(app.id, e.target.value)}
                      className={`w-full py-5 rounded-2xl text-[11px] font-black uppercase border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] outline-none appearance-none text-center cursor-pointer transition-all ${getStatusTheme(app.status)}`}
                    >
                      {stages.map(s => <option key={s} value={s} className="text-black bg-white">{s}</option>)}
                      <optgroup label="Archive">
                        <option value="Failed Interview" className="text-black bg-white">Failed Interview</option>
                        <option value="Rejected Offer" className="text-black bg-white">Rejected Offer</option>
                        <option value="Resigned" className="text-black bg-white">Resigned</option>
                        <option value="Blacklisted" className="text-black bg-white">Blacklisted</option>
                      </optgroup>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-white border-4 border-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Resume</a>
                    <button onClick={() => fetchData()} className="px-6 bg-slate-50 rounded-2xl border-4 border-slate-900 font-black hover:bg-slate-900 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">↻</button>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}