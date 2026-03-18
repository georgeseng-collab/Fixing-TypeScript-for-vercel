// @ts-nocheck
import { useEffect, useState } from 'react';
import { getApplicants, supabase } from '../db';

export default function Dashboard() {
  const [applicants, setApplicants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showHistoryId, setShowHistoryId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');

  const fetchData = async () => {
    try {
      const data = await getApplicants();
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
      if (dateInput === null) return;
      onboardingDate = dateInput;
      const gCalTitle = encodeURIComponent(`Onboarding: ${app.name}`);
      const gCalDate = dateInput.replace(/-/g, '');
      window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gCalTitle}&dates=${gCalDate}/${gCalDate}`, '_blank');
    }

    if (newStatus === 'Rejected Offer') {
      const reason = window.prompt(`Why did they reject the offer?`);
      if (reason === null) return;
      rejectReason = reason;
    }

    try {
      const updatedHistory = [...(app.status_history || []), { status: newStatus, date: new Date().toISOString() }];
      await supabase.from('applicants').update({ 
        status: newStatus, 
        status_history: updatedHistory,
        final_offer_salary: finalOffer,
        onboarding_date: onboardingDate,
        rejection_reason: rejectReason
      }).eq('id', app.id);
      fetchData();
    } catch (e) { alert("Update failed."); }
  };

  // Archive Filter: Keep these out of the active pipeline
  const activePipeline = applicants.filter(a => 
    a.status !== 'Quit' && 
    a.status !== 'Blacklisted' && 
    a.status !== 'Failed Interview'
  );

  const statsConfig = [
    { label: 'Total', key: 'All', color: 'bg-slate-600', text: 'text-slate-600', border: 'border-slate-600' },
    { label: 'Applied', key: 'Applied', color: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-500' },
    { label: 'Interviewing', key: 'Interviewing', color: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-500' },
    { label: 'Offered', key: 'Offered', color: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-500' },
    { label: 'Hired', key: 'Hired', color: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-500' },
    { label: 'Declined', key: 'Rejected Offer', color: 'bg-rose-500', text: 'text-rose-600', border: 'border-rose-500' },
  ];

  const filtered = activePipeline.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.job_role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || a.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="p-20 text-center font-black text-slate-400 animate-pulse">SYNCING PIPELINE...</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* 📊 STATS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsConfig.map((s) => (
          <button key={s.key} onClick={() => setFilterStatus(s.key)}
            className={`p-4 rounded-2xl border-2 transition-all bg-white relative overflow-hidden text-left ${
              filterStatus === s.key ? `${s.border} ring-4 ring-slate-100 scale-[1.02]` : 'border-slate-50 opacity-70'
            }`}
          >
            <div className={`absolute top-0 left-0 w-1 h-full ${s.color}`}></div>
            <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{s.label}</div>
            <div className={`text-2xl font-black ${s.text}`}>
              {s.key === 'All' ? activePipeline.length : activePipeline.filter(a => a.status === s.key).length}
            </div>
          </button>
        ))}
      </div>

      {/* SEARCH BAR */}
      <div className="flex justify-between items-center bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="px-4 text-sm font-black text-slate-400 uppercase tracking-widest">Pipeline Explorer</h2>
        <input 
          type="text" 
          placeholder="Search name or role..." 
          className="px-6 py-3 border-none rounded-xl outline-none w-full md:w-96 text-sm font-medium bg-slate-50" 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      {/* CANDIDATE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((app) => (
          <div key={app.id} className="bg-white border-2 border-slate-50 p-7 rounded-[2.5rem] shadow-sm relative flex flex-col transition-all hover:shadow-2xl group">
            
            {/* Top Identity Stripe */}
            <div className={`absolute top-0 left-0 right-0 h-2 ${
              app.status === 'Hired' ? 'bg-emerald-500' : 
              app.status === 'Offered' ? 'bg-purple-500' : 
              app.status === 'Rejected Offer' ? 'bg-rose-500' : 
              app.status === 'Interviewing' ? 'bg-amber-500' : 'bg-blue-500'
            }`}></div>

            <div className="mb-6">
              <h3 className="font-black text-2xl text-slate-800 leading-tight">{app.name}</h3>
              <div className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded uppercase tracking-wider">{app.job_role}</div>
            </div>

            {/* 📋 CANDIDATE INTEL SECTION */}
            <div className="space-y-5 mb-8 flex-grow">
              
              {/* Contact Quick-Links */}
              <div className="space-y-2">
                <div className="text-slate-400 font-black uppercase text-[9px] tracking-widest mb-1">Direct Contact</div>
                <div className="flex items-center gap-3">
                  <a href={`mailto:${app.email}`} className="text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl transition-all border border-slate-100 w-full overflow-hidden truncate">
                    <span>📧</span> {app.email}
                  </a>
                </div>
                {app.phone && (
                  <a 
                    href={`https://wa.me/${app.phone.replace(/[^0-9]/g, '')}`} 
                    target="_blank" 
                    className="flex items-center gap-2 text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all w-full"
                  >
                    <span>📱</span> {app.phone}
                    <span className="ml-auto text-[8px] uppercase font-black opacity-60">WhatsApp</span>
                  </a>
                )}
              </div>

              {/* Financial Breakdown */}
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-3">
                <div className="text-slate-400 font-black uppercase text-[9px] mb-1">Salary Intelligence</div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-tighter">Last Drawn</span>
                  <span className="font-black text-slate-700">{app.last_drawn_salary || '—'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-tighter">Expected</span>
                  <span className="font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{app.salary_expectation || '—'}</span>
                </div>
                {app.final_offer_salary && (
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200">
                    <span className="text-purple-500 font-black uppercase tracking-tighter italic">Final Offer</span>
                    <span className="font-black text-purple-600">{app.final_offer_salary}</span>
                  </div>
                )}
              </div>

              {app.status === 'Hired' && app.onboarding_date && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between text-emerald-700 font-black text-[10px] animate-pulse">
                  <span>📅 ONBOARDING DATE</span>
                  <span>{app.onboarding_date}</span>
                </div>
              )}

              {app.status === 'Rejected Offer' && app.rejection_reason && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-[10px] italic leading-relaxed">
                  <strong>Reason:</strong> {app.rejection_reason}
                </div>
              )}
            </div>

            {/* FLOW CONTROL */}
            <div className="space-y-3">
              <select 
                value={app.status} 
                onChange={(e) => handleStatusChange(app, e.target.value)}
                className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-xs font-black uppercase bg-white cursor-pointer hover:border-blue-300 outline-none appearance-none text-center tracking-widest"
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

              <div className="flex gap-2">
                <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-slate-900 text-white py-3 rounded-2xl font-black text-[10px] tracking-[0.2em] hover:bg-black transition-all">VIEW RESUME</a>
                <button 
                  onClick={() => setShowHistoryId(showHistoryId === app.id ? null : app.id)} 
                  className="px-5 bg-slate-100 rounded-2xl font-bold text-slate-400 hover:bg-slate-200 transition-colors"
                >
                  🕒
                </button>
              </div>
            </div>

            {/* 🕒 SOLID HISTORY OVERLAY */}
            {showHistoryId === app.id && (
              <div className="absolute inset-0 bg-white z-40 p-8 flex flex-col rounded-[2.3rem] shadow-2xl animate-fade-in border-2 border-slate-100">
                <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Candidate History</span>
                  <button onClick={() => setShowHistoryId(null)} className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-red-500 font-bold transition-all shadow-sm">✕</button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-6 pr-2">
                  {app.status_history?.map((h, idx) => (
                    <div key={idx} className="relative pl-6">
                      <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-50"></div>
                      <div className="text-xs font-black uppercase text-slate-800 tracking-tighter">{h.status}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-1">
                        {new Date(h.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowHistoryId(null)} className="mt-6 py-3 bg-slate-50 text-slate-400 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-100 transition-colors">Close Log</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}