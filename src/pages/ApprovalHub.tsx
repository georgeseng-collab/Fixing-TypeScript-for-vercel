// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../db';

export default function ApprovalHub() {
  const [applicants, setApplicants] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [copyStatus, setCopyStatus] = useState(false);
  
  // Recipient Logic
  const [boss, setBoss] = useState('Alicia');
  const recipients = {
    'Alicia': { email: 'alicia@geniebook.com', name: 'Alicia' },
    'ZhiZhong': { email: 'neo@geniebook.com', name: 'ZhiZhong' }
  };
  const ccEmail = 'merissa.lim@geniebook.com';

  const [details, setDetails] = useState({
    manager: 'Wei Zhi',
    department: 'Sales',
    currentSal: '0',
    expectedSal: '0',
    proposedSal: '2700',
    source: 'Fastjobs',
    joinDate: '2026-04-06',
    probation: '3 months'
  });

  const departments = ["Sales", "Curriculum", "Customer Success", "Marketing", "Tech", "HR"];

  useEffect(() => {
    fetchApplicants();
  }, []);

  const fetchApplicants = async () => {
    const { data } = await supabase.from('applicants')
      .select('*')
      .in('status', ['Offer Accepted', 'Offered'])
      .order('name');
    setApplicants(data || []);
  };

  const selectedApp = applicants.find(a => a.id === selectedId);

  const handleDispatch = async () => {
    if (!selectedId) return alert("Select candidate first.");
    
    // 1. Copy Rich Text to Clipboard
    const emailContent = document.getElementById('approval-content');
    const blob = new Blob([emailContent.innerHTML], { type: "text/html" });
    const data = [new ClipboardItem({ "text/html": blob })];

    try {
      await navigator.clipboard.write(data);
      setCopyStatus(true);

      // 2. Log History
      await supabase.from('hiring_approval_history').insert([{ applicant_id: selectedApp.id, applicant_name: selectedApp.name }]);
      await supabase.from('salary_approval_history').insert([{ applicant_id: selectedApp.id, applicant_name: selectedApp.name }]);

      // 3. Construct Gmail URL with CC
      const role = selectedApp?.job_role || 'Outbound Education Consultant';
      const subject = `Hiring & Salary Approval Request - ${selectedApp.name} (${role})`;
      const toEmail = recipients[boss].email;
      
      // Gmail URL supports CC via '&cc=' parameter
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${toEmail}&cc=${ccEmail}&su=${encodeURIComponent(subject)}`;
      
      window.open(gmailUrl, '_blank');
      setTimeout(() => setCopyStatus(false), 2000);
    } catch (err) { 
      alert("Rich text copy failed. Manual copy-paste required."); 
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 pb-40 font-sans">
      <div className="flex justify-between items-center mb-10 border-b-8 border-slate-900 pb-8">
        <div>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter">Approval Hub</h1>
          <p className="text-blue-600 font-bold text-[10px] tracking-widest mt-2 uppercase">Internal Hiring & Salary Proposals</p>
        </div>

        {/* RECIPIENT SELECTOR */}
        <div className="bg-slate-200 p-1.5 rounded-2xl flex gap-1 shadow-inner">
          {Object.keys(recipients).map((r) => (
            <button 
              key={r}
              onClick={() => setBoss(r)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${boss === r ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
            >
              Hi {recipients[r].name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* INPUTS */}
        <div className="lg:col-span-4 space-y-4 sticky top-24 h-fit">
          <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border-4 border-slate-900 space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Candidate (Offered Status Only)</label>
              <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold shadow-inner outline-none focus:ring-2 ring-blue-500" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
                <option value="">Choose Candidate...</option>
                {applicants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Department</label>
                <select className="w-full p-4 bg-slate-50 rounded-xl font-bold text-xs shadow-inner outline-none" value={details.department} onChange={e => setDetails({...details, department: e.target.value})}>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Reporting Manager</label>
                <input className="w-full p-4 bg-slate-50 rounded-xl font-bold text-xs shadow-inner" value={details.manager} onChange={e => setDetails({...details, manager: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Current</label>
                <input className="w-full p-4 bg-slate-50 rounded-xl font-bold text-xs shadow-inner" value={details.currentSal} onChange={e => setDetails({...details, currentSal: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Expected</label>
                <input className="w-full p-4 bg-slate-50 rounded-xl font-bold text-xs shadow-inner" value={details.expectedSal} onChange={e => setDetails({...details, expectedSal: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Proposed</label>
                <input className="w-full p-4 bg-slate-50 rounded-xl font-bold text-xs shadow-inner" value={details.proposedSal} onChange={e => setDetails({...details, proposedSal: e.target.value})} />
              </div>
            </div>

            <button onClick={handleDispatch} className={`w-full py-7 text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 ${copyStatus ? 'bg-emerald-500 shadow-emerald-200' : 'bg-blue-600 shadow-blue-200'}`}>
              {copyStatus ? '✅ COPIED & OPENING GMAIL' : '🚀 DISPATCH APPROVAL'}
            </button>
            <p className="text-[8px] text-center text-slate-400 font-bold uppercase italic">Automatically CC's Merissa Lim</p>
          </div>
        </div>

        {/* PREVIEW */}
        <div className="lg:col-span-8 bg-white p-16 rounded-[4.5rem] shadow-2xl border border-slate-100 min-h-[600px]">
          <div id="approval-content" style={{ color: '#000', fontFamily: 'Arial, sans-serif', fontSize: '15px', lineHeight: '1.4' }}>
            <p>Hi {recipients[boss].name},</p>
            <br />
            <p>Please do approve to hire the following candidate as well as reviewing the salary package offered to the <strong>{selectedApp?.job_role?.includes('Malaysian') ? 'Malaysian' : 'Singaporean'}</strong> candidate below.</p>
            <br />
            <p><strong>Name:</strong> {selectedApp?.name || '[Candidate Name]'}</p>
            <p><strong>Role:</strong> {selectedApp?.job_role || '[Job Title]'}</p>
            <p><strong>Source:</strong> {details.source}</p>
            <p><strong><u>Working Hours</u></strong></p>
            <p style={{ margin: '0' }}>Working Days : 3 weekdays + 2 weekends</p>
            <ul style={{ margin: '5px 0', paddingLeft: '40px' }}>
              <li>Weekdays (Mon - Thurs) : 12.30pm - 8.30pm</li>
              <li>Weekdays (Fri) : 12pm - 9pm</li>
              <li>Weekends (Sat - Sun) : 11am - 9pm</li>
            </ul>
            <p><i>You may be required to work outside your stated working hours when the need arises.</i></p>
            <br />
            <p><strong>Join Date:</strong> {details.joinDate}</p>
            <p><strong>Probation Period:</strong> {details.probation}</p>
            <br />
            <p><strong><u>Salary Proposal</u></strong></p>
            
            <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #000' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#D9E2F3', fontWeight: 'bold', width: '30%' }}>Job Department</td>
                  <td colSpan="4" style={{ border: '1px solid #000', padding: '8px' }}>{details.department}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>Job Title</td>
                  <td colSpan="4" style={{ border: '1px solid #000', padding: '8px' }}>{selectedApp?.job_role || '[Role]'}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>Job Level</td>
                  <td colSpan="4" style={{ border: '1px solid #000', padding: '8px' }}></td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>Reporting To</td>
                  <td colSpan="4" style={{ border: '1px solid #000', padding: '8px' }}>{details.manager}</td>
                </tr>
                <tr style={{ backgroundColor: '#D9E2F3', fontWeight: 'bold', textAlign: 'center' }}>
                  <td style={{ border: '1px solid #000', padding: '8px' }}></td>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>Current</td>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>Expected</td>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>Proposed</td>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>Inc %</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>CAMPUS (Hourly Rate)</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>${details.currentSal}</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>${details.expectedSal}</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>${details.proposedSal}</td>
                  <td style={{ border: '1px solid #000', padding: '8px' }}></td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>CAMPUS Relief (Hourly Rate)</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>$0</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>$0</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>$0</td>
                  <td style={{ border: '1px solid #000', padding: '8px' }}></td>
                </tr>
                <tr style={{ backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>Annual Guaranteed Cash</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>NA</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>NA</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>NA</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>NA</td>
                </tr>
                <tr style={{ backgroundColor: '#E2EFDA' }}>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>Total Compensation Package</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>$0</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>$0</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>$0</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>N.A</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}