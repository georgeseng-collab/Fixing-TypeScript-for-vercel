// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../db';
import { format } from 'date-fns';

export default function Dashboard() {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal Control
  const [modal, setModal] = useState({ show: false, type: '', app: null });
  const [formData, setFormData] = useState({ salary: '', remarks: '', date: format(new Date(), 'yyyy-MM-dd') });

  const fetchApplicants = async () => {
    setLoading(true);
    const { data } = await supabase.from('applicants').select('*').order('created_at', { ascending: false });
    setApplicants(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchApplicants(); }, []);

  const getCount = (status) => applicants.filter(a => a.status === status).length;

  const handleStatusChange = (app, newStatus) => {
    const needsDetails = ['Offered', 'Blacklisted', 'Rejected', 'Resigned'].includes(newStatus);
    if (needsDetails) {
      setModal({ show: true, type: newStatus, app });
    } else {
      updateApplicantStatus(app, newStatus);
    }
  };

  const updateApplicantStatus = async (app, newStatus, extra = {}) => {
    const timestamp = new Date().toISOString();
    const newEntry = { 
      status: newStatus, 
      date: timestamp, 
      ...extra 
    };

    const updatedHistory = [...(app.status_history || []), newEntry];

    const { error } = await supabase
      .from('applicants')
      .update({ 
        status: newStatus, 
        status_history: updatedHistory 
      })
      .eq('id', app.id);

    if (error) {
      alert("Update Failed: " + error.message);
    } else {
      setModal({ show: false, type: '', app: null });
      setFormData({ salary: '', remarks: '', date: format(new Date(), 'yyyy-MM-dd') });
      fetchApplicants();
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <div className="font-black text-blue-600 text-6xl animate-pulse italic tracking-tighter uppercase">GENIEBOOK</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 pb-40">
      
      {/* STATUS BAR HEADER (NEO-BRUTALIST CARDS) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-20">
        {[
          { label: 'Applied', count: getCount('Applied'), color: 'bg-blue-600' },
          { label: 'Interviewing', count: getCount('Interviewing'), color: 'bg-indigo-600' },
          { label: 'Offered', count: getCount('Offered'), color: 'bg-amber-500' },
          { label: 'Hired', count: getCount('Hired'), color: 'bg-emerald-500' },
          { label: 'Others', count: applicants.length - (getCount('Applied') + getCount('Interviewing') + getCount('Offered') + getCount('Hired')), color: 'bg-slate-900' }
        ].map((stat, i) => (
          <div key={i} className={`${stat.color} p-10 rounded-[3rem] text-white shadow-2xl transition-transform hover:-translate-y-2`}>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">{stat.label}</div>
            <div className="text-5xl font-black italic tracking-tighter">{stat.count}</div>
          </div>
        ))}
      </div>

      {/* CANDIDATE LIST */}
      <div className="space-y-8">
        {applicants.map((app) => (
          <div key={app.id} className="group bg-white p-12 rounded-[4.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col lg:flex-row justify-between lg:items-center gap-10">
            
            <div className="flex-1">
              <div className="flex items-center gap-5 mb-4">
                <div className={`w-4 h-4 rounded-full ${app.status === 'Blacklisted' ? 'bg-black' : 'bg-blue-600'} shadow-lg`} />
                <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">{app.name}</h2>
              </div>
              <div className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] ml-9 mb-8">{app.job_role}</div>
              
              {/* FEATURE ACTIONS (WP, EMAIL, RESUME) */}
              <div className="flex flex-wrap gap-4 ml-9">
                <a href={`https://wa.me/${app.phone}`} target="_blank" className="px-8 py-4 bg-emerald-50 text-emerald-600 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all">WhatsApp</a>
                <a href={`mailto:${app.email}`} className="px-8 py-4 bg-blue-50 text-blue-600 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">Email Address</a>
                {app.resume_metadata?.url && (
                  <a href={app.resume_metadata.url} target="_blank" className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all">View Resume</a>
                )}
              </div>
            </div>

            {/* STATUS DROPDOWN */}
            <div className="px-9 lg:px-0">
               <div className="relative">
                <select 
                  value={app.status}
                  onChange={(e) => handleStatusChange(app, e.target.value)}
                  className="appearance-none bg-slate-50 border-none px-12 py-7 rounded-[3rem] font-black text-[12px] uppercase tracking-[0.15em] text-slate-600 outline-none cursor-pointer hover:bg-slate-100 transition-all min-w-[240px]"
                >
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offered">Offered</option>
                  <option value="Hired">Hired</option>
                  <option value="Rejected">Rejected Offer</option>
                  <option value="Blacklisted">Blacklist</option>
                  <option value="Resigned">Resigned</option>
                </select>
                <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">▼</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* DYNAMIC MODAL (Salary, Remarks, Date) */}
      {modal.show && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[200] flex items-center justify-center p-8">
          <div className="bg-white w-full max-w-xl rounded-[5rem] p-16 shadow-2xl border-4 border-white">
            <h3 className="text-5xl font-black italic uppercase tracking-tighter mb-4">{modal.type}</h3>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mb-12 italic">Updating: {modal.app?.name}</p>
            
            <div className="space-y-8">
              {modal.type === 'Offered' && (
                <div className="relative group">
                  <div className="absolute left-8 top-1/2 -translate-y-1/2 font-black text-slate-200 text-4xl italic group-focus-within:text-blue-600 transition-colors">$</div>
                  <input type="number" autoFocus placeholder="0.00" className="w-full py-10 pl-20 pr-10 bg-slate-50 rounded-[3rem] font-black text-5xl outline-none focus:ring-8 focus:ring-blue-50 shadow-inner" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} />
                </div>
              )}
              
              {modal.type === 'Resigned' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-300 ml-8 tracking-widest">Effective Date</label>
                  <input type="date" className="w-full p-8 bg-slate-50 rounded-[3rem] font-black text-xl outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
              )}

              {['Blacklisted', 'Rejected', 'Resigned'].includes(modal.type) && (
                <textarea placeholder="Enter Remarks..." className="w-full p-10 bg-slate-50 rounded-[3.5rem] font-bold text-lg outline-none shadow-inner h-48 focus:ring-8 focus:ring-blue-50" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
              )}

              <div className="flex gap-6 pt-10">
                <button onClick={() => setModal({show:false})} className="flex-1 py-8 bg-slate-100 text-slate-400 rounded-[2.5rem] font-black uppercase text-[12px] tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                <button 
                  onClick={() => updateApplicantStatus(modal.app, modal.type, { 
                    salary: modal.type === 'Offered' ? formData.salary : null, 
                    remarks: formData.remarks, 
                    date: modal.type === 'Resigned' ? formData.date : new Date().toISOString() 
                  })}
                  className="flex-[2] py-8 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase text-[12px] tracking-widest shadow-2xl active:scale-95 transition-all"
                >
                  Save Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}