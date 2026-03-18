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
  const [showHistoryId, setShowHistoryId] = useState(null);

  const [showModal, setShowModal] = useState(false);
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
      setShowModal(true);
    } else if (newStatus === 'Resigned') {
      setModalType('resigned');
      setFormData({ status: newStatus, remarks: '', date: today });
      setShowModal(true);
    } else {
      updateStatus(app.id, newStatus, '', '');
    }
  };

  const updateStatus = async (id, status, remarks, date) => {
    const { data: current } = await supabase.from('applicants').select('status_history').eq('id', id).single();
    const historyEntry = { status, date: new Date().toISOString(), remarks: remarks || null, leaving_date: date || null };
    const updatedHistory = [...(current?.status_history || []), historyEntry];

    await supabase.from('applicants').update({ 
      status, 
      remarks: remarks || activeApp?.remarks,
      resignation_date: date || null,
      status_history: updatedHistory
    }).eq('id', id);
    
    setShowModal(false);
    fetchData();
  };

  const toggleContract = async (id, currentVal) => {
    await supabase.from('applicants').update({ contract_generated: !currentVal }).eq('id', id);
    fetchData();
  };

  const saveEdit = async () => {
    await supabase.from('applicants').update(editData).eq('id', editId);
    setEditId(null);
    fetchData();
  };

  const getStatusTheme = (status) => {
    const themes = {
      'Hired': 'bg-emerald-600 text-white',
      'Offer Accepted': 'bg-blue-600 text-white',
      'Offered': 'bg-purple-600 text-white',
      'Interviewing': 'bg-amber-500 text-white',
      'Applied': 'bg-blue-600 text-white',
      'Archive': 'bg-slate-500 text-white'
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
    Archive: applicants.filter(a => ['Failed Interview', 'Blacklisted', 'Resigned', 'Rejected Offer'].includes(a.status)).length,
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
      
      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white border-8 border-slate-900 w-full max-w-lg rounded-[3rem] shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] p-10 space-y-6">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter italic">Status Update</h2>
            <div className="space-y-4">
              {modalType === 'resigned' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase ml-2 text-slate-400">Date of Leaving</label>
                  <input type="date" className="w-full p-5 bg-slate-50 border-4 border-slate-900 rounded-2xl font-bold outline-none" 
                    value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase ml-2 text-slate-400">Reason / Remarks</label>
                <textarea rows="4" className="w-full p-5 bg-slate-50 border-4 border-slate-900 rounded-2xl font-bold outline-none" 
                  value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setShowModal(false)} className="flex-1 py-5 border-4 border-slate-900 rounded-2xl font-black uppercase text-xs">Cancel</button>
              <button onClick={() => updateStatus(activeApp.id, formData.status, formData.remarks, formData.date)} className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(59,130,246,1)]">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-8 border-slate-900 pb-8">
        <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Dashboard</h1>
        <input type="text" placeholder="Search..." className="w-full md:w-80 bg-white px-8 py-5 rounded-[2rem] border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-bold text-sm outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-2 bg-white p-3 rounded-[2.5rem] border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-x-auto no-scrollbar">
        {Object.entries(stats).map(([label, count]) => (
          <button key={label} onClick={() => setFilterStatus(label)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${filterStatus === label ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-400'}`}>
            {label} <span className={`px-2.5 py-1 rounded-md text-[9px] ${filterStatus === label ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {filtered.map(app => {
          const isFullyReady = offerHistory.includes(app.id) && approvalHistory.includes(app.id) && app.contract_generated;
          const isArchivedView = filterStatus === 'Archive';

          return (
            <div key={app.id} className="bg-white rounded-[4rem] border-4 border-slate-900 shadow-[10px_10px_0px_0px_rgba(15,23,42,1)] overflow-hidden flex flex-col transition-all">
              
              <div className={`p-10 pb-6 ${getStatusTheme(app.status)} border-b-4 border-slate-900`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-grow">
                    {editId === app.id ? (
                      <input className="w-full text-xl font-black bg-white/20 rounded-xl px-3 py-1 outline-none text-white border border-white/40" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                    ) : (
                      <h2 className="text-3xl font-black tracking-tighter italic uppercase break-words leading-tight">{app.name}</h2>
                    )}
                    <p className="text-[10px] font-black uppercase opacity-70 mt-1">{app.job_role}</p>
                  </div>
                  <button onClick={() => editId === app.id ? saveEdit() : (setEditId(app.id), setEditData(app))} className="w-12 h-12 flex items-center justify-center bg-white/20 rounded-2xl border-2 border-white/20 shrink-0">
                    {editId === app.id ? '✔️' : '✏️'}
                  </button>
                </div>
              </div>

              <div className="p-10 space-y-6 flex-grow">
                {/* Contacts */}
                <div className="space-y-3">
                  <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-[1.5rem] text-[11px] font-black text-slate-600 border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] uppercase truncate">
                    <span>📧</span> {app.email}
                  </div>
                  <a href={`https://wa.me/${app.phone?.replace(/[^0-9]/g, '')}`} target="_blank" className="flex items-center gap-4 bg-emerald-50 p-5 rounded-[1.5rem] text-[11px] font-black text-emerald-700 border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] uppercase">
                    <span>📱</span> {app.phone}
                  </a>
                </div>

                {/* ARCHIVE VS REGULAR TRACKING */}
                {isArchivedView ? (
                  <div className="bg-slate-900 p-8 rounded-[3rem] space-y-4 text-white">
                    {app.status === 'Resigned' && <div className="space-y-1"><span className="text-[9px] font-black text-blue-400 uppercase">Leaving Date</span><p className="text-sm font-bold">{app.resignation_date}</p></div>}
                    <div className="space-y-1"><span className="text-[9px] font-black text-blue-400 uppercase">Remarks</span><p className="text-xs italic opacity-80 leading-relaxed">"{app.remarks || 'None'}"</p></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* CHECKBOXES ARE BACK HERE */}
                    {(app.status === 'Offered' || app.status === 'Offer Accepted') && (
                      <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-900 space-y-3 shadow-inner">
                        <div className="flex justify-between text-[10px] font-black uppercase italic"><span>1. Offer Hub</span><span className={offerHistory.includes(app.id) ? "text-emerald-600" : "text-slate-300"}>{offerHistory.includes(app.id) ? "● SENT" : "○ PENDING"}</span></div>
                        <div className="flex justify-between text-[10px] font-black uppercase italic"><span>2. Approval Hub</span><span className={approvalHistory.includes(app.id) ? "text-blue-600" : "text-slate-300"}>{approvalHistory.includes(app.id) ? "● SENT" : "○ PENDING"}</span></div>
                        <button onClick={() => toggleContract(app.id, app.contract_generated)} className={`w-full flex justify-between px-5 py-3 rounded-xl border-2 font-black text-[10px] uppercase border-slate-900 ${app.contract_generated ? 'bg-slate-900 text-white' : 'bg-white text-slate-300'}`}>
                          <span>3. Contract Done</span>
                          <span>{app.contract_generated ? '✓' : '○'}</span>
                        </button>
                      </div>
                    )}

                    {app.status === 'Offer Accepted' && isFullyReady ? (
                      <button onClick={() => updateStatus(app.id, 'Hired', 'Onboarded', '')} className="w-full py-6 bg-emerald-500 text-white rounded-[2rem] border-4 border-slate-900 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse hover:bg-slate-900">🎉 Onboard Now</button>
                    ) : (
                      <select value={app.status} onChange={e => handleStatusSelect(app, e.target.value)} className={`w-full py-5 rounded-[2rem] text-[11px] font-black uppercase border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center appearance-none cursor-pointer ${getStatusTheme(app.status)}`}>
                        {app.status === 'Hired' ? (
                          <><option value="Hired">Hired</option><option value="Offer Accepted">Move Back</option><option value="Resigned">Resigned</option></>
                        ) : (
                          <>{stages.map(s => <option key={s} value={s}>{s}</option>)}<optgroup label="Archive"><option value="Failed Interview">Failed Interview</option><option value="Rejected Offer">Rejected Offer</option><option value="Blacklisted">Blacklisted</option></optgroup></>
                        )}
                      </select>
                    )}
                  </div>
                )}

                {/* BOTTOM BUTTONS */}
                <div className="flex gap-2">
                  <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-white border-4 border-slate-900 py-4 rounded-[1.5rem] font-black text-[10px] uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-900 hover:text-white">Resume</a>
                  <button onClick={() => setShowHistoryId(showHistoryId === app.id ? null : app.id)} className="px-6 bg-slate-50 rounded-[1.5rem] border-4 border-slate-900 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">🕒 Hist</button>
                  <button onClick={() => fetchData()} className="p-4 bg-slate-50 rounded-[1.5rem] border-4 border-slate-900 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">↻</button>
                </div>

                {showHistoryId === app.id && (
                  <div className="mt-4 p-6 bg-slate-900 rounded-[2.5rem] text-white space-y-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-top-4 duration-300">
                     <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 border-b border-white/10 pb-2 italic">Detailed Timeline</p>
                     <div className="max-h-[150px] overflow-y-auto space-y-3 no-scrollbar">
                       {(app.status_history || []).map((h, i) => (
                         <div key={i} className="border-l-2 border-white/20 pl-4 py-1">
                            <div className="flex justify-between items-center text-[9px] font-black uppercase"><span>{h.status}</span><span className="text-white/40">{new Date(h.date).toLocaleDateString()}</span></div>
                            {h.remarks && <div className="text-[8px] italic text-white/60 mt-1">"{h.remarks}"</div>}
                         </div>
                       ))}
                     </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}