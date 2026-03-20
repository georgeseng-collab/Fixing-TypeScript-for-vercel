// @ts-nocheck
import React, { useState } from 'react';
import { format } from 'date-fns';

const RECRUITERS = [
  "Shin Leng",
  "Janice",
  "George",
  "From Geniebook Recruitment Team",
  "Recruiter from Geniebook"
];

// The Google Drive link you provided
const MAP_LINK = "https://drive.google.com/file/d/1xIiiz7bny2IBh6QhXtqZhGEJUC5eoQFN/view?usp=sharing";

export default function WhatsAppOutreach() {
  const [mode, setMode] = useState('write-in'); 
  const [candidateName, setCandidateName] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [source, setSource] = useState('LinkedIn');
  const [role, setRole] = useState('Sales Executive');
  const [recruiterName, setRecruiterName] = useState(RECRUITERS[0]);

  const [includeJobscope, setIncludeJobscope] = useState(false);
  const [includeRoadshow, setIncludeRoadshow] = useState(false);
  const [includeMap, setIncludeMap] = useState(true);

  const [intDate, setIntDate] = useState('');
  const [intTime, setIntTime] = useState('');
  const [interviewer, setInterviewer] = useState('');

  const getDayOfWeek = (dateString) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'EEEE');
  };

  const generateMessage = () => {
    let msg = "";

    if (mode === 'headhunting') {
      msg = `Hi ${candidateName}, I am ${recruiterName}. I came across your Resume at ${source}. Wonder if you will be keen for a new opportunity with us as a [${role}]?`;
    } 
    
    else if (mode === 'write-in') {
      msg = `Hi ${candidateName}, I am ${recruiterName}. I have received your profile from ${source}. Can I check for a few more details / arrange a short call before sending up the resume for review?\n\n` +
            `Could you provide the following:\n` +
            `1) Last Drawn Salary: \n` +
            `2) Expected Salary: \n` +
            `3) Notice Period: \n` +
            `4) When is your availability for a Physical Interview: \n`;
      
      if (includeJobscope) msg += `5) Are you okay with the jobscope?\n`;
      if (includeRoadshow) msg += `6) Are you okay with working in roadshows (different locations/malls)?\n`;
    } 
    
    else if (mode === 'interview') {
      msg = `Hi ${candidateName}, great news! We would like to invite you for an interview.\n\n` +
            `*Interview Details*\n` +
            `Date: ${intDate}\n` +
            `Day: ${getDayOfWeek(intDate)}\n` +
            `Time: ${intTime}\n` +
            `Location: 3 Ang Mo Kio Street 62, #01-30, Link@AMK, Singapore 569139\n\n` +
            `Company Website: https://geniebook.com/\n` +
            `Interviewer: ${interviewer}\n\n`;

      if (includeMap) {
        msg += `*Walking Directions from Yio Chu Kang MRT (Exit A):*\n` +
               `1. Exit via Yio Chu Kang (Exit A).\n` +
               `2. Turn right towards the bus interchange and walk to the end.\n` +
               `3. Cross the traffic light and turn right into the sheltered walkway.\n` +
               `4. Walk past the fire station (on your left).\n` +
               `5. Cross the road and turn into Ang Mo Kio Street 62.\n` +
               `6. Go up the stairs next to bus stop (802) near the Link @ AMK board.\n` +
               `7. Arrive at Geniebook #01-30.\n\n` +
               `*View Direction Map PDF:* ${MAP_LINK}\n\n`;
      }

      msg += `Do acknowledge to confirm for the interview schedule 🙂`;
    }

    return msg;
  };

  const openWhatsApp = () => {
    if (!candidatePhone) return alert("Please enter a phone number");
    let cleanPhone = candidatePhone.replace(/\D/g, '');
    if (cleanPhone.length === 8) cleanPhone = '65' + cleanPhone;

    const encodedMsg = encodeURIComponent(generateMessage());
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto p-10 text-left bg-slate-50 min-h-screen font-sans">
      <div className="mb-10 bg-black text-white p-8 rounded-[2rem] shadow-[8px_8px_0_0_#3b82f6] border-4 border-black">
        <h1 className="text-4xl font-black italic uppercase italic tracking-tighter leading-none">WhatsApp Hub</h1>
        <p className="text-blue-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Standalone Outreach Tool</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-blue-600">Recruiter Profile</h3>
            <select 
              className="w-full p-3 border-2 border-black rounded-lg font-bold bg-white"
              value={recruiterName}
              onChange={e => setRecruiterName(e.target.value)}
            >
              {RECRUITERS.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>

          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-blue-600">Step 1: Select Format</h3>
            <div className="grid grid-cols-3 gap-2">
              {['headhunting', 'write-in', 'interview'].map(m => (
                <button key={m} onClick={() => setMode(m)} className={`p-3 border-2 border-black rounded-xl font-black uppercase text-[9px] transition-all ${mode === m ? 'bg-blue-600 text-white' : 'bg-white shadow-[2px_2px_0_0_#000]'}`}>
                  {m.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000] space-y-4">
            <h3 className="font-black uppercase italic text-xs mb-2 text-blue-600">Step 2: Candidate Data</h3>
            <input type="text" placeholder="Candidate Name" className="w-full p-3 border-2 border-black rounded-lg font-bold" value={candidateName} onChange={e => setCandidateName(e.target.value)} />
            <input type="tel" placeholder="Phone Number (e.g. 91234567)" className="w-full p-3 border-2 border-black rounded-lg font-bold" value={candidatePhone} onChange={e => setCandidatePhone(e.target.value)} />
            {mode !== 'interview' && (
              <>
                <input type="text" placeholder="Source (LinkedIn, JobStreet...)" className="w-full p-3 border-2 border-black rounded-lg font-bold" value={source} onChange={e => setSource(e.target.value)} />
                <input type="text" placeholder="Role Name" className="w-full p-3 border-2 border-black rounded-lg font-bold" value={role} onChange={e => setRole(e.target.value)} />
              </>
            )}
          </div>

          {mode === 'interview' && (
            <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000] space-y-4">
              <h3 className="font-black uppercase italic text-xs mb-2 text-blue-600">Interview Logistics</h3>
              <input type="date" className="w-full p-3 border-2 border-black rounded-lg font-black" value={intDate} onChange={e => setIntDate(e.target.value)} />
              <input type="time" className="w-full p-3 border-2 border-black rounded-lg font-black" value={intTime} onChange={e => setIntTime(e.target.value)} />
              <input type="text" placeholder="Interviewer Name" className="w-full p-3 border-2 border-black rounded-lg font-bold" value={interviewer} onChange={e => setInterviewer(e.target.value)} />
              <label className="flex items-center gap-3 font-black text-[11px] uppercase cursor-pointer mt-4 text-emerald-600">
                <input type="checkbox" checked={includeMap} onChange={e => setIncludeMap(e.target.checked)} className="w-5 h-5 border-2 border-black" /> Include Map Link & Directions
              </label>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-10 h-fit">
          <div className="bg-white p-8 border-4 border-black rounded-[3rem] shadow-[12px_12px_0_0_#000] relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-400 text-black px-6 py-2 font-black uppercase italic text-[10px] border-b-4 border-l-4 border-black">Live Preview</div>
            <h3 className="font-black uppercase italic text-xs mb-6 text-slate-400">Message Content</h3>
            <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-200 text-sm font-bold leading-relaxed whitespace-pre-wrap min-h-[400px] text-slate-800 italic">
              {generateMessage() || "Fill in data to see preview..."}
            </div>
            <button onClick={openWhatsApp} className="w-full mt-8 bg-[#25D366] text-white p-6 border-4 border-black rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-[6px_6px_0_0_#000] hover:bg-black transition-all flex items-center justify-center gap-4 active:translate-y-1 active:shadow-none">
              💬 Open WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}