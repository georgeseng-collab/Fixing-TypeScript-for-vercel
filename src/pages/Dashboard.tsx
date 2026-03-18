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

  // --- THE ULTIMATE TIMEZONE ANCHOR ---
  const handleBooking = (app, type) => {
    const dateIn = window.prompt(`Confirm Date (YYYY-MM-DD):`, new Date().toLocaleDateString('en-CA'));
    const timeIn = window.prompt(`Confirm Time (24h HH:MM):`, "10:00");
    
    if (!dateIn || !timeIn) return null;

    // 1. Internal Database Fix: 
    // We manually append +08:00 so the DB knows this is ALREADY Singapore time.
    const internalFixedTimestamp = `${dateIn}T${timeIn}:00+08:00`;

    // 2. Google Calendar Fix:
    // We strip the characters Google hates but KEEP the Asia/Singapore tag.
    const gDate = dateIn.replace(/-/g, '');
    const gTime = timeIn.replace(/:/g, '');
    const start = `${gDate}T${gTime}00`;
    
    // Calculate End (+1 Hour)
    let [h, m] = timeIn.split(':').map(Number);
    let endH = (h + 1).toString().padStart(2, '0');
    const end = `${gDate}T${endH}${m.toString().padStart(2, '0')}00`;

    const title = encodeURIComponent(`${type}: ${app.name}`);
    const details = encodeURIComponent(`Role: ${app.job_role}\nCandidate Contact: ${app.email}`);
    
    // The ctz=Asia/Singapore tells Google to ignore UTC and use SGT.
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&ctz=Asia/Singapore`;
    
    window.open(url, '_blank');

    return internalFixedTimestamp;
  };

  const handleStatusChange = async (app, newStatus) => {
    let finalOffer = app.final_offer_salary;
    let timestamp = new Date().toISOString(); // Default for non-calendar events

    // Trigger the Fix for Interviewing or Hired
    if (newStatus === 'Interviewing' || newStatus === 'Hired') {
      const fixedTime = handleBooking(app, newStatus.toUpperCase());
      if (fixedTime) {
        timestamp = fixedTime;
      } else {
        return; // Stop if user cancelled prompt
      }
    }

    if (newStatus === 'Offered') {
      const amount = window.prompt(`Offer Salary:`, app.salary_expectation || "");
      if (amount !== null) finalOffer = amount;
    }

    const history = [...(app.status_history || []), { 
      status: newStatus, 
      date: timestamp 
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

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-slate-300 text-3xl italic animate-pulse">FIXING TIMEZONES...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10 pb-20">
      
      {/* CATEGORY TABS */}
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
          <div key={app.id} className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden relative">
            
            <div className={`h-3 ${getStatusTheme(app.status).split(' ')[0]}`}></div>
            
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div className="pr-4">
                  <h2 className="text-2xl font-black text-slate-800 leading-tight">{app.name}</h2>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">{app.job_role}</p>
                </div>
                <button onClick={() => editId === app.id ? saveEdit() : (setEditId(app.id), setEditData(app))} className="p-3 bg-slate-50 rounded-xl hover:bg-slate-900 hover:text-white transition-all">
                  {editId === app.id ? '💾' : '✏️'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="block text-[8px] font-black text-slate-400 uppercase mb-1">Last Drawn</span>
                  <span className="text-xs font-bold text-slate-700">{app.last_drawn_salary || '—'}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="block text-[8px] font-black text-slate-400 uppercase mb-1">Expected</span>
                  <span className="text-xs font-black text-blue-600">{app.salary_expectation || '—'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-50">
                <select 
                  value={app.status} 
                  onChange={e => handleStatusChange(app, e.target.value)} 
                  className={`w-full py-4 px-4 rounded-2xl text-[11px] font-black uppercase tracking-widest cursor-pointer appearance-none text-center border-2 ${getStatusTheme(app.status)}`}
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
              </div>

              <div className="flex gap-2">
                <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">Resume</a>
                <button onClick={() => setShowHistoryId(showHistoryId === app.id ? null : app.id)} className="px-5 bg-slate-50 rounded-2xl text-slate-300 font-bold hover:text-blue-500">🕒</button>
              </div>
            </div>

            {/* HISTORY OVERLAY - FIXED TIMEZONE DISPLAY */}
            {showHistoryId === app.id && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 p-10 flex flex-col rounded-[2.8rem] animate-fade-in shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-black">Timeline Log</span>
                  <button onClick={() => setShowHistoryId(null)} className="text-slate-300 hover:text-red-500 font-bold">✕</button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-8">
                  {app.status_history?.map((h, i) => (
                    <div key={i} className="relative pl-8 border-l-2 border-slate-200">
                      <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-200"></div>
                      <div className="text-xs font-black uppercase text-slate-800 tracking-tight">{h.status}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-1">
                        {/* Display specifically in Singapore time */}
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