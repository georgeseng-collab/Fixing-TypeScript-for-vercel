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

  const fetchData = async () => {
    try {
      // 1. Fetch Applicants
      const { data: apps } = await supabase.from('applicants').select('*').order('created_at', { ascending: false });
      
      // 2. Fetch Offer Email History
      const { data: offHist } = await supabase.from('offer_history').select('applicant_id');
      
      // 3. Fetch Internal Approval History (Salary Hub)
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

  // Handle Checkbox for Contract Generated (Stored in DB)
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
      'Applied': 'bg-slate-400 text-white'
    };
    return themes[status] || 'bg-slate-300 text-white';
  };

  const counts = {
    All: applicants.filter(a => !['Blacklisted', 'Resigned', 'Failed Interview'].includes(a.status)).length,
    Applied: applicants.filter(a => a.status === 'Applied').length,
    Interviewing: applicants.filter(a => a.status === 'Interviewing').length,
    Offered: applicants.filter(a => a.status === 'Offered').length,
    'Offer Accepted': applicants.filter(a => a.status === 'Offer Accepted').length,
    Hired: applicants.filter(a => a.status === 'Hired').length,
  };

  const filtered = applicants.filter(a => {
    const matchesSearch = (a.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (a.job_role || "").toLowerCase().includes(searchTerm.toLowerCase());
    if (filterStatus === 'All') return matchesSearch && !['Failed Interview', 'Blacklisted', 'Resigned', 'Rejected Offer'].includes(a.status);
    return matchesSearch && a.status === filterStatus;
  });

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 text-5xl animate-pulse italic uppercase tracking-tighter">GENIEBOOK</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-8 pb-32">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase underline decoration-blue-600">Pipeline</h1>
        <input 
          type="text" 
          placeholder="Search candidates..." 
          className="w-full md:w-80 bg-white px-8 py-5 rounded-[2rem] border-4 border-slate-900 shadow-xl font-bold text-sm outline-none"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 bg-slate-100 p-2 rounded-[2.5rem] border-2 border-slate-200 shadow-inner">
        {Object.entries(counts).map(([label, count]) => (
          <button key={label} onClick={() => setFilterStatus(label)} className={`flex items-center gap-3 px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === label ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white'}`}>
            {label} <span className="opacity-50 text-[8px]">{count}</span>
          </button>
        ))}
      </div>

      {/* Candidate Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(app => (
          <div key={app.id} className="bg-white rounded-[3.5rem] border-4 border-slate-900 shadow-[10px_10px_0px_0px_rgba(15,23,42,1)] overflow-hidden flex flex-col transition-all hover:translate-y-[-4px]">
            
            <div className={`p-8 pb-6 ${getStatusTheme(app.status)} border-b-4 border-slate-900`}>
                <h2 className="text-2xl font-black tracking-tighter italic uppercase truncate">{app.name}</h2>
                <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">{app.job_role}</p>
            </div>

            <div className="p-8 space-y-6 flex-grow">
              
              {/* Tracker Checklist (Only for Offered/Accepted) */}
              {(app.status === 'Offered' || app.status === 'Offer Accepted') && (
                <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-200 space-y-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 italic">Offer Checklist</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-600">1. Offer Email</span>
                    {offerHistory.includes(app.id) ? 
                      <span className="bg-emerald-500 text-white text-[8px] px-2 py-1 rounded-lg font-black italic">SENT</span> : 
                      <span className="bg-slate-200 text-slate-400 text-[8px] px-2 py-1 rounded-lg font-black italic">PENDING</span>
                    }
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-600">2. Internal Approval</span>
                    {approvalHistory.includes(app.id) ? 
                      <span className="bg-blue-500 text-white text-[8px] px-2 py-1 rounded-lg font-black italic">SENT</span> : 
                      <span className="bg-slate-200 text-slate-400 text-[8px] px-2 py-1 rounded-lg font-black italic">PENDING</span>
                    }
                  </div>

                  <button 
                    onClick={() => toggleContract(app.id, app.contract_generated)}
                    className={`w-full mt-2 flex items-center justify-between px-4 py-2 rounded-xl transition-all border-2 ${app.contract_generated ? 'bg-purple-600 border-purple-700 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-tight">3. Contract Done</span>
                    <span className="text-xs">{app.contract_generated ? '✓' : '○'}</span>
                  </button>
                </div>
              )}

              {/* Salary Quick Info */}
              <div className="flex gap-4">
                <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="block text-[8px] font-black text-slate-400 uppercase mb-1">Current</span>
                  <span className="text-xs font-black text-slate-700">${app.current_salary || '0'}</span>
                </div>
                <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="block text-[8px] font-black text-slate-400 uppercase mb-1">Proposed</span>
                  <span className="text-xs font-black text-blue-600">${app.salary_expectation || '0'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex gap-2">
                <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all">Resume</a>
                <button className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase border-2 border-slate-900 transition-all ${getStatusTheme(app.status)}`}>
                  {app.status}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}