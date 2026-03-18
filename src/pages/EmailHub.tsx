// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../db';

export default function EmailHub() {
  const [applicants, setApplicants] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [templateType, setTemplateType] = useState('Singaporean'); // 'Singaporean' or 'Malaysian'
  
  // Schedule Presets
  const schedules = {
    "Sales (Fixed)": "3 weekdays + 2 weekends\nWeekdays (Mon - Thurs) : 12.30pm - 8.30pm\nWeekdays (Fri) : 12pm - 9pm\nWeekends (Sat - Sun) : 11am - 9pm",
    "Curriculum (Teacher 5+1)": "5 Weekdays + 1 Weekend\nWeekdays : 12pm to 9pm\nWeekends : 9am to 6.30pm",
    "Curriculum (Teacher 3+2)": "3 Weekdays + 2 Weekend\nWeekdays : 12pm to 9pm\nWeekends : 9am to 6.30pm",
    "Curriculum (Teacher 4+1)": "4 Weekdays + 1 Weekend\nWeekdays : 12pm to 9pm\nWeekends : 9am to 6.30pm",
    "Office Standard": "5 Weekdays\n10am to 7pm",
    "Relationship Executive": "3 weekdays + 2 weekends\nWeekdays (Mon - Friday) : 12.30pm - 9pm\nWeekends (Sat - Sun) : 8.30am - 6.30pm"
  };

  const [details, setDetails] = useState({
    salary: '3000',
    workSchedule: schedules["Sales (Fixed)"],
    joinDate: '2026-04-06',
    probation: '3 Months',
    noticePeriod: '1 day (Sales)',
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

  const generateEmail = () => {
    if (!selectedApp) return alert("Please select a candidate first.");

    const trainingCost = templateType === 'Singaporean' ? "$2,000" : "$1,000";
    const subject = `Offer of Employment - ${selectedApp.job_role || 'Outbound Education Consultant'} - ${selectedApp.name}`;
    
    const benefitsSection = templateType === 'Singaporean' ? 
`Benefits: <ONLY APPLIES TO SINGAPORE FULL TIME STAFF>
- 15 day's annual leave, with one additional day for every year of service, up to max 21 days
- 1 Day Birthday Off on birthday month
- 60 days Hospitalisation Leave inclusive of 14 day's Medical Leave
- Group Hospital & Surgical Insurance
- Group Outpatient
- Laptop + Company T-Shirt/s` : `(Standard Employment Terms Apply)`;

    const body = `Dear ${selectedApp.name},

Thank you for your time and effort in preparing & attending our interviews.

We are pleased to offer you the role of ${selectedApp.job_role || 'Education Consultant'} with Geniebook Pte Ltd.

Details are as follows:

Monthly Salary: $${details.salary}
Work Schedule:
${details.workSchedule}

Join Date: ${details.joinDate}
Probation Period: ${details.probation}
Notice Period: ${details.noticePeriod}

${benefitsSection}

In addition, here is a checklist of documents I would require from you in the meantime, to submit for the generation of the Employment Contract.

Please save the files in the format of (Document Name) followed by (Name - As Per in NRIC) - do not consolidate:
- Attached GB Personal Details Form
- Attached Conflict of Interest Policy Form
- Attached Declaration of Interest Form
- Identity Card (Front & Back)
- Deed Poll (if applicable)
- Last 3 months payslip / CPF Contribution
- Highest Qualification Certificate
- Birth certificate of Child (if any)
- Covid-19 Vaccination Report
- Bank Account document (with Name/Logo/Number)

Feel free to let me know if you have any queries and notify me once you have submitted all the documents. Do take note that you will be required to pay for training costs of ${trainingCost} if you resign within 3 months or are terminated due to misconduct.

Lastly, we would appreciate it if you could consider our offer and acknowledge this email as a form of acceptance latest by ${details.offerExpiry}.

Meanwhile, I am extremely excited for you to be part of this team!

PS. Please take note that all matters relating to salary are confidential.

Thank you,`;

    window.location.href = `mailto:${selectedApp.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 pb-40">
      <div className="mb-12">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900">Offer <span className="text-blue-600">Hub</span></h1>
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Elite Recruitment Dispatch</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* LEFT SETTINGS */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[3.5rem] shadow-xl border border-slate-100 space-y-6">
            
            {/* Template Selection */}
            <div>
              <label className="text-[10px] font-black uppercase text-blue-600 ml-4 italic">Step 1: Choose Template</label>
              <div className="grid grid-cols-2 gap-2 mt-2 p-1.5 bg-slate-100 rounded-[1.5rem]">
                <button onClick={() => setTemplateType('Singaporean')} className={`py-4 rounded-xl font-black text-[10px] uppercase transition-all ${templateType === 'Singaporean' ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}>Singaporean</button>
                <button onClick={() => setTemplateType('Malaysian')} className={`py-4 rounded-xl font-black text-[10px] uppercase transition-all ${templateType === 'Malaysian' ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}>Malaysian</button>
              </div>
            </div>

            {/* Candidate Selection */}
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 ml-4 tracking-widest">Step 2: Candidate</label>
              <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold mt-1 shadow-inner text-sm outline-none border-2 border-transparent focus:border-blue-600" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
                <option value="">Select Candidate...</option>
                {applicants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            {/* Schedule Selector */}
            <div>
              <label className="text-[9px] font-black uppercase text-slate-400 ml-4 tracking-widest">Step 3: Work Schedule</label>
              <select 
                className="w-full p-4 bg-blue-50 text-blue-700 rounded-2xl font-bold mt-1 shadow-inner text-[11px] outline-none"
                onChange={(e) => setDetails({...details, workSchedule: schedules[e.target.value]})}
              >
                {Object.keys(schedules).map(key => <option key={key} value={key}>{key}</option>)}
              </select>
            </div>

            {/* Financials & Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Salary ($)</label>
                <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm shadow-inner" value={details.salary} onChange={e => setDetails({...details, salary: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Join Date</label>
                <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm shadow-inner" value={details.joinDate} onChange={e => setDetails({...details, joinDate: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Notice Period</label>
                <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm shadow-inner" value={details.noticePeriod} onChange={e => setDetails({...details, noticePeriod: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Offer Exp.</label>
                <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm shadow-inner" value={details.offerExpiry} onChange={e => setDetails({...details, offerExpiry: e.target.value})} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PREVIEW */}
        <div className="lg:col-span-8 bg-slate-900 rounded-[4rem] p-12 shadow-2xl flex flex-col border-b-8 border-blue-600">
           <div className="flex justify-between items-center mb-8 px-2">
             <h3 className="text-blue-400 font-black italic uppercase tracking-[0.2em] text-sm">Previewing: {templateType} Template</h3>
             <div className="px-4 py-2 bg-slate-800 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest border border-slate-700">Cost: {templateType === 'Singaporean' ? '$2,000' : '$1,000'}</div>
           </div>

           <div className="bg-slate-800/40 p-10 rounded-[3rem] border border-slate-700/50 text-slate-300 font-mono text-[11px] leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[650px] no-scrollbar shadow-inner">
             {selectedApp ? (
               <>
                <div className="text-blue-600 mb-4 font-black">TO: {selectedApp.email}</div>
                Dear {selectedApp.name}, {'\n\n'}
                We are pleased to offer you the role of {selectedApp.job_role || 'Education Consultant'}. {'\n\n'}
                <div className="text-white bg-slate-800 p-4 rounded-xl border-l-4 border-blue-600">
                Monthly Salary: ${details.salary} {'\n'}
                Work Schedule: {'\n'}
                {details.workSchedule}
                </div>
                {'\n'}
                Join Date: <span className="text-white">{details.joinDate}</span> {'\n\n'}
                {templateType === 'Singaporean' ? 
                  <span className="text-emerald-400 font-black italic">[Full SG Benefits Included]</span> : 
                  <span className="text-slate-500 italic">[Standard Employment Terms Apply]</span>
                }
                {'\n\n'}
                ... Training costs of <span className="text-amber-400 font-bold underline">{templateType === 'Singaporean' ? '$2,000' : '$1,000'}</span> if you resign...
               </>
             ) : (
               <div className="text-center py-32 opacity-20 italic font-black text-xl uppercase tracking-tighter">Select Candidate & Schedule</div>
             )}
           </div>

           <div className="mt-10 flex items-center justify-between">
              <div className="flex gap-2">
                 {[1,2,3].map(i => <div key={i} className="w-2 h-2 rounded-full bg-blue-600/30"></div>)}
              </div>
              <button 
                onClick={generateEmail}
                className="bg-blue-600 hover:bg-white hover:text-blue-600 text-white px-14 py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] transition-all shadow-2xl active:scale-95"
              >
                Dispatch to Gmail
              </button>
           </div>
        </div>

      </div>
    </div>
  );
}