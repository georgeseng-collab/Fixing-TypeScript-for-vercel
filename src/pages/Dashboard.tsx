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

  // Helper for status-based colors
  const getStatusColor = (status) => {
    switch(status) {
      case 'Hired': return 'bg-emerald-500';
      case 'Offered': return 'bg-purple-500';
      case 'Rejected Offer': return 'bg-rose-500';
      case 'Interviewing': return 'bg-amber-500';
      default: return 'bg-blue-500';
    }
  };

  const handleStatusChange = async (app, newStatus) => {
    let finalOffer = app.final_offer_salary;
    let onboardingDate = app.onboarding_date;
    let rejectReason = app.rejection_reason;

    if (newStatus === 'Offered') {
      const amount = window.prompt(`Enter Final Offer Salary:`, app.salary_expectation || "");
      if (amount === null) return; 
      finalOffer = amount;
    }

    if (newStatus === 'Hired') {
      const dateInput = window.prompt(`Onboarding Date (YYYY-MM-DD):`, new Date().toISOString().split('T')[0]);
      if (!dateInput) return;
      onboardingDate = dateInput;
      const gCalDate = dateInput.replace(/-/g, '');
      const gCalTitle = encodeURIComponent(`Onboarding: ${app.name}`);
      window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gCalTitle}&dates=${gCalDate}/${gCalDate}`, '_blank');
    }

    const updatedHistory = [...(app.status_history || []), { status: newStatus, date: new Date().toISOString() }];
    await supabase.from('applicants').update({ 
      status: newStatus, 
      status_history: updatedHistory,
      final_offer_salary: finalOffer,
      onboarding_date: onboardingDate,
      rejection_reason: rejectReason
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
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.job_role.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(a => filterStatus === 'All' || a.status === filterStatus);

  if (loading) return <div className="p-20 text-center font-black text-slate-300 animate-pulse tracking-[0.2em]">GENIEBOOK TALENT SYNC...</div>;

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      
      {/* 📊 PREMIUM STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total', key: 'All', color: 'border-slate-400 text-slate-600' },
          { label: 'Applied', key: 'Applied', color: 'border-blue-500 text-blue-600' },
          { label: 'Interviewing', key: 'Interviewing', color: 'border-amber-500 text-amber-600' },
          { label: 'Offered', key: 'Offered', color: 'border-purple-500 text-purple-600' },
          { label: 'Hired', key: 'Hired', color: 'border-emerald-500 text-emerald-600' },
          { label: 'Declined', key: 'Rejected Offer', color: 'border-rose-500 text-rose-600' },
        ].map((s) => (
          <button key={s.key} onClick={() => setFilterStatus(s.key)}
            className={`p-5 rounded-[2rem] border-2 transition-all bg-white text-left shadow-sm ${
              filterStatus === s.key ? `${s.color} ring-4 ring-slate-100 scale-105 z-10` : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-50">{s.label}</div>
            <div className="text-3xl font-black italic">
              {s.key === 'All' ? activePipeline.length : activePipeline.filter(a => a.status === s.key).length}
            </div>
          </button>
        ))}
      </div>

      {/* SEARCH */}
      <div className="flex justify-end">
        <input 
          type="text" placeholder="Quick Search Name/Role..." 
          className="px-6 py-3 border-2 border-white rounded-2xl outline-none focus:border-blue-500 w-full md:w-96 shadow-lg shadow-slate-200/50 bg-white font-medium" 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      {/* CANDIDATE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {filtered.map((app) => (
          <div key={app.id} className="bg-white border border-slate-100 p-8 rounded-[3rem] shadow-xl shadow-slate-200/40 relative flex flex-col transition-all hover:translate-y-[-4px]">
            
            {/* Color Stripe */}
            <div className={`absolute top-0 left-0 right-0 h-3 ${getStatusColor(app.status)}`}></div>
            
            <div className="flex justify-between items-start mb-8 pt-2">
              <div className="flex-grow mr-4">
                {editId === app.id ? (
                  <input className="font-black text-2xl border-b-2 border-blue-500 outline-none w-full bg-slate-50 px-2 py-1 rounded-t-lg" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                ) : (
                  <h3 className="font-black text-2xl text-slate-800 tracking-tight">{app.name}</h3>
                )}
                {editId === app.id ? (
                  <input className="text-[10px] font-black uppercase text-blue-600 mt-3 block w-full bg-blue-50 px-2 py-1 rounded-md" value={editData.job_role} onChange={e => setEditData({...editData, job_role: e.target.value})} />
                ) : (
                  <div className="inline-block mt-3 px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest">{app.job_role}</div>
                )}
              </div>
              <button onClick={() => editId === app.id ? saveEdit() : (setEditId(app.id), setEditData(app))} className={`p-3 rounded-2xl transition-all shadow-sm ${editId === app.id ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-50 text-slate-300 hover:text-blue-500 hover:bg-blue-50'}`}>
                {editId === app.id ? 'SAVE' : 'EDIT'}
              </button>
            </div>

            <div className="space-y-6 mb-10 flex-grow">
              {/* Contact Information */}
              <div className="space-y-3">
                <div className="text-[9px] font-black uppercase text-slate-300 tracking-[0.2em]">Contact Node</div>
                {editId === app.id ? (
                  <div className="space-y-2">
                    <input placeholder="Email" className="w-full p-2 text-xs border rounded-xl" value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} />
                    <input placeholder="Phone" className="w-full p-2 text-xs border rounded-xl" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <a href={`mailto:${app.email}`} className="flex items-center gap-3 text-xs font-bold text-slate-600 bg-slate-50/50 p-3 rounded-2xl border border-slate-50 hover:border-blue-200 transition-all overflow-hidden truncate">
                      <span className="opacity-50">📧</span> {app.email}
                    </a>
                    <a href={`https://wa.me/${app.phone?.replace(/[^0-9]/g, '')}`} target="_blank" className="flex items-center gap-3 text-xs font-bold text-emerald-700 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-50 hover:bg-emerald-600 hover:text-white transition-all">
                      <span className="opacity-50 text-lg">📱</span> {app.phone}
                    </a>
                  </div>
                )}
              </div>

              {/* Salary Intel */}
              <div className="bg-slate-50/80 p-5 rounded-[2rem] border border-slate-100 space-y-4 shadow-inner">
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Financial Matrix</div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold uppercase">Last Drawn</span>
                  {editId === app.id ? (
                    <input className="w-24 p-1 border rounded-lg text-right" value={editData.last_drawn_salary} onChange={e => setEditData({...editData, last_drawn_salary: e.target.value})} />
                  ) : (
                    <span className="font-black text-slate-800">{app.last_drawn_salary || '—'}</span>
                  )}
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold uppercase">Expected</span>
                  {editId === app.id ? (
                    <input className="w-24 p-1 border rounded-lg text-right" value={editData.salary_expectation} onChange={e => setEditData({...editData, salary_expectation: e.target.value})} />
                  ) : (
                    <span className="font-black text-blue-600 bg-white px-3 py-1 rounded-xl shadow-sm border border-blue-50">{app.salary_expectation || '—'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="space-y-4">
              <select 
                value={app.status} 
                onChange={(e) => handleStatusChange(app, e.target.value)} 
                className={`w-full border-2 rounded-2xl px-4 py-4 text-xs font-black uppercase text-center tracking-widest cursor-pointer transition-all ${getStatusColor(app.status)} bg-opacity-10 border-transparent hover:border-slate-200`}
                style={{ color: 'rgba(0,0,0,0.6)' }}
              >
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offered">Offered</option>
                <option value="Hired">Hired</option>
                <option value="Rejected Offer">Rejected Offer</option>
                <option disabled>────── ARCHIVE ──────</option>
                <option value="Failed Interview">Failed Interview</option>
                <option value="Quit">Quit</option>
                <option value="Blacklisted">Blacklisted</option>
              </select>
              
              <div className="flex gap-3">
                <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] tracking-[0.2em] shadow-lg shadow-slate-200 hover:bg-black active:scale-95 transition-all uppercase">Open Resume</a>
                <button onClick={() => setShowHistoryId(showHistoryId === app.id ? null : app.id)} className="px-6 bg-slate-100 rounded-2xl font-bold text-slate-400 hover:bg-slate-200 transition-all">🕒</button>
              </div>
            </div>

            {/* History Overlay */}
            {showHistoryId === app.id && (
              <div className="absolute inset-0 bg-white z-40 p-10 flex flex-col rounded-[2.8rem] shadow-2xl border-2 border-slate-100 animate-fade-in">
                <div className="flex justify-between items-center mb-10 border-b pb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                  <span>Timeline</span>
                  <button onClick={() => setShowHistoryId(null)} className="h-10 w-10 rounded-full bg-slate-50 text-slate-400 font-bold hover:text-red-500 transition-all">✕</button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-8 custom-scrollbar">
                  {app.status_history?.map((h, idx) => (
                    <div key={idx} className="relative pl-8 border-l-2 border-slate-100">
                      <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-200"></div>
                      <div className="text-xs font-black uppercase text-slate-800">{h.status}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-1 opacity-70">
                        {new Date(h.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
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