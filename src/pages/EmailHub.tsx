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
    noticePeriod: '1 month',
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
  const showTrainingCost = currentSchedule.type === 'sales' || currentSchedule.type === 'teacher';
  const trainingCostAmount = isSingaporean ? "$2,000" : "$1,000";

  const handleGmailDispatch = async () => {
    if (!selectedApp) return alert("Please select a candidate first.");

    const el = document.getElementById('email-content');
    const range = document.createRange();
    range.selectNode(el);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();

    const role = selectedApp.job_role || 'Outbound Education Consultant';
    const name = selectedApp.name || 'Candidate';
    const subject = `Congratulations_Offered (${role}) _ ${name}`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${selectedApp.email}&su=${encodeURIComponent(subject)}`;
    
    await supabase.from('applicants').update({ status: 'Offered' }).eq('id', selectedApp.id);
    window.open(gmailUrl, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 pb-40">
      <div className="flex justify-between items-center mb-10 border-b-8 border-slate-900 pb-8">
        <h1 className="text-5xl font-black uppercase italic tracking-tighter">Offer Hub</h1>
        <div className="flex gap-4">
           <div className="bg-slate-200 p-1 rounded-2xl flex gap-1">
              <button onClick={() => setIsFullTimeStaff(true)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase ${isFullTimeStaff ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>Full Time</button>
              <button onClick={() => setIsFullTimeStaff(false)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase ${!isFullTimeStaff ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>Part Time</button>
           </div>
           <div className="bg-slate-200 p-1 rounded-2xl flex gap-1">
              <button onClick={() => setIsSingaporean(true)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase ${isSingaporean ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>Singaporean</button>
              <button onClick={() => setIsSingaporean(false)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase ${!isSingaporean ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>Malaysian</button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-4 sticky top-24 h-fit">
          <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border-4 border-slate-900 space-y-6">
            <select className="w-full p-5 bg-slate-50 rounded-[1.5rem] font-bold outline-none" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">Select Candidate...</option>
              {applicants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            
            <div className="grid grid-cols-2 gap-4">
              <input className="p-5 bg-slate-50 rounded-[1.5rem] font-bold text-sm" placeholder="Salary" value={details.salary} onChange={e => setDetails({...details, salary: e.target.value})} />
              <input type="date" className="p-5 bg-slate-50 rounded-[1.5rem] font-bold text-sm" value={details.joinDate} onChange={e => setDetails({...details, joinDate: e.target.value})} />
            </div>

            <select className="w-full p-5 bg-slate-50 rounded-[1.5rem] font-bold outline-none" value={details.scheduleKey} onChange={e => setDetails({...details, scheduleKey: e.target.value})}>
              {Object.keys(schedules).map(k => <option key={k} value={k}>{k}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-4">
              <input className="p-5 bg-slate-50 rounded-[1.5rem] font-bold text-sm" placeholder="Notice" value={details.noticePeriod} onChange={e => setDetails({...details, noticePeriod: e.target.value})} />
              <input type="date" className="p-5 bg-slate-50 rounded-[1.5rem] font-bold text-sm" value={details.offerExpiry} onChange={e => setDetails({...details, offerExpiry: e.target.value})} />
            </div>

            <button onClick={handleGmailDispatch} className="w-full py-8 bg-red-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-slate-900 transition-all active:scale-95">
              <span>🚀 DISPATCH TO GMAIL</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white p-16 rounded-[4.5rem] shadow-2xl border border-slate-100">
          <div id="email-content" style={{ color: '#000', fontFamily: 'Arial, sans-serif', fontSize: '15px', lineHeight: '1.4' }}>
            <p>Dear {selectedApp?.name || 'Miko'},</p>
            <br />
            <p>Thank you for your time and effort in preparing & attending our interviews.</p>
            <br />
            <p>We are pleased to offer you the role of <strong>{selectedApp?.job_role || 'Outbound Education Consultant'}</strong> with Geniebook Pte Ltd.</p>
            <br />
            <p>Details are as follows :</p>
            
            <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #000', marginTop: '10px' }}>
              <tbody>
                <tr><td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#D9E2F3', fontWeight: 'bold', width: '35%' }}>Monthly Salary</td><td style={{ border: '1px solid #000', padding: '12px' }}>${details.salary}</td></tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>Work Days</td>
                  <td style={{ border: '1px solid #000', padding: '12px' }}>
                    {currentSchedule.days}
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                      {currentSchedule.hours.split('\n').map((line, i) => <li key={i} style={{ fontStyle: 'italic' }}>{line.replace('• ', '')}</li>)}
                    </ul>
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
                <ul style={{ color: 'black', fontStyle: 'normal', fontWeight: 'normal', paddingLeft: '20px' }}>
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