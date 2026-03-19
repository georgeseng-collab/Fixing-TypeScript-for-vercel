// @ts-nocheck
import { useEffect, useState } from 'react';
import { getApplicants, deleteApplicant } from '../db';

export default function CandidateSearch() {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

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

  // Automatically extract unique job roles for the dropdown
  const uniqueRoles = ['All', ...new Set(applicants.map(a => a.job_role))];

  const filtered = applicants.filter(app => {
    const matchesRole = filterRole === 'All' || app.job_role === filterRole;
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          app.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const handleDelete = async (app: any) => {
    if (window.confirm(`Delete ${app.name}?`)) {
      await deleteApplicant(app.id, app.resume_metadata?.path);
      fetchData();
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-slate-500">Loading Directory...</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex-1 space-y-4">
          <h1 className="text-3xl font-bold text-slate-800">Talent Directory</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Search by Name/Email</label>
              <input 
                type="text" 
                placeholder="Ex: John Doe..." 
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Filter by Job Role</label>
              <select 
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                onChange={(e) => setFilterRole(e.target.value)}
                value={filterRole}
              >
                {uniqueRoles.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-blue-200 text-center">
          <div className="text-2xl font-bold">{filtered.length}</div>
          <div className="text-xs uppercase font-medium opacity-80">Candidates Found</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Candidate Details</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Current Status</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Salary Details</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(app => (
              <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-slate-800">{app.name}</div>
                  <div className="text-sm text-blue-600 font-medium mb-1">{app.job_role}</div>
                  <div className="text-xs text-slate-500 italic">{app.email} • {app.phone}</div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    app.status === 'Blacklisted' ? 'bg-red-100 text-red-700' : 
                    app.status === 'Hired' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {app.status}
                  </span>
                </td>
                <td className="p-4">
                  <div className="text-sm text-slate-700"><strong>Excl:</strong> {app.salary_expectation}</div>
                  <div className="text-xs text-slate-500"><strong>Last:</strong> {app.last_drawn_salary}</div>
                </td>
                <td className="p-4 text-right space-x-2">
                  <a href={app.resume_metadata?.url} target="_blank" className="inline-block p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Resume">
                    📄
                  </a>
                  <button onClick={() => handleDelete(app)} className="p-2 text-slate-300 hover:text-red-500 rounded-lg" title="Delete">
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-20 text-center text-slate-400 font-medium">No candidates match your filters.</div>
        )}
      </div>
    </div>
  );
}