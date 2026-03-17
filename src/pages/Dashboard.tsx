// @ts-nocheck
import { useEffect, useState } from 'react';
import { getApplicants, updateApplicantStatus, deleteApplicant } from '../db';

export default function Dashboard() {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const data = await getApplicants();
      setApplicants(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusChange = async (id: string, newStatus: string, history: any[]) => {
    await updateApplicantStatus(id, newStatus, history);
    fetchData();
  };

  const handleDelete = async (app: any) => {
    if (window.confirm(`Permanently delete ${app.name}?`)) {
      try {
        await deleteApplicant(app.id, app.resume_metadata?.path);
        fetchData();
      } catch (e) { alert("Delete failed."); }
    }
  };

  // Filter for Active Pipeline only (excludes Quit/Blacklisted)
  const activePipeline = applicants.filter(a => a.status !== 'Quit' && a.status !== 'Blacklisted');

  // Stats Calculation
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

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400 font-bold">LOADING PIPELINE...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 📊 STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Active', count: stats.total, color: 'bg-slate-800' },
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

      {/* SEARCH & HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Recruitment Pipeline</h1>
          <p className="text-slate-500 text-sm">Track and manage active candidate progress.</p>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
          <input 
            type="text" 
            placeholder="Search by name or role..." 
            className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-80 bg-white shadow-sm transition-all"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* PIPELINE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((app) => (
          <div key={app.id} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all relative group border-t-4" 
               style={{ borderTopColor: 
                 app.status === 'Hired' ? '#10b981' : 
                 app.status === 'Offered' ? '#a855f7' : 
                 app.status === 'Interviewing' ? '#f59e0b' : '#3b82f6' 
               }}>
            
            <button 
              onClick={() => handleDelete(app)}
              className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            <div className="mb-4">
              <h3 className="font-bold text-lg text-slate-800 leading-tight mb-1">{app.name}</h3>
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">{app.job_role}</div>
            </div>

            <div className="text-sm space-y-2 mb-6 text-slate-600">
              <div className="flex items-center gap-2"><span>📧</span> {app.email}</div>
              <div className="flex items-center gap-2"><span>📱</span> {app.phone}</div>
              <div className="flex items-center gap-2 font-medium text-slate-800">
                <span>💰</span> {app.salary_expectation}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update Progress</div>
              <select 
                value={app.status} 
                onChange={(e) => handleStatusChange(app.id, e.target.value, app.status_history)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
              >
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offered">Offered</option>
                <option value="Hired">Hired</option>
                <option disabled>──────</option>
                <option value="Quit">Archive: Quit</option>
                <option value="Blacklisted">Archive: Blacklist</option>
              </select>
              <a 
                href={app.resume_metadata?.url} 
                target="_blank" 
                className="text-center bg-slate-800 text-white py-2 rounded-xl font-bold text-xs hover:bg-slate-900 transition-colors shadow-lg shadow-slate-100"
              >
                VIEW RESUME
              </a>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-medium">
          No candidates currently in the pipeline.
        </div>
      )}
    </div>
  );
}