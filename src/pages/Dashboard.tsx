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
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
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
      'Applied': 'bg-slate-500 text-white'
    };
    return themes[status] || 'bg-slate-300 text-white';
  };

  // Stats Logic
  const stats = {
    total: applicants.length,
    interviewing: applicants.filter(a => a.status === 'Interviewing').length,
    offered: applicants.filter(a => a.status === 'Offered').length,
    accepted: applicants.filter(a => a.status === 'Offer Accepted').length,
    hired: applicants.filter(a => a.status === 'Hired').length,
  };

  const filtered = applicants.filter(a => {
    const matchesSearch = (a.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (a.job_role || "").toLowerCase().includes(searchTerm.toLowerCase());
    if (filterStatus === 'All') return matchesSearch;
    return matchesSearch && a.status === filterStatus;
  });

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 text-5xl animate-pulse italic uppercase">GENIEBOOK</div>;

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-12 space-y-10 pb-40">
      
      {/* STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(stats).map(([key, val]) => (
          <div key={key} className="bg-white border-4 border-slate-900 p-6 rounded-[2rem] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{key}</p>
            <p className="text-3xl font-black text-slate-900 italic">{val}</p>
          </div>
        ))}
      </div>

      {/* HEADER & SEARCH */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b-8 border-slate-900 pb-10">
        <h1 className="text-7xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Pipeline</h1>
        <input 
          type="text" 
          placeholder="Quick search..." 
          className="w-full lg:w-96 bg-white px-8 py-5 rounded-3xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-bold text-sm outline-none"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {filtered.map(app => {
          const hasOfferSent = offerHistory.includes(app.id);
          const hasApprovalSent = approvalHistory.includes(app.id);
          const isContractDone = app.contract_generated;
          const canOnboard = hasOfferSent && hasApprovalSent && isContractDone;

          return (
            <div key={app.id} className="bg-white rounded-[4rem] border-4 border-slate-900 shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] overflow-hidden flex flex-col transition-all hover:translate-y-[-4px]">
              
              {/* Header */}
              <div className={`p-10 pb-6 ${getStatusTheme(app.status)} border-b-4 border-slate-900`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter italic uppercase truncate leading-tight">{app.name}</h2>
                    <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">{app.job_role}</p>
                  </div>
                  <div className="flex gap-2">
                    <a href={`mailto:${app.email}`} className="p-3 bg-white/20 rounded-xl hover:bg-white/40 transition-all">📧</a>
                    <a href={`https://wa.me/${app.phone?.replace(/[^0-9]/g, '')}`} target="_blank" className="p-3 bg-white/20 rounded-xl hover:bg-white/40 transition-all">💬</a>
                  </div>
                </div>
              </div>

              <div className="p-10 space-y-6 flex-grow">
                
                {/* TRACKER (For Offer/Accepted) */}
                {(app.status === 'Offered' || app.status === 'Offer Accepted') && (
                  <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-200 space-y-3 shadow-inner">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tight">
                      <span className="text-slate-500">1. Offer Email</span>
                      <span className={hasOfferSent ? "text-emerald-600" : "text-slate-300"}>{hasOfferSent ? "● SENT" : "○ PENDING"}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tight">
                      <span className="text-slate-500">2. Internal Approval</span>
                      <span className={hasApprovalSent ? "text-blue-600" : "text-slate-300"}>{hasApprovalSent ? "● SENT" : "○ PENDING"}</span>
                    </div>
                    <button 
                      onClick={() => toggleContract(app.id, isContractDone)}
                      className={`w-full flex justify-between items-center px-4 py-2 rounded-xl border-2 transition-all ${isContractDone ? 'bg-slate-900 text-white' : 'bg-white text-slate-400'}`}
                    >
                      <span className="text-[10px] font-black uppercase">3. Contract Done</span>
                      <span>{isContractDone ? '✓' : '○'}</span>
                    </button>
                  </div>
                )}

                {/* ONBOARD BUTTON (Conditional) */}
                {app.status === 'Offer Accepted' && canOnboard && (
                  <button 
                    onClick={() => handleStatusChange(app.id, 'Hired')}
                    className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-100 hover:bg-slate-900 transition-all animate-bounce"
                  >
                    🎉 Onboard Candidate
                  </button>
                )}

                {/* Salary Stats */}
                <div className="flex gap-3">
                  <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="block text-[8px] font-black text-slate-400 uppercase">Current</span>
                    <span className="text-xs font-black text-slate-700">${app.current_salary || '0'}</span>
                  </div>
                  <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="block text-[8px] font-black text-slate-400 uppercase">Expected</span>
                    <span className="text-xs font-black text-blue-600">${app.expected_salary || '0'}</span>
                  </div>
                </div>

                {/* Status Picker */}
                <select 
                  value={app.status} 
                  onChange={e => handleStatusChange(app.id, e.target.value)}
                  className={`w-full py-5 rounded-2xl text-[11px] font-black uppercase text-center border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${getStatusTheme(app.status)}`}
                >
                  {stages.map(s => <option key={s} value={s} className="text-black bg-white">{s}</option>)}
                  <option value="Failed Interview">Failed Interview</option>
                  <option value="Rejected Offer">Rejected Offer</option>
                  <option value="Resigned">Resigned</option>
                  <option value="Blacklisted">Blacklisted</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}