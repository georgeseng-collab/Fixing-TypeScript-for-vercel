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
      'Hired': 'bg-emerald-50 text-emerald-700 border-emerald-100',
      'Offer Accepted': 'bg-blue-50 text-blue-700 border-blue-100',
      'Offered': 'bg-purple-50 text-purple-700 border-purple-100',
      'Interviewing': 'bg-amber-50 text-amber-700 border-amber-100',
      'Applied': 'bg-slate-50 text-slate-700 border-slate-100',
    };
    return themes[status] || 'bg-slate-50 text-slate-500';
  };

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

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="text-4xl font-black text-slate-900 animate-pulse tracking-tighter uppercase italic">GENIEBOOK</div>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto px-10 py-12 space-y-12 pb-40 font-sans">
      
      {/* HEADER & SEARCH */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="text-center lg:text-left">
          <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none">Dashboard</h1>
          <p className="text-slate-400 font-medium mt-2">Manage your recruitment pipeline</p>
        </div>
        <div className="relative w-full lg:w-96">
          <input 
            type="text" 
            placeholder="Search candidates..." 
            className="w-full bg-slate-100 px-6 py-4 rounded-2xl border border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all shadow-sm font-medium"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* CLICKABLE STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {Object.entries(stats).map(([label, count]) => (
          <button 
            key={label} 
            onClick={() => setFilterStatus(label)}
            className={`p-6 rounded-3xl transition-all border-2 text-left ${
                filterStatus === label 
                ? 'bg-slate-900 border-slate-900 text-white shadow-xl translate-y-[-4px]' 
                : 'bg-white border-slate-100 text-slate-900 hover:border-slate-300'
            }`}
          >
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${filterStatus === label ? 'text-blue-400' : 'text-slate-400'}`}>{label}</p>
            <p className="text-3xl font-black">{count}</p>
          </button>
        ))}
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filtered.map(app => {
          const hasOfferSent = offerHistory.includes(app.id);
          const hasApprovalSent = approvalHistory.includes(app.id);
          const isContractDone = app.contract_generated;
          const canOnboard = hasOfferSent && hasApprovalSent && isContractDone && app.status === 'Offer Accepted';

          return (
            <div key={app.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all flex flex-col group overflow-hidden">
              
              {/* CARD TOP */}
              <div className="p-8 border-b border-slate-50">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusTheme(app.status)}`}>
                    {app.status}
                  </span>
                  <div className="flex gap-2">
                    <a href={`mailto:${app.email}`} className="text-slate-300 hover:text-blue-500 transition-colors">📧</a>
                    <a href={`https://wa.me/${app.phone?.replace(/[^0-9]/g, '')}`} target="_blank" className="text-slate-300 hover:text-emerald-500 transition-colors">💬</a>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 truncate">{app.name}</h2>
                <p className="text-sm font-semibold text-slate-400 mt-0.5 uppercase tracking-wide">{app.job_role}</p>
              </div>

              <div className="p-8 space-y-6 flex-grow">
                {/* TRACKERS */}
                {(app.status === 'Offered' || app.status === 'Offer Accepted') && (
                  <div className="bg-slate-50 rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-tighter">Offer Email</span>
                      <span className={hasOfferSent ? "text-emerald-600 font-black" : "text-slate-300 font-bold"}>{hasOfferSent ? "✓ SENT" : "○ PENDING"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-500 uppercase tracking-tighter">Internal Approval</span>
                      <span className={hasApprovalSent ? "text-blue-600 font-black" : "text-slate-300 font-bold"}>{hasApprovalSent ? "✓ SENT" : "○ PENDING"}</span>
                    </div>
                    <button 
                        onClick={() => toggleContract(app.id, isContractDone)} 
                        className={`w-full flex justify-between items-center px-4 py-2.5 rounded-xl border transition-all text-[11px] font-black uppercase ${isContractDone ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                    >
                      <span>Contract Status</span>
                      <span>{isContractDone ? 'READY' : 'PENDING'}</span>
                    </button>
                  </div>
                )}

                {/* ONBOARD BUTTON */}
                {canOnboard && (
                  <button 
                    onClick={() => handleStatusChange(app.id, 'Hired')} 
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-slate-900 transition-all transform hover:scale-[1.02]"
                  >
                    🚀 Onboard Now
                  </button>
                )}

                {/* SALARY INFO */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Last Drawn</span>
                    <span className="text-md font-bold text-slate-700">${app.current_salary || app.last_drawn_salary || '0'}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Expected</span>
                    <span className="text-md font-bold text-blue-600">${app.expected_salary || app.salary_expectation || '0'}</span>
                  </div>
                </div>

                {/* STATUS SELECTOR */}
                <div className="flex gap-2">
                  <select 
                    value={app.status} 
                    onChange={e => handleStatusChange(app.id, e.target.value)} 
                    className="flex-1 bg-slate-100 border-none p-4 rounded-2xl text-xs font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-200 transition-all appearance-none text-center"
                  >
                    {stages.map(s => <option key={s} value={s}>{s}</option>)}
                    <optgroup label="Archive">
                      <option value="Failed Interview">Failed Interview</option>
                      <option value="Rejected Offer">Rejected Offer</option>
                      <option value="Resigned">Resigned</option>
                      <option value="Blacklisted">Blacklisted</option>
                    </optgroup>
                  </select>
                  <a href={app.resume_metadata?.url} target="_blank" className="p-4 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-blue-600 transition-all">
                    Resume
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}