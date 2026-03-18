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

  const handleStatusChange = async (app, newStatus) => {
    let finalOffer = app.final_offer_salary;
    let onboardingDate = app.onboarding_date;

    if (newStatus === 'Offered') {
      const amount = window.prompt(`Final Offer Salary for ${app.name}:`, app.salary_expectation || "");
      if (amount === null) return; 
      finalOffer = amount;
    }

    if (newStatus === 'Hired') {
      const dateInput = window.prompt(`Onboarding Date (YYYY-MM-DD):`, new Date().toISOString().split('T')[0]);
      if (!dateInput) return;
      onboardingDate = dateInput;
      const gCalDate = dateInput.replace(/-/g, '');
      window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=Onboarding:+${encodeURIComponent(app.name)}&dates=${gCalDate}/${gCalDate}`, '_blank');
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
    <div className="max-w-7xl mx-auto px-6 pb-24 space-y-12">
      
      {/* 📊 MINI STATS BAR */}
      <div className="flex flex-wrap gap-3">
        {['All', 'Applied', 'Interviewing', 'Offered', 'Hired', 'Rejected Offer'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
            filterStatus === s ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
          }`}>
            {s === 'Rejected Offer' ? 'Declined' : s} ({s === 'All' ? activePipeline.length : activePipeline.filter(a => a.status === s).length})
          </button>
        ))}
      </div>

      {/* 🔍 SEARCH HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <h1 className="text-3xl font-black text-slate-900 italic tracking-tight underline decoration-blue-500 decoration-4 underline-offset-8">Active Pipeline</h1>
        <input 
          type="text" 
          placeholder="Search by name or role..." 
          className="bg-slate-50 px-6 py-3 rounded-2xl outline-none border-2 border-transparent focus:border-blue-500 w-full md:w-80 font-bold text-sm transition-all"
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 🗂️ CANDIDATE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(app => (
          <div key={app.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col overflow-hidden transition-transform hover:-translate-y-1">
            
            {/* Header Area */}
            <div className={`p-8 pb-4 border-t-8 ${getStatusTheme(app.status).split(' ')[0]}`}>
              <div className="flex justify-between items-start">
                <div className="space-y-1 flex-grow pr-4">
                  {editId === app.id ? (
                    <input className="w-full text-xl font-black border-b border-blue-400 outline-none" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                  ) : (
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">{app.name}</h2>
                  )}
                  {editId === app.id ? (
                    <input className="w-full text-[10px] font-bold text-blue-600 uppercase border-b border-blue-200 outline-none mt-2" value={editData.job_role} onChange={e => setEditData({...editData, job_role: e.target.value})} />
                  ) : (
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-500">{app.job_role}</p>
                  )}
                </div>
                <button onClick={() => editId === app.id ? saveEdit() : (setEditId(app.id), setEditData(app))} className="p-3 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-colors">
                  {editId === app.id ? '💾' : '✏️'}
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-8 pt-0 space-y-6 flex-grow">
              <div className="space-y-3">
                <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Connect</div>
                {editId === app.id ? (
                  <div className="space-y-2">
                    <input className="w-full p-2 text-xs border rounded-xl" value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} />
                    <input className="w-full p-2 text-xs border rounded-xl" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    <a href={`mailto:${app.email}`} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl text-xs font-bold text-slate-600 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100 truncate">
                      <span>📧</span> {app.email}
                    </a>
                    <a href={`https://wa.me/${app.phone?.replace(/[^0-9]/g, '')}`} target="_blank" className="flex items-center gap-3 bg-emerald-50 p-3 rounded-2xl text-xs font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100">
                      <span>📱</span> {app.phone} <span className="ml-auto text-[8px] opacity-60 uppercase font-black">WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>

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
                {app.final_offer_salary && (
                  <div className="flex justify-between text-xs font-black pt-3 border-t border-slate-200 text-purple-600">
                    <span>Final Offer</span>
                    <span>{app.final_offer_salary}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer / Status Area */}
            <div className="p-8 pt-0 space-y-4">
              <select 
                value={app.status} 
                onChange={e => handleStatusChange(app, e.target.value)} 
                className={`w-full py-4 px-4 rounded-2xl text-[11px] font-black uppercase tracking-widest cursor-pointer border-2 transition-all appearance-none text-center ${getStatusTheme(app.status)}`}
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
                <button onClick={() => setShowHistoryId(showHistoryId === app.id ? null : app.id)} className="px-6 bg-slate-100 rounded-2xl text-slate-400 hover:bg-slate-200 transition-all font-bold">🕒</button>
              </div>
            </div>

            {/* 🕒 TIMELINE OVERLAY */}
            {showHistoryId === app.id && (
              <div className="absolute inset-0 bg-white z-50 p-10 flex flex-col rounded-[2.3rem] shadow-2xl animate-fade-in">
                <div className="flex justify-between items-center mb-10 border-b pb-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">History Log</span>
                  <button onClick={() => setShowHistoryId(null)} className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 font-bold hover:text-red-500 transition-all">✕</button>
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
                <button onClick={() => setShowHistoryId(null)} className="mt-8 py-3 bg-slate-50 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-widest">Close</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}