// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { getApplicants, deleteApplicant } from '../db';

export default function Archive() {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const data = await getApplicants();
    setApplicants(data.filter(a => a.status === 'Quit' || a.status === 'Blacklisted'));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (app) => {
    if (window.confirm(`Permanently delete ${app.name}? This cannot be undone.`)) {
      await deleteApplicant(app.id, app.resume_metadata?.path);
      fetchData();
    }
  };

  if (loading) return <div className="text-center p-20 font-bold text-slate-400 animate-pulse">SYNCHRONIZING ARCHIVE...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Archive</h1>
        <p className="text-slate-500 text-sm mt-1 font-medium">Inactive records for GenieBook talent pool.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidate</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Role</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason</th>
              <th className="p-5 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {applicants.map(app => (
              <tr key={app.id} className="group hover:bg-slate-50/50 transition-all">
                <td className="p-5">
                  <div className="font-bold text-slate-800">{app.name}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">{app.email}</div>
                </td>
                <td className="p-5">
                  <div className="text-xs font-black text-blue-600 uppercase">{app.job_role}</div>
                </td>
                <td className="p-5">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                    app.status === 'Blacklisted' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {app.status}
                  </span>
                </td>
                <td className="p-5 text-right">
                  <button onClick={() => handleDelete(app)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded-xl text-red-400">
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {applicants.length === 0 && (
          <div className="py-24 text-center">
            <div className="text-4xl mb-4">📂</div>
            <div className="text-slate-400 font-bold">Archive is currently empty.</div>
          </div>
        )}
      </div>
    </div>
  );
}