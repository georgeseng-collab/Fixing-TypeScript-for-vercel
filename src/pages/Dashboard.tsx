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

  const openGoogleCalendar = (app, type = 'INTERVIEW') => {
    const dateInput = window.prompt(`Date for ${type} (YYYY-MM-DD):`, new Date().toISOString().split('T')[0]);
    if (!dateInput) return;

    const timeInput = window.prompt(`Start Time (24h format HH:MM):`, "10:00");
    if (!timeInput) return;

    // Formatting for Google: YYYYMMDDTHHMMSS
    const cleanDate = dateInput.replace(/-/g, '');
    const cleanTime = timeInput.replace(/:/g, '');
    
    // We explicitly set a start and end time (1 hour duration)
    const startTime = `${cleanDate}T${cleanTime}00`;
    
    // Calculate End Time (+1 hour)
    let [hours, minutes] = timeInput.split(':').map(Number);
    let endHours = (hours + 1).toString().padStart(2, '0');
    const endTime = `${cleanDate}T${endHours}${minutes.toString().padStart(2, '0')}00`;

    const title = encodeURIComponent(`${type}: ${app.name} (${app.job_role})`);
    const details = encodeURIComponent(`Candidate: ${app.name}\nRole: ${app.job_role}\nEmail: ${app.email}\nPhone: ${app.phone}`);
    
    // ctz=Asia/Singapore is the "Magic Bullet" to stop date shifting
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}&ctz=Asia/Singapore`;
    
    window.open(url, '_blank');
  };

  const handleStatusChange = async (app, newStatus) => {
    let finalOffer = app.final_offer_salary;
    let onboardingDate = app.onboarding_date;

    if (newStatus === 'Offered') {
      const amount = window.prompt(`Final Offer Salary:`, app.salary_expectation || "");
      if (amount !== null) finalOffer = amount;
    }

    if (newStatus === 'Interviewing') {
      const confirm = window.confirm("Book the Interview slot in Google Calendar now?");
      if (confirm) openGoogleCalendar(app, 'INTERVIEW');
    }

    if (newStatus === 'Hired') {
      const confirm = window.confirm("Book the Onboarding slot in Google Calendar now?");
      if (confirm) openGoogleCalendar(app, 'ONBOARDING');
    }

    const history = [...(app.status_history || []), { status: newStatus, date: new Date().toISOString() }];
    await supabase.from('applicants').update({ 
      status: newStatus, 
      status_history: history,
      final_offer_salary: finalOffer,
      onboarding_date: onboardingDate
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

  if (loading) return <div className="flex h-screen items-center justify-center font-black text-slate-300 animate-pulse uppercase tracking-[0.3em]">Geniebook Systems...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 pb-24 space-y-10">
      
      {/* 📊 TABS */}
      <div className="flex flex-wrap gap-2">
        {['All', 'Applied', 'Interviewing', 'Offered', 'Hired', 'Rejected Offer'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            filterStatus === s ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
          }`}>
            {s === 'Rejected Offer' ? 'Declined' : s}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">Talent Pipeline</h1>
        <input 
          type="text" 
          placeholder="Search..." 
          className="bg-white px-6 py-3 rounded-2xl outline-none border border-slate-100 shadow-sm w-full md:w-80 font-bold text-sm"
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(app => (
          <div key={app.id} className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col overflow-hidden transition-all hover:shadow-2xl">
            
            <div className={`p-8 pb-4 border-t-[12px] ${getStatusTheme(app.status).split(' ')[0]}`}>
              <div className="flex justify-between items-start">
                <div className="flex-grow">
                  {editId === app.id ? (
                    <input className="w-full text-xl font-black border-b-2 border-blue-400 outline-none mb-2" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                  ) : (
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">{app.name}</h2>
                  )}
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">{app.job_role}</p>
                </div>
                <button onClick={() => editId === app.id ? saveEdit() : (setEditId(app.id), setEditData(app))} className="p-3 bg-slate-50 rounded-2xl hover:bg-blue-600 hover:text-white transition-all">
                  {editId === app.id ? '💾' : '✏️'}
                </button>
              </div>
            </div>

            <div className="p-8 pt-0 space-y-6 flex-grow">
              {/* Actions Hub */}
              <div className="grid grid-cols-2 gap-2">
                <a href={`mailto:${app.email}`} className="flex items-center justify-center bg-slate-50 p-3 rounded-2xl text-[10px] font-black text-slate-600 hover:bg-slate-100">EMAIL</a>
                <a href={`https://wa.me/${app.phone?.replace(/[^0-9]/g, '')}`} target="_blank" className="flex items-center justify-center bg-emerald-50 p-3 rounded-2xl text-[10px] font-black text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all">WHATSAPP</a>
              </div>

              {/* Calendar Quick-Action Button */}
              <button 
                onClick={() => openGoogleCalendar(app, 'INTERVIEW')}
                className="w-full flex items-center justify-center gap-2 py-4 bg-amber-50 border border-amber-200 rounded-3xl text-amber-700 font-black text-[11px] uppercase tracking-widest hover:bg-amber-100 transition-all shadow-sm"
              >
                📅 Schedule Interview
              </button>

              <div className="bg-slate-50/80 p-5 rounded-[2rem] border border-slate-100 space-y-4">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Comp Details</div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400">Last Drawn</span>
                  {editId === app.id ? <input className="w-20 text-right border-b" value={editData.last_drawn_salary} onChange={e => setEditData({...editData, last_drawn_salary: e.target.value})} /> : <span>{app.last_drawn_salary || '—'}</span>}
                </div>
                <div className="flex justify-between text-xs font-black">
                  <span className="text-slate-400 font-bold">Expected</span>
                  {editId === app.id ? <input className="w-20 text-right border-b" value={editData.salary_expectation} onChange={e => setEditData({...editData, salary_expectation: e.target.value})} /> : <span className="text-blue-600">{app.salary_expectation || '—'}</span>}
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
                <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-black transition-all">Resume</a>
                <button onClick={() => setShowHistoryId(showHistoryId === app.id ? null : app.id)} className="px-6 bg-slate-100 rounded-2xl text-slate-400 font-bold">🕒 Log</button>
              </div>
            </div>

            {showHistoryId === app.id && (
              <div className="absolute inset-0 bg-white z-50 p-10 flex flex-col rounded-[2.3rem] shadow-2xl">
                <div className="flex justify-between items-center mb-10 border-b pb-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">History Log</span>
                  <button onClick={() => setShowHistoryId(null)} className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 font-bold">✕</button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-8">
                  {app.status_history?.map((h, i) => (
                    <div key={i} className="relative pl-8 border-l-2 border-slate-100">
                      <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-50"></div>
                      <div className="text-xs font-black uppercase text-slate-800">{h.status}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-1">{new Date(h.date).toLocaleDateString()}</div>
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