import { useEffect, useState } from 'react';
import { getApplicants, updateApplicantStatus } from '../db';

export default function Archive() {
  const [archived, setArchived] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try { 
      const data = await getApplicants();
      // Only keep Quit and Blacklisted candidates
      setArchived(data.filter(a => a.status === 'Quit' || a.status === 'Blacklisted'));
    } 
    catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusChange = async (id: string, newStatus: string, history: any[]) => {
    // If they change them back to Applied/Hired, we restore them to the active pipeline
    await updateApplicantStatus(id, newStatus, history);
    fetchData(); 
  };

  if (loading) return <div className="flex justify-center items-center h-64 text-slate-500 animate-pulse">Loading archive...</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Archive & Blacklist</h1>
        <p className="text-slate-500 mt-1">Directory of former employees and blacklisted candidates.</p>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Candidate Info</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status & Remarks</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Restore Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {archived.map((app) => (
                <tr key={app.id} className={`hover:bg-slate-50 ${app.status === 'Blacklisted' ? 'bg-red-50/30' : ''}`}>
                  
                  {/* UPDATED: Prominent Contact Info */}
                  <td className="p-4 align-top">
                    <div className="font-bold flex items-center gap-2">
                      {app.status === 'Blacklisted' && <span title="Do Not Contact" className="text-xl">🚫</span>}
                      <span className={app.status === 'Blacklisted' ? 'text-red-700 font-black text-base' : 'text-slate-800 text-base'}>
                        {app.name}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-700 mt-1">{app.job_role}</div>
                    <div className="text-sm text-slate-600 mt-2 flex flex-col gap-1">
                      <span className="bg-white px-2 py-1 rounded border border-slate-200 w-max shadow-sm">📧 {app.email}</span>
                      <span className="bg-white px-2 py-1 rounded border border-slate-200 w-max shadow-sm">📱 {app.phone || 'N/A'}</span>
                    </div>
                  </td>
                  
                  {/* Remarks & Dates */}
                  <td className="p-4 align-top">
                    <div className="flex flex-col gap-2">
                      <span className={`w-max text-xs px-2 py-1 rounded font-bold uppercase tracking-wider ${app.status === 'Blacklisted' ? 'bg-black text-white' : 'bg-slate-700 text-white'}`}>
                        {app.status}
                      </span>
                      {app.left_date && (
                        <div className="text-sm text-slate-600 mt-1">
                          <strong>Date Left:</strong> {app.left_date}
                        </div>
                      )}
                      <div className="text-sm text-slate-800 bg-white p-3 border border-slate-200 rounded-lg max-w-md shadow-sm mt-1">
                        <strong className="text-slate-500 block mb-1 uppercase text-xs">Remarks/Reason:</strong> 
                        {app.remarks || 'No remarks added.'}
                      </div>
                    </div>
                  </td>

                  {/* Restore Actions */}
                  <td className="p-4 align-top">
                    <select 
                      value={app.status} 
                      onChange={(e) => handleStatusChange(app.id, e.target.value, app.status_history)} 
                      className="text-sm border border-slate-300 rounded-lg px-3 py-2 cursor-pointer outline-none bg-white hover:border-blue-400 transition-colors shadow-sm"
                    >
                      <option disabled>Restore to Active:</option>
                      <option value="Applied">Move to Applied</option>
                      <option value="Hired">Move to Hired</option>
                      <option disabled>──────</option>
                      <option value="Quit">Quit</option>
                      <option value="Blacklisted">Blacklisted</option>
                    </select>
                  </td>
                </tr>
              ))}
              {archived.length === 0 && (
                <tr><td colSpan={3} className="p-8 text-center text-slate-500">No archived candidates.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}