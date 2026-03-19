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
  
  // New State for Archive Sub-Filtering
  const [archiveFilter, setArchiveFilter] = useState('All');
  
  // Ownership State for Recruiter Tracking
  const [currentUser, setCurrentUser] = useState(null);
  const [viewType, setViewType] = useState('All'); 

  // Edit State
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});

  // Modals State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeApp, setActiveApp] = useState(null);
  const [modalType, setModalType] = useState(''); 
  const [formData, setFormData] = useState({ status: '', remarks: '', date: '', offered_salary: '' });

  // DEFINING ARCHIVE CATEGORIES
  const ARCHIVE_STATUSES = ['KIV', 'Resigned', 'Blacklisted', 'Failed Interview', 'Rejected Offer'];
  const stages = ['Applied', 'Interviewing', 'Offered', 'Offer Accepted', 'Hired'];

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get Logged in Recruiter
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

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

  useEffect(() => { 
    fetchData(); 
  }, []);

  // --- ANALYTICS CALCULATIONS ---
  const funnelData = {
    applied: applicants.length,
    active: applicants.filter(a => !ARCHIVE_STATUSES.includes(a.status) && a.status !== 'Hired').length,
    hired: applicants.filter(a => a.status === 'Hired').length
  };

  const sourceCounts = applicants.reduce((acc, app) => {
    const src = app.source || 'Direct';
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {});

  const updateStatus = async (id, status, remarks, date, offered_salary, isReset = false) => {
    try {
      const { data: currentApp } = await supabase.from('applicants').select('*').eq('id', id).single();
      
      const historyEntry = { 
        status, 
        date: new Date().toISOString(), 
        remarks: remarks || (isReset ? "🔄 Candidate Reset to Pipeline" : "Status Updated"), 
        offered_salary: offered_salary || null 
      };

      const updatedHistory = [...(currentApp?.status_history || []), historyEntry];
      
      const updatePayload = { 
        status, 
        status_history: updatedHistory,
        remarks: isReset ? null : (remarks || currentApp.remarks),
        resignation_date: isReset ? null : (date || currentApp.resignation_date)
      };

      if (offered_salary) updatePayload.offered_salary = offered_salary;

      const { error } = await supabase.from('applicants').update(updatePayload).eq('id', id);
      if (error) throw error;

      setShowStatusModal(false);
      setActiveApp(null);
      fetchData();
    } catch (err) { 
      alert("Update failed: " + err.message); 
    }
  };

  const handleStatusSelect = (app, newStatus) => {
    setActiveApp(app);
    const today = new Date().toISOString().split('T')[0];
    
    if (newStatus === 'Offered') {
      setModalType('offer');
      setFormData({ status: newStatus, remarks: '', date: '', offered_salary: app.offered_salary || '' });
      setShowStatusModal(true);
    } else if (ARCHIVE_STATUSES.includes(newStatus)) {
      setModalType('remarks');
      setFormData({ status: newStatus, remarks: '', date: (newStatus === 'Resigned' ? today : ''), offered_salary: '' });
      setShowStatusModal(true);
    } else {
      updateStatus(app.id, newStatus, '', '', '');
    }
  };

  const toggleContract = async (id, currentVal) => {
    await supabase.from('applicants').update({ contract_generated: !currentVal }).eq('id', id);
    fetchData();
  };

  const saveEdit = async () => {
    const syncData = {
      ...editData,
      current_salary: editData.current_salary || editData.last_drawn_salary,
      expected_salary: editData.expected_salary || editData.salary_expectation
    };
    await supabase.from('applicants').update(syncData).eq('id', editId);
    setEditId(null);
    fetchData();
  };

  const getStatusTheme = (status) => {
    const themes = {
      'Applied': 'bg-blue-600 text-white',
      'Interviewing': 'bg-amber-500 text-white',
      'Offered': 'bg-purple-600 text-white',
      'Offer Accepted': 'bg-indigo-600 text-white',
      'Hired': 'bg-emerald-600 text-white',
      'Resigned': 'bg-orange-700 text-white',
      'Blacklisted': 'bg-slate-900 text-white',
      'Failed Interview': 'bg-slate-500 text-white',
      'Rejected Offer': 'bg-rose-500 text-white',
      'KIV': 'bg-teal-600 text-white'
    };
    return themes[status] || 'bg-slate-400 text-white';
  };

  const stats = {
    All: applicants.filter(a => !ARCHIVE_STATUSES.includes(a.status)).length,
    Applied: applicants.filter(a => a.status === 'Applied').length,
    Interviewing: applicants.filter(a => a.status === 'Interviewing').length,
    Offered: applicants.filter(a => a.status === 'Offered').length,
    'Offer Accepted': applicants.filter(a => a.status === 'Offer Accepted').length,
    Hired: applicants.filter(a => a.status === 'Hired').length,
    'Archive': applicants.filter(a => ARCHIVE_STATUSES.includes(a.status)).length,
  };

  const filtered = applicants.filter(a => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = 
      (a.name || "").toLowerCase().includes(s) || 
      (a.job_role || "").toLowerCase().includes(s) || 
      (a.email || "").toLowerCase().includes(s) || 
      (a.phone || "").includes(s);

    const matchesOwnership = viewType === 'All' || a.created_by === currentUser?.id;
    const isArchived = ARCHIVE_STATUSES.includes(a.status);
    
    // ARCHIVE LOGIC WITH SUB-FILTERING
    if (filterStatus === 'Archive') {
      if (!isArchived) return false;
      if (archiveFilter !== 'All' && a.status !== archiveFilter) return false;
      return matchesSearch && matchesOwnership;
    }
    
    if (filterStatus === 'All') return matchesSearch && matchesOwnership && !isArchived;
    return matchesSearch && matchesOwnership && a.status === filterStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-8 pb-32 relative text-slate-900 font-sans">
      
      {/* 📊 NEW ANALYTICS HUB */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Source Tracking Card */}
        <div className="bg-white border-4 border-slate-900 rounded-[3rem] p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
           <h3 className="text-xl font-black uppercase italic mb-6">📍 Lead Sources</h3>
           <div className="space-y-4 max-h-[180px] overflow-y-auto pr-2 no-scrollbar">
              {Object.entries(sourceCounts).map(([source, count], i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-black uppercase">
                    <span>{source}</span>
                    <span>{Math.round((count / applicants.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full border border-slate-900 overflow-hidden">
                    <div className="bg-blue-600 h-full" style={{ width: `${(count / applicants.length) * 100}%` }} />
                  </div>
                </div>
              ))}
           </div>
        </div>

        {/* Funnel Visual */}
        <div className="lg:col-span-2 bg-slate-900 rounded-[3rem] p-8 border-4 border-slate-900 shadow-[12px_12px_0px_0px_rgba(59,130,246,1)] text-white">
          <h3 className="text-xl font-black uppercase italic mb-6 flex justify-between items-center">
            Recruitment Funnel <span className="text-[10px] bg-blue-500 px-3 py-1 rounded-full not-italic">LIVE</span>
          </h3>
          <div className="grid grid-cols-3 gap-4">
             <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center">
                <p className="text-[10px] font-bold uppercase opacity-40 mb-2">Total Apps</p>
                <p className="text-5xl font-black italic">{funnelData.applied}</p>
             </div>
             <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center">
                <p className="text-[10px] font-bold uppercase opacity-40 mb-2">In Pipeline</p>
                <p className="text-5xl font-black italic text-amber-400">{funnelData.active}</p>
             </div>
             <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center">
                <p className="text-[10px] font-bold uppercase opacity-40 mb-2">Hired</p>
                <p className="text-5xl font-black italic text-emerald-400">{funnelData.hired}</p>
             </div>
          </div>
        </div>
      </section>

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-8 border-slate-900 pb-8 text-left">
        <div className="space-y-4">
           <h1 className="text-7xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Management</h1>
           <div className="flex gap-2">
              <button 
                onClick={() => setViewType('All')} 
                className={`px-6 py-2 rounded-full border-4 border-slate-900 font-black text-[10px] uppercase transition-all ${viewType === 'All' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-900 hover:bg-slate-100'}`}
              >
                🌍 Team's View
              </button>
              <button 
                onClick={() => setViewType('Mine')} 
                className={`px-6 py-2 rounded-full border-4 border-slate-900 font-black text-[10px] uppercase transition-all ${viewType === 'Mine' ? 'bg-blue-600 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-slate-900 hover:bg-blue-50'}`}
              >
                👤 My Candidates
              </button>
           </div>
        </div>
        <input 
          type="text" 
          placeholder="Search name, role, email..." 
          className="w-full md:w-96 bg-white px-8 py-5 rounded-[2.5rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] font-bold text-sm outline-none focus:bg-blue-50 transition-all placeholder:text-slate-300" 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
        />
      </div>

      {/* MAIN STATS FILTER BUTTONS */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(stats).map(([label, count]) => (
          <button 
            key={label} 
            onClick={() => { 
              setFilterStatus(label); 
              setArchiveFilter('All'); 
            }} 
            className={`flex-1 min-w-[140px] p-6 rounded-[2rem] border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all ${filterStatus === label ? 'bg-slate-900 text-white shadow-none translate-x-1 translate-y-1' : 'bg-white text-slate-900'}`}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className="text-4xl font-black italic">{count}</p>
          </button>
        ))}
      </div>

      {/* ARCHIVE SUB-FILTERS (Only visible when Archive is selected) */}
      {filterStatus === 'Archive' && (
        <div className="flex flex-wrap gap-3 items-center bg-slate-200 p-5 rounded-3xl border-4 border-slate-900 shadow-inner animate-in fade-in zoom-in duration-200 text-left">
          <span className="text-[11px] font-black uppercase tracking-widest opacity-50 ml-2 mr-2">Filter Archive:</span>
          {['All', 'KIV', 'Failed Interview', 'Resigned', 'Blacklisted', 'Rejected Offer'].map(sub => (
            <button 
              key={sub} 
              onClick={() => setArchiveFilter(sub)}
              className={`px-5 py-2.5 rounded-2xl border-4 border-slate-900 font-black text-[10px] uppercase transition-all ${archiveFilter === sub ? 'bg-slate-900 text-white shadow-none translate-y-1' : 'bg-white text-slate-900 hover:bg-slate-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* APPLICANT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 text-left pt-4">
        {filtered.map(app => {
          const isReady = offerHistory.includes(app.id) && approvalHistory.includes(app.id) && app.contract_generated;
          const isArchived = ARCHIVE_STATUSES.includes(app.status);

          return (
            <div key={app.id} className="bg-white rounded-[4rem] border-4 border-slate-900 shadow-[14px_14px_0px_0px_rgba(15,23,42,1)] overflow-hidden flex flex-col transition-all hover:-translate-y-2">
              
              {/* CARD HEADER */}
              <div className={`p-10 pb-8 ${getStatusTheme(app.status)} border-b-4 border-slate-900 relative`}>
                  {app.offered_salary && !isArchived && (
                    <div className="absolute top-6 right-6 bg-emerald-400 border-2 border-slate-900 px-3 py-1 rounded-full text-[10px] font-black text-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      OFFER: ${app.offered_salary}
                    </div>
                  )}
                  <div className="flex-grow">
                    {editId === app.id ? (
                      <div className="space-y-2">
                        <input 
                          className="w-full text-xl font-black bg-white/20 rounded-xl px-3 py-1 outline-none text-white border border-white/40" 
                          value={editData.name} 
                          onChange={e => setEditData({...editData, name: e.target.value})} 
                        />
                        <input 
                          className="w-full text-[11px] font-black uppercase bg-white/10 rounded-xl px-3 py-1 outline-none text-white/80" 
                          value={editData.job_role} 
                          onChange={e => setEditData({...editData, job_role: e.target.value})} 
                        />
                      </div>
                    ) : (
                      <>
                        <h2 className="text-3xl font-black tracking-tighter italic uppercase break-words leading-tight mb-1">{app.name}</h2>
                        <p className="text-[11px] font-black uppercase opacity-70 mt-1">{app.job_role}</p>
                      </>
                    )}
                  </div>
                  {/* RECRUITER & SOURCE TAGS */}
                  <div className="flex gap-2 flex-wrap mt-4">
                    <div className="text-[9px] font-black uppercase bg-black/10 inline-flex items-center px-3 py-1 rounded-full">
                      👤 {app.creator_email === currentUser?.email ? 'Me' : (app.creator_email || 'System')}
                    </div>
                    <div className="text-[9px] font-black uppercase bg-black/10 inline-flex items-center px-3 py-1 rounded-full">
                      📍 {app.source || 'Direct'}
                    </div>
                  </div>
              </div>

              {/* CARD BODY */}
              <div className="p-10 space-y-8 flex-grow">
                
                {/* CONTACT INFO */}
                <div className="space-y-3">
                  {editId === app.id ? (
                    <div className="space-y-2">
                      <input 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-900 rounded-2xl font-bold text-xs" 
                        value={editData.email} 
                        onChange={e => setEditData({...editData, email: e.target.value})} 
                      />
                      <input 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-900 rounded-2xl font-bold text-xs" 
                        value={editData.phone} 
                        onChange={e => setEditData({...editData, phone: e.target.value})} 
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-[1.5rem] text-[11px] font-black text-slate-600 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase truncate">
                        <span>📧</span> {app.email}
                      </div>
                      <a 
                        href={`https://wa.me/${app.phone?.replace(/[^0-9]/g, '')}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex items-center gap-4 bg-emerald-50 p-5 rounded-[1.5rem] text-[11px] font-black text-emerald-700 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase hover:bg-emerald-100 transition-all"
                      >
                        <span>📱</span> {app.phone}
                      </a>
                    </>
                  )}
                </div>

                {/* STATUS & JOURNEY LOGIC */}
                {isArchived ? (
                  <div className="space-y-6 text-center">
                    <div className="bg-slate-900 p-8 rounded-[3.5rem] text-white shadow-inner text-left">
                      {app.status === 'Resigned' && (
                        <div className="space-y-1 mb-4">
                          <span className="text-[9px] font-black text-blue-400 uppercase italic tracking-widest">Resigned On</span>
                          <p className="text-sm font-bold text-rose-400 italic">{app.resignation_date || 'N/A'}</p>
                        </div>
                      )}
                      <p className="text-[9px] font-black text-blue-400 uppercase italic mb-2 tracking-widest">Archive Log ({app.status})</p>
                      <p className="text-xs italic opacity-80 leading-relaxed line-clamp-4">"{app.remarks || 'No remarks recorded.'}"</p>
                    </div>
                    <button 
                      onClick={() => { if(confirm(`Restore ${app.name}?`)) updateStatus(app.id, 'Applied', '', '', '', true) }} 
                      className="w-full py-6 bg-white border-4 border-slate-900 rounded-[2.5rem] font-black uppercase text-[11px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-600 hover:text-white transition-all"
                    >
                      🔄 Restore Candidate
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(app.status === 'Offered' || app.status === 'Offer Accepted') && (
                      <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-900 space-y-4 shadow-inner mb-6">
                        <div className="flex justify-between text-[11px] font-black uppercase italic">
                          <span>1. Offer Hub</span>
                          <span className={offerHistory.includes(app.id) ? "text-emerald-600" : "text-slate-300"}>{offerHistory.includes(app.id) ? "● SENT" : "○ PENDING"}</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-black uppercase italic">
                          <span>2. Approval Hub</span>
                          <span className={approvalHistory.includes(app.id) ? "text-blue-600" : "text-slate-300"}>{approvalHistory.includes(app.id) ? "● SENT" : "○ PENDING"}</span>
                        </div>
                        <button 
                          onClick={() => toggleContract(app.id, app.contract_generated)} 
                          className={`w-full flex justify-between px-6 py-4 rounded-2xl border-2 font-black text-[11px] uppercase border-slate-900 transition-all ${app.contract_generated ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-300'}`}
                        >
                          <span>3. Contract Done</span>
                          <span>{app.contract_generated ? '✓' : '○'}</span>
                        </button>
                      </div>
                    )}
                    
                    {app.status === 'Offer Accepted' && isReady ? (
                      <button 
                        onClick={() => updateStatus(app.id, 'Hired', 'Onboarded', '')} 
                        className="w-full py-8 bg-emerald-500 text-white rounded-[2.5rem] border-4 border-slate-900 font-black uppercase tracking-widest shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-pulse"
                      >
                        🎉 Onboard Now
                      </button>
                    ) : (
                      <select 
                        value={app.status} 
                        onChange={e => handleStatusSelect(app, e.target.value)} 
                        className={`w-full py-6 rounded-[2.5rem] text-[12px] font-black uppercase border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center appearance-none cursor-pointer ${getStatusTheme(app.status)}`}
                      >
                        {app.status === 'Hired' ? (
                          <>
                            <option value="Hired">Hired (Onboarded)</option>
                            <option value="Offer Accepted">Move Back to Offer</option>
                            <option value="Resigned">Resigned</option>
                          </>
                        ) : (
                          <>
                            <optgroup label="Active Process">
                              {stages.map(s => <option key={s} value={s}>{s}</option>)}
                            </optgroup>
                            <optgroup label="Archive / Decision">
                              <option value="KIV">Keep In View (KIV)</option>
                              <option value="Failed Interview">Failed Interview</option>
                              <option value="Rejected Offer">Rejected Offer</option>
                              <option value="Resigned">Resigned</option>
                              <option value="Blacklisted">Blacklisted</option>
                            </optgroup>
                          </>
                        )}
                      </select>
                    )}
                  </div>
                )}

                {/* SALARY INFO SECTION */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-5 rounded-[1.5rem] border-2 border-slate-900 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <span className="block text-[9px] font-black text-slate-400 uppercase mb-1 text-left italic">Last Drawn</span>
                    {editId === app.id ? ( 
                      <input 
                        className="w-full text-center bg-white border-2 border-slate-200 rounded-lg font-black py-1 text-xs" 
                        value={editData.current_salary} 
                        onChange={e => setEditData({...editData, current_salary: e.target.value})} 
                      /> 
                    ) : ( 
                      <span className="text-sm font-black">${app.current_salary || app.last_drawn_salary || '0'}</span> 
                    )}
                  </div>
                  <div className="bg-slate-50 p-5 rounded-[1.5rem] border-2 border-slate-900 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <span className="block text-[9px] font-black text-blue-600 uppercase mb-1 text-left italic">Expected</span>
                    {editId === app.id ? ( 
                      <input 
                        className="w-full text-center bg-white border-2 border-slate-200 rounded-lg font-black py-1 text-xs text-blue-600" 
                        value={editData.expected_salary} 
                        onChange={e => setEditData({...editData, expected_salary: e.target.value})} 
                      /> 
                    ) : ( 
                      <span className="text-sm font-black text-blue-600">${app.expected_salary || app.salary_expectation || '0'}</span> 
                    )}
                  </div>
                </div>

                {/* ACTION ICONS SECTION */}
                <div className="flex gap-4">
                  <a 
                    href={app.resume_metadata?.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex-1 flex justify-center items-center bg-white border-4 border-slate-900 py-5 rounded-[2rem] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-900 hover:text-white text-2xl transition-all"
                  >
                    📄
                  </a>
                  <button 
                    onClick={() => { setActiveApp(app); setShowHistoryModal(true); }} 
                    className="flex-1 flex justify-center items-center bg-slate-50 rounded-[2rem] border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-500 hover:text-white text-2xl transition-all"
                  >
                    🕒
                  </button>
                  <button 
                    onClick={() => editId === app.id ? saveEdit() : (setEditId(app.id), setEditData(app))} 
                    className={`flex-1 flex justify-center items-center rounded-[2rem] border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-2xl transition-all ${editId === app.id ? 'bg-emerald-500 text-white animate-pulse' : 'bg-white text-slate-900 hover:bg-slate-900 hover:text-white'}`}
                  >
                    {editId === app.id ? '✔️' : '✏️'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODALS SECTION */}
      {showStatusModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4">
          <div className="bg-white border-8 border-slate-900 w-full max-w-lg rounded-[3rem] p-10 space-y-6 shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] text-left">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">
              {modalType === 'offer' ? '💸 Salary Offer' : `Log ${formData.status}`}
            </h2>
            <div className="space-y-4">
              {modalType === 'offer' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-blue-600">Offered Salary ($)</label>
                  <input 
                    type="number" 
                    className="w-full p-4 border-4 border-slate-900 rounded-2xl font-black outline-none bg-slate-50 focus:bg-white" 
                    value={formData.offered_salary} 
                    onChange={e => setFormData({...formData, offered_salary: e.target.value})} 
                  />
                </div>
              )}
              {modalType === 'resigned' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Date of Exit</label>
                  <input 
                    type="date" 
                    className="w-full p-4 border-4 border-slate-900 rounded-2xl font-bold outline-none bg-slate-50 focus:bg-white" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 italic">Internal Remarks / Reason</label>
                <textarea 
                  rows="4" 
                  className="w-full p-4 border-4 border-slate-900 rounded-2xl font-bold outline-none bg-slate-50 focus:bg-white" 
                  value={formData.remarks} 
                  onChange={e => setFormData({...formData, remarks: e.target.value})} 
                />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setShowStatusModal(false)} 
                className="flex-1 py-4 border-4 border-slate-900 rounded-xl font-black uppercase text-xs hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => updateStatus(activeApp.id, formData.status, formData.remarks, formData.date, formData.offered_salary)} 
                className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(59,130,246,1)] hover:bg-blue-600 transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-4 text-white">
          <div className="bg-slate-900 border-8 border-white/10 w-full max-w-2xl rounded-[4rem] p-12 relative overflow-hidden text-left shadow-2xl">
            <h2 className="text-5xl font-black uppercase italic tracking-tighter mb-8">Journey Log</h2>
            <div className="max-h-[400px] overflow-y-auto space-y-6 pr-4 no-scrollbar mt-8">
              {(activeApp?.status_history || []).map((h, i) => (
                <div key={i} className="relative pl-8 border-l-4 border-white/10 py-2">
                  <div className="absolute -left-[10px] top-4 w-4 h-4 rounded-full bg-blue-500" />
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xl font-black uppercase tracking-tighter italic">{h.status}</span>
                    <span className="text-[10px] font-bold text-white/30">{new Date(h.date).toLocaleDateString()}</span>
                  </div>
                  {h.offered_salary && <p className="text-xs font-black text-emerald-400 mb-1 tracking-widest">OFFERED: ${h.offered_salary}</p>}
                  {h.remarks && <p className="text-sm font-medium text-white/60 bg-white/5 p-4 rounded-2xl italic leading-relaxed">"{h.remarks}"</p>}
                </div>
              ))}
            </div>
            <button 
              onClick={() => setShowHistoryModal(false)} 
              className="w-full mt-10 py-6 bg-white text-slate-900 rounded-[2rem] font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(59,130,246,1)] hover:bg-blue-500 hover:text-white transition-all text-center"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}