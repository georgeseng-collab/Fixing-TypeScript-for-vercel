// @ts-nocheck
import { useEffect, useState } from 'react';
import { getApplicants, updateApplicantStatus, deleteApplicant } from '../db';

export default function Dashboard() {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    const data = await getApplicants();
    setApplicants(data);
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusChange = async (id: string, newStatus: string, history: any[]) => {
    await updateApplicantStatus(id, newStatus, history);
    fetchData();
  };

  const handleDelete = async (app: any) => {
    if (window.confirm(`Permanently delete ${app.name} and their resume?`)) {
      try {
        await deleteApplicant(app.id, app.resume_metadata?.path);
        fetchData();
      } catch (e) { alert("Delete failed."); }
    }
  };

  const filtered = applicants.filter(a => 
    (a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.job_role.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (a.status !== 'Quit' && a.status !== 'Blacklisted')
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Pipeline</h1>
        <input 
          type="text" placeholder="Search..." 
          className="px-4 py-2 border rounded-lg w-64"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filtered.map((app) => (
          <div key={app.id} className="bg-white border p-5 rounded-xl shadow-sm relative group">
            <button 
              onClick={() => handleDelete(app)}
              className="absolute top-4 right-4 text-slate-300 hover:text-red-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <h3 className="font-bold text-slate-800">{app.name}</h3>
            <p className="text-blue-600 text-sm mb-4">{app.job_role}</p>
            <div className="text-sm space-y-1 mb-4 text-slate-600">
              <p>📧 {app.email}</p>
              <p>📱 {app.phone}</p>
            </div>
            <div className="flex flex-col gap-2">
              <select 
                value={app.status} 
                onChange={(e) => handleStatusChange(app.id, e.target.value, app.status_history)}
                className="border p-2 rounded-lg text-sm bg-slate-50"
              >
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offered">Offered</option>
                <option value="Hired">Hired</option>
                <option value="Quit">Archive: Quit</option>
                <option value="Blacklisted">Archive: Blacklist</option>
              </select>
              <a href={app.resume_metadata?.url} target="_blank" className="text-center bg-blue-50 text-blue-600 py-2 rounded-lg font-bold text-xs">VIEW RESUME</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}