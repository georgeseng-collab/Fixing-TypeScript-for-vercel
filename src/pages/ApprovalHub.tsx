// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../db';

export default function ApprovalHub() {
  const [applicants, setApplicants] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [isSingaporean, setIsSingaporean] = useState(true); 
  const [copyStatus, setCopyStatus] = useState(false);
  
  const [boss, setBoss] = useState('Alicia');
  const recipients = {
    'Alicia': { email: 'alicia@geniebook.com', name: 'Alicia' },
    'ZhiZhong': { email: 'neo@geniebook.com', name: 'ZhiZhong' }
  };
  const ccEmail = 'merissa.lim@geniebook.com';

  const schedules = {
    "Sales (Fixed)": { days: "3 weekdays + 2 weekends", hours: "Weekdays (Mon - Thurs) : 12.30pm - 8.30pm\nWeekdays (Fri) : 12pm - 9pm\nWeekends (Sat - Sun) : 11am - 9pm" },
    "Curriculum (Teacher 5+1)": { days: "5 Weekdays + 1 Weekend", hours: "Weekdays : 12pm to 9pm\nWeekends : 9am to 6.30pm" },
    "Curriculum (Teacher 3+2)": { days: "3 Weekdays + 2 Weekend", hours: "Weekdays : 12pm to 9pm\nWeekends : 9am to 6.30pm" },
    "Curriculum (Teacher 4+1)": { days: "4 Weekdays + 1 Weekend", hours: "Weekdays : 12pm to 9pm\nWeekends : 9am to 6.30pm" },
    "Office Standard": { days: "5 Weekdays", hours: "10am to 7pm" },
    "Relationship Executive": { days: "3 weekdays + 2 weekends", hours: "Weekdays (Mon - Friday) : 12.30pm - 9pm\nWeekends (Sat - Sun) : 8.30am - 6.30pm" }
  };

  const [details, setDetails] = useState({
    manager: 'Wei Zhi',
    department: 'Sales',
    scheduleKey: "Sales (Fixed)",
    proposedSal: '2700',
    source: 'Fastjobs',
    joinDate: '6th April 2026',
    probation: '3 months'
  });

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
  const currentSchedule = schedules[details.scheduleKey];

  const handleDispatch = async () => {
    if (!selectedId) return alert("Select candidate first.");
    const emailContent = document.getElementById('approval-content');
    const blob = new Blob([emailContent.innerHTML], { type: "text/html" });
    const data = [new ClipboardItem({ "text/html": blob })];

    try {
      await navigator.clipboard.write(data);
      setCopyStatus(true);

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
      <div className="flex justify-between items-center mb-10 border-b-8 border-slate-900 pb-8">
        <div>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter">Approval Hub</h1>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setBoss('Alicia')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${boss === 'Alicia' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>Hi Alicia</button>
            <button onClick={() => setBoss('ZhiZhong')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${boss === 'ZhiZhong' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>Hi ZhiZhong</button>
          </div>
        </div>

        <div className="bg-slate-200 p-1.5 rounded-2xl flex gap-1 shadow-inner">
          <button onClick={() => setIsSingaporean(true)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${isSingaporean ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>Singaporean</button>
          <button onClick={() => setIsSingaporean(false)} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!isSingaporean ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>Malaysian</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-4 sticky top-24 h-fit">
          <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border-4 border-slate-900 space-y-4">
            <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">Choose Candidate...</option>
              {applicants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>

            <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs" value={details.department} onChange={e => setDetails({...details, department: e.target.value})}>
              <option value="Sales">Sales</option>
              <option value="Curriculum">Curriculum</option>
              <option value="Customer Success">Customer Success</option>
              <option value="Marketing">Marketing</option>
              <option value="Tech">Tech</option>
              <option value="HR">HR</option>
            </select>

            <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs" value={details.scheduleKey} onChange={e => setDetails({...details, scheduleKey: e.target.value})}>
              {Object.keys(schedules).map(k => <option key={k} value={k}>{k}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <input className="p-4 bg-slate-50 rounded-xl font-bold text-xs" placeholder="Reporting Manager" value={details.manager} onChange={e => setDetails({...details, manager: e.target.value})} />
              <input className="p-4 bg-slate-50 rounded-xl font-bold text-xs" placeholder="Proposed Sal" value={details.proposedSal} onChange={e => setDetails({...details, proposedSal: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input className="p-4 bg-slate-50 rounded-xl font-bold text-xs" placeholder="Join Date" value={details.joinDate} onChange={e => setDetails({...details, joinDate: e.target.value})} />
              <input className="p-4 bg-slate-50 rounded-xl font-bold text-xs" placeholder="Probation" value={details.probation} onChange={e => setDetails({...details, probation: e.target.value})} />
            </div>

            <button onClick={handleDispatch} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-slate-900 transition-all">
              {copyStatus ? '✅ COPIED' : '🚀 DISPATCH'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white p-16 rounded-[4.5rem] shadow-2xl border border-slate-100 min-h-[800px]">
          <div id="approval-content" style={{ color: '#000', fontFamily: 'Arial, sans-serif', fontSize: '15px', lineHeight: '1.4' }}>
            <p>Hi {recipients[boss].name},</p>
            <br />
            <p>Please do approve to hire the following candidate as well as reviewing the salary package offered to the <strong>{isSingaporean ? 'Singaporean' : 'Malaysian'}</strong> candidate below.</p>
            <br />
            <p><strong>Name:</strong> {selectedApp?.name || 'Parvin Paramananthan'}</p>
            <p><strong>Role:</strong> {selectedApp?.job_role || 'Outbound Education Consultant'}</p>
            <p><strong>Source:</strong> {details.source}</p>
            <br />
            <p><strong><u>Working Hours</u></strong></p>
            <p style={{ margin: '0' }}>Working Days : {currentSchedule.days}</p>
            <br />
            <div style={{ paddingLeft: '0px' }}>
              {currentSchedule.hours.split('\n').map((line, i) => <p key={i} style={{ margin: '0' }}>{line}</p>)}
            </div>
            <br />
            <p><i>You may be required to work outside your stated working hours when the need arises.</i></p>
            <br />
            <p><strong>Join Date:</strong> {details.joinDate}</p>
            <p><strong>Probation Period:</strong> {details.probation}</p>
            <br />
            <p><strong><u>Salary Proposal</u></strong></p>
            
            <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #000' }}>
              <tbody>
                <tr><td style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#D9E2F3', fontWeight: 'bold', width: '30%' }}>Job Department</td><td colSpan="4" style={{ border: '1px solid #000', padding: '10px' }}>{details.department}</td></tr>
                <tr><td style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>Job Title</td><td colSpan="4" style={{ border: '1px solid #000', padding: '10px' }}>{selectedApp?.job_role || 'Outbound Education Consultant'}</td></tr>
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
                  <td style={{ border: '1px solid #000', padding: '10px' }}>CAMPUS (Hourly Rate)</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>${selectedApp?.current_salary || '0'}</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>${selectedApp?.expected_salary || '0'}</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right' }}>${details.proposedSal}</td>
                  <td style={{ border: '1px solid #000', padding: '10px' }}></td>
                </tr>
                {/* ... existing table rows ... */}
                <tr style={{ backgroundColor: '#E2EFDA' }}>
                  <td style={{ border: '1px solid #000', padding: '10px', fontWeight: 'bold' }}>Total Compensation Package</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>$0</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>$0</td>
                  <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>$0</td>
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