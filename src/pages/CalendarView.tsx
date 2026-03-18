// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '../db';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// --- YOUR CONFIGURATION ---
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwtMXnRrDEx80dni3lrYtSMbQBbPBgK218XgDd9Frd7Vx2q1lHOZ8csVyiAhmKE9E0i/exec';

const TEAM_MEMBERS = [
  { name: 'Interviewer 1', email: 'interviewer1@geniebook.com' },
  { name: 'HR Manager', email: 'hr@geniebook.com' },
  { name: 'Tech Lead', email: 'techlead@geniebook.com' },
  { name: 'CEO Office', email: 'ceo@geniebook.com' },
];

export default function CalendarView() {
  // Data States
  const [events, setEvents] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false); 
  
  // UI States
  const [showModal, setShowModal] = useState(false);
  const [isManagementMode, setIsManagementMode] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  
  // Form States
  const [searchCandidate, setSearchCandidate] = useState('');
  const [selectedGuests, setSelectedGuests] = useState([]); 
  const [customGuest, setCustomGuest] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formTime, setFormTime] = useState('10:00');

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('applicants').select('*');
      if (error) throw error;
      setApplicants(data || []);
      
      // Filter for 'isManual' to avoid auto-booking from pipeline shifts
      const calendarEvents = (data || []).flatMap(app => 
        (app.status_history || [])
          .filter(h => h && h.isManual === true) 
          .map((h, idx) => ({
            id: `${app.id}___${idx}`,
            candidate: app,
            start: new Date(h.date),
            end: addHours(new Date(h.date), 1),
            title: `INTERVIEW: ${app.name} (${app.job_role || 'Role'})`
          }))
      );
      setEvents(calendarEvents);
    } catch (e) { console.error("Fetch Error:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleGuest = (email) => {
    setSelectedGuests(prev => 
      prev.includes(email) ? prev.filter(g => g !== email) : [...prev, email]
    );
  };

  const handleSave = async () => {
    if (!selectedApp) return alert("Select a candidate first");
    setIsSyncing(true);

    // Combine Guest logic
    const finalGuestList = [...selectedGuests];
    if (customGuest.trim()) finalGuestList.push(customGuest.trim());
    if (selectedApp.email) finalGuestList.push(selectedApp.email); // Auto-invite candidate

    try {
      let base64File = "";
      let fileName = "resume.pdf";
      let contentType = "application/pdf";

      // File handling logic
      if (resumeFile) {
        fileName = resumeFile.name;
        contentType = resumeFile.type;
        const reader = new FileReader();
        base64File = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(resumeFile);
        });
      } else if (selectedApp.resume_metadata?.url) {
        try {
          const response = await fetch(selectedApp.resume_metadata.url);
          const blob = await response.blob();
          fileName = `${selectedApp.name.replace(/\s/g, '_')}_Resume.pdf`;
          contentType = blob.type;
          base64File = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
          });
        } catch (e) { console.warn("Existing resume fetch failed", e); }
      }

      // 1. Sync to Google Script
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          name: selectedApp.name,
          role: selectedApp.job_role || "Candidate",
          date: formDate,
          time: formTime,
          fileName: fileName,
          contentType: contentType,
          fileBase64: base64File,
          guests: finalGuestList.join(',')
        })
      });

      // 2. Update Supabase
      const finalTimestamp = `${formDate}T${formTime}:00+08:00`;
      let updatedHistory = [...(selectedApp.status_history || [])];

      if (isManagementMode) {
        const idx = parseInt(selectedEventId.split('___')[1]);
        if (updatedHistory[idx]) {
          updatedHistory[idx].date = finalTimestamp;
          updatedHistory[idx].isManual = true;
        }
      } else {
        updatedHistory.push({ status: 'Interviewing', date: finalTimestamp, isManual: true });
      }

      await supabase.from('applicants').update({ 
        status: 'Interviewing', 
        status_history: updatedHistory 
      }).eq('id', selectedApp.id);

      alert("Interview Synced & Invites Sent!");
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      alert("Sync Error: " + err.message);
    } finally { setIsSyncing(false); }
  };

  const resetForm = () => {
    setSelectedGuests([]);
    setCustomGuest('');
    setResumeFile(null);
    setSearchCandidate('');
  };

  const confirmDelete = async () => {
    const [candId, idxStr] = selectedEventId.split('___');
    const { data: fresh } = await supabase.from('applicants').select('status_history').eq('id', candId).single();
    const newHistory = [...(fresh?.status_history || [])];
    newHistory.splice(parseInt(idxStr), 1);
    await supabase.from('applicants').update({ status_history: newHistory }).eq('id', candId);
    setShowModal(false);
    fetchData();
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-black text-blue-600 text-6xl italic animate-pulse tracking-tighter uppercase">GENIEBOOK</div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 relative pb-32">
      
      {/* Header Row */}
      <div className="bg-white p-12 rounded-[4rem] border-4 border-slate-900 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center mb-12 transition-all">
        <div>
          <h1 className="text-6xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">Scheduler</h1>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em] mt-2">Team & Google Sync Active</p>
        </div>
        <button 
          onClick={() => { setIsManagementMode(false); setStep(1); setShowModal(true); }} 
          className="bg-blue-600 text-white px-12 py-6 rounded-[2.5rem] border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-black text-xs uppercase tracking-widest hover:bg-slate-900 hover:translate-y-[-4px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          + New Schedule
        </button>
      </div>

      {/* Main Calendar View */}
      <div className="bg-white p-10 rounded-[4.5rem] border-4 border-slate-900 shadow-[20px_20px_0px_0px_rgba(15,23,42,1)]" style={{ height: '800px' }}>
        <Calendar 
          localizer={localizer} 
          events={events} 
          selectable 
          defaultView="week"
          onSelectEvent={(e) => { 
            setSelectedApp(e.candidate); 
            setSelectedEventId(e.id); 
            setIsManagementMode(true); 
            setStep(2); 
            setShowModal(true); 
          }}
          onSelectSlot={({start}) => { 
            setIsManagementMode(false); 
            setFormDate(format(start, 'yyyy-MM-dd')); 
            setFormTime(format(start, 'HH:mm')); 
            setStep(1); 
            setShowModal(true); 
          }}
          eventPropGetter={() => ({ 
            style: { 
              backgroundColor: '#3b82f6', 
              borderRadius: '20px', 
              border: '3px solid #0f172a', 
              fontWeight: '900',
              textTransform: 'uppercase',
              fontSize: '10px',
              padding: '6px 12px'
            } 
          })}
        />
      </div>

      {/* The Unified Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xl rounded-[4rem] border-8 border-slate-900 shadow-[25px_25px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            
            {isSyncing && (
              <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 border-8 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-black text-slate-900 text-xs uppercase tracking-widest italic text-center leading-relaxed">Processing Invitations &<br/>Google Calendar Sync...</p>
              </div>
            )}

            <div className={`p-10 text-white flex justify-between items-center ${isManagementMode ? 'bg-blue-600' : 'bg-slate-900'}`}>
              <h3 className="text-4xl font-black italic uppercase tracking-tighter">{isManagementMode ? 'Edit' : 'Step ' + step}</h3>
              <button onClick={() => setShowModal(false)} className="text-3xl font-black opacity-30 hover:opacity-100 transition-opacity">✕</button>
            </div>

            <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar flex-grow">
              {step === 1 ? (
                <div className="space-y-6">
                  <input 
                    type="text" 
                    placeholder="Search candidate, role or email..." 
                    className="w-full p-6 bg-slate-50 border-4 border-slate-900 rounded-[2rem] font-black outline-none uppercase text-sm placeholder:text-slate-300" 
                    value={searchCandidate} 
                    onChange={e => setSearchCandidate(e.target.value)} 
                  />
                  <div className="space-y-3">
                    {applicants
                      .filter(a => 
                        a.name.toLowerCase().includes(searchCandidate.toLowerCase()) || 
                        (a.job_role || "").toLowerCase().includes(searchCandidate.toLowerCase()) ||
                        (a.email || "").toLowerCase().includes(searchCandidate.toLowerCase())
                      )
                      .slice(0, 5) // Performance optimization
                      .map(app => (
                        <button 
                          key={app.id} 
                          onClick={() => { setSelectedApp(app); setStep(2); }} 
                          className="w-full text-left p-6 bg-white hover:bg-blue-50 rounded-[2.5rem] border-4 border-slate-900 flex justify-between items-center group transition-all shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
                        >
                          <div>
                            <div className="font-black text-slate-900 text-xl uppercase tracking-tighter italic leading-none">{app.name}</div>
                            <div className="text-[9px] uppercase font-black text-slate-400 tracking-widest mt-1">{app.job_role}</div>
                          </div>
                          <span className="text-blue-600 font-black text-xs opacity-0 group-hover:opacity-100 transition-all">SELECT →</span>
                        </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="bg-slate-900 p-8 rounded-[3rem] text-white border-4 border-slate-900">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 italic">Candidate Selection</p>
                    <div className="text-3xl font-black italic uppercase tracking-tighter leading-none">{selectedApp?.name}</div>
                    <p className="text-[10px] uppercase font-bold text-white/40 mt-2 tracking-widest">{selectedApp?.email}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <input type="date" className="p-5 bg-slate-50 border-4 border-slate-900 rounded-[2rem] font-black outline-none text-xs" value={formDate} onChange={e => setFormDate(e.target.value)} />
                    <input type="time" className="p-5 bg-slate-50 border-4 border-slate-900 rounded-[2rem] font-black outline-none text-xs" value={formTime} onChange={e => setFormTime(e.target.value)} />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[11px] font-black uppercase text-slate-900 italic tracking-[0.2em] ml-2">Invite Interviewers</label>
                    <div className="flex flex-wrap gap-2">
                      {TEAM_MEMBERS.map(m => (
                        <button 
                          key={m.email} 
                          onClick={() => toggleGuest(m.email)}
                          className={`px-4 py-3 rounded-2xl border-2 font-black text-[10px] uppercase transition-all ${selectedGuests.includes(m.email) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-900'}`}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                    <input 
                      type="text" 
                      placeholder="Add another email (comma separated)..." 
                      className="w-full p-4 bg-slate-50 border-4 border-slate-900 rounded-[2rem] font-bold text-xs outline-none" 
                      value={customGuest}
                      onChange={e => setCustomGuest(e.target.value)}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase text-slate-900 italic tracking-[0.2em] ml-2">Attach Resume</label>
                    <input type="file" className="w-full p-4 bg-slate-50 border-4 border-slate-900 rounded-[2rem] text-[10px] font-black uppercase" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
                  </div>

                  <div className="flex flex-col gap-4 pt-6 border-t-4 border-slate-100">
                    <button 
                      onClick={handleSave} 
                      className="w-full py-8 bg-blue-600 text-white rounded-[2.5rem] border-4 border-slate-900 font-black text-sm uppercase tracking-widest shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-900 hover:translate-y-[-4px] active:translate-y-[2px] transition-all"
                    >
                        Confirm & Send Invites
                    </button>
                    {isManagementMode ? (
                        <button onClick={confirmDelete} className="w-full py-4 text-rose-600 font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 rounded-2xl transition-all">Delete Schedule</button>
                    ) : (
                        <button onClick={() => setStep(1)} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Back to List</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}