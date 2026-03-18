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

  // --- THE SURGICAL TIME FIX ---
  const handleCalendarAndHistory = (app, type) => {
    const dateIn = window.prompt(`Confirm Date (YYYY-MM-DD):`, new Date().toLocaleDateString('en-CA'));
    const timeIn = window.prompt(`Confirm Time (24h HH:MM):`, "10:00");
    
    if (!dateIn || !timeIn) return null;

    // 1. Internal History Fix: Hardcode the string with the Singapore offset
    // This prevents the "6:00 PM" shift by telling DB exactly what timezone this is.
    const internalIsoWithOffset = `${dateIn}T${timeIn}:00+08:00`;

    // 2. Google Calendar Fix:
    const gDate = dateIn.replace(/-/g, '');
    const gTime = timeIn.replace(/:/g, '');
    const startStr = `${gDate}T${gTime}00`;
    
    let [h, m] = timeIn.split(':').map(Number);
    let endH = (h + 1).toString().padStart(2, '0');
    const endStr = `${gDate}T${endH}${m.toString().padStart(2, '0')}00`;

    const title = encodeURIComponent(`${type}: ${app.name}`);
    const details = encodeURIComponent(`Candidate: ${app.name}\nRole: ${app.job_role}`);
    
    // ctz=Asia/Singapore is mandatory to prevent the "12:30 PM" shift in Google
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&ctz=Asia/Singapore`;
    
    window.open(url, '_blank');

    return internalIsoWithOffset;
  };

  const handleStatusChange = async (app, newStatus) => {
    let finalOffer = app.final_offer_salary;
    // For standard updates, we still use UTC, but for Calendar, we use our fixed string
    let customHistoryDate = new Date().toISOString(); 

    if (newStatus === 'Interviewing' || newStatus === 'Hired') {
      const fixedIso = handleCalendarAndHistory(app, newStatus.toUpperCase());
      if (fixedIso) customHistoryDate = fixedIso; else return;
    }

    if (newStatus === 'Offered') {
      const amount = window.prompt(`Offer Salary:`, app.salary_expectation || "");
      if (amount !== null) finalOffer = amount;
    }

    const history = [...(app.status_history || []), { 
      status: newStatus, 
      date: customHistoryDate 
    }];

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

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-slate-300 text-3xl animate-pulse tracking-tighter uppercase">GenieBook.ATS</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      
      {/* CATEGORY TABS */}
      <div className="flex flex-wrap gap-2">
        {['All', 'Applied', 'Interviewing', 'Offered', 'Hired', 'Rejected Offer'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
            filterStatus === s ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100'
          }`}>
            {s === 'Rejected Offer' ? 'Declined' : s}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[3rem] border border-slate-50 shadow-sm">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">Talent<span className="text-blue-600">.</span></h1>
        <input 
          type="text" 
          placeholder="Filter..." 
          className="bg-slate-50 px-8 py-4 rounded-3xl outline-none border-2 border-transparent focus:border-blue-500 w-full md:w-80 font-bold text-sm"
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {filtered.map(app => (
          <div key={app.id} className="bg-white rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col overflow-hidden transition-all hover:shadow-2xl">
            <div className={`p-8 pb-4 border-t-[14px] ${getStatusTheme(app.status).split(' ')[0]}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{app.name}</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mt-2">{app.job_role}</p>
                </div>
                <button onClick={() => editId === app.id ? saveEdit() : (setEditId(app.id), setEditData(app))} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-900 transition-all shadow-sm">
                  {editId === app.id ? '💾' : '✏️'}
                </button>
              </div>
            </div>

            <div className="p-8 pt-0 space-y-6 flex-grow">
              <div className="grid grid-cols-2 gap-2">
                <a href={`mailto:${app.email}`} className="bg-slate-50 p-3 rounded-2xl text-center text-[10px] font-black text-slate-500 uppercase">Email</a>
                <a href={`https://wa.me/${app.phone?.replace(/[^0-9]/g, '')}`} target="_blank" className="bg-emerald-50 p-3 rounded-2xl text-center text-[10px] font-black text-emerald-700 hover:bg-emerald-600 hover:text-white uppercase transition-all">WhatsApp</a>
              </div>

              <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-4">
                <div className="flex justify-between text-xs font-black items-center">
                  <span className="text-slate-400 uppercase text-[9px] tracking-widest font-black">Expectation</span>
                  <span className="text-blue-600">{app.salary_expectation || '—'}</span>
                </div>
              </div>
            </div>

            <div className="p-8 pt-0 space-y-4">
              <select 
                value={app.status} 
                onChange={e => handleStatusChange(app, e.target.value)} 
                className={`w-full py-4 px-4 rounded-2xl text-[11px] font-black uppercase tracking-widest cursor-pointer border-2 appearance-none text-center ${getStatusTheme(app.status)}`}
              >
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offered">Offered</option>
                <option value="Hired">Hired</option>
                <option value="Rejected Offer">Rejected Offer</option>
                <option disabled>── ARCHIVE ──</option>
                <option value="Failed Interview">Failed</option>
                <option value="Quit">Quit</option>
                <option value="Blacklisted">Blacklisted</option>
              </select>

              <div className="flex gap-2">
                <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">Resume</a>
                <button onClick={() => setShowHistoryId(showHistoryId === app.id ? null : app.id)} className="px-6 bg-slate-50 rounded-2xl text-slate-300 font-bold hover:text-blue-500 transition-colors">🕒</button>
              </div>
            </div>

            {/* HISTORY OVERLAY */}
            {showHistoryId === app.id && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 p-10 flex flex-col rounded-[2.8rem] animate-fade-in shadow-2xl">
                <div className="flex justify-between items-center mb-10 border-b pb-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-black">Lifecycle</span>
                  <button onClick={() => setShowHistoryId(null)} className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 font-bold hover:text-red-500 transition-all">✕</button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-8">
                  {app.status_history?.map((h, i) => (
                    <div key={i} className="relative pl-8 border-l-2 border-slate-100">
                      <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-200"></div>
                      <div className="text-xs font-black uppercase text-slate-800 tracking-tight">{h.status}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-1">
                        {/* THE DISPLAY FIX: Force Singapore display regardless of storage */}
                        {new Date(h.date).toLocaleString('en-SG', { timeZone: 'Asia/Singapore', hour12: true })}
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