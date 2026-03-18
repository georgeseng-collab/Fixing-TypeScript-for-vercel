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

  // --- CORE FIX: TIMEZONE HANDLER ---
  const getSingaporeISO = (dateStr, timeStr) => {
    // Force a string like "2024-03-19T10:00:00+08:00"
    // This prevents internal database from shifting the time
    return `${dateStr}T${timeStr}:00+08:00`;
  };

  const openGoogleCalendar = (app, type, dateInput, timeInput) => {
    const cleanDate = dateInput.replace(/-/g, '');
    const cleanTime = timeInput.replace(/:/g, '');
    
    // Start/End for Google Link
    const startStr = `${cleanDate}T${cleanTime}00`;
    let [h, m] = timeInput.split(':').map(Number);
    let endH = (h + 1).toString().padStart(2, '0');
    const endStr = `${cleanDate}T${endH}${m.toString().padStart(2, '0')}00`;

    const title = encodeURIComponent(`${type}: ${app.name}`);
    const details = encodeURIComponent(`Role: ${app.job_role}\nEmail: ${app.email}\nPhone: ${app.phone}`);
    
    // ctz=Asia/Singapore is the secret key to stopping the 12:30pm shift
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&ctz=Asia/Singapore`;
    
    window.open(url, '_blank');
  };

  const handleStatusChange = async (app, newStatus) => {
    let finalOffer = app.final_offer_salary;
    let customHistoryDate = new Date().toISOString(); // Default

    if (newStatus === 'Interviewing' || newStatus === 'Hired') {
      const dateIn = window.prompt(`Select Date (YYYY-MM-DD):`, new Date().toLocaleDateString('en-CA'));
      const timeIn = window.prompt(`Select Time (HH:MM):`, "10:00");
      
      if (dateIn && timeIn) {
        // FIX 1: Set the internal history date to exactly what you picked
        customHistoryDate = getSingaporeISO(dateIn, timeIn);
        
        // FIX 2: Launch Google Calendar with the specific Asia/Singapore tag
        openGoogleCalendar(app, newStatus.toUpperCase(), dateIn, timeIn);
      }
    }

    if (newStatus === 'Offered') {
      const amount = window.prompt(`Offer Salary:`, app.salary_expectation || "");
      if (amount !== null) finalOffer = amount;
    }

    const history = [...(app.status_history || []), { 
      status: newStatus, 
      date: customHistoryDate // This now carries the +08:00 offset
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

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-slate-200 text-3xl italic animate-pulse">SYNCING...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      
      {/* FILTER TABS */}
      <div className="flex flex-wrap gap-2">
        {['All', 'Applied', 'Interviewing', 'Offered', 'Hired'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            filterStatus === s ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
          }`}>
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {filtered.map(app => (
          <div key={app.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden relative group">
            
            <div className={`h-3 ${getStatusTheme(app.status).split(' ')[0]}`}></div>
            
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 leading-tight">{app.name}</h2>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">{app.job_role}</p>
                </div>
                <button onClick={() => editId === app.id ? saveEdit() : (setEditId(app.id), setEditData(app))} className="p-3 bg-slate-50 rounded-xl hover:bg-slate-900 hover:text-white transition-all">
                  {editId === app.id ? '💾' : '✏️'}
                </button>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => handleStatusChange(app, 'Interviewing')}
                  className="w-full py-4 bg-amber-400 text-amber-950 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:brightness-105 transition-all shadow-md"
                >
                  📅 Book 10:00 AM Slot
                </button>
                
                <div className="grid grid-cols-2 gap-2">
                  <a href={`mailto:${app.email}`} className="bg-slate-50 p-3 rounded-xl text-center text-[10px] font-black text-slate-400 hover:bg-slate-100 uppercase">Email</a>
                  <a href={`https://wa.me/${app.phone?.replace(/[^0-9]/g, '')}`} target="_blank" className="bg-emerald-50 p-3 rounded-xl text-center text-[10px] font-black text-emerald-600 hover:bg-emerald-500 hover:text-white uppercase transition-all">WhatsApp</a>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50">
                <select 
                  value={app.status} 
                  onChange={e => handleStatusChange(app, e.target.value)} 
                  className={`w-full py-4 px-4 rounded-2xl text-[11px] font-black uppercase tracking-widest cursor-pointer appearance-none text-center border-2 ${getStatusTheme(app.status)}`}
                >
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offered">Offered</option>
                  <option value="Hired">Hired</option>
                </select>
              </div>

              <div className="flex gap-2">
                <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">Resume</a>
                <button onClick={() => setShowHistoryId(showHistoryId === app.id ? null : app.id)} className="px-5 bg-slate-50 rounded-2xl text-slate-300 font-bold hover:text-blue-500">🕒</button>
              </div>
            </div>

            {/* STATUS LOG */}
            {showHistoryId === app.id && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 p-10 flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-8">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">History</span>
                  <button onClick={() => setShowHistoryId(null)} className="text-slate-300 hover:text-red-500 font-bold">✕</button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-6">
                  {app.status_history?.map((h, i) => (
                    <div key={i} className="pl-4 border-l-2 border-blue-500 py-1">
                      <div className="text-xs font-black uppercase text-slate-800">{h.status}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-1">
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