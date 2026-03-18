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
    if (newStatus === 'Offered') {
      setActiveApp(applicant);
      setShowOfferModal(true);
      return;
    }
    await executeUpdate(applicant, newStatus);
  };

  const executeUpdate = async (applicant, newStatus, extraData = {}) => {
    const timestamp = new Date().toISOString();
    const newHistoryEntry = {
      status: newStatus,
      date: timestamp,
      ...extraData
    };

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
      {/* HEADER SECTION */}
      <div className="flex justify-between items-end mb-16 px-4">
        <div>
          <h1 className="text-6xl font-black italic tracking-tighter text-slate-900 uppercase">Talent Pipeline</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-4 ml-1">Centralized Recruitment Intelligence</p>
        </div>
        <div className="bg-slate-900 text-white px-10 py-5 rounded-[2.5rem] font-black text-xs italic shadow-2xl">
          {applicants.length} TOTAL CANDIDATES
        </div>
      </div>

      {/* CANDIDATE LIST */}
      <div className="grid gap-8">
        {applicants.map((app) => (
          <div key={app.id} className="group bg-white p-12 rounded-[4.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between hover:shadow-2xl hover:border-blue-200 transition-all duration-500">
            
            <div className="flex-1">
              <div className="flex items-center gap-5 mb-4">
                <div className={`w-4 h-4 rounded-full ${
                  app.status === 'Hired' ? 'bg-emerald-500' : 
                  app.status === 'Offered' ? 'bg-amber-500' : 
                  app.status === 'Rejected' ? 'bg-rose-500' : 'bg-blue-600'
                } shadow-[0_0_15px_rgba(0,0,0,0.1)]`} />
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">{app.name}</h2>
              </div>
              
              <div className="flex items-center gap-10">
                <div>
                  <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Target Role</div>
                  <div className="font-black text-slate-500 italic text-lg">{app.job_role || 'General'}</div>
                </div>
                
                <div className="h-10 w-[2px] bg-slate-50" />
                
                <div>
                  <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">Status Timeline</div>
                  <div className="flex gap-3">
                    {app.status_history?.map((h, i) => (
                      <div key={i} className="group/dot relative">
                        <div className="w-5 h-5 rounded-full bg-slate-50 border-4 border-white shadow-inner group-hover/dot:bg-blue-600 transition-all cursor-crosshair" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 hidden group-hover/dot:block z-50">
                          <div className="bg-slate-900 text-white text-[10px] font-black p-4 rounded-[1.5rem] whitespace-nowrap shadow-2xl border border-slate-800">
                            <span className="uppercase tracking-widest">{h.status}</span>
                            <div className="text-slate-500 font-bold mt-1 lowercase italic">{format(new Date(h.date), 'MMM dd, yyyy')}</div>
                            {h.salary && <div className="text-emerald-400 mt-2 pt-2 border-t border-slate-700 font-black">OFFER: ${h.salary}</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION AREA */}
            <div className="mt-10 md:mt-0 flex items-center gap-6">
              <div className="relative">
                <select 
                  value={app.status}
                  onChange={(e) => handleStatusUpdate(app, e.target.value)}
                  className="appearance-none bg-slate-50 border-none px-12 py-7 rounded-[3rem] font-black text-[12px] uppercase tracking-[0.15em] text-slate-700 focus:ring-8 focus:ring-blue-50 outline-none cursor-pointer hover:bg-slate-100 transition-all shadow-inner min-w-[200px]"
                >
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offered">Offered</option>
                  <option value="Hired">Hired</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">▼</div>
              </div>
              
              <button className="p-7 bg-slate-900 text-white rounded-[2.5rem] hover:bg-blue-600 transition-all shadow-xl active:scale-90 group">
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* OFFER MODAL */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[200] flex items-center justify-center p-8">
          <div className="bg-white w-full max-w-xl rounded-[5rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden p-16 border-4 border-white">
            <h3 className="text-5xl font-black italic tracking-tighter text-slate-900 mb-4 uppercase">Financial Offer</h3>
            <p className="text-slate-400 font-bold text-sm mb-12 tracking-wide uppercase">Assign monthly compensation for <span className="text-blue-600">{activeApp?.name}</span></p>
            
            <div className="relative mb-12">
              <div className="absolute left-10 top-1/2 -translate-y-1/2 font-black text-slate-200 text-4xl italic">$</div>
              <input 
                type="number"
                autoFocus
                placeholder="0.00"
                value={salaryInput}
                onChange={(e) => setSalaryInput(e.target.value)}
                className="w-full bg-slate-50 rounded-[3rem] py-10 pl-20 pr-10 text-5xl font-black text-slate-900 outline-none focus:ring-8 focus:ring-blue-50 shadow-inner tracking-tighter"
              />
            </div>

            <div className="flex gap-6">
              <button 
                onClick={() => setShowOfferModal(false)}
                className="flex-1 py-7 bg-slate-100 text-slate-400 rounded-[2.5rem] font-black text-[13px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Back
              </button>
              <button 
                onClick={() => executeUpdate(activeApp, 'Offered', { salary: salaryInput })}
                className="flex-[2] py-7 bg-blue-600 text-white rounded-[2.5rem] font-black text-[13px] uppercase tracking-widest shadow-2xl shadow-blue-200 active:scale-95 transition-all"
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