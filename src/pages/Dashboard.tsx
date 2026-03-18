// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../db';
import { format } from 'date-fns';

export default function Dashboard() {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal Logic
  const [modalConfig, setModalConfig] = useState({ show: false, type: '', app: null });
  const [formInput, setFormInput] = useState({ salary: '', remarks: '', date: format(new Date(), 'yyyy-MM-dd') });

  const fetchApplicants = async () => {
    setLoading(true);
    const { data } = await supabase.from('applicants').select('*').order('created_at', { ascending: false });
    setApplicants(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchApplicants(); }, []);

  const getCount = (status) => applicants.filter(a => a.status === status).length;

  const handleStatusChange = (app, newStatus) => {
    if (['Offered', 'Blacklisted', 'Rejected', 'Resigned'].includes(newStatus)) {
      setModalConfig({ show: true, type: newStatus, app });
    } else {
      updateDB(app, newStatus);
    }
  };

  const updateDB = async (app, newStatus, extra = {}) => {
    const newHistory = [...(app.status_history || []), { status: newStatus, date: new Date().toISOString(), ...extra }];
    await supabase.from('applicants').update({ status: newStatus, status_history: newHistory }).eq('id', app.id);
    setModalConfig({ show: false, type: '', app: null });
    setFormInput({ salary: '', remarks: '', date: format(new Date(), 'yyyy-MM-dd') });
    fetchApplicants();
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 text-6xl animate-pulse italic">GENIEBOOK</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 pb-40">
      
      {/* STATUS BAR HEADER */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-16">
        {[
          { label: 'Applied', count: getCount('Applied'), color: 'bg-blue-600' },
          { label: 'Interviewing', count: getCount('Interviewing'), color: 'bg-indigo-600' },
          { label: 'Offered', count: getCount('Offered'), color: 'bg-amber-500' },
          { label: 'Hired', count: getCount('Hired'), color: 'bg-emerald-500' },
          { label: 'Others', count: applicants.length - (getCount('Applied') + getCount('Interviewing') + getCount('Offered') + getCount('Hired')), color: 'bg-slate-400' }
        ].map((stat, i) => (
          <div key={i} className={`${stat.color} p-8 rounded-[2.5rem] text-white shadow-xl`}>
            <div className="text-[10px] font-black uppercase tracking-widest opacity-60">{stat.label}</div>
            <div className="text-4xl font-black italic">{stat.count}</div>
          </div>
        ))}
      </div>

      {/* CANDIDATE CARDS */}
      <div className="space-y-6">
        {applicants.map((app) => (
          <div key={app.id} className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all flex flex-col lg:flex-row justify-between lg:items-center gap-8">
            
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <div className={`w-3 h-3 rounded-full ${app.status === 'Blacklisted' ? 'bg-black' : 'bg-blue-600'}`} />
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">{app.name}</h2>
              </div>
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-7">{app.job_role}</div>
              
              {/* CONTACT & RESUME ACTIONS */}
              <div className="flex gap-3 mt-6 ml-7">
                <a href={`https://wa.me/${app.phone}`} target="_blank" className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all">
                  <span className="font-black text-[10px] uppercase">WhatsApp</span>
                </a>
                <a href={`mailto:${app.email}`} className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all">
                  <span className="font-black text-[10px] uppercase">Email</span>
                </a>
                {app.resume_metadata?.url && (
                  <a href={app.resume_metadata.url} target="_blank" className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 transition-all">
                    <span className="font-black text-[10px] uppercase tracking-widest">View Resume</span>
                  </a>
                )}
              </div>
            </div>

            {/* STATUS DROPDOWN */}
            <div className="flex items-center gap-4">
               <select 
                value={app.status}
                onChange={(e) => handleStatusChange(app, e.target.value)}
                className="bg-slate-50 border-none px-8 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest text-slate-600 outline-none cursor-pointer"
              >
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offered">Offered</option>
                <option value="Hired">Hired</option>
                <option value="Rejected">Rejected Offer</option>
                <option value="Blacklisted">Blacklist</option>
                <option value="Resigned">Resigned</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* DYNAMIC ACTION MODAL */}
      {modalConfig.show && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 shadow-2xl">
            <h3 className="text-4xl font-black italic uppercase mb-2">{modalConfig.type}</h3>
            <p className="text-slate-400 font-bold mb-10 uppercase text-xs tracking-widest">Updating: {modalConfig.app.name}</p>
            
            <div className="space-y-6">
              {modalConfig.type === 'Offered' && (
                <input type="number" placeholder="Offered Monthly Salary ($)" className="w-full p-6 bg-slate-50 rounded-[2rem] font-black text-2xl" value={formInput.salary} onChange={e => setFormInput({...formInput, salary: e.target.value})} />
              )}
              
              {modalConfig.type === 'Resigned' && (
                <input type="date" className="w-full p-6 bg-slate-50 rounded-[2rem] font-black" value={formInput.date} onChange={e => setFormInput({...formInput, date: e.target.value})} />
              )}

              {(modalConfig.type === 'Blacklisted' || modalConfig.type === 'Rejected' || modalConfig.type === 'Resigned') && (
                <textarea placeholder="Enter Remarks/Reason..." className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold h-32" value={formInput.remarks} onChange={e => setFormInput({...formInput, remarks: e.target.value})} />
              )}

              <div className="flex gap-4 pt-4">
                <button onClick={() => setModalConfig({show:false})} className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-[2rem] font-black uppercase text-[11px]">Cancel</button>
                <button 
                  onClick={() => updateDB(modalConfig.app, modalConfig.type, { 
                    salary: formInput.salary, 
                    remarks: formInput.remarks, 
                    resign_date: modalConfig.type === 'Resigned' ? formInput.date : null 
                  })}
                  className="flex-[2] py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-[11px] shadow-xl"
                >
                  Save Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}