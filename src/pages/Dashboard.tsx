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
      'Hired': 'border-emerald-500 text-emerald-600 bg-emerald-50',
      'Offered': 'border-purple-500 text-purple-600 bg-purple-50',
      'Rejected Offer': 'border-rose-500 text-rose-600 bg-rose-50',
      'Interviewing': 'border-amber-500 text-amber-600 bg-amber-50',
      'Applied': 'border-blue-500 text-blue-600 bg-blue-50'
    };
    return themes[status] || 'border-slate-300 text-slate-600 bg-slate-50';
  };

  // --- THE ULTIMATE FIX FOR SINGAPORE TIME ---
  const handleTimezoneLockedBooking = (app, type) => {
    const dateIn = window.prompt(`Confirm Date (YYYY-MM-DD):`, new Date().toLocaleDateString('en-CA'));
    const timeIn = window.prompt(`Confirm Start Time (24h HH:MM):`, "10:00");
    
    if (!dateIn || !timeIn) return null;

    // 1. DATABASE SAVING (Internal History)
    // We store it as a string with the +08:00 offset so it never shifts to 6pm
    const internalFixedTimestamp = `${dateIn}T${timeIn}:00+08:00`;

    // 2. GOOGLE CALENDAR LINK
    const gDate = dateIn.replace(/-/g, '');
    const gTime = timeIn.replace(/:/g, '');
    
    // Calculate End Time (Start + 1 Hour)
    let [h, m] = timeIn.split(':').map(Number);
    let endH = (h + 1).toString().padStart(2, '0');
    
    const startStr = `${gDate}T${gTime}00`;
    const endStr = `${gDate}T${endH}${m.toString().padStart(2, '0')}00`;

    const title = encodeURIComponent(`${type}: ${app.name}`);
    const details = encodeURIComponent(`Candidate: ${app.name}\nRole: ${app.job_role}\nEmail: ${app.email}`);
    
    // ctz=Asia/Singapore tells Google to ignore the system clock and use Singapore SGT
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&ctz=Asia/Singapore`;
    
    window.open(url, '_blank');
    return internalFixedTimestamp;
  };

  const handleStatusChange = async (app, newStatus) => {
    let finalOffer = app.final_offer_salary;
    let timestamp = new Date().toISOString(); 

    if (newStatus === 'Interviewing' || newStatus === 'Hired') {
      const fixedTime = handleTimezoneLockedBooking(app, newStatus.toUpperCase());
      if (fixedTime) timestamp = fixedTime; else return;
    }

    if (newStatus === 'Offered') {
      const amount = window.prompt(`Final Offer Salary:`, app.salary_expectation || "");
      if (amount !== null) finalOffer = amount;
    }

    const history = [...(app.status_history || []), { status: newStatus, date: timestamp }];

    await supabase.from('applicants').update({ 
      status: newStatus, 
      status_history: history,
      final_offer_salary: finalOffer
    }).eq('id', app.id);
    fetchData();
  };

  const saveEdit = async () => {
    await supabase.from('applicants').update(editData).eq('id', editId);
    setEditId(null);
    fetchData();
  };

  const activePipeline = applicants.filter(a => !['Quit', 'Blacklisted', 'Failed Interview'].includes(a.status));
  const filtered = activePipeline.filter(a => 
    (a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.job_role.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterStatus === 'All' || a.status === filterStatus)
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10 pb-24">
      
      {/* 📊 CATEGORY TABS */}
      <div className="flex flex-wrap gap-2">
        {['All', 'Applied', 'Interviewing', 'Offered', 'Hired', 'Rejected Offer'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            filterStatus === s ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100'
          }`}>
            {s === 'Rejected Offer' ? 'Declined' : s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {filtered.map(app => (
          <div key={app.id} className="bg-white rounded-[3.5rem] border border-slate-100 shadow-xl overflow-hidden relative group">
            <div className={`h-3 ${getStatusTheme(app.status).split(' ')[0]}`}></div>
            
            <div className="p-10 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 leading-none tracking-tighter">{app.name}</h2>
                  <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest mt-2">{app.job_role}</p>
                </div>
                <button onClick={() => editId === app.id ? saveEdit() : (setEditId(app.id), setEditData(app))} className="p-4 bg-slate-50 rounded-2xl hover:bg-slate-900 hover:text-white transition-all">
                  {editId === app.id ? '💾' : '✏️'}
                </button>
              </div>

              {/* ACTION: ONE-CLICK BOOKING */}
              <button 
                onClick={() => handleStatusChange(app, 'Interviewing')}
                className="w-full py-5 bg-amber-400 text-amber-950 rounded-[2rem] font-black text-[12px] uppercase tracking-widest hover:bg-amber-500 transition-all shadow-lg shadow-amber-100"
              >
                📅 Schedule Interview
              </button>

              <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-4 shadow-inner">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-400 uppercase text-[9px]">Last Drawn</span>
                  {editId === app.id ? <input className="w-20 text-right border-b" value={editData.last_drawn_salary} onChange={e => setEditData({...editData, last_drawn_salary: e.target.value})} /> : <span>{app.last_drawn_salary || '—'}</span>}
                </div>
                <div className="flex justify-between items-center text-xs font-black">
                  <span className="text-slate-400 uppercase text-[9px]">Expected</span>
                  {editId === app.id ? <input className="w-20 text-right border-b" value={editData.salary_expectation} onChange={e => setEditData({...editData, salary_expectation: e.target.value})} /> : <span className="text-blue-600">{app.salary_expectation || '—'}</span>}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-50">
                <select 
                  value={app.status} 
                  onChange={e => handleStatusChange(app, e.target.value)} 
                  className={`w-full py-5 px-6 rounded-[2rem] text-[11px] font-black uppercase tracking-widest cursor-pointer appearance-none text-center border-2 ${getStatusTheme(app.status)}`}
                >
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offered">Offered</option>
                  <option value="Hired">Hired</option>
                  <option value="Rejected Offer">Rejected Offer</option>
                </select>
              </div>

              <div className="flex gap-3">
                <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-slate-900 text-white py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-lg">Resume</a>
                <button onClick={() => setShowHistoryId(showHistoryId === app.id ? null : app.id)} className="px-8 bg-slate-50 rounded-[2rem] text-slate-300 font-bold hover:text-blue-500">🕒</button>
              </div>
            </div>

            {/* 🕒 THE FIXED HISTORY DISPLAY */}
            {showHistoryId === app.id && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-50 p-12 flex flex-col rounded-[3.5rem] animate-fade-in shadow-2xl">
                <div className="flex justify-between items-center mb-10 border-b pb-4">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">History Log (SGT)</span>
                  <button onClick={() => setShowHistoryId(null)} className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 font-bold">✕</button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-10">
                  {app.status_history?.map((h, i) => (
                    <div key={i} className="relative pl-10 border-l-4 border-slate-50">
                      <div className="absolute -left-[10px] top-1 w-4 h-4 rounded-full bg-blue-500 shadow-lg shadow-blue-200"></div>
                      <div className="text-sm font-black uppercase text-slate-800 tracking-tighter">{h.status}</div>
                      <div className="text-[11px] text-slate-400 font-bold mt-2">
                        {/* THIS LINE ENSURES THE TEXT SAYS 10:00 AM */}
                        {new Date(h.date).toLocaleString('en-SG', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', hour12: true, day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}