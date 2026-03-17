import { useEffect, useState, useMemo } from 'react';
import { getApplicants, updateApplicantStatus } from '../db';

export default function Dashboard() {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const fetchData = async () => {
    try { setApplicants(await getApplicants()); } 
    catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusChange = async (id: string, newStatus: string, history: any[]) => {
    let extraData = {};

    // POPUP LOGIC FOR QUIT AND BLACKLISTED
    if (newStatus === 'Quit') {
      const leftDate = prompt('Enter the date they left (e.g., YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
      if (leftDate === null) return; // User clicked cancel
      const remarks = prompt('Enter reason for leaving / remarks:');
      extraData = { left_date: leftDate, remarks: remarks || 'No reason provided.' };
    } else if (newStatus === 'Blacklisted') {
      const remarks = prompt('WARNING: You are blacklisting this candidate.\n\nEnter the reason (Required for TA visibility):');
      if (!remarks) return; // Cancel if no reason is given
      extraData = { remarks: remarks };
    }

    await updateApplicantStatus(id, newStatus, history, extraData);
    fetchData(); 
  };

  const uniqueRoles = useMemo(() => {
    const roles = applicants.map(a => a.job_role).filter(Boolean);
    return ['All', ...new Set(roles)];
  }, [applicants]);

  // Exclude Quit and Blacklisted from the main active dashboard view
  const activeApplicants = applicants.filter(a => a.status !== 'Quit' && a.status !== 'Blacklisted');

  const filteredApplicants = useMemo(() => {
    return activeApplicants.filter(app => {
      const matchesSearch = app.name?.toLowerCase().includes(searchQuery.toLowerCase()) || app.email?.toLowerCase().includes(searchQuery.toLowerCase()) || app.phone?.includes(searchQuery);
      const matchesRole = roleFilter === 'All' || app.job_role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [activeApplicants, searchQuery, roleFilter]);

  const roleStats = useMemo(() => {
    const stats: Record<string, { total: number, interviewing: number, hired: number }> = {};
    activeApplicants.forEach(app => {
      const role = app.job_role || 'Unspecified';
      if (!stats[role]) stats[role] = { total: 0, interviewing: 0, hired: 0 };
      stats[role].total += 1;
      if (app.status === 'Interviewing') stats[role].interviewing += 1;
      if (app.status === 'Hired') stats[role].hired += 1;
    });
    return Object.entries(stats).map(([role, data]) => ({ role, ...data }));
  }, [activeApplicants]);

  const exportCSV = () => {
    const headers = ['Name,Email,Phone,Role,Last Drawn,Expected Salary,Notice Period,Status\n'];
    const rows = filteredApplicants.map(a => `${a.name},${a.email},${a.phone},${a.job_role},${a.last_drawn_salary},${a.salary_expectation},${a.notice_period},${a.status}\n`);
    const blob = new Blob([headers + rows.join('')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'geniebook-active-pipeline.csv'; a.click();
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Hired': return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'Interviewing': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Blacklisted': return 'bg-black text-white border-black';
      case 'Quit': return 'bg-slate-700 text-white border-slate-700';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64 text-slate-500 animate-pulse">Loading workspace...</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Active Pipeline</h1>
          <p className="text-slate-500 mt-1">Manage your active candidates. (Quit and Blacklisted candidates are moved to the Archive tab).</p>
        </div>
        <button onClick={exportCSV} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg shadow-sm font-medium">Export CSV</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Visible Candidates', count: filteredApplicants.length, color: 'border-blue-500' },
          { label: 'Applied', count: filteredApplicants.filter(a => a.status === 'Applied').length, color: 'border-slate-400' },
          { label: 'Interviewing', count: filteredApplicants.filter(a => a.status === 'Interviewing').length, color: 'border-yellow-400' },
          { label: 'Hired', count: filteredApplicants.filter(a => a.status === 'Hired').length, color: 'border-green-500' },
        ].map((stat, i) => (
          <div key={i} className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${stat.color}`}>
            <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">{stat.label}</h3>
            <p className="text-4xl font-black text-slate-800 mt-2">{stat.count}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200"><h3 className="font-bold text-slate-800">Role Breakdown Stats</h3></div>
          <div className="p-4">
            <table className="w-full text-sm text-left">
              <thead><tr className="text-slate-500 border-b"><th className="pb-2 font-medium">Role</th><th className="pb-2 font-medium text-center">Total</th><th className="pb-2 font-medium text-center">Interviews</th><th className="pb-2 font-medium text-center">Hired</th></tr></thead>
              <tbody>
                {roleStats.map((stat, i) => (
                  <tr key={i} className="border-b last:border-0 border-slate-100">
                    <td className="py-2 font-semibold text-slate-700">{stat.role}</td><td className="py-2 text-center text-slate-600">{stat.total}</td><td className="py-2 text-center text-yellow-600 font-medium">{stat.interviewing}</td><td className="py-2 text-center text-green-600 font-medium">{stat.hired}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 shadow-sm border border-slate-200 rounded-xl">
            <input type="text" placeholder="🔍 Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-grow border border-slate-300 rounded-lg px-4 py-2 outline-none" />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="sm:w-64 border border-slate-300 rounded-lg px-4 py-2 outline-none cursor-pointer bg-white">
              {uniqueRoles.map((role, i) => <option key={i} value={role}>{role === 'All' ? 'All Roles' : role}</option>)}
            </select>
          </div>

          <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr><th className="p-4 text-xs font-semibold text-slate-500 uppercase">Candidate Info</th><th className="p-4 text-xs font-semibold text-slate-500 uppercase">Role & Details</th><th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status</th><th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Resume</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApplicants.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50 group">
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-base">{app.name}</div>
                        <div className="text-sm text-slate-500 mt-1 flex flex-col gap-0.5"><span>📧 {app.email}</span><span>📱 {app.phone || 'N/A'}</span></div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-700">{app.job_role}</div>
                        <div className="text-xs text-slate-500 mt-1 grid grid-cols-1 gap-1">
                          <span className="bg-slate-100 px-2 py-0.5 rounded inline-block w-max">Last: <span className="font-semibold">{app.last_drawn_salary || '-'}</span></span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded inline-block w-max">Exp: <span className="font-semibold">{app.salary_expectation || '-'}</span></span>
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <select value={app.status} onChange={(e) => handleStatusChange(app.id, e.target.value, app.status_history)} className={`text-sm border rounded-full px-3 py-1 font-semibold cursor-pointer outline-none mb-2 ${getStatusColor(app.status)}`}>
                          <option value="Applied">Applied</option>
                          <option value="Interviewing">Interviewing</option>
                          <option value="Hired">Hired</option>
                          <option value="Rejected">Rejected</option>
                          <option disabled>──────</option>
                          <option value="Quit">Move to Quit</option>
                          <option value="Blacklisted">Blacklist</option>
                        </select>
                      </td>
                      <td className="p-4 text-right align-top">
                        {app.resume_metadata ? <a href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/resumes/${app.resume_metadata.path}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100">📄 View</a> : <span className="text-sm text-slate-400">No file</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}