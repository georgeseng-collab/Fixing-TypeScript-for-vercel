// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../db';

export default function EmailHub() {
  const [applicants, setApplicants] = useState([]);
  const [history, setHistory] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]); // Added for CC
  const [selectedId, setSelectedId] = useState('');
  const [selectedCC, setSelectedCC] = useState([]); // Added for CC
  const [isFullTimeStaff, setIsFullTimeStaff] = useState(true); 
  const [isSingaporean, setIsSingaporean] = useState(true); 
  const [copyStatus, setCopyStatus] = useState(false);
  
  const [details, setDetails] = useState({
    salary: '3000',
    scheduleKey: "Sales (Fixed)",
    joinDate: '2026-04-06',
    probation: '3 Months',
    noticePeriod: '1 day (Sales)',
    offerExpiry: '2026-03-20'
  });

  const schedules = {
    "Sales (Fixed)": { type: 'sales', days: "3 weekdays + 2 weekends", hours: "• Weekdays (Mon - Thurs) : 12.30pm - 8.30pm\n• Weekdays (Fri) : 12pm - 9pm\n• Weekends (Sat - Sun) : 11am - 9pm" },
    "Curriculum (Teacher 5+1)": { type: 'teacher', days: "5 Weekdays + 1 Weekend", hours: "• Weekdays : 12pm to 9pm\n• Weekends : 9am to 6.30pm" },
    "Curriculum (Teacher 4+1)": { type: 'teacher', days: "4 Weekdays + 1 Weekend", hours: "• Weekdays : 12pm to 9pm\n• Weekends : 9am to 6.30pm" },
    "Curriculum (Teacher 3+2)": { type: 'teacher', days: "3 Weekdays + 2 Weekend", hours: "• Weekdays : 12pm to 9pm\n• Weekends : 9am to 6.30pm" },
    "Office Standard": { type: 'office', days: "5 Weekdays", hours: "• 10am to 7pm" },
    "Relationship Executive": { type: 'office', days: "3 weekdays + 2 weekends", hours: "• Weekdays (Mon - Friday) : 12.30pm - 9pm\n• Weekends (Sat - Sun) : 8.30am - 6.30pm" }
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: apps } = await supabase.from('applicants')
      .select('id, name, email, job_role, current_salary, expected_salary, offered_salary')
      .in('status', ['Offered', 'Offer Accepted'])
      .order('name');
    
    const { data: hist } = await supabase.from('offer_history')
      .select('*')
      .order('sent_at', { ascending: false });

    // Fetch Team for CC functionality
    const { data: team } = await supabase.from('team_members').select('name, email').order('name');

    setApplicants(apps || []);
    setHistory(hist || []);
    setTeamMembers(team || []);
  };

  const handleCandidateChange = (id) => {
    setSelectedId(id);
    const app = applicants.find(a => a.id === id);
    if (app) {
      const initialSalary = app.offered_salary || app.expected_salary || '3000';
      setDetails(prev => ({...prev, salary: initialSalary}));
    }
  };

  const toggleCC = (email) => {
    setSelectedCC(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const selectedApp = applicants.find(a => a.id === selectedId);
  const currentSchedule = schedules[details.scheduleKey];
  const trainingCostAmount = isSingaporean ? "$2,000" : "$1,000";
  const showTrainingCost = currentSchedule.type === 'sales' || currentSchedule.type === 'teacher';

  const handleDispatch = async () => {
    if (!selectedId) return alert("Select candidate first.");
    const emailContent = document.getElementById('email-content');
    const blob = new Blob([emailContent.innerHTML], { type: "text/html" });
    const data = [new ClipboardItem({ "text/html": blob })];

    try {
      await navigator.clipboard.write(data);
      setCopyStatus(true);

      await supabase.from('offer_history').insert([{
        applicant_id: selectedApp.id,
        applicant_name: selectedApp.name,
        role: selectedApp.job_role,
        salary: details.salary 
      }]);

      const subject = `Congratulations_Offered (${selectedApp?.job_role}) _ ${selectedApp?.name}`;
      
      // Construct CC query parameter
      const ccParam = selectedCC.length > 0 ? `&cc=${encodeURIComponent(selectedCC.join(','))}` : '';
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${selectedApp?.email}${ccParam}&su=${encodeURIComponent(subject)}`;
      
      window.open(gmailUrl, '_blank');
      fetchData();
      setTimeout(() => setCopyStatus(false), 2000);
    } catch (err) { alert("Copy failed."); }
  };

  const deleteHistory = async (id) => {
    if (window.confirm("Delete record?")) {
      await supabase.from('offer_history').delete().eq('id', id);
      fetchData();
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-10 pb-40 text-slate-900">
      <div className="flex justify-between items-end mb-12 border-b-[10px] border-slate-900 pb-10">
        <h1 className="text-7xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Offer Hub</h1>
        <div className="flex gap-4">
           <div className="bg-slate-200 p-2 rounded-3xl flex gap-1 shadow-inner">
              <button onClick={() => setIsFullTimeStaff(true)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${isFullTimeStaff ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Full Time</button>
              <button onClick={() => setIsFullTimeStaff(false)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase ${!isFullTimeStaff ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Part Time</button>
           </div>
           <div className="bg-slate-900 p-2 rounded-3xl flex gap-1 shadow-2xl">
              <button onClick={() => setIsSingaporean(true)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${isSingaporean ? 'bg-white text-emerald-600 shadow-xl' : 'text-slate-500'}`}>Singaporean</button>
              <button onClick={() => setIsSingaporean(false)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${!isSingaporean ? 'bg-white text-emerald-600 shadow-xl' : 'text-slate-500'}`}>Malaysian</button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-10 rounded-[4rem] shadow-2xl border-4 border-slate-900 space-y-5">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className={labelClass}>Candidate</label>
                <select className={selectClass} value={selectedId} onChange={e => handleCandidateChange(e.target.value)}>
                  <option value="">Choose Candidate...</option>
                  {applicants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                {selectedApp && (
                  <div className="flex gap-4 ml-4 mt-2">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Expected: ${selectedApp.expected_salary}</p>
                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest italic underline">Confirmed: ${selectedApp.offered_salary || 'NONE'}</p>
                  </div>
                )}
              </div>

              {/* Added CC Selector in Sidebar */}
              <div className="space-y-1 p-4 bg-slate-50 rounded-3xl border-2 border-slate-100">
                <label className="text-[9px] font-black uppercase text-slate-400 italic block mb-2 tracking-widest">CC Team Members</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto no-scrollbar">
                  {teamMembers.map(m => (
                    <button
                      key={m.email}
                      onClick={() => toggleCC(m.email)}
                      className={`px-3 py-2 rounded-xl border-2 text-[9px] font-black uppercase transition-all ${
                        selectedCC.includes(m.email) 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                          : 'bg-white text-slate-400 border-slate-200'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>Monthly Salary ($)</label>
                  <input className={`${inputClass} bg-blue-50 focus:bg-white text-blue-700`} value={details.salary} onChange={e => setDetails({...details, salary: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Join Date</label>
                  <input type="date" className={inputClass} value={details.joinDate} onChange={e => setDetails({...details, joinDate: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className={labelClass}>Working Hours Schedule</label>
                <select className={selectClass} value={details.scheduleKey} onChange={e => setDetails({...details, scheduleKey: e.target.value})}>
                  {Object.keys(schedules).map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>Notice Period</label>
                  <input className={inputClass} value={details.noticePeriod} onChange={e => setDetails({...details, noticePeriod: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Offer Expiry</label>
                  <input type="date" className={inputClass} value={details.offerExpiry} onChange={e => setDetails({...details, offerExpiry: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className={labelClass}>Probation</label>
                <input className={inputClass} value={details.probation} onChange={e => setDetails({...details, probation: e.target.value})} />
              </div>
            </div>

            <button onClick={handleDispatch} className={`w-full py-8 text-white rounded-[2.5rem] font-black uppercase text-sm tracking-[0.3em] shadow-2xl transition-all active:scale-95 ${copyStatus ? 'bg-emerald-500' : 'bg-red-600 hover:bg-slate-900'}`}>
              {copyStatus ? '✅ COPIED & OPENED' : '🚀 DISPATCH OFFER'}
            </button>
          </div>

          <div className="bg-slate-900 rounded-[3rem] p-10 text-white min-h-[300px]">
             <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-6">Dispatch History</h3>
             <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
               {history.map(h => (
                 <div key={h.id} className="group bg-slate-800/50 p-5 rounded-2xl flex justify-between items-center border border-transparent hover:border-slate-700 transition-all">
                   <div>
                     <p className="font-black text-[11px] uppercase tracking-tight">{h.applicant_name}</p>
                     <p className="text-[9px] font-bold text-slate-500 mt-1">${h.salary} • {new Date(h.sent_at).toLocaleDateString()}</p>
                   </div>
                   <button onClick={() => deleteHistory(h.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-500">✕</button>
                 </div>
               ))}
             </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white p-20 rounded-[5rem] shadow-2xl border border-slate-100 min-h-[1000px]">
          <div id="email-content" style={{ color: '#000', fontFamily: 'Arial, sans-serif', fontSize: '15px', lineHeight: '1.4' }}>
              <p>Dear {selectedApp?.name || 'Candidate'},</p>
              <br />
              <p>Thank you for your time and effort in preparing & attending our interviews.</p>
              <br />
              <p>We are pleased to offer you the role of <strong>{selectedApp?.job_role || 'Position'}</strong> with Geniebook Pte Ltd.</p>
              <br />
              <p>Details are as follows :</p>
              <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #000', marginTop: '10px' }}>
                <tbody>
                  <tr><td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#D9E2F3', fontWeight: 'bold', width: '35%' }}>Monthly Salary</td><td style={{ border: '1px solid #000', padding: '12px' }}>${details.salary}</td></tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>Work Days</td>
                    <td style={{ border: '1px solid #000', padding: '12px' }}>
                      {currentSchedule.days}
                      <div style={{ marginTop: '8px', fontSize: '14px' }}>
                        {currentSchedule.hours.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                      </div>
                    </td>
                  </tr>
                  <tr><td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>Join Date</td><td style={{ border: '1px solid #000', padding: '12px' }}>{details.joinDate}</td></tr>
                  <tr><td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>Probation Period</td><td style={{ border: '1px solid #000', padding: '12px' }}>{details.probation}</td></tr>
                  <tr><td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>Notice Period</td><td style={{ border: '1px solid #000', padding: '12px' }}>{details.noticePeriod}</td></tr>
                </tbody>
              </table>
              <br />
              {isFullTimeStaff && (
                <div style={{ color: 'red', fontWeight: 'bold', fontStyle: 'italic' }}>
                  &lt;ONLY APPLIES TO SINGAPORE FULL TIME STAFF&gt;
                  <ul style={{ color: 'black', fontStyle: 'normal', fontWeight: 'normal', paddingLeft: '20px', marginTop: '5px' }}>
                    <li>15 day's annual leave, with one additional day for every year of service, up to max 21 days</li>
                    <li>1 Day Birthday Off on birthday month</li>
                    <li>60 days Hospitalisation Leave inclusive of 14 day's Medical Leave</li>
                    <li>Group Hospital & Surgical Insurance</li>
                    <li>Group Outpatient</li>
                    <li>Laptop + Company T-Shirt/s</li>
                  </ul>
                </div>
              )}
              <p style={{ marginTop: '20px' }}>In addition,</p>
              <p>Here is a checklist of documents I would require from you in the meantime, to submit for the generation of the Employment Contract.</p>
              <br />
              <p>Please save the files in the format of <span style={{ backgroundColor: '#00FF00', fontWeight: 'bold' }}>(Document Name) followed by (Name - As Per in NRIC) - do not consolidate:</span></p>
              <ol style={{ paddingLeft: '25px', marginTop: '10px' }}>
                <li><span style={{ backgroundColor: '#FFF2CC' }}>Attached</span> GB Personal Details Form - <i>Name as per NRIC</i></li>
                <li><span style={{ backgroundColor: '#FFF2CC' }}>Attached</span> Conflict of Interest Policy Form - <i>Name as per NRIC</i></li>
                <li><span style={{ backgroundColor: '#FFF2CC' }}>Attached</span> Declaration of Interest Form - <i>Name as per NRIC</i></li>
                <li>Identity Card (Front & Back) - <i>Name as per NRIC</i></li>
                <li>Deed Poll if your name has been changed before - <i>Name as per NRIC</i></li>
                <li>Last 3 months payslip, or <span style={{ backgroundColor: '#FFFF00', fontWeight: 'bold' }}>CPF/EPF</span> contribution during the service period if payslip not available - <i>Name as per NRIC</i></li>
                <li>Highest Qualification (Certificate) - <i>Name as per NRIC</i></li>
                <li>Birth certificate of Child (if any) - <i>Name as per NRIC</i></li>
                <li>Covid-19 Vaccination Report - <i>Name as per NRIC</i></li>
                <li>Any Bank Account document with Bank Account Name/Logo, Account Number, and your Name (For Payroll Purpose) - <i>Name as per NRIC</i></li>
              </ol>
              <br />
              <p>Feel free to let me know if you have any queries and notify me once you have submitted all the documents. {showTrainingCost && <span>Do take note that you will be required to pay for training costs of <strong>{trainingCostAmount}</strong> if you resign within 3 months or are terminated due to misconduct.</span>}</p>
              <br />
              <p>Lastly, we would appreciate it if you could consider our offer and acknowledge this email as a form of acceptance of the offer <strong>latest by {details.offerExpiry}</strong>.</p>
              <br />
              <p>Meanwhile, I am extremely excited for you to be part of this team!</p>
              <br />
              <p style={{ color: 'red', fontWeight: 'bold' }}>PS. Please take note that all matters relating to salary are confidential and should not be shared or communicated with non-authorised people.</p>
           </div>
        </div>
      </div>
    </div>
  );
}

const inputClass = "w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs border-2 border-transparent focus:border-blue-600 outline-none transition-all shadow-inner";
const selectClass = "w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs border-2 border-transparent focus:border-blue-600 outline-none cursor-pointer";
const labelClass = "text-[10px] font-black uppercase text-slate-400 ml-4 mb-1 block tracking-[0.2em]";