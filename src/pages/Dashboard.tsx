// @ts-nocheck
import { useEffect, useState } from 'react';
import { supabase } from '../db';

export default function Dashboard() {
  const [applicants, setApplicants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showHistoryId, setShowHistoryId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});

  const fetchData = async () => {
    try {
      const { data } = await supabase.from('applicants').select('*').order('created_at', { ascending: false });
      setApplicants(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const getStatusTheme = (status) => {
    const themes = {
      'Hired': 'bg-emerald-600 text-white',
      'Offered': 'bg-purple-600 text-white',
      'Interviewing': 'bg-amber-500 text-white',
      'Applied': 'bg-blue-600 text-white',
      'Rejected Offer': 'bg-rose-500 text-white',
      'Blacklisted': 'bg-slate-900 text-white',
      'Resigned': 'bg-orange-700 text-white',
      'Failed Interview': 'bg-slate-500 text-white'
    };
    return themes[status] || 'bg-slate-400 text-white';
  };

  // --- THE CORRECTED & SAFE STATUS CHANGE LOGIC ---
  const handleStatusChange = async (app, newStatus) => {
    // 1. Fetch Fresh Data (Prevents History Overwriting)
    const { data: freshApp, error: fetchErr } = await supabase
      .from('applicants')
      .select('status_history, remarks')
      .eq('id', app.id)
      .single();

    if (fetchErr) return alert("Sync Error: Could not fetch latest record.");

    let remarks = freshApp.remarks || "";
    let offeredSalary = null;
    let resignDate = null;

    // 2. Conditional Prompts
    if (newStatus === 'Offered') {
      const sal = window.prompt(`Enter Offered Salary for ${app.name}:`);
      if (sal === null) return;
      offeredSalary = sal;
    }

    if (['Blacklisted', 'Failed Interview', 'Resigned', 'Rejected Offer'].includes(newStatus)) {
      const msg = window.prompt(`Enter remarks/reason for ${newStatus}:`, remarks);
      if (msg === null) return;
      remarks = msg;
    }

    if (newStatus === 'Resigned') {
      const rDate = window.prompt(`Effective Date (YYYY-MM-DD):`, new Date().toISOString().split('T')[0]);
      if (rDate === null) return;
      resignDate = rDate;
    }

    // 3. Construct the Rich History Entry
    const newEntry = { 
      status: newStatus, 
      date: new Date().toISOString(),
      remarks: remarks || null,
      salary: offeredSalary || null,
      resign_date: resignDate || null
    };

    const updatedHistory = [...(freshApp.status_history || []), newEntry];

    // 4. Atomic Update
    const { error: updateErr } = await supabase.from('applicants').update({ 
      status: newStatus, 
      status_history: updatedHistory, 
      remarks 
    }).eq('id', app.id);
    
    if (updateErr) alert("Update Failed: " + updateErr.message);
    fetchData();
  };

  const saveEdit = async () => {
    await supabase.from('applicants').update(editData).eq('id', editId);
    setEditId(null);
    fetchData();
  };

  const counts = {
    All: applicants.filter(a => !['Blacklisted', 'Resigned', 'Failed Interview'].includes(a.status)).length,
    Applied: applicants.filter(a => a.status === 'Applied').length,
    Interviewing: applicants.filter(a => a.status === 'Interviewing').length,
    Offered: applicants.filter(a => a.status === 'Offered').length,
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
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase">GenieBook <span className="text-blue-600">ATS</span></h1>
        <input 
          type="text" 
          placeholder="Search name or role..." 
          className="w-full md:w-80 bg-white px-8 py-5 rounded-[2rem] border border-slate-100 shadow-sm font-bold text-sm focus:ring-4 focus:ring-blue-50 outline-none transition-all"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 bg-white p-3 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
        {Object.entries(counts).map(([label, count]) => (
          <button key={label} onClick={() => setFilterStatus(label)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${filterStatus === label ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-400'}`}>
            {label} <span className={`px-2.5 py-1 rounded-md text-[9px] ${filterStatus === label ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
          </button>
        ))}
      </div>

      {/* Grid of Candidate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(app => (
          <div key={app.id} className="bg-white rounded-[3.5rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col transition-all hover:translate-y-[-8px] hover:shadow-2xl">
            
            {/* Card Header (Colored) */}
            <div className={`p-10 pb-6 ${getStatusTheme(app.status)} transition-colors duration-500`}>
              <div className="flex justify-between items-start">
                <div className="flex-grow space-y-1">
                  {editId === app.id ? (
                    <>
                      <input className="w-full text-xl font-black bg-white/20 rounded-xl px-3 py-1 outline-none text-white mb-2" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                      <input className="w-full text-[10px] font-black uppercase bg-white/10 rounded-xl px-3 py-1 outline-none text-white/80" value={editData.job_role} onChange={e => setEditData({...editData, job_role: e.target.value})} />
                    </>
                  ) : (
                    <>
                      <h2 className="text-3xl font-black tracking-tighter italic uppercase">{app.name}</h2>
                      <p className="text-[10px] font-black uppercase opacity-70 tracking-[0.2em]">{app.job_role || 'No Role'}</p>
                    </>
                  )}
                </div>
                <button onClick={() => editId === app.id ? saveEdit() : (setEditId(app.id), setEditData(app))} className="p-4 bg-white/20 rounded-2xl hover:bg-white/40 transition-all active:scale-90">
                  {editId === app.id ? '✔️' : '✏️'}
                </button>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-10 space-y-8 flex-grow">
              <div className="space-y-3">
                <a href={`mailto:${app.email}`} className="flex items-center gap-4 bg-slate-50 p-5 rounded-[1.5rem] text-[11px] font-black text-slate-600 truncate hover:bg-slate-100 border border-slate-100 transition-all uppercase tracking-tight">
                  <span className="text-lg">📧</span> {app.email || 'No Email'}
                </a>
                <a href={`https://wa.me/${(app.phone || '').replace(/[^0-9]/g, '')}`} target="_blank" className="flex items-center gap-4 bg-emerald-50 p-5 rounded-[1.5rem] text-[11px] font-black text-emerald-700 hover:bg-emerald-100 border border-emerald-100 transition-all uppercase tracking-tight">
                  <span className="text-lg">📱</span> {app.phone || 'No Phone'}
                </a>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100">
                  <span className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Last Drawn</span>
                  <span className="text-xs font-black text-slate-700">{app.last_drawn_salary || '—'}</span>
                </div>
                <div className="flex-1 bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100">
                  <span className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Expected</span>
                  <span className="text-xs font-black text-blue-600">{app.salary_expectation || '—'}</span>
                </div>
              </div>

              {app.remarks && (
                <div className="bg-slate-50 p-5 rounded-[1.5rem] border-l-8 border-slate-200 shadow-inner">
                  <span className="block text-[8px] font-black text-slate-400 uppercase mb-2 italic tracking-tighter underline">Latest Admin Note</span>
                  <p className="text-[11px] text-slate-600 font-bold italic leading-relaxed">"{app.remarks}"</p>
                </div>
              )}

              {/* Status & History Control */}
              <div className="space-y-4 pt-4">
                <div className="relative">
                  <select 
                    value={app.status} 
                    onChange={e => handleStatusChange(app, e.target.value)} 
                    className={`w-full py-5 px-8 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] cursor-pointer border-none appearance-none text-center shadow-lg transition-all ${getStatusTheme(app.status)}`}
                  >
                    <option value="Applied">Applied</option>
                    <option value="Interviewing">Interviewing</option>
                    <option value="Offered">Offered</option>
                    <option value="Hired">Hired</option>
                    <option value="Rejected Offer">Rejected Offer</option>
                    <option value="Failed Interview">Failed Interview</option>
                    <option value="Resigned">Resigned</option>
                    <option value="Blacklisted">Blacklisted</option>
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">▼</div>
                </div>

                <div className="flex gap-3">
                  <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all">View Resume</a>
                  <button onClick={() => setShowHistoryId(showHistoryId === app.id ? null : app.id)} className="px-6 bg-slate-50 rounded-[1.5rem] text-slate-400 font-black text-[10px] hover:text-blue-600 transition-all uppercase tracking-tighter">🕒 Hist</button>
                </div>
              </div>

              {/* EXPANDABLE RICH HISTORY */}
              {showHistoryId === app.id && (
                <div className="mt-4 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-300">
                   <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 italic">Detailed Timeline</p>
                   <div className="max-h-[200px] overflow-y-auto pr-2 space-y-4 no-scrollbar">
                     {app.status_history?.map((h, i) => (
                       <div key={i} className="border-l-2 border-slate-200 pl-4 py-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{h.status}</span>
                            <span className="text-[8px] font-bold text-slate-400">{new Date(h.date).toLocaleDateString()}</span>
                          </div>
                          {h.salary && <div className="text-[9px] font-black text-emerald-600 italic">Offer: ${h.salary}</div>}
                          {h.remarks && <div className="text-[9px] font-bold text-slate-500 italic mt-1 leading-tight">"{h.remarks}"</div>}
                          {h.resign_date && <div className="text-[9px] font-black text-rose-600">Effective: {h.resign_date}</div>}
                       </div>
                     ))}
                   </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}