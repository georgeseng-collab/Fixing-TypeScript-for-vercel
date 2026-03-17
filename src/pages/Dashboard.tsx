// @ts-nocheck
import { useEffect, useState } from 'react';
import { getApplicants, updateApplicantStatus, deleteApplicant, supabase } from '../db';

export default function Dashboard() {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showHistoryId, setShowHistoryId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('All');

  const fetchData = async () => {
    try {
      const data = await getApplicants();
      setApplicants(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusChange = async (app: any, newStatus: string) => {
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

    // NEW: Reject Offer Logic
    if (newStatus === 'Rejected Offer') {
      const reason = window.prompt(`Why did ${app.name} reject the offer? (e.g., Salary too low, accepted elsewhere)`);
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
      if (error) throw error;
      fetchData();
    } catch (e) { alert("Update failed."); }
  };

  const activePipeline = applicants.filter(a => a.status !== 'Quit' && a.status !== 'Blacklisted');

  const statsConfig = [
    { label: 'Total Pool', key: 'All', color: 'bg-slate-600', text: 'text-slate-600', border: 'border-slate-600' },
    { label: 'Applied', key: 'Applied', color: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-500' },
    { label: 'Interviewing', key: 'Interviewing', color: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-500' },
    { label: 'Offered', key: 'Offered', color: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-500' },
    { label: 'Hired', key: 'Hired', color: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-500' },
    { label: 'Rejected', key: 'Rejected Offer', color: 'bg-rose-500', text: 'text-rose-600', border: 'border-rose-500' },
  ];

  const getCount = (key) => key === 'All' ? activePipeline.length : activePipeline.filter(a => a.status === key).length;

  const filtered = activePipeline.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.job_role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || a.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400 font-black">SYNCING GENIEBOOK DATA...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 📊 COLOR-CODED STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsConfig.map((s) => (
          <button 
            key={s.key} 
            onClick={() => setFilterStatus(s.key)}
            className={`p-4 rounded-2xl border-2 transition-all shadow-sm bg-white relative overflow-hidden ${
              filterStatus === s.key ? `${s.border} ring-4 ring-slate-100` : 'border-transparent opacity-70 grayscale-[0.5] hover:opacity-100 hover:grayscale-0'
            }`}
          >
            <div className={`absolute top-0 left-0 w-1 h-full ${s.color}`}></div>
            <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{s.label}</div>
            <div className={`text-2xl font-black ${s.text}`}>{getCount(s.key)}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          {filterStatus === 'All' ? 'Full Pipeline' : filterStatus}
        </h2>
        <input 
          type="text" placeholder="Search talent..." 
          className="px-4 py-3 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 w-full md:w-80 shadow-inner bg-slate-50"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* PIPELINE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((app) => (
          <div key={app.id} className="bg-white border-2 border-slate-100 p-6 rounded-3xl shadow-sm relative group overflow-hidden transition-all hover:shadow-xl">
            <div className={`absolute top-0 left-0 right-0 h-2 ${
              app.status === 'Hired' ? 'bg-emerald-500' : 
              app.status === 'Offered' ? 'bg-purple-500' : 
              app.status === 'Rejected Offer' ? 'bg-rose-500' : 
              app.status === 'Interviewing' ? 'bg-amber-500' : 'bg-blue-500'
            }`}></div>

            <div className="mb-4">
              <h3 className="font-black text-xl text-slate-800">{app.name}</h3>
              <div className="text-xs font-bold text-blue-600 uppercase">{app.job_role}</div>
            </div>

            <div className="text-sm space-y-3 mb-6">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="text-slate-500 text-[10px] font-bold uppercase">Compensation</div>
                <div className="font-bold text-slate-800">Expects: {app.salary_expectation}</div>
                {(app.status === 'Offered' || app.status === 'Hired') && app.final_offer_salary && (
                  <div className="text-blue-600 font-black">Final: {app.final_offer_salary}</div>
                )}
              </div>

              {app.status === 'Rejected Offer' && app.rejection_reason && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs italic">
                  <strong>Reason:</strong> {app.rejection_reason}
                </div>
              )}

              {app.status === 'Hired' && app.onboarding_date && (
                <div className="flex items-center gap-2 text-emerald-600 font-black text-xs">
                  📅 STARTS: {app.onboarding_date}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <select 
                value={app.status} 
                onChange={(e) => handleStatusChange(app, e.target.value)}
                className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold bg-white cursor-pointer hover:border-blue-200"
              >
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offered">Offered</option>
                <option value="Hired">Hired</option>
                <option value="Rejected Offer">Rejected Offer</option>
                <option value="Quit">Archive: Quit</option>
              </select>
              <div className="flex gap-2">
                <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-slate-900 text-white py-2.5 rounded-xl font-bold text-[10px] hover:bg-black transition-all">RESUME</a>
                <button onClick={() => setShowHistoryId(showHistoryId === app.id ? null : app.id)} className="px-4 bg-slate-100 rounded-xl font-bold text-slate-500 hover:bg-slate-200">🕒</button>
              </div>
            </div>

            {/* HISTORY OVERLAY (Same as before) */}
            {showHistoryId === app.id && (
              <div className="absolute inset-0 bg-white/98 p-6 z-10 flex flex-col animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Candidate Journey</span>
                  <button onClick={() => setShowHistoryId(null)} className="text-slate-300 hover:text-slate-800">✕</button>
                </div>
                <div className="overflow-y-auto space-y-4">
                  {app.status_history?.map((h, i) => (
                    <div key={i} className="border-l-2 border-blue-100 pl-4 py-1">
                      <div className="text-[10px] font-black text-slate-800 uppercase">{h.status}</div>
                      <div className="text-[10px] text-slate-400">{new Date(h.date).toLocaleDateString()}</div>
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