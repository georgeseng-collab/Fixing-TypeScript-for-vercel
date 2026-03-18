// @ts-nocheck
import { useEffect, useState } from 'react';
import { getApplicants, supabase } from '../db';

export default function Dashboard() {
  const [applicants, setApplicants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showHistoryId, setShowHistoryId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  
  // Edit State
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});

  const fetchData = async () => {
    try {
      const { data } = await supabase.from('applicants').select('*').order('created_at', { ascending: false });
      setApplicants(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusChange = async (app, newStatus) => {
    let finalOffer = app.final_offer_salary;
    let onboardingDate = app.onboarding_date;
    let rejectReason = app.rejection_reason;

    if (newStatus === 'Offered') {
      const amount = window.prompt(`Enter Final Offer Salary for ${app.name}:`, app.salary_expectation || "");
      if (amount === null) return; 
      finalOffer = amount;
    }

    if (newStatus === 'Hired') {
      const dateInput = window.prompt(`Enter Onboarding Date (YYYY-MM-DD):`, new Date().toISOString().split('T')[0]);
      if (!dateInput) return;
      onboardingDate = dateInput;
      
      // FIX: Clean date for Google Calendar (Removes hyphens)
      const gCalDate = dateInput.replace(/-/g, '');
      const gCalTitle = encodeURIComponent(`ONBOARDING: ${app.name} (${app.job_role})`);
      const gCalDetails = encodeURIComponent(`Role: ${app.job_role}\nFinal Salary: ${finalOffer}`);
      
      // Creates an all-day event correctly
      window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gCalTitle}&dates=${gCalDate}/${gCalDate}&details=${gCalDetails}`, '_blank');
    }

    if (newStatus === 'Rejected Offer') {
      const reason = window.prompt(`Reason for rejection?`);
      if (reason === null) return;
      rejectReason = reason;
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

  const startEdit = (app) => {
    setEditId(app.id);
    setEditData({ ...app });
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

  if (loading) return <div className="p-20 text-center font-black text-slate-400 animate-pulse">REFRESHING TALENT POOL...</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* STATS HEADER */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {['All', 'Applied', 'Interviewing', 'Offered', 'Hired', 'Rejected Offer'].map((key) => (
          <button key={key} onClick={() => setFilterStatus(key)}
            className={`p-4 rounded-2xl border-2 transition-all bg-white text-left ${
              filterStatus === key ? 'border-blue-600 ring-4 ring-blue-50' : 'border-slate-50 opacity-70'
            }`}
          >
            <div className="text-[9px] font-black text-slate-400 uppercase mb-1">{key === 'Rejected Offer' ? 'Declined' : key}</div>
            <div className="text-2xl font-black text-slate-800">
              {key === 'All' ? activePipeline.length : activePipeline.filter(a => a.status === key).length}
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((app) => (
          <div key={app.id} className="bg-white border-2 border-slate-50 p-7 rounded-[2.5rem] shadow-sm relative flex flex-col transition-all hover:shadow-xl group">
            <div className={`absolute top-0 left-0 right-0 h-2 ${app.status === 'Hired' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
            
            {/* Header with Edit Toggle */}
            <div className="flex justify-between items-start mb-6">
              <div>
                {editId === app.id ? (
                  <input className="font-black text-xl border-b-2 border-blue-500 outline-none w-full" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                ) : (
                  <h3 className="font-black text-2xl text-slate-800 leading-tight">{app.name}</h3>
                )}
                {editId === app.id ? (
                  <input className="text-[10px] font-black uppercase text-blue-600 mt-2 block w-full" value={editData.job_role} onChange={e => setEditData({...editData, job_role: e.target.value})} />
                ) : (
                  <div className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded uppercase tracking-wider">{app.job_role}</div>
                )}
              </div>
              <button onClick={() => editId === app.id ? saveEdit() : startEdit(app)} className={`p-2 rounded-xl transition-all ${editId === app.id ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:text-blue-500 hover:bg-blue-50'}`}>
                {editId === app.id ? '✔️' : '✏️'}
              </button>
            </div>

            {/* Candidate Info */}
            <div className="space-y-4 mb-8 flex-grow">
              <div className="space-y-2 text-xs">
                <div className="text-slate-400 font-black uppercase text-[9px] tracking-widest">Direct Contact</div>
                {editId === app.id ? (
                  <div className="space-y-2">
                    <input className="w-full p-2 border rounded-lg" value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} />
                    <input className="w-full p-2 border rounded-lg" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} />
                  </div>
                ) : (
                  <>
                    <a href={`mailto:${app.email}`} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl font-bold text-slate-600 truncate">📧 {app.email}</a>
                    <a href={`https://wa.me/${app.phone?.replace(/[^0-9]/g, '')}`} target="_blank" className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl font-bold border border-emerald-100">📱 {app.phone} <span className="ml-auto text-[7px] font-black opacity-50 uppercase">WhatsApp</span></a>
                  </>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-3">
                <div className="text-slate-400 font-black uppercase text-[9px]">Salary Intelligence</div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-tighter">Last Drawn</span>
                  {editId === app.id ? (
                    <input className="w-24 p-1 border rounded" value={editData.last_drawn_salary} onChange={e => setEditData({...editData, last_drawn_salary: e.target.value})} />
                  ) : (
                    <span className="font-black text-slate-700">{app.last_drawn_salary || '—'}</span>
                  )}
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-tighter">Expected</span>
                  {editId === app.id ? (
                    <input className="w-24 p-1 border rounded" value={editData.salary_expectation} onChange={e => setEditData({...editData, salary_expectation: e.target.value})} />
                  ) : (
                    <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{app.salary_expectation || '—'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="space-y-3">
              <select value={app.status} onChange={(e) => handleStatusChange(app, e.target.value)} className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-xs font-black uppercase bg-white text-center tracking-widest">
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
              <div className="flex gap-2">
                <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-slate-900 text-white py-3 rounded-2xl font-black text-[10px] tracking-[0.2em]">VIEW RESUME</a>
                <button onClick={() => setShowHistoryId(showHistoryId === app.id ? null : app.id)} className="px-5 bg-slate-100 rounded-2xl font-bold text-slate-400">🕒</button>
              </div>
            </div>

            {/* History Overlay */}
            {showHistoryId === app.id && (
              <div className="absolute inset-0 bg-white z-40 p-8 flex flex-col rounded-[2.3rem] shadow-2xl border-2 border-slate-100">
                <div className="flex justify-between items-center mb-8 border-b pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Candidate History</span>
                  <button onClick={() => setShowHistoryId(null)} className="h-8 w-8 rounded-full bg-slate-50 text-slate-400 font-bold">✕</button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-6">
                  {app.status_history?.map((h, idx) => (
                    <div key={idx} className="relative pl-6 border-l-2 border-slate-100">
                      <div className="text-xs font-black uppercase text-slate-800 tracking-tighter">{h.status}</div>
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