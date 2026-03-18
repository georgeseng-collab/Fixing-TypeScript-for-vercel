// @ts-nocheck
import { useEffect, useState } from 'react';
import { getApplicants, updateApplicantStatus, deleteApplicant, supabase } from '../db';

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
      const amount = window.prompt(`Enter Final Offer Salary:`, app.salary_expectation || "");
      if (amount === null) return; 
      finalOffer = amount;
    }

    if (newStatus === 'Hired') {
      const dateInput = window.prompt(`Enter Onboarding Date (YYYY-MM-DD):`, new Date().toISOString().split('T')[0]);
      if (dateInput === null) return;
      onboardingDate = dateInput;
      const gCalTitle = encodeURIComponent(`Onboarding: ${app.name}`);
      window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gCalTitle}&dates=${dateInput.replace(/-/g, '')}/${dateInput.replace(/-/g, '')}`, '_blank');
    }

    if (newStatus === 'Rejected Offer') {
      const reason = window.prompt(`Why did they reject the offer?`);
      if (reason === null) return;
      rejectReason = reason;
    }

    try {
      const updatedHistory = [...(app.status_history || []), { status: newStatus, date: new Date().toISOString() }];
      const { error } = await supabase.from('applicants').update({ 
        status: newStatus, 
        status_history: updatedHistory,
        final_offer_salary: finalOffer,
        onboarding_date: onboardingDate,
        rejection_reason: rejectReason
      }).eq('id', app.id);
      fetchData();
    } catch (e) { alert("Update failed."); }
  };

  // ARCHIVE FILTER: Exclude these from the main dashboard
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

  if (loading) return <div className="p-20 text-center font-black text-slate-400 animate-pulse">LOADING PIPELINE...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* STATS */}
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

      {/* SEARCH */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Current Talent</h2>
        <input type="text" placeholder="Search..." className="px-4 py-2 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 w-64" onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((app) => (
          <div key={app.id} className="bg-white border-2 border-slate-50 p-6 rounded-[2rem] shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-2 ${app.status === 'Hired' ? 'bg-emerald-500' : app.status === 'Offered' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
            <h3 className="font-black text-xl mb-1">{app.name}</h3>
            <div className="text-[10px] font-black text-blue-600 uppercase mb-4">{app.job_role}</div>

            <div className="flex flex-col gap-3">
              <select value={app.status} onChange={(e) => handleStatusChange(app, e.target.value)} className="w-full border-2 border-slate-50 rounded-xl p-2 text-xs font-black uppercase">
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offered">Offered</option>
                <option value="Hired">Hired</option>
                <option value="Rejected Offer">Rejected Offer</option>
                <option disabled className="text-slate-300">── Move to Archive ──</option>
                <option value="Failed Interview">Failed Interview</option>
                <option value="Quit">Quit</option>
                <option value="Blacklisted">Blacklisted</option>
              </select>
              <div className="flex gap-2">
                <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-slate-900 text-white py-2 rounded-xl font-black text-[10px] tracking-widest">RESUME</a>
                <button onClick={() => setShowHistoryId(showHistoryId === app.id ? null : app.id)} className="px-4 bg-slate-100 rounded-xl font-bold text-slate-400 hover:bg-slate-200 transition-colors text-xs">🕒</button>
              </div>
            </div>

            {/* 🕒 SOLID HISTORY OVERLAY */}
            {showHistoryId === app.id && (
              <div className="absolute inset-0 bg-white z-30 p-6 flex flex-col rounded-[1.8rem] border-2 border-slate-100">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Status Journey</span>
                  <button onClick={() => setShowHistoryId(null)} className="text-slate-400 hover:text-red-500 font-bold">✕</button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-4">
                  {app.status_history?.map((h, idx) => (
                    <div key={idx} className="border-l-2 border-slate-100 pl-4 py-1">
                      <div className="text-[10px] font-black uppercase text-slate-700">{h.status}</div>
                      <div className="text-[9px] text-slate-400">{new Date(h.date).toLocaleDateString()}</div>
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