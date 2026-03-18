// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../db';

export default function ApprovalHub() {
  const [applicants, setApplicants] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [isSingaporean, setIsSingaporean] = useState(true); 
  const [copyStatus, setCopyStatus] = useState(false);
  
  // Recipient Routing
  const [boss, setBoss] = useState('Alicia');
  const recipients = {
    'Alicia': { email: 'alicia@geniebook.com', name: 'Alicia' },
    'ZhiZhong': { email: 'neo@geniebook.com', name: 'ZhiZhong' }
  };
  const ccEmail = 'merissa.lim@geniebook.com';

  const [details, setDetails] = useState({
    manager: 'Wei Zhi',
    department: 'Sales',
    scheduleKey: "Sales (Fixed)",
    proposedSal: 2700,
    proposedAllowance: 0,
    monthsPaid: 12,
    source: 'Fastjobs',
    joinDate: '6th April 2026',
    probation: '3 months'
  });

  const schedules = {
    "Sales (Fixed)": { days: "3 weekdays + 2 weekends", hours: "Weekdays (Mon - Thurs) : 12.30pm - 8.30pm\nWeekdays (Fri) : 12pm - 9pm\nWeekends (Sat - Sun) : 11am - 9pm" },
    "Curriculum (Teacher 5+1)": { days: "5 Weekdays + 1 Weekend", hours: "Weekdays : 12pm to 9pm\nWeekends : 9am to 6.30pm" },
    "Curriculum (Teacher 4+1)": { days: "4 Weekdays + 1 Weekend", hours: "Weekdays : 12pm to 9pm\nWeekends : 9am to 6.30pm" },
    "Office Standard": { days: "5 Weekdays", hours: "10am to 7pm" }
  };

  useEffect(() => {
    fetchApplicants();
  }, []);

  const fetchApplicants = async () => {
    const { data } = await supabase.from('applicants')
      .select('*')
      .in('status', ['Offered', 'Offer Accepted'])
      .order('name');
    setApplicants(data || []);
  };

  const selectedApp = applicants.find(a => a.id === selectedId);
  const currentSchedule = schedules[details.scheduleKey] || schedules["Sales (Fixed)"];

  // --- CALCULATION LOGIC ---
  const n = (val) => Number(val) || 0;
  
  const currentSal = n(selectedApp?.current_salary);
  const expectedSal = n(selectedApp?.expected_salary);
  const proposedSal = n(details.proposedSal);
  const proposedAllow = n(details.proposedAllowance);
  const months = n(details.monthsPaid);

  const calcAnnual = (sal, allow, m) => (sal + allow) * m;
  const calcInc = (curr, prop) => {
    if (curr === 0) return "0%";
    const diff = ((prop - curr) / curr) * 100;
    return diff >= 0 ? `${diff.toFixed(1)}%` : `Saving ${Math.abs(diff).toFixed(1)}%`;
  };

  const currAnnual = calcAnnual(currentSal, 0, 12);
  const expAnnual = calcAnnual(expectedSal, 0, 12);
  const propAnnual = calcAnnual(proposedSal, proposedAllow, months);

  const handleDispatch = async () => {
    if (!selectedId) return alert("Select candidate first.");
    const emailContent = document.getElementById('approval-content');
    const blob = new Blob([emailContent.innerHTML], { type: "text/html" });
    const data = [new ClipboardItem({ "text/html": blob })];

    try {
      await navigator.clipboard.write(data);
      setCopyStatus(true);
      
      // Update Histories
      await supabase.from('hiring_approval_history').insert([{ applicant_id: selectedApp.id, applicant_name: selectedApp.name }]);
      await supabase.from('salary_approval_history').insert([{ applicant_id: selectedApp.id, applicant_name: selectedApp.name }]);

      const toEmail = recipients[boss].email;
      const subject = `Hiring & Salary Approval Request - ${selectedApp.name}`;
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${toEmail}&cc=${ccEmail}&su=${encodeURIComponent(subject)}`;
      
      window.open(gmailUrl, '_blank');
      setTimeout(() => setCopyStatus(false), 2000);
    } catch (err) { alert("Copy failed."); }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 pb-40">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-10 border-b-8 border-slate-900 pb-8">
        <div>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900">Approval Hub</h1>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setBoss('Alicia')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${boss === 'Alicia' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}>Hi Alicia (Boss)</button>
            <button onClick={() => setBoss('ZhiZhong')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${boss === 'ZhiZhong' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}>Hi ZhiZhong (Boss)</button>
          </div>
        </div>

        <div className="bg-slate-200 p-1.5 rounded-2xl flex gap-1 shadow-inner border border-slate-300">
          <button onClick={() => setIsSingaporean(true)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${isSingaporean ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>Singaporean</button>
          <button onClick={() => setIsSingaporean(false)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!isSingaporean ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>Malaysian</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* INPUT SIDEBAR */}
        <div className="lg:col-span-4 space-y-4 sticky top-24 h-fit bg-white p-8 rounded-[3.5rem] shadow-2xl border-4 border-slate-900">
            <label className={labelClass}>Candidate</label>
            <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm mb-4" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">Select Candidate...</option>
              {applicants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-4">
               <input className="p-4 bg-slate-50 rounded-xl font-bold text-xs" placeholder="Proposed Salary" type="number" value={details.proposedSal} onChange={e => setDetails({...details, proposedSal: e.target.value})} />
               <input className="p-4 bg-slate-50 rounded-xl font-bold text-xs" placeholder="Fixed Allowance" type="number" value={details.proposedAllowance} onChange={e => setDetails({...details, proposedAllowance: e.target.value})} />
            </div>

            <select className="w-full p-4 bg-slate-50 rounded-xl font-bold text-xs" value={details.scheduleKey} onChange={e => setDetails({...details, scheduleKey: e.target.value})}>
              {Object.keys(schedules).map(k => <option key={k} value={k}>{k}</option>)}
            </select>

            <input className="w-full p-4 bg-slate-50 rounded-xl font-bold text-xs" placeholder="Reporting Manager" value={details.manager} onChange={e => setDetails({...details, manager: e.target.value})} />

            <div className="grid grid-cols-2 gap-4">
               <input className="p-4 bg-slate-50 rounded-xl font-bold text-xs" placeholder="Join Date" value={details.joinDate} onChange={e => setDetails({...details, joinDate: e.target.value})} />
               <input className="p-4 bg-slate-50 rounded-xl font-bold text-xs" placeholder="Probation" value={details.probation} onChange={e => setDetails({...details, probation: e.target.value})} />
            </div>

            <button onClick={handleDispatch} className="w-full py-7 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-slate-900 transition-all active:scale-95">
              {copyStatus ? '✅ COPIED TO CLIPBOARD' : '🚀 DISPATCH APPROVAL'}
            </button>
        </div>

        {/* EMAIL PREVIEW (EXACT SCREENSHOT FORMAT) */}
        <div className="lg:col-span-8 bg-white p-16 rounded-[4.5rem] shadow-2xl border border-slate-100 min-h-[1000px]">
          <div id="approval-content" style={{ color: '#000', fontFamily: 'Arial, sans-serif', fontSize: '15px', lineHeight: '1.2' }}>
            <p>Hi {recipients[boss].name},</p>
            <br />
            <p>Please do approve to hire the following candidate as well as reviewing the salary package offered to the <strong>{isSingaporean ? 'Singaporean' : 'Malaysian'}</strong> candidate below.</p>
            <br />
            <p style={{ margin: '0' }}>Name: {selectedApp?.name || 'Candidate Name'}</p>
            <p style={{ margin: '0' }}>Role: {selectedApp?.job_role || 'Position'}</p>
            <p style={{ margin: '0' }}>Source: {details.source}</p>
            <br />
            <p style={{ margin: '0' }}><strong>Working Hours</strong></p>
            <p style={{ margin: '0' }}>Working Days : {currentSchedule.days}</p>
            <br />
            {currentSchedule.hours.split('\n').map((line, i) => (
              <p key={i} style={{ margin: '0' }}>{line}</p>
            ))}
            <br />
            <p><i>You may be required to work outside your stated working hours when the need arises.</i></p>
            <br />
            <p style={{ margin: '0' }}>Join Date: {details.joinDate}</p>
            <p style={{ margin: '0' }}>Probation Period: {details.probation}</p>
            <br />
            <p style={{ margin: '0' }}><strong>Salary Proposal</strong></p>
            <br />
            <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #000' }}>
              <tbody>
                <tr><td style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#D9E2F3', fontWeight: 'bold', width: '30%' }}>Job Department</td><td colSpan="4" style={{ border: '1px solid #000', padding: '10px' }}>{details.department}</td></tr>
                <tr><td style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>Job Title</td><td colSpan="4" style={{ border: '1px solid #000', padding: '10px' }}>{selectedApp?.job_role}</td></tr>
                <tr><td style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>Job Level</td><td colSpan="4" style={{ border: '1px solid #000', padding: '10px' }}></td></tr>
                <tr><td style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>Reporting To</td><td colSpan="4" style={{ border: '1px solid #000', padding: '10px' }}>{details.manager}</td></tr>
                
                <tr style={{ backgroundColor: '#D9E2F3', fontWeight: 'bold', textAlign: 'center' }}>
                  <td style={{ border: '1px solid #000', padding: '10px' }}></td>
                  <td style={{ border: '1px solid #000', padding: '10px' }}>Current</td>
                  <td style={{ border: '1px solid #000', padding: '10px' }}>Expected</td>
                  <td style={{ border: '1px solid #000', padding: '10px' }}>Proposed</td>
                  <td style={{ border: '1px solid #000', padding: '10px' }}>Inc %</td>
                </tr>

                <tr>
                  <td style={{ border: '1px solid #000', padding: '10px' }}>Monthly Basic Salary</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>${currentSal.toLocaleString()}</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>${expectedSal.toLocaleString()}</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>${proposedSal.toLocaleString()}</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>{calcInc(currentSal, proposedSal)}</td>
                </tr>

                <tr>
                  <td style={{ border: '1px solid #000', padding: '10px' }}>Monthly Fixed Allowance</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>$0</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>$0</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>${proposedAllow.toLocaleString()}</td>
                  <td style={{ border: '1px solid #000', padding: '10px' }}></td>
                </tr>

                <tr>
                  <td style={{ border: '1px solid #000', padding: '10px' }}>Months Paid</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>12</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>12</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>{months}</td>
                  <td style={{ border: '1px solid #000', padding: '10px' }}></td>
                </tr>

                <tr style={{ backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>Annual Guaranteed Cash</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>${currAnnual.toLocaleString()}</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>${expAnnual.toLocaleString()}</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>${propAnnual.toLocaleString()}</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>{calcInc(currAnnual, propAnnual)}</td>
                </tr>

                <tr style={{ backgroundColor: '#E2EFDA', fontWeight: 'bold' }}>
                  <td style={{ border: '1px solid #000', padding: '10px' }}>Total Compensation Package</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>${currAnnual.toLocaleString()}</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>${expAnnual.toLocaleString()}</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>${propAnnual.toLocaleString()}</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>N.A</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelClass = "text-[10px] font-black uppercase text-slate-400 ml-4 mb-1 block tracking-widest";