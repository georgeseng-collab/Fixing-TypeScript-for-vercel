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

    // 1. Logic for OFFERED
    if (newStatus === 'Offered') {
      const amount = window.prompt(`Enter Final Offer Salary for ${app.name}:`, app.salary_expectation || "");
      if (amount === null) return; 
      finalOffer = amount;
    }

    // 2. Logic for HIRED (Prompt for Date + Google Cal Link)
    if (newStatus === 'Hired') {
      const dateInput = window.prompt(`Enter Onboarding Date (YYYY-MM-DD):`, new Date().toISOString().split('T')[0]);
      if (dateInput === null) return;
      onboardingDate = dateInput;

      // Generate a Google Calendar Link for the user to "Book Own Calendar"
      const gCalTitle = encodeURIComponent(`Onboarding: ${app.name} (${app.job_role})`);
      const gCalDetails = encodeURIComponent(`New hire starting!\nRole: ${app.job_role}\nSalary: ${app.final_offer_salary || 'N/A'}`);
      const gCalDate = dateInput.replace(/-/g, '');
      const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gCalTitle}&dates=${gCalDate}/${gCalDate}&details=${gCalDetails}`;
      
      // Open Google Calendar in a new tab so the user can save the event
      window.open(gCalUrl, '_blank');
    }

    try {
      const updatedHistory = [...(app.status_history || []), { status: newStatus, date: new Date().toISOString() }];
      
      const { error } = await supabase
        .from('applicants')
        .update({ 
          status: newStatus, 
          status_history: updatedHistory,
          final_offer_salary: finalOffer,
          onboarding_date: onboardingDate
        })
        .eq('id', app.id);

      if (error) throw error;
      fetchData();
    } catch (e) { alert("Update failed."); }
  };

  // ... rest of the filtering and delete logic remains the same ...
  const activePipeline = applicants.filter(a => a.status !== 'Quit' && a.status !== 'Blacklisted');
  const stats = {
    all: activePipeline.length,
    applied: activePipeline.filter(a => a.status === 'Applied').length,
    interviewing: activePipeline.filter(a => a.status === 'Interviewing').length,
    offered: activePipeline.filter(a => a.status === 'Offered').length,
    hired: activePipeline.filter(a => a.status === 'Hired').length,
  };

  const filtered = activePipeline.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.job_role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || a.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400 font-bold">LOADING...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Same Stat Card buttons as before... */}
        {['All', 'Applied', 'Interviewing', 'Offered', 'Hired'].map((key) => (
          <button key={key} onClick={() => setFilterStatus(key)} className={`p-4 rounded-2xl border bg-white ${filterStatus === key ? 'border-blue-500 ring-2 ring-blue-50' : 'border-slate-200'}`}>
            <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{key}</div>
            <div className="text-2xl font-black">{key === 'All' ? stats.all : stats[key.toLowerCase()]}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filtered.map((app) => (
          <div key={app.id} className="bg-white border p-6 rounded-2xl shadow-sm relative overflow-hidden border-t-4" 
               style={{ borderTopColor: app.status === 'Hired' ? '#10b981' : app.status === 'Offered' ? '#a855f7' : '#3b82f6' }}>
            
            <h3 className="font-bold text-lg">{app.name}</h3>
            <p className="text-xs text-blue-600 font-bold uppercase mb-4">{app.job_role}</p>

            <div className="text-sm space-y-2 mb-6 text-slate-600">
              <div>💰 Expect: <strong>{app.salary_expectation}</strong></div>
              
              {app.final_offer_salary && (
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 font-bold text-slate-800">
                  {app.status === 'Hired' ? '🤝 Joined: ' : '✨ Offer: '} {app.final_offer_salary}
                </div>
              )}

              {app.status === 'Hired' && app.onboarding_date && (
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 font-bold animate-pulse">
                  📅 Starts: {app.onboarding_date}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <select value={app.status} onChange={(e) => handleStatusChange(app, e.target.value)} className="w-full border p-2 rounded-xl text-sm font-bold bg-slate-50">
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offered">Offered</option>
                <option value="Hired">Hired</option>
                <option value="Quit">Archive: Quit</option>
              </select>
              <a href={app.resume_metadata?.url} target="_blank" className="text-center bg-slate-800 text-white py-2 rounded-xl font-bold text-xs">VIEW RESUME</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}