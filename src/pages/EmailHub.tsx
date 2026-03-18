// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../db';

export default function EmailHub() {
  const [applicants, setApplicants] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [isFullTimeStaff, setIsFullTimeStaff] = useState(true); 
  const [isSingaporean, setIsSingaporean] = useState(true); 
  
  const schedules = {
    "Sales (Fixed)": { type: 'sales', days: "3 weekdays + 2 weekends", hours: "• Weekdays (Mon - Thurs) : 12.30pm - 8.30pm\n• Weekdays (Fri) : 12pm - 9pm\n• Weekends (Sat - Sun) : 11am - 9pm" },
    "Curriculum (Teacher 5+1)": { type: 'teacher', days: "5 Weekdays + 1 Weekend", hours: "• Weekdays : 12pm to 9pm\n• Weekends : 9am to 6.30pm" },
    "Curriculum (Teacher 3+2)": { type: 'teacher', days: "3 Weekdays + 2 Weekend", hours: "• Weekdays : 12pm to 9pm\n• Weekends : 9am to 6.30pm" },
    "Curriculum (Teacher 4+1)": { type: 'teacher', days: "4 Weekdays + 1 Weekend", hours: "• Weekdays : 12pm to 9pm\n• Weekends : 9am to 6.30pm" },
    "Office Standard": { type: 'office', days: "5 Weekdays", hours: "• 10am to 7pm" },
    "Relationship Executive": { type: 'office', days: "3 weekdays + 2 weekends", hours: "• Weekdays (Mon - Friday) : 12.30pm - 9pm\n• Weekends (Sat - Sun) : 8.30am - 6.30pm" }
  };

  const [details, setDetails] = useState({
    salary: '2700',
    scheduleKey: "Sales (Fixed)",
    joinDate: '2026-04-06',
    probation: '3 Months',
    noticePeriod: '1 Month',
    offerExpiry: '2026-03-20'
  });

  useEffect(() => {
    const fetchApplicants = async () => {
      const { data } = await supabase.from('applicants').select('id, name, email, job_role').order('name');
      setApplicants(data || []);
    };
    fetchApplicants();
  }, []);

  const selectedApp = applicants.find(a => a.id === selectedId);
  const currentSchedule = schedules[details.scheduleKey];
  
  // Logic: Only Sales and Teachers pay training costs
  const showTrainingCost = currentSchedule.type === 'sales' || currentSchedule.type === 'teacher';
  const trainingCostAmount = isSingaporean ? "$2,000" : "$1,000";

  const copyToClipboard = () => {
    const el = document.getElementById('email-content');
    const range = document.createRange();
    range.selectNode(el);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
    alert("Email Content Copied! Ready to paste into Gmail.");
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 pb-40">
      <div className="flex justify-between items-end mb-10 border-b-4 border-slate-900 pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">Offer Generator</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Role-Based Logic Active</p>
        </div>
        
        <div className="flex gap-4">
           <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
              <button onClick={() => setIsFullTimeStaff(true)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase ${isFullTimeStaff ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>Full Time Staff</button>
              <button onClick={() => setIsFullTimeStaff(false)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase ${!isFullTimeStaff ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>Part Time / Contract</button>
           </div>
           <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
              <button onClick={() => setIsSingaporean(true)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase ${isSingaporean ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>Singaporean</button>
              <button onClick={() => setIsSingaporean(false)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase ${!isSingaporean ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>Malaysian</button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 bg-white p-8 rounded-[3rem] shadow-xl space-y-4 h-fit border border-slate-100">
          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-widest">Candidate</label>
            <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-blue-600" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">Choose Candidate...</option>
              {applicants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-widest">Work Schedule</label>
            <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none" value={details.scheduleKey} onChange={e => setDetails({...details, scheduleKey: e.target.value})}>
              {Object.keys(schedules).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input className="p-4 bg-slate-50 rounded-2xl font-bold text-sm" placeholder="Salary" value={details.salary} onChange={e => setDetails({...details, salary: e.target.value})} />
            <input type="date" className="p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={details.joinDate} onChange={e => setDetails({...details, joinDate: e.target.value})} />
          </div>
          <button onClick={copyToClipboard} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-slate-900 transition-all active:scale-95">
             Copy Formatted Email
          </button>
          
          {/* Visual Alert for Training Cost */}
          {showTrainingCost ? (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-[10px] font-bold text-amber-700 text-center">
              ⚠️ Training Cost of {trainingCostAmount} included for this role.
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[10px] font-bold text-slate-400 text-center">
              ℹ️ No training cost for this role.
            </div>
          )}
        </div>

        {/* PREVIEW BOX */}
        <div className="lg:col-span-8 bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100">
          <div id="email-content" style={{ color: '#334155', fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '1.6' }}>
            <p>Dear {selectedApp?.name || '[Candidate Name]'},</p>
            <br />
            <p>Thank you for your time and effort in preparing & attending our interviews.</p>
            <br />
            <p>We are pleased to offer you the role of <strong>{selectedApp?.job_role || 'Outbound Education Consultant'}</strong> with Geniebook Pte Ltd.</p>
            <br />
            <p>Details are as follows :</p>
            
            <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #000', marginTop: '10px' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#D9E2F3', fontWeight: 'bold', width: '35%' }}>Monthly Salary</td>
                  <td style={{ border: '1px solid #000', padding: '12px' }}>${details.salary}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>Work Days</td>
                  <td style={{ border: '1px solid #000', padding: '12px' }}>
                    {currentSchedule.days}
                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#475569' }}>
                      {currentSchedule.hours.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>Join Date</td>
                  <td style={{ border: '1px solid #000', padding: '12px' }}>{details.joinDate}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>Probation Period</td>
                  <td style={{ border: '1px solid #000', padding: '12px' }}>{details.probation}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>Notice Period</td>
                  <td style={{ border: '1px solid #000', padding: '12px' }}>{details.noticePeriod}</td>
                </tr>
              </tbody>
            </table>

            <br />
            {isFullTimeStaff && (
              <>
                <p style={{ color: '#E11D48', fontWeight: 'bold', fontStyle: 'italic', margin: '0' }}>&lt;ONLY APPLIES TO SINGAPORE FULL TIME STAFF BENEFIT&gt;</p>
                <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
                  <li>15 day's annual leave, with one additional day for every year of service, up to max 21 days</li>
                  <li>1 Day Birthday Off on birthday month</li>
                  <li>60 days Hospitalisation Leave inclusive of 14 day's Medical Leave</li>
                  <li>Group Hospital & Surgical Insurance</li>
                  <li>Group Outpatient</li>
                  <li>Laptop + Company T-Shirt/s</li>
                </ul>
              </>
            )}

            <p style={{ marginTop: '20px' }}>In addition, here is a checklist of documents I would require from you...</p>
            
            {/* TRAINING COST LOGIC: Only shows if Teacher or Sales */}
            {showTrainingCost && (
              <p>Feel free to let me know if you have any queries and notify me once you have submitted all the documents. <strong>Do take note that you will be required to pay for training costs of {trainingCostAmount} if you resign within 3 months or are terminated due to misconduct.</strong></p>
            )}

            <br />
            <p>Lastly, we would appreciate it if you could consider our offer latest by <strong>{details.offerExpiry}</strong>.</p>
            <br />
            <p>Meanwhile, I am extremely excited for you to be part of this team!</p>
            <br />
            <p>Thank you,</p>
          </div>
        </div>
      </div>
    </div>
  );
}