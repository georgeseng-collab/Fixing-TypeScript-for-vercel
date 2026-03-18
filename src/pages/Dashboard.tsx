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

  // Unified Stage Logic
  const stages = ['Applied', 'Interviewing', 'Offered', 'Offer Accepted', 'Hired'];

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch fresh data from all 3 sources to update trackers
      const { data: apps } = await supabase.from('applicants').select('*').order('created_at', { ascending: false });
      const { data: offHist } = await supabase.from('offer_history').select('applicant_id');
      const { data: appHist } = await supabase.from('salary_approval_history').select('applicant_id');

      setApplicants(apps || []);
      setOfferHistory(offHist?.map(h => h.applicant_id) || []);
      setApprovalHistory(appHist?.map(h => h.applicant_id) || []);
    } catch (e) { 
      console.error("Fetch Error:", e); 
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

  // Matches the color themes from your screenshots
  const getStatusTheme = (status) => {
    const themes = {
      'Hired': 'bg-emerald-600 text-white border-emerald-800',
      'Offer Accepted': 'bg-blue-600 text-white border-blue-800',
      'Offered': 'bg-purple-600 text-white border-purple-800',
      'Interviewing': 'bg-amber-500 text-white border-amber-700',
      'Applied': 'bg-slate-400 text-white border-slate-600'
    };
    return themes[status] || 'bg-slate-200 text-slate-500 border-slate-300';
  };

  const filtered = applicants.filter(a => {
    const name = a.name || "";
    const role = a.job_role || "";
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          role.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isArchived = ['Failed Interview', 'Blacklisted', 'Resigned', 'Rejected Offer'].includes(a.status);
    
    if (filterStatus === 'Archive') return matchesSearch && isArchived;
    if (filterStatus === 'All') return matchesSearch && !isArchived;
    return matchesSearch && a.status === filterStatus;
  });

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="text-6xl font-black text-blue-600 animate-bounce tracking-tighter italic italic uppercase">GENIEBOOK</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-10 pb-40">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-8 border-slate-900 pb-10">
        <div>
          <h1 className="text-7xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Dashboard</h1>
          <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.4em] mt-3 ml-2">Talent Acquisition Pipeline</p>
        </div>
        <div className="relative group">
          <input 
            type="text" 
            placeholder="Search candidates..." 
            className="w-full md:w-96 bg-white px-8 py-6 rounded-3xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-bold text-sm outline-none focus:bg-blue-50 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* STAGE FILTERS */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {['All', ...stages, 'Archive'].map(label => (
          <button 
            key={label} 
            onClick={() => setFilterStatus(label)} 
            className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === label ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* CANDIDATE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {filtered.map(app => (
          <div key={app.id} className="bg-white rounded-[4rem] border-4 border-slate-900 shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] overflow-hidden flex flex-col transition-transform hover:-translate-y-2">
            
            {/* CARD TOP */}
            <div className={`p-10 pb-8 ${getStatusTheme(app.status)} border-b-4 border-slate-900 relative`}>
                <h2 className="text-3xl font-black tracking-tighter italic uppercase truncate leading-none">{app.name}</h2>
                <p className="text-[10px] font-black uppercase opacity-80 tracking-widest mt-2">{app.job_role || 'General Role'}</p>
                <div className="absolute top-4 right-6 text-2xl opacity-20 font-black italic">GB</div>
            </div>

            <div className="p-10 space-y-8 flex-grow">
              
              {/* STATUS TRACKER (Visible only for Offered/Accepted) */}
              {(app.status === 'Offered' || app.status === 'Offer Accepted') && (
                <div className="bg-slate-50 p-8 rounded-[3rem] border-2 border-slate-200 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider italic">1. Offer Email</span>
                    <span className={`text-[9px] px-3 py-1 rounded-full font-black italic ${offerHistory.includes(app.id) ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      {offerHistory.includes(app.id) ? 'SENT' : 'PENDING'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider italic">2. Approval Hub</span>
                    <span className={`text-[9px] px-3 py-1 rounded-full font-black italic ${approvalHistory.includes(app.id) ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                      {approvalHistory.includes(app.id) ? 'SENT' : 'PENDING'}
                    </span>
                  </div>

                  <button 
                    onClick={() => toggleContract(app.id, app.contract_generated)}
                    className={`w-full mt-2 flex items-center justify-between px-5 py-3 rounded-2xl border-2 transition-all ${app.contract_generated ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-900 hover:text-slate-900'}`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">3. Contract Done</span>
                    <span className="text-lg">{app.contract_generated ? '●' : '○'}</span>
                  </button>
                </div>
              )}

              {/* SALARY STATS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Current</span>
                  <span className="text-sm font-black text-slate-800">${app.current_salary || '0'}</span>
                </div>
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Expected</span>
                  <span className="text-sm font-black text-blue-600">${app.expected_salary || '0'}</span>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="space-y-3">
                <select 
                  value={app.status} 
                  onChange={e => handleStatusChange(app.id, e.target.value)}
                  className={`w-full py-5 rounded-2xl text-[11px] font-black uppercase text-center border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer outline-none transition-all hover:bg-slate-900 hover:text-white ${getStatusTheme(app.status)}`}
                >
                  {stages.map(s => <option key={s} value={s} className="text-black bg-white">{s}</option>)}
                  <optgroup label="Archive">
                    <option value="Failed Interview" className="text-black bg-white">Failed Interview</option>
                    <option value="Rejected Offer" className="text-black bg-white">Rejected Offer</option>
                    <option value="Resigned" className="text-black bg-white">Resigned</option>
                    <option value="Blacklisted" className="text-black bg-white">Blacklisted</option>
                  </optgroup>
                </select>

                <div className="flex gap-2">
                  <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-white border-2 border-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">Resume</a>
                  <button onClick={() => fetchData()} className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:border-slate-900 transition-all">↻</button>
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}