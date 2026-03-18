// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../db';
import { format } from 'date-fns';

export default function Dashboard() {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Offer Modal States
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [activeApp, setActiveApp] = useState(null);
  const [salaryInput, setSalaryInput] = useState('');

  const fetchApplicants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('applicants')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setApplicants(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchApplicants(); }, []);

  const handleStatusUpdate = async (applicant, newStatus) => {
    // If selecting 'Offered', intercept to show the salary prompt
    if (newStatus === 'Offered') {
      setActiveApp(applicant);
      setShowOfferModal(true);
      return;
    }
    // Otherwise, proceed with standard update
    await executeUpdate(applicant, newStatus);
  };

  const executeUpdate = async (applicant, newStatus, extraData = {}) => {
    const timestamp = new Date().toISOString();
    
    // Create the new history log entry
    const newHistoryEntry = {
      status: newStatus,
      date: timestamp,
      ...extraData
    };

    // CRITICAL: Spread existing history so we don't lose past data
    const updatedHistory = [...(applicant.status_history || []), newHistoryEntry];

    const { error } = await supabase
      .from('applicants')
      .update({ 
        status: newStatus, 
        status_history: updatedHistory 
      })
      .eq('id', applicant.id);

    if (error) {
      alert("Update Failed: " + error.message);
    } else {
      setShowOfferModal(false);
      setSalaryInput('');
      fetchApplicants();
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="font-black text-blue-600 text-6xl animate-pulse italic tracking-tighter">GENIEBOOK</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 relative pb-32">
      {/* Header Section */}
      <div className="flex justify-between items-end mb-16 px-4">
        <div>
          <h1 className="text-6xl font-black italic tracking-tighter text-slate-900">Talent Pipeline</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-4 ml-1">Live Recruitment Overview</p>
        </div>
        <div className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] font-black text-xs italic">
          {applicants.length} Total Candidates
        </div>
      </div>

      {/* Main Table/Grid */}
      <div className="grid gap-6">
        {applicants.map((app) => (
          <div key={app.id} className="group bg-white p-10 rounded-[4rem] shadow-sm border border-slate-50 flex flex-col md:flex-row md:items-center justify-between hover:shadow-2xl hover:border-blue-100 transition-all duration-500">
            
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <span className={`w-3 h-3 rounded-full ${
                  app.status === 'Hired' ? 'bg-emerald-500' : 
                  app.status === 'Offered' ? 'bg-amber-500' : 
                  app.status === 'Rejected' ? 'bg-rose-500' : 'bg-blue-500'
                } shadow-lg animate-pulse`} />
                <h2 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">{app.name}</h2>
              </div>
              
              <div className="flex items-center gap-6 mt-4">
                <div>
                  <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Role</div>
                  <div className="font-bold text-slate-600 italic">{app.job_role || 'Not Specified'}</div>
                </div>
                
                <div className="h-8 w-[1px] bg-slate-100" />
                
                <div>
                  <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Pipeline Journey</div>
                  <div className="flex gap-2 mt-1">
                    {app.status_history?.map((h, i) => (
                      <div key={i} className="group/dot relative cursor-help">
                        <div className="w-4 h-4 rounded-full bg-slate-100 border-2 border-white shadow-sm group-hover/dot:bg-blue-600 transition-all" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover/dot:block z-50 animate-in fade-in slide-in-from-bottom-2">
                          <div className="bg-slate-900 text-white text-[9px] font-black p-3 rounded-2xl whitespace-nowrap shadow-2xl uppercase tracking-widest">
                            {h.status} <br/>
                            <span className="text-slate-400 font-bold lowercase italic">{format(new Date(h.date), 'dd MMM')}</span>
                            {h.salary && <div className="text-emerald-400 mt-1 border-t border-slate-700 pt-1">Offer: ${h.salary}</div>}
                          </div>
                          <div className="w-2 h-2 bg-slate-900 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 md:mt-0 flex items-center gap-4">
              <select 
                value={app.status}
                onChange={(e) => handleStatusUpdate(app, e.target.value)}
                className="appearance-none bg-slate-50 border-none px-10 py-6 rounded-[2.5rem] font-black text-[11px] uppercase tracking-widest text-slate-600 focus:ring-4 focus:ring-blue-100 outline-none cursor-pointer hover:bg-slate-100 transition-all"
              >
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offered">Offered</option>
                <option value="Hired">Hired</option>
                <option value="Rejected">Rejected</option>
              </select>
              
              <button className="p-6 bg-slate-900 text-white rounded-[2rem] hover:bg-blue-600 transition-colors shadow-xl active:scale-90">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* --- OFFER MODAL --- */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden p-12 border border-white">
            <h3 className="text-4xl font-black italic tracking-tighter text-slate-900 mb-2">Record Offer</h3>
            <p className="text-slate-400 font-bold text-sm mb-10">Set the monthly base salary for <span className="text-blue-600">{activeApp?.name}</span></p>
            
            <div className="relative group mb-10">
              <div className="absolute left-8 top-1/2 -translate-y-1/2 font-black text-slate-300 text-2xl group-focus-within:text-blue-600 transition-colors">$</div>
              <input 
                type="number"
                autoFocus
                placeholder="0.00"
                value={salaryInput}
                onChange={(e) => setSalaryInput(e.target.value)}
                className="w-full bg-slate-50 rounded-[2.5rem] py-8 pl-14 pr-8 text-3xl font-black text-slate-800 outline-none focus:ring-4 focus:ring-blue-50 shadow-inner"
              />
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowOfferModal(false)}
                className="flex-1 py-6 bg-slate-100 text-slate-400 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => executeUpdate(activeApp, 'Offered', { salary: salaryInput })}
                className="flex-[2] py-6 bg-blue-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-blue-200 active:scale-95 transition-all"
              >
                Confirm Offer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}