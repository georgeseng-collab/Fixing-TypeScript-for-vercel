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
      'Hired': 'bg-emerald-500 text-white shadow-emerald-100',
      'Offered': 'bg-purple-600 text-white shadow-purple-100',
      'Interviewing': 'bg-amber-500 text-white shadow-amber-100',
      'Applied': 'bg-blue-600 text-white shadow-blue-100',
      'Rejected Offer': 'bg-rose-500 text-white shadow-rose-100'
    };
    return themes[status] || 'bg-slate-400 text-white';
  };

  const openGoogleCalendar = (app, type) => {
    const dateIn = window.prompt(`Confirm Date (YYYY-MM-DD):`, new Date().toLocaleDateString('en-CA'));
    const timeIn = window.prompt(`Confirm Time (24h HH:MM):`, "10:00");
    if (!dateIn || !timeIn) return null;

    const gDate = dateIn.replace(/-/g, '');
    const gTime = timeIn.replace(/:/g, '');
    const start = `${gDate}T${gTime}00`;
    let [h, m] = timeIn.split(':').map(Number);
    let endH = (h + 1).toString().padStart(2, '0');
    const end = `${gDate}T${endH}${m.toString().padStart(2, '0')}00`;

    const title = encodeURIComponent(`${type}: ${app.name}`);
    const details = encodeURIComponent(`Candidate: ${app.name}\nRole: ${app.job_role}\nEmail: ${app.email}`);
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&ctz=Asia/Singapore`;
    window.open(url, '_blank');

    return `${dateIn}T${timeIn}:00+08:00`;
  };

  const handleStatusChange = async (app, newStatus) => {
    let finalOffer = app.final_offer_salary;
    let timestamp = new Date().toISOString(); 

    if (newStatus === 'Interviewing' || newStatus === 'Hired') {
      const fixedTime = openGoogleCalendar(app, newStatus.toUpperCase());
      if (fixedTime) timestamp = fixedTime; else return;
    }

    if (newStatus === 'Offered') {
      const amount = window.prompt(`Confirm Final Offer Salary:`, app.salary_expectation || "");
      if (amount !== null) finalOffer = amount;
    }

    const history = [...(app.status_history || []), { status: newStatus, date: timestamp }];
    await supabase.from('applicants').update({ status: newStatus, status_history: history, final_offer_salary: finalOffer }).eq('id', app.id);
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

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 text-4xl animate-pulse italic">GENIEBOOK</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      
      {/* 📊 NAVIGATION TABS */}
      <div className="flex flex-wrap gap-3 justify-center md:justify-start">
        {['All', 'Applied', 'Interviewing', 'Offered', 'Hired'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            filterStatus === s ? 'bg-slate-900 text-white shadow-2xl scale-105' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
          }`}>
            {s} ({s === 'All' ? activePipeline.length : activePipeline.filter(a => a.status === s).length})
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white/50 backdrop-blur-xl p-10 rounded-[3rem] border border-white shadow-2xl">
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic">Talent<span className="text-blue-600">.</span></h1>
        <input 
          type="text" 
          placeholder="Filter candidate names..." 
          className="bg-white px-8 py-4 rounded-3xl outline-none border border-slate-100 focus:border-blue-500 w-full md:w-96 font-bold text-lg shadow-sm"
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {filtered.map(app => (
          <div key={app.id} className="bg-white rounded-[4rem] border border-slate-50 shadow-2xl flex flex-col overflow-hidden transition-all hover:translate-y-[-8px]">
            
            <div className={`p-10 pb-6 ${getStatusTheme(app.status)}`}>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  {editId === app.id ? (
                    <input className="bg-white/20 text-white font-black text-2xl rounded px-2 w-full outline-none" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                  ) : (
                    <h2 className="text-3xl font-black tracking-tighter leading-none">{app.name}</h2>
                  )}
                  <p className="text-[11px] font-black uppercase opacity-80 tracking-widest">{app.job_role}</p>
                </div>
                <button onClick={() => editId === app.id ? saveEdit() : (setEditId(app.id), setEditData(app))} className="p-4 bg-white/20 hover:bg-white/40 rounded-3xl transition-all">
                  {editId === app.id ? '✔️' : '✏️'}
                </button>
              </div>
            </div>

            <div className="p-10 pt-8 space-y-8 flex-grow">
              
              {/* Communication Hub */}
              <div className="grid grid-cols-2 gap-4">
                <a href={`mailto:${app.email}`} className="bg-slate-50 p-4 rounded-3xl text-center text-[10px] font-black text-slate-500 hover:bg-slate-900 hover:text-white transition-all">EMAIL</a>
                <a href={`https://wa.me/${app.phone?.replace(/[^0-9]/g, '')}`} target="_blank" className="bg-emerald-50 p-4 rounded-3xl text-center text-[10px] font-black text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all">WHATSAPP</a>
              </div>

              {/* Salary Breakdown */}
              <div className="bg-slate-50/50 p-8 rounded-[3rem] border border-slate-100 space-y-5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-black uppercase text-[9px] tracking-widest">Last Drawn</span>
                  {editId === app.id ? <input className="w-24 text-right border-b bg-transparent font-bold" value={editData.last_drawn_salary} onChange={e => setEditData({...editData, last_drawn_salary: e.target.value})} /> : <span className="font-black text-slate-700">{app.last_drawn_salary || '—'}</span>}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-black uppercase text-[9px] tracking-widest">Expected</span>
                  {editId === app.id ? <input className="w-24 text-right border-b bg-transparent font-bold" value={editData.salary_expectation} onChange={e => setEditData({...editData, salary_expectation: e.target.value})} /> : <span className="font-black text-blue-600 text-xl">{app.salary_expectation || '—'}</span>}
                </div>
              </div>

              {/* Status Selector */}
              <div className="space-y-4">
                <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-2">Pipeline Stage</div>
                <select 
                  value={app.status} 
                  onChange={e => handleStatusChange(app, e.target.value)} 
                  className={`w-full py-5 px-8 rounded-[2.5rem] text-[11px] font-black uppercase tracking-widest cursor-pointer border-2 transition-all appearance-none text-center ${getStatusTheme(app.status)}`}
                >
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offered">Offered</option>
                  <option value="Hired">Hired</option>
                  <option value="Rejected Offer">Rejected Offer</option>
                  <option disabled>── ARCHIVE ──</option>
                  <option value="Failed Interview">Failed Interview</option>
                  <option value="Quit">Quit</option>
                  <option value="Blacklisted">Blacklisted</option>
                </select>
              </div>

              <div className="flex gap-4">
                <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-slate-900 text-white py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-lg hover:bg-black transition-all">Resume</a>
                <button onClick={() => setShowHistoryId(showHistoryId === app.id ? null : app.id)} className="px-8 bg-slate-100 rounded-[2rem] text-slate-400 font-bold hover:bg-slate-200 transition-colors">🕒 History</button>
              </div>
            </div>

            {/* Lifecycle History Overlay */}
            {showHistoryId === app.id && (
              <div className="absolute inset-0 bg-white/98 backdrop-blur-xl z-50 p-12 flex flex-col rounded-[4rem] animate-fade-in shadow-2xl">
                <div className="flex justify-between items-center mb-10 border-b pb-6">
                  <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">Full Lifecycle Log</span>
                  <button onClick={() => setShowHistoryId(null)} className="h-12 w-12 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 font-bold hover:text-red-500 transition-all">✕</button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-10 custom-scrollbar">
                  {app.status_history?.map((h, i) => (
                    <div key={i} className="relative pl-12 border-l-4 border-slate-50">
                      <div className="absolute -left-[10px] top-1 w-4 h-4 rounded-full bg-blue-500 shadow-lg shadow-blue-200"></div>
                      <div className="text-sm font-black uppercase text-slate-800 tracking-tighter">{h.status}</div>
                      <div className="text-[11px] text-slate-400 font-bold mt-2">
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