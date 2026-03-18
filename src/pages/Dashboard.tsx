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
  
  // Modals State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeApp, setActiveApp] = useState(null);
  const [modalType, setModalType] = useState(''); 
  const [formData, setFormData] = useState({ status: '', remarks: '', date: '' });

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

  const handleStatusSelect = (app, newStatus) => {
    setActiveApp(app);
    const today = new Date().toISOString().split('T')[0];
    if (['Blacklisted', 'Rejected Offer', 'Failed Interview'].includes(newStatus)) {
      setModalType('remarks');
      setFormData({ status: newStatus, remarks: '', date: '' });
      setShowStatusModal(true);
    } else if (newStatus === 'Resigned') {
      setModalType('resigned');
      setFormData({ status: newStatus, remarks: '', date: today });
      setShowStatusModal(true);
    } else {
      updateStatus(app.id, newStatus, '', '');
    }
  };

  const updateStatus = async (id, status, remarks, date) => {
    const { data: current } = await supabase.from('applicants').select('status_history').eq('id', id).single();
    const historyEntry = { 
      status, 
      date: new Date().toISOString(), 
      remarks: remarks || null, 
      leaving_date: date || null 
    };
    const updatedHistory = [...(current?.status_history || []), historyEntry];

    await supabase.from('applicants').update({ 
      status, 
      remarks: remarks || activeApp?.remarks,
      resignation_date: date || null,
      status_history: updatedHistory
    }).eq('id', id);
    
    setShowStatusModal(false);
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
      'Applied': 'bg-blue-600 text-white',
      'Resigned': 'bg-orange-700 text-white',
      'Blacklisted': 'bg-slate-900 text-white',
      'Failed Interview': 'bg-slate-500 text-white',
      'Rejected Offer': 'bg-rose-500 text-white'
    };
    return themes[status] || 'bg-slate-400 text-white';
  };

  const stats = {
    All: applicants.filter(a => !['Blacklisted', 'Resigned', 'Failed Interview', 'Rejected Offer'].includes(a.status)).length,
    Applied: applicants.filter(a => a.status === 'Applied').length,
    Interviewing: applicants.filter(a => a.status === 'Interviewing').length,
    Offered: applicants.filter(a => a.status === 'Offered').length,
    'Offer Accepted': applicants.filter(a => a.status === 'Offer Accepted').length,
    Hired: applicants.filter(a => a.status === 'Hired').length,
    'Archive': applicants.filter(a => ['Failed Interview', 'Blacklisted', 'Resigned', 'Rejected Offer'].includes(a.status)).length,
  };

  const filtered = applicants.filter(a => {
    const matchesSearch = (a.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const isArchived = ['Failed Interview', 'Blacklisted', 'Resigned', 'Rejected Offer'].includes(a.status);
    if (filterStatus === 'Archive') return matchesSearch && isArchived;
    if (filterStatus === 'All') return matchesSearch && !isArchived;
    return matchesSearch && a.status === filterStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-8 pb-32 relative">
      
      {/* 1. STATUS UPDATE MODAL */}
      {showStatusModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4">
          <div className="bg-white border-8 border-slate-900 w-full max-w-lg rounded-[3rem] shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] p-10 space-y-6">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">Status Change</h2>
            <div className="space-y-4">
              {modalType === 'resigned' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase ml-2 text-slate-400 italic">Date of Leaving</label>
                  <input type="date" className="w-full p-5 bg-slate-50 border-4 border-slate-900 rounded-2xl font-bold" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase ml-2 text-slate-400 italic">Reason / Remarks</label>
                <textarea rows="4" className="w-full p-5 bg-slate-50 border-4 border-slate-900 rounded-2xl font-bold outline-none" placeholder="Provide details..." value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowStatusModal(false)} className="flex-1 py-5 border-4 border-slate-900 rounded-2xl font-black uppercase text-xs hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={() => updateStatus(activeApp.id, formData.status, formData.remarks, formData.date)} className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(59,130,246,1)] active:translate-y-1 active:shadow-none transition-all">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. HISTORY TIMELINE MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-4">
          <div className="bg-slate-900 border-8 border-white/10 w-full max-w-2xl rounded-[4rem] shadow-[30px_30px_60px_rgba(0,0,0,0.5)] p-12 relative overflow-hidden">
            <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white mb-2 leading-none">Journey Log</h2>
            <p className="text-blue-400 font-black uppercase tracking-[0.3em] text-[10px] mb-10 underline italic">{activeApp?.name}</p>
            <div className="max-h-[400px] overflow-y-auto space-y-6 pr-4 custom-scrollbar">
              {(activeApp?.status_history || []).length > 0 ? (
                activeApp.status_history.map((h, i) => (
                  <div key={i} className="relative pl-8 border-l-4 border-white/10 py-2">
                    <div className="absolute -left-[10px] top-4 w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xl font-black uppercase text-white tracking-tighter italic">{h.status}</span>
                      <span className="text-[10px] font-bold text-white/30 bg-white/5 px-3 py-1 rounded-full">{new Date(h.date).toLocaleDateString()}</span>
                    </div>
                    {h.remarks && <p className="text-sm font-medium text-white/60 bg-white/5 p-4 rounded-2xl italic">"{h.remarks}"</p>}
                    {h.leaving_date && <p className="text-xs font-black text-rose-400 uppercase mt-2 italic">Leaving Date: {h.leaving_date}</p>}
                  </div>
                ))
              ) : (
                <p className="text-white/20 font-black text-center py-20 italic uppercase tracking-widest">No history recorded.</p>
              )}
            </div>
            <button onClick={() => setShowHistoryModal(false)} className="w-full mt-10 py-6 bg-white text-slate-900 rounded-[2rem] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all">Close Interface</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-8 border-slate-900 pb-8">
        <h1 className="text-7xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Dashboard</h1>
        <input type="text" placeholder="Search name..." className="w-full md:w-80 bg-white px-8 py-5 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-bold text-sm outline-none transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(stats).map(([label, count]) => (
          <button key={label} onClick={() => setFilterStatus(label)} className={`flex-1 min-w-[140px] p-6 rounded-[2rem] border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-y-1 active:shadow-none ${filterStatus === label ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
            <p className={`text-[10px] font-black uppercase tracking-widest ${filterStatus === label ? 'text-blue-400' : 'text-slate-400'}`}>{label}</p>
            <p className="text-4xl font-black italic">{count}</p>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {filtered.map(app => {
          const isFullyReady = offerHistory.includes(app.id) && approvalHistory.includes(app.id) && app.contract_generated;
          const isArchivedView = ['Failed Interview', 'Blacklisted', 'Resigned', 'Rejected Offer'].includes(app.status);

          return (
            <div key={app.id} className="bg-white rounded-[4rem] border-4 border-slate-900 shadow-[14px_14px_0px_0px_rgba(15,23,42,1)] overflow-hidden flex flex-col transition-all hover:-translate-y-2">
              
              <div className={`p-10 pb-8 ${getStatusTheme(app.status)} border-b-4 border-slate-900`}>
                <h2 className="text-4xl font-black tracking-tighter italic uppercase break-words leading-tight mb-1">{app.name}</h2>
                <p className="text-[11px] font-black uppercase opacity-70 tracking-widest">{isArchivedView ? `Archive: ${app.status}` : app.job_role}</p>
              </div>

              <div className="p-10 space-y-8 flex-grow">
                {/* Contact Area */}
                <div className="space-y-3">
                  <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-[1.5rem] text-[11px] font-black text-slate-600 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase truncate">
                    <span>📧</span> {app.email}
                  </div>
                  <a href={`https://wa.me/${app.phone?.replace(/[^0-9]/g, '')}`} target="_blank" className="flex items-center gap-4 bg-emerald-50 p-5 rounded-[1.5rem] text-[11px] font-black text-emerald-700 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase transition-all hover:bg-emerald-100">
                    <span>📱</span> {app.phone}
                  </a>
                </div>

                {/* ARCHIVE VS REGULAR TRACKING */}
                {isArchivedView ? (
                  <div className="bg-slate-900 p-8 rounded-[3.5rem] space-y-5 text-white">
                    {app.status === 'Resigned' && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest italic">Date of Leaving</span>
                        <p className="text-sm font-bold text-rose-400 uppercase italic">{app.resignation_date || 'N/A'}</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest italic">Reason / Remarks</span>
                      <p className="text-xs italic opacity-80 leading-relaxed font-medium line-clamp-4">"{app.remarks || 'No remarks provided.'}"</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(app.status === 'Offered' || app.status === 'Offer Accepted') && (
                      <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-900 space-y-4 shadow-inner">
                        <div className="flex justify-between text-[11px] font-black uppercase italic">
                           <span className="text-slate-400">1. Offer Hub</span>
                           <span className={offerHistory.includes(app.id) ? "text-emerald-600" : "text-slate-300"}>{offerHistory.includes(app.id) ? "● SENT" : "○ PENDING"}</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-black uppercase italic">
                           <span className="text-slate-400">2. Approval Hub</span>
                           <span className={approvalHistory.includes(app.id) ? "text-blue-600" : "text-slate-300"}>{approvalHistory.includes(app.id) ? "● SENT" : "○ PENDING"}</span>
                        </div>
                        <button onClick={() => toggleContract(app.id, app.contract_generated)} className={`w-full flex justify-between px-6 py-4 rounded-2xl border-2 font-black text-[11px] uppercase border-slate-900 transition-all ${app.contract_generated ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-300'}`}>
                          <span>3. Contract Done</span>
                          <span>{app.contract_generated ? '✓' : '○'}</span>
                        </button>
                      </div>
                    )}

                    {app.status === 'Offer Accepted' && isFullyReady ? (
                      <button onClick={() => updateStatus(app.id, 'Hired', 'Onboarded via Dashboard', '')} className="w-full py-8 bg-emerald-500 text-white rounded-[2.5rem] border-4 border-slate-900 font-black uppercase tracking-[0.2em] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-pulse hover:bg-slate-900 transition-all">🎉 Onboard Now</button>
                    ) : (
                      <select value={app.status} onChange={e => handleStatusSelect(app, e.target.value)} className={`w-full py-6 rounded-[2.5rem] text-[12px] font-black uppercase border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center appearance-none cursor-pointer transition-all ${getStatusTheme(app.status)}`}>
                        {app.status === 'Hired' ? (
                          <><option value="Hired">Hired</option><option value="Offer Accepted">Move Back</option><option value="Resigned">Resigned</option></>
                        ) : (
                          <>{stages.map(s => <option key={s} value={s}>{s}</option>)}<optgroup label="Archive"><option value="Failed Interview">Failed Interview</option><option value="Rejected Offer">Rejected Offer</option><option value="Blacklisted">Blacklisted</option></optgroup></>
                        )}
                      </select>
                    )}
                  </div>
                )}

                {/* SALARY INFO - RESTORED FOR ALL VIEWS */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-5 rounded-[1.5rem] border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
                    <span className="block text-[9px] font-black text-slate-400 uppercase mb-1 italic">Last Drawn</span>
                    <span className="text-sm font-black text-slate-900">${app.current_salary || app.last_drawn_salary || '0'}</span>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-[1.5rem] border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
                    <span className="block text-[9px] font-black text-slate-400 uppercase mb-1 italic text-blue-600">Expected</span>
                    <span className="text-sm font-black text-blue-600">${app.expected_salary || app.salary_expectation || '0'}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-white border-4 border-slate-900 py-5 rounded-[2rem] font-black text-[11px] uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-900 hover:text-white transition-all">Resume</a>
                  <button onClick={() => { setActiveApp(app); setShowHistoryModal(true); }} className="px-8 bg-slate-50 rounded-[2rem] border-4 border-slate-900 font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-500 hover:text-white transition-all">🕒 Hist</button>
                  <button onClick={() => fetchData()} className="p-5 bg-slate-50 rounded-[2rem] border-4 border-slate-900 font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:rotate-180 transition-all duration-500">↻</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}