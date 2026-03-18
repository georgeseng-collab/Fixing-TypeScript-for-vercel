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
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});

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

  const saveEdit = async () => {
    await supabase.from('applicants').update(editData).eq('id', editId);
    setEditId(null);
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
      'Interviewing': 'bg-amber-500 text-white', // YELLOW
      'Applied': 'bg-blue-600 text-white',      // BLUE
      'Rejected Offer': 'bg-rose-500 text-white',
      'Blacklisted': 'bg-slate-900 text-white',
      'Resigned': 'bg-orange-700 text-white',
      'Failed Interview': 'bg-slate-500 text-white'
    };
    return themes[status] || 'bg-slate-400 text-white';
  };

  const stats = {
    All: applicants.filter(a => !['Blacklisted', 'Resigned', 'Failed Interview'].includes(a.status)).length,
    Applied: applicants.filter(a => a.status === 'Applied').length,
    Interviewing: applicants.filter(a => a.status === 'Interviewing').length,
    Offered: applicants.filter(a => a.status === 'Offered').length,
    'Offer Accepted': applicants.filter(a => a.status === 'Offer Accepted').length,
    Hired: applicants.filter(a => a.status === 'Hired').length,
    'Archive': applicants.filter(a => ['Failed Interview', 'Blacklisted', 'Resigned', 'Rejected Offer'].includes(a.status)).length,
  };

  const filtered = applicants.filter(a => {
    const matchesSearch = (a.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (a.job_role || "").toLowerCase().includes(searchTerm.toLowerCase());
    if (filterStatus === 'Archive') return matchesSearch && ['Failed Interview', 'Blacklisted', 'Resigned', 'Rejected Offer'].includes(a.status);
    if (filterStatus === 'All') return matchesSearch && !['Failed Interview', 'Blacklisted', 'Resigned', 'Rejected Offer'].includes(a.status);
    return matchesSearch && a.status === filterStatus;
  });

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 text-5xl animate-pulse italic uppercase tracking-tighter">GENIEBOOK</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-8 pb-32">
      
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-8 border-slate-900 pb-8">
        <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic uppercase">Dashboard</h1>
        <input 
          type="text" 
          placeholder="Search name or role..." 
          className="w-full md:w-80 bg-white px-8 py-5 rounded-[2rem] border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-bold text-sm outline-none transition-all"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-2 bg-white p-3 rounded-[2.5rem] border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-x-auto no-scrollbar">
        {Object.entries(stats).map(([label, count]) => (
          <button key={label} onClick={() => setFilterStatus(label)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${filterStatus === label ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-400'}`}>
            {label} <span className={`px-2.5 py-1 rounded-md text-[9px] ${filterStatus === label ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
          </button>
        ))}
      </div>

      {/* Candidate Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {filtered.map(app => {
          const hasOfferSent = offerHistory.includes(app.id);
          const hasApprovalSent = approvalHistory.includes(app.id);
          const isContractDone = app.contract_generated;
          const canOnboard = hasOfferSent && hasApprovalSent && isContractDone && app.status === 'Offer Accepted';

          return (
            <div key={app.id} className="bg-white rounded-[4rem] border-4 border-slate-900 shadow-[10px_10px_0px_0px_rgba(15,23,42,1)] overflow-hidden flex flex-col transition-all hover:translate-y-[-8px]">
              
              {/* Header - ALIGNMENT FIXED HERE */}
              <div className={`p-10 pb-6 ${getStatusTheme(app.status)} border-b-4 border-slate-900`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-grow overflow-hidden">
                    {editId === app.id ? (
                      <div className="space-y-1">
                        <input className="w-full text-xl font-black bg-white/20 rounded-xl px-3 py-1 outline-none text-white" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                        <input className="w-full text-[10px] font-black uppercase bg-white/10 rounded-xl px-3 py-1 outline-none text-white/80" value={editData.job_role} onChange={e => setEditData({...editData, job_role: e.target.value})} />
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <h2 className="text-3xl font-black tracking-tighter italic uppercase truncate leading-none">{app.name}</h2>
                        <p className="text-[10px] font-black uppercase opacity-70 tracking-[0.2em]">{app.job_role || 'No Role'}</p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => editId === app.id ? saveEdit() : (setEditId(app.id), setEditData(app))} 
                    className="shrink-0 w-12 h-12 flex items-center justify-center bg-white/20 rounded-2xl hover:bg-white/40 transition-all active:scale-90"
                  >
                    {editId === app.id ? '✔️' : '✏️'}
                  </button>
                </div>
              </div>

              <div className="p-10 space-y-8 flex-grow">
                {/* Contact Section */}
                <div className="space-y-3">
                  <a href={`mailto:${app.email}`} className="flex items-center gap-4 bg-slate-50 p-5 rounded-[1.5rem] text-[11px] font-black text-slate-600 truncate hover:bg-slate-100 border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all uppercase tracking-tight">
                    <span className="text-lg">📧</span> {app.email || 'No Email'}
                  </a>
                  <a href={`https://wa.me/${(app.phone || '').replace(/[^0-9]/g, '')}`} target="_blank" className="flex items-center gap-4 bg-emerald-50 p-5 rounded-[1.5rem] text-[11px] font-black text-emerald-700 hover:bg-emerald-100 border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all uppercase tracking-tight">
                    <span className="text-lg">📱</span> {app.phone || 'No Phone'}
                  </a>
                </div>

                {/* Checklist Tracker */}
                {(app.status === 'Offered' || app.status === 'Offer Accepted') && (
                  <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-900 space-y-4 shadow-inner">
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
                      className={`w-full flex justify-between items-center px-6 py-4 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest mt-2 ${isContractDone ? 'bg-slate-900 text-white border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-slate-300 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'}`}
                    >
                      <span>3. Contract Done</span>
                      <span className="text-lg">{isContractDone ? '✓' : '○'}</span>
                    </button>
                  </div>
                )}

                {/* Onboard Now Button */}
                {canOnboard && (
                  <button 
                    onClick={() => handleStatusChange(app.id, 'Hired')}
                    className="w-full py-6 bg-emerald-500 text-white rounded-[2rem] border-4 border-slate-900 font-black uppercase tracking-[0.2em] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-900 transition-all animate-pulse"
                  >
                    🚀 Onboard Now
                  </button>
                )}

                {/* Salaries */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-5 rounded-[1.5rem] border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Last Drawn</span>
                    <span className="text-sm font-black text-slate-900">${app.current_salary || app.last_drawn_salary || '0'}</span>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-[1.5rem] border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Expected</span>
                    <span className="text-sm font-black text-blue-600">${app.expected_salary || app.salary_expectation || '0'}</span>
                  </div>
                </div>

                {/* Status Switcher & Resume */}
                <div className="space-y-4">
                  <select 
                    value={app.status} 
                    onChange={e => handleStatusChange(app.id, e.target.value)}
                    className={`w-full py-5 rounded-[2rem] text-[11px] font-black uppercase border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] outline-none appearance-none text-center cursor-pointer transition-all ${getStatusTheme(app.status)}`}
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
                    <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-white border-4 border-slate-900 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">View Resume</a>
                    <button onClick={() => fetchData()} className="px-6 bg-slate-50 rounded-[1.5rem] border-4 border-slate-900 font-black hover:bg-slate-900 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">↻</button>
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