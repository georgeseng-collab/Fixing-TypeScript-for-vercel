// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../db';

export default function ApprovalHub() {
  const [applicants, setApplicants] = useState([]);
  const [history, setHistory] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]); 
  const [selectedId, setSelectedId] = useState('');
  const [selectedCC, setSelectedCC] = useState([]); 
  const [isSingaporean, setIsSingaporean] = useState(true); 
  const [copyStatus, setCopyStatus] = useState(false);
  
  const [boss, setBoss] = useState('Alicia');
  const recipients = {
    'Alicia': { email: 'alicia@geniebook.com', name: 'Alicia' },
    'ZhiZhong': { email: 'neo@geniebook.com', name: 'ZhiZhong' }
  };
  const defaultCC = 'merissa.lim@geniebook.com';

  const [details, setDetails] = useState({
    manager: 'Wei Zhi',
    department: 'Sales',
    scheduleKey: "Sales (Fixed)",
    proposedSal: 0, 
    proposedAllowance: 0,
    monthsPaid: 12,
    source: 'Fastjobs',
    referralName: '',
    joinDate: '6th April 2026',
    probation: '3 months'
  });

  const sources = ["Fastjobs", "Jobstreet", "Linkedin", "CareerFair", "Others", "Referral"];
  const departments = ["Sales", "Curriculum", "Customer Success", "Marketing", "Tech", "HR"];

  const schedules = {
    "Sales (Fixed)": { days: "3 weekdays + 2 weekends", hours: "Weekdays (Mon - Thurs) : 12.30pm - 8.30pm\nWeekdays (Fri) : 12pm - 9pm\nWeekends (Sat - Sun) : 11am - 9pm" },
    "Curriculum (Teacher 5+1)": { days: "5 Weekdays + 1 Weekend", hours: "Weekdays : 12pm to 9pm\nWeekends : 9am to 6.30pm" },
    "Curriculum (Teacher 4+1)": { days: "4 Weekdays + 1 Weekend", hours: "Weekdays : 12pm to 9pm\nWeekends : 9am to 6.30pm" },
    "Curriculum (Teacher 3+2)": { days: "3 Weekdays + 2 Weekend", hours: "Weekdays : 12pm to 9pm\nWeekends : 9am to 6.30pm" },
    "Office Standard": { days: "5 Weekdays", hours: "10am to 7pm" },
    "Relationship Executive": { days: "3 weekdays + 2 weekends", hours: "Weekdays (Mon - Friday) : 12.30pm - 9pm\nWeekends (Sat - Sun) : 8.30am - 6.30pm" }
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: apps } = await supabase.from('applicants')
      .select('*')
      .in('status', ['Offered', 'Offer Accepted'])
      .order('name');
    
    const { data: team } = await supabase.from('team_members').select('name, email').order('name');
    const { data: hist } = await supabase.from('salary_approval_history').select('*').order('sent_at', { ascending: false });

    setApplicants(apps || []);
    setTeamMembers(team || []);
    setHistory(hist || []);
  };

  const handleCandidateChange = (id) => {
    setSelectedId(id);
    const app = applicants.find(a => a.id === id);
    if (app) {
      // Sync Proposed with Dashboard 'offered_salary', or fallback to expected
      setDetails(prev => ({
        ...prev, 
        proposedSal: app.offered_salary || app.salary_expectation || app.expected_salary || 0 
      }));
    }
  };

  const toggleCC = (email) => {
    setSelectedCC(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  };

  const deleteHistory = async (id) => {
    if (window.confirm("Delete record?")) {
      await supabase.from('salary_approval_history').delete().eq('id', id);
      fetchData();
    }
  };

  const selectedApp = applicants.find(a => a.id === selectedId);
  const currentSchedule = schedules[details.scheduleKey] || schedules["Sales (Fixed)"];

  const n = (val) => Number(val) || 0;
  
  // Logic from applicant form submit fields
  const currentSal = n(selectedApp?.current_salary || selectedApp?.last_drawn_salary || 0);
  const expectedSal = n(selectedApp?.salary_expectation || selectedApp?.expected_salary || 0);
  
  const proposedSal = n(details.proposedSal);
  const proposedAllow = n(details.proposedAllowance);
  const months = n(details.monthsPaid);

  const calcAnnual = (sal, allow, m) => (sal + allow) * m;
  const currAnnual = calcAnnual(currentSal, 0, 12);
  const expAnnual = calcAnnual(expectedSal, 0, 12);
  const propAnnual = calcAnnual(proposedSal, proposedAllow, months);

  const calcInc = (curr, prop) => {
    if (curr === 0) return "0%";
    const diff = ((prop - curr) / curr) * 100;
    return diff >= 0 ? `${diff.toFixed(1)}%` : `-${Math.abs(diff).toFixed(1)}% (Saving)`;
  };

  const handleDispatch = async () => {
    if (!selectedId) return alert("Select candidate first.");
    const emailContent = document.getElementById('approval-content');
    const blob = new Blob([emailContent.innerHTML], { type: "text/html" });
    const data = [new ClipboardItem({ "text/html": blob })];

    try {
      await navigator.clipboard.write(data);
      setCopyStatus(true);
      
      await supabase.from('applicants').update({ status: 'Offer Accepted' }).eq('id', selectedId);
      await supabase.from('salary_approval_history').insert([{ 
        applicant_id: selectedApp.id, 
        applicant_name: selectedApp.name, 
        salary: details.proposedSal 
      }]);
      
      const allCC = [defaultCC, ...selectedCC].join(',');
      const subject = `Hiring & Salary Approval Request - ${selectedApp.name}`;
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipients[boss].email}&cc=${encodeURIComponent(allCC)}&su=${encodeURIComponent(subject)}`;
      
      window.open(gmailUrl, '_blank');
      fetchData();
      setTimeout(() => setCopyStatus(false), 2000);
    } catch (err) { alert("Copy failed."); }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-10 pb-40 text-slate-900 font-sans">
      <div className="flex justify-between items-end mb-12 border-b-[10px] border-slate-900 pb-10">
        <div>
          <h1 className="text-7xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Approval Hub</h1>
          <div className="flex gap-3 mt-6">
            {Object.keys(recipients).map(r => (
              <button key={r} onClick={() => setBoss(r)} className={`px-8 py-3 rounded-2xl text-xs font-black uppercase transition-all shadow-sm ${boss === r ? 'bg-blue-600 text-white translate-y-[-4px]' : 'bg-slate-100 text-slate-400'}`}>Hi {r}</button>
            ))}
          </div>
        </div>
        <div className="bg-slate-900 p-2 rounded-3xl flex gap-1 shadow-2xl">
          <button onClick={() => setIsSingaporean(true)} className={`px-10 py-4 rounded-2xl text-xs font-black uppercase transition-all ${isSingaporean ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-500'}`}>Singaporean</button>
          <button onClick={() => setIsSingaporean(false)} className={`px-10 py-4 rounded-2xl text-xs font-black uppercase transition-all ${!isSingaporean ? 'bg-white text-emerald-600 shadow-xl' : 'text-slate-500'}`}>Malaysian</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-10 rounded-[4rem] shadow-2xl border-4 border-slate-900 space-y-5">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className={labelClass}>Candidate Selection</label>
                <select className={selectClass} value={selectedId} onChange={e => handleCandidateChange(e.target.value)}>
                  <option value="">Choose Candidate...</option>
                  {applicants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="space-y-1 p-4 bg-slate-50 rounded-3xl border-2 border-slate-100">
                <label className="text-[9px] font-black uppercase text-slate-400 italic block mb-2 tracking-widest">CC Additional Team</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto no-scrollbar">
                  {teamMembers.map(m => (
                    <button key={m.email} onClick={() => toggleCC(m.email)}
                      className={`px-3 py-2 rounded-xl border-2 text-[9px] font-black uppercase transition-all ${selectedCC.includes(m.email) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-900'}`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>Dept</label>
                  <select className={selectClass} value={details.department} onChange={e => setDetails({...details, department: e.target.value})}>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Source</label>
                  <select className={selectClass} value={details.source} onChange={e => setDetails({...details, source: e.target.value})}>
                    {sources.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {details.source === 'Referral' && (
                <div className="space-y-1">
                  <label className={labelClass}>Referred By</label>
                  <input className={inputClass} placeholder="Referrer Name" value={details.referralName} onChange={e => setDetails({...details, referralName: e.target.value})} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>Proposed Sal</label>
                  <input className={inputClass} type="number" value={details.proposedSal} onChange={e => setDetails({...details, proposedSal: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Join Date</label>
                  <input className={inputClass} value={details.joinDate} onChange={e => setDetails({...details, joinDate: e.target.value})} />
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
                  <label className={labelClass}>Manager</label>
                  <input className={inputClass} placeholder="Reporting To" value={details.manager} onChange={e => setDetails({...details, manager: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Probation</label>
                  <input className={inputClass} value={details.probation} onChange={e => setDetails({...details, probation: e.target.value})} />
                </div>
              </div>
            </div>

            <button onClick={handleDispatch} className={`w-full py-8 text-white rounded-[2.5rem] font-black uppercase text-sm tracking-[0.3em] shadow-2xl transition-all active:scale-95 ${copyStatus ? 'bg-emerald-500' : 'bg-blue-600 hover:bg-slate-900'}`}>
              {copyStatus ? '✅ COPIED & OPENED' : '🚀 DISPATCH APPROVAL'}
            </button>
          </div>

          <div className="bg-slate-900 rounded-[3rem] p-10 text-white min-h-[300px]">
             <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-6 flex items-center gap-2">History Log</h3>
             <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
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

        {/* PREVIEW CONTAINER - FULL 322 LINE LOGIC RESTORED */}
        <div className="lg:col-span-8 bg-white p-20 rounded-[5rem] shadow-2xl border border-slate-100 min-h-[900px]">
          <div id="approval-content" style={{ color: '#000', fontFamily: 'Arial, sans-serif', fontSize: '15px', lineHeight: '1.2' }}>
            <p>Hi {recipients[boss].name},</p>
            <br />
            <p>Please do approve to hire the following candidate as well as reviewing the salary package offered to the <strong>{isSingaporean ? 'Singaporean' : 'Malaysian'}</strong> candidate below.</p>
            <br />
            <p style={{ margin: '0' }}>Name: {selectedApp?.name || '---'}</p>
            <p style={{ margin: '0' }}>Role: {selectedApp?.job_role || '---'}</p>
            <p style={{ margin: '0' }}>Source: {details.source}{details.source === 'Referral' ? ` (${details.referralName})` : ''}</p>
            <br />
            <p style={{ margin: '0' }}><strong>Working Hours</strong></p>
            <p style={{ margin: '0' }}>Working Days : {currentSchedule.days}</p>
            <br />
            <div style={{ paddingLeft: '0px' }}>
              {currentSchedule.hours.split('\n').map((line, i) => <p key={i} style={{ margin: '0' }}>{line}</p>)}
            </div>
            <br />
            <p><i>You may be required to work outside your stated working hours when the need arises.</i></p>
            <br />
            <p style={{ margin: '0' }}>Join Date: {details.joinDate}</p>
            <p style={{ margin: '0' }}>Probation Period: {details.probation}</p>
            <br />
            <p style={{ margin: '0' }}><strong><u>Salary Proposal</u></strong></p>
            <br />
            <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #000' }}>
              <tbody>
                <tr style={{ backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>
                  <td style={{ border: '1px solid #000', padding: '10px', width: '35%' }}>Job Department</td>
                  <td colSpan="4" style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#fff' }}>{details.department}</td>
                </tr>
                <tr style={{ backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>
                  <td style={{ border: '1px solid #000', padding: '10px' }}>Job Title</td>
                  <td colSpan="4" style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#fff' }}>{selectedApp?.job_role || '---'}</td>
                </tr>
                <tr style={{ backgroundColor: '#D9E2F3', fontWeight: 'bold' }}>
                  <td style={{ border: '1px solid #000', padding: '10px' }}>Reporting To</td>
                  <td colSpan="4" style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#fff' }}>{details.manager}</td>
                </tr>
                
                <tr style={{ backgroundColor: '#D9E2F3', fontWeight: 'bold', textAlign: 'center' }}>
                  <td style={{ border: '1px solid #000', padding: '10px' }}></td>
                  <td style={{ border: '1px solid #000', padding: '10px' }}>Current (Last Drawn)</td>
                  <td style={{ border: '1px solid #000', padding: '10px' }}>Expected</td>
                  <td style={{ border: '1px solid #000', padding: '10px' }}>Proposed (Offered)</td>
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

const inputClass = "w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs border-2 border-transparent focus:border-blue-600 outline-none transition-all shadow-inner";
const selectClass = "w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs border-2 border-transparent focus:border-blue-600 outline-none cursor-pointer";
const labelClass = "text-[10px] font-black uppercase text-slate-400 ml-4 mb-1 block tracking-[0.2em]";