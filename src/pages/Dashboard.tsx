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
      setApplicants(data || []);
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

    if (newStatus === 'Rejected Offer') {
      const reason = window.prompt(`Why did ${app.name} reject the offer?`);
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

  const handleDelete = async (app: any) => {
    if (window.confirm(`Permanently delete ${app.name}?`)) {
      try {
        await deleteApplicant(app.id, app.resume_metadata?.path);
        fetchData();
      } catch (e) { alert("Delete failed."); }
    }
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
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* 📊 COLOR-CODED STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsConfig.map((s) => (
          <button 
            key={s.key} 
            onClick={() => setFilterStatus(s.key)}
            className={`p-4 rounded-2xl border-2 transition-all shadow-sm bg-white relative overflow-hidden text-left ${
              filterStatus === s.key ? `${s.border} ring-4 ring-slate-100 scale-[1.02] z-10` : 'border-slate-50 opacity-70 hover:opacity-100'
            }`}
          >
            <div className={`absolute top-0 left-0 w-1 h-full ${s.color}`}></div>
            <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{s.label}</div>
            <div className={`text-2xl font-black ${s.text}`}>{getCount(s.key)}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {filterStatus === 'All' ? 'Active Pipeline' : `${filterStatus} Stage`}
          </h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
            {filtered.length} Candidates matched
          </p>
        </div>
        <input 
          type="text" placeholder="Quick find name/role..." 
          className="px-4 py-3 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 w-full md:w-80 shadow-sm bg-white"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* PIPELINE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((app) => (
          <div key={app.id} className="bg-white border-2 border-slate-50 p-6 rounded-[2rem] shadow-sm relative group transition-all hover:shadow-xl hover:-translate-y-1">
            
            {/* Top Status Indicator */}
            <div className={`absolute top-0 left-0 right-0 h-2 ${
              app.status === 'Hired' ? 'bg-emerald-500' : 
              app.status === 'Offered' ? 'bg-purple-500' : 
              app.status === 'Rejected Offer' ? 'bg-rose-500' : 
              app.status === 'Interviewing' ? 'bg-amber-500' : 'bg-blue-500'
            }`}></div>

            <button onClick={() => handleDelete(app)} className="absolute top-5 right-5 text-slate-200 hover:text-red-500 transition-colors">🗑️</button>

            <div className="mb-6">
              <h3 className="font-black text-xl text-slate-800 leading-tight">{app.name}</h3>
              <div className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded uppercase tracking-wider">{app.job_role}</div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="text-xs text-slate-500 flex flex-col gap-1">
                <span>📧 {app.email}</span>
                <span>📱 {app.phone}</span>
              </div>
              
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Compensation Details</div>
                <div className="text-sm font-bold text-slate-700 italic">Expects: {app.salary_expectation}</div>
                {(app.status === 'Offered' || app.status === 'Hired') && app.final_offer_salary && (
                  <div className="text-sm font-black text-blue-600 mt-1">Final: {app.final_offer_salary}</div>
                )}
              </div>

              {app.status === 'Rejected Offer' && app.rejection_reason && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-[11px] font-medium leading-relaxed">
                  <strong>Rejection Reason:</strong> {app.rejection_reason}
                </div>
              )}

              {app.status === 'Hired' && app.onboarding_date && (
                <div className="flex items-center gap-2 p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 font-black text-xs">
                  📅 STARTS: {app.onboarding_date}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <select 
                value={app.status} 
                onChange={(e) => handleStatusChange(app, e.target.value)}
                className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-xs font-black bg-white cursor-pointer hover:border-blue-200 outline-none uppercase tracking-tighter"
              >
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offered">Offered</option>
                <option value="Hired">Hired</option>
                <option value="Rejected Offer">Rejected Offer</option>
                <option value="Quit">Archive: Quit</option>
              </select>
              <div className="flex gap-2">
                <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] hover:bg-black transition-all tracking-widest">RESUME</a>
                <button 
                  onClick={() => setShowHistoryId(showHistoryId === app.id ? null : app.id)} 
                  className="px-4 bg-slate-100 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  🕒
                </button>
              </div>
            </div>

            {/* 🕒 FIXED SOLID HISTORY OVERLAY */}
            {showHistoryId === app.id && (
              <div className="absolute inset-0 bg-white z-30 p-6 flex flex-col animate-fade-in shadow-2xl rounded-[1.8rem] border-2 border-slate-100">
                <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🕒</span>
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400">Status Journey</h4>
                  </div>
                  <button onClick={() => setShowHistoryId(null)} className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 font-bold transition-all">✕</button>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                  {app.status_history?.map((h: any, idx: number) => (
                    <div key={idx} className="relative pl-8">
                      {idx !== app.status_history.length - 1 && (
                        <div className="absolute left-[11px] top-5 w-[2px] h-full bg-slate-50"></div>
                      )}
                      <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${idx === 0 ? 'bg-blue-500' : 'bg-slate-200'}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-[11px] font-black uppercase tracking-tight ${idx === 0 ? 'text-blue-600' : 'text-slate-700'}`}>{h.status}</span>
                        <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                          {new Date(h.date).toLocaleDateString()} at {new Date(h.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={() => setShowHistoryId(null)} className="mt-6 w-full py-3 bg-slate-50 text-slate-400 text-[9px] font-black rounded-xl hover:bg-slate-100 transition-colors uppercase tracking-widest">Close Progress Log</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}