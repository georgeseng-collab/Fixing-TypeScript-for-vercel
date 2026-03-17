// @ts-nocheck
import { useEffect, useState } from 'react';
import { getApplicants, updateApplicantStatus, deleteApplicant, supabase } from '../db';

export default function Dashboard() {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showHistoryId, setShowHistoryId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const data = await getApplicants();
      setApplicants(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusChange = async (app: any, newStatus: string) => {
    let finalOffer = app.final_offer_salary;

    // NEW: If moving to Offered, prompt for the exact salary
    if (newStatus === 'Offered') {
      const amount = window.prompt(`Enter the Final Offer Salary for ${app.name}:`, app.salary_expectation);
      if (amount === null) return; // Cancel if they hit cancel
      finalOffer = amount;
    }

    try {
      // Update the status, history, AND the final offer amount
      const updatedHistory = [...(app.status_history || []), { status: newStatus, date: new Date().toISOString() }];
      
      const { error } = await supabase
        .from('applicants')
        .update({ 
          status: newStatus, 
          status_history: updatedHistory,
          final_offer_salary: finalOffer 
        })
        .eq('id', app.id);

      if (error) throw error;
      fetchData();
    } catch (e) {
      alert("Failed to update status.");
    }
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

  const stats = {
    total: activePipeline.length,
    applied: activePipeline.filter(a => a.status === 'Applied').length,
    interviewing: activePipeline.filter(a => a.status === 'Interviewing').length,
    offered: activePipeline.filter(a => a.status === 'Offered').length,
    hired: activePipeline.filter(a => a.status === 'Hired').length,
  };

  const filtered = activePipeline.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.job_role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400 font-bold">LOADING...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Pool', count: stats.total, color: 'bg-slate-800' },
          { label: 'Applied', count: stats.applied, color: 'bg-blue-500' },
          { label: 'Interviewing', count: stats.interviewing, color: 'bg-amber-500' },
          { label: 'Offered', count: stats.offered, color: 'bg-purple-500' },
          { label: 'Hired', count: stats.hired, color: 'bg-emerald-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</div>
            <div className="flex items-center gap-3">
              <div className={`h-2 w-2 rounded-full ${stat.color}`}></div>
              <div className="text-2xl font-black text-slate-800">{stat.count}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Active Pipeline</h1>
        <input 
          type="text" 
          placeholder="Search..." 
          className="px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-80 shadow-sm"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((app) => (
          <div key={app.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative group overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${
              app.status === 'Hired' ? 'bg-emerald-500' : 
              app.status === 'Offered' ? 'bg-purple-500' : 
              app.status === 'Interviewing' ? 'bg-amber-500' : 'bg-blue-500'
            }`}></div>

            <button onClick={() => handleDelete(app)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500">🗑️</button>

            <div className="mb-4">
              <h3 className="font-bold text-lg text-slate-800 leading-tight">{app.name}</h3>
              <div className="text-xs font-bold text-blue-600 uppercase mt-1">{app.job_role}</div>
            </div>

            <div className="text-sm space-y-2 mb-6 text-slate-600">
              <div className="flex items-center gap-2">📧 {app.email}</div>
              <div className="flex items-center gap-2">
                💰 Expect: <span className="font-bold text-slate-800">{app.salary_expectation}</span>
              </div>
              {/* DISPLAY FINAL OFFER IF IT EXISTS */}
              {app.status === 'Offered' && app.final_offer_salary && (
                <div className="mt-2 p-2 bg-purple-50 border border-purple-100 rounded-lg text-purple-700 font-black animate-bounce-short">
                  ✨ Final Offer: {app.final_offer_salary}
                </div>
              )}
              {app.status === 'Hired' && app.final_offer_salary && (
                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 font-black">
                  🤝 Joined at: {app.final_offer_salary}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <select 
                value={app.status} 
                onChange={(e) => handleStatusChange(app, e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              >
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offered">Offered</option>
                <option value="Hired">Hired</option>
                <option value="Quit">Archive: Quit</option>
                <option value="Blacklisted">Archive: Blacklist</option>
              </select>
              
              <div className="flex gap-2">
                <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-slate-800 text-white py-2 rounded-xl font-bold text-xs hover:bg-slate-900 transition-colors">VIEW RESUME</a>
                <button 
                  onClick={() => setShowHistoryId(showHistoryId === app.id ? null : app.id)}
                  className="px-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors text-xs font-bold"
                >
                  {showHistoryId === app.id ? '✕' : '🕒'}
                </button>
              </div>
            </div>

            {/* HISTORY OVERLAY */}
            {showHistoryId === app.id && (
              <div className="absolute inset-0 bg-white/95 p-6 z-10 animate-fade-in flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-black text-xs uppercase text-slate-400 tracking-widest">Progress Log</h4>
                  <button onClick={() => setShowHistoryId(null)} className="text-slate-400 hover:text-slate-800">×</button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-4">
                  {app.status_history?.map((h: any, idx: number) => (
                    <div key={idx} className="relative pl-6 border-l-2 border-slate-100 pb-1">
                      <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></div>
                      <div className="text-xs font-bold text-slate-800 uppercase">{h.status}</div>
                      <div className="text-[10px] text-slate-400">{new Date(h.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
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