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
      'Hired': 'bg-emerald-500 text-white',
      'Offered': 'bg-purple-600 text-white',
      'Interviewing': 'bg-amber-500 text-white',
      'Applied': 'bg-blue-600 text-white',
      'Rejected Offer': 'bg-rose-500 text-white'
    };
    return themes[status] || 'bg-slate-400 text-white';
  };

  const handleBooking = (app, type) => {
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
    const details = encodeURIComponent(`Role: ${app.job_role}\nEmail: ${app.email}\nPhone: ${app.phone}`);
    
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&ctz=Asia/Singapore`, '_blank');
    return `${dateIn}T${timeIn}:00+08:00`;
  };

  const handleStatusChange = async (app, newStatus) => {
    let finalOffer = app.final_offer_salary;
    let timestamp = new Date().toISOString(); 

    if (newStatus === 'Interviewing' || newStatus === 'Hired') {
      const fixedTime = handleBooking(app, newStatus.toUpperCase());
      if (fixedTime) timestamp = fixedTime; else return;
    }

    const history = [...(app.status_history || []), { status: newStatus, date: timestamp }];
    await supabase.from('applicants').update({ status: newStatus, status_history: history }).eq('id', app.id);
    fetchData();
  };

  const saveEdit = async () => {
    await supabase.from('applicants').update(editData).eq('id', editId);
    setEditId(null);
    fetchData();
  };

  const filtered = applicants.filter(a => !['Quit', 'Blacklisted', 'Failed Interview'].includes(a.status))
    .filter(a => (a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.job_role.toLowerCase().includes(searchTerm.toLowerCase())))
    .filter(a => (filterStatus === 'All' || a.status === filterStatus));

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 text-5xl animate-pulse italic tracking-tighter">GENIEBOOK</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12 pb-24">
      {/* 📊 CATEGORY TABS */}
      <div className="flex flex-wrap gap-3">
        {['All', 'Applied', 'Interviewing', 'Offered', 'Hired'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            filterStatus === s ? 'bg-slate-900 text-white shadow-2xl scale-105' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
          }`}>
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {filtered.map(app => (
          <div key={app.id} className="bg-white rounded-[4rem] border border-slate-100 shadow-2xl flex flex-col overflow-hidden transition-all hover:scale-[1.01]">
            <div className={`p-10 pb-6 ${getStatusTheme(app.status)}`}>
              <div className="flex justify-between items-start">
                <div className="flex-grow space-y-2">
                  {editId === app.id ? (
                    <>
                      <input className="w-full text-2xl font-black bg-white/20 rounded px-2 outline-none text-white" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} placeholder="Name" />
                      <input className="w-full text-[10px] font-black uppercase bg-white/10 rounded px-2 outline-none text-white/90" value={editData.job_role} onChange={e => setEditData({...editData, job_role: e.target.value})} placeholder="Role" />
                    </>
                  ) : (
                    <>
                      <h2 className="text-3xl font-black tracking-tighter leading-none">{app.name}</h2>
                      <p className="text-[11px] font-black uppercase opacity-80 tracking-widest">{app.job_role}</p>
                    </>
                  )}
                </div>
                <button onClick={() => editId === app.id ? saveEdit() : (setEditId(app.id), setEditData(app))} className="p-4 bg-white/20 hover:bg-white/40 rounded-3xl transition-all ml-4">
                  {editId === app.id ? '✔️' : '✏️'}
                </button>
              </div>
            </div>

            <div className="p-10 pt-8 space-y-8 flex-grow">
              <div className="space-y-3 text-xs font-bold text-slate-500">
                <a href={`mailto:${app.email}`} className="flex items-center gap-3 bg-slate-50 p-4 rounded-3xl truncate">📧 {app.email}</a>
                <a href={`https://wa.me/${app.phone?.replace(/[^0-9]/g, '')}`} target="_blank" className="flex items-center gap-3 bg-emerald-50 text-emerald-700 p-4 rounded-3xl">📱 {app.phone || 'N/A'}</a>
              </div>

              {/* 📅 SCHEDULE BUTTON */}
              <button onClick={() => handleStatusChange(app, 'Interviewing')} className="w-full py-5 bg-amber-400 text-amber-950 rounded-[2.5rem] font-black text-[12px] uppercase tracking-widest hover:bg-amber-500 transition-all shadow-lg shadow-amber-100">
                📅 Schedule Interview
              </button>

              {/* 💰 FINANCIAL INTEL: SHOWING LAST DRAWN & EXPECTED */}
              <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <span className="text-slate-400 font-black uppercase text-[9px] tracking-widest">Last Drawn</span>
                  {editId === app.id ? (
                    <input className="w-24 text-right border-b bg-transparent font-bold" value={editData.last_drawn_salary} onChange={e => setEditData({...editData, last_drawn_salary: e.target.value})} />
                  ) : (
                    <span className="font-black text-slate-700">{app.last_drawn_salary || '—'}</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-black uppercase text-[9px] tracking-widest">Expected</span>
                  {editId === app.id ? (
                    <input className="w-24 text-right border-b bg-transparent font-black text-blue-600" value={editData.salary_expectation} onChange={e => setEditData({...editData, salary_expectation: e.target.value})} />
                  ) : (
                    <span className="font-black text-blue-600 text-xl">{app.salary_expectation || '—'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}