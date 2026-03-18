// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '../db';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwtMXnRrDEx80dni3lrYtSMbQBbPBgK218XgDd9Frd7Vx2q1lHOZ8csVyiAhmKE9E0i/exec';

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false); 
  
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [isManagementMode, setIsManagementMode] = useState(false);
  
  const [searchCandidate, setSearchCandidate] = useState('');
  const [selectedGuests, setSelectedGuests] = useState([]); 
  const [customGuest, setCustomGuest] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formTime, setFormTime] = useState('10:00');

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: apps } = await supabase.from('applicants').select('*');
      const { data: team } = await supabase.from('team_members').select('*');
      setApplicants(apps || []);
      setTeamMembers(team || []);
      
      const calendarEvents = (apps || []).flatMap(app => 
        (app.status_history || [])
          .filter(h => h && h.isManual === true) 
          .map((h, idx) => ({
            id: `${app.id}___${idx}`,
            candidate: app,
            start: new Date(h.date),
            end: addHours(new Date(h.date), 1),
            title: `INTERVIEW: ${app.name}`
          }))
      );
      setEvents(calendarEvents);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleGuest = (email) => {
    setSelectedGuests(prev => 
      prev.includes(email) ? prev.filter(g => g !== email) : [...prev, email]
    );
  };

  const handleSave = async () => {
    if (!selectedApp) return alert("Select candidate");
    setIsSyncing(true);

    const finalGuestList = [...selectedGuests];
    if (customGuest.trim()) {
      const additional = customGuest.split(',').map(e => e.trim());
      finalGuestList.push(...additional);
    }

    try {
      let base64File = "";
      let fileName = "resume.pdf";
      if (resumeFile) {
        const reader = new FileReader();
        base64File = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(resumeFile);
        });
        fileName = resumeFile.name;
      } else if (selectedApp.resume_metadata?.url) {
        const resp = await fetch(selectedApp.resume_metadata.url);
        const blob = await resp.blob();
        base64File = await new Promise((resolve) => {
          const r = new FileReader();
          r.onloadend = () => resolve(r.result.split(',')[1]);
          r.readAsDataURL(blob);
        });
      }

      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          name: selectedApp.name,
          role: selectedApp.job_role,
          date: formDate,
          time: formTime,
          fileName,
          fileBase64: base64File,
          guests: finalGuestList.join(',')
        })
      });

      const finalTimestamp = `${formDate}T${formTime}:00+08:00`;
      let updatedHistory = [...(selectedApp.status_history || [])];

      if (isManagementMode) {
        const idx = parseInt(selectedEventId.split('___')[1]);
        if (updatedHistory[idx]) updatedHistory[idx].date = finalTimestamp;
      } else {
        updatedHistory.push({ status: 'Interviewing', date: finalTimestamp, isManual: true });
      }

      await supabase.from('applicants').update({ status: 'Interviewing', status_history: updatedHistory }).eq('id', selectedApp.id);

      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) { alert(err.message); }
    finally { setIsSyncing(false); }
  };

  // RESTORED: Confirm Delete Function
  const confirmDelete = async () => {
    if (!selectedEventId || !window.confirm("ARE YOU SURE? This will remove the schedule from the ATS.")) return;
    
    const [candId, idxStr] = selectedEventId.split('___');
    const idx = parseInt(idxStr);

    try {
      const { data: fresh } = await supabase.from('applicants').select('status_history').eq('id', candId).single();
      const newHistory = [...(fresh?.status_history || [])];
      
      // Remove the specific entry
      newHistory.splice(idx, 1);
      
      await supabase.from('applicants').update({ status_history: newHistory }).eq('id', candId);
      
      setShowModal(false);
      fetchData();
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  };

  const resetForm = () => {
    setSelectedGuests([]);
    setCustomGuest('');
    setResumeFile(null);
    setSearchCandidate('');
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-black text-blue-600 text-4xl italic animate-pulse">
      GENIEBOOK SECURE BOOT...
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 pb-32">
      {/* Header Container */}
      <div className="bg-white p-10 rounded-[3rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center mb-10">
        <h1 className="text-5xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">Scheduler</h1>
        <button onClick={() => { setIsManagementMode(false); setStep(1); setShowModal(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl border-4 border-slate-900 font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-900 transition-all">+ New Schedule</button>
      </div>

      {/* Calendar Area */}
      <div className="bg-white p-8 rounded-[3rem] border-4 border-slate-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] h-[800px]">
        <Calendar localizer={localizer} events={events} selectable defaultView="week"
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
          eventPropGetter={() => ({ style: { backgroundColor: '#2563eb', borderRadius: '12px', border: '2px solid #0f172a', fontWeight: 'bold', fontSize: '11px' } })}
        />
      </div>

      {/* Modal with Scrollable Body & Fixed Action Footer */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3rem] border-8 border-slate-900 shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[85vh] overflow-hidden">
            
            {/* Header */}
            <div className={`p-8 text-white flex justify-between items-center shrink-0 ${isManagementMode ? 'bg-blue-600' : 'bg-slate-900'}`}>
              <h3 className="text-3xl font-black italic uppercase tracking-tighter">{isManagementMode ? 'Edit' : 'Step ' + step}</h3>
              <button onClick={() => setShowModal(false)} className="text-2xl font-black hover:scale-110">✕</button>
            </div>

            {/* Scrollable Content */}
            <div className="p-8 space-y-6 overflow-y-auto no-scrollbar flex-grow bg-slate-50/50">
              {step === 1 ? (
                <div className="space-y-4">
                  <div className="sticky top-0 bg-white/90 backdrop-blur-md pb-4 z-10">
                     <input type="text" placeholder="Search name, job, or email..." className="w-full p-5 border-4 border-slate-900 rounded-2xl font-black outline-none uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" value={searchCandidate} onChange={e => setSearchCandidate(e.target.value)} />
                  </div>
                  <div className="grid gap-3">
                    {applicants
                      .filter(a => a.name.toLowerCase().includes(searchCandidate.toLowerCase()))
                      .map(app => (
                        <button key={app.id} onClick={() => { setSelectedApp(app); setStep(2); }} className="w-full text-left p-5 bg-white hover:bg-blue-50 rounded-2xl border-4 border-slate-900 flex justify-between items-center transition-all group">
                          <div>
                            <div className="font-black text-slate-900 text-lg uppercase italic leading-none">{app.name}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase mt-1">{app.job_role}</div>
                          </div>
                          <span className="text-blue-600 font-black text-xs opacity-0 group-hover:opacity-100 transition-all">SELECT →</span>
                        </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-[6px_6px_0px_0px_rgba(37,99,235,1)]">
                    <p className="text-[10px] font-black text-blue-400 uppercase mb-1 italic">Target Candidate</p>
                    <div className="text-2xl font-black italic uppercase leading-none">{selectedApp?.name}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <input type="date" className="p-4 border-4 border-slate-900 rounded-2xl font-black text-xs" value={formDate} onChange={e => setFormDate(e.target.value)} />
                    <input type="time" className="p-4 border-4 border-slate-900 rounded-2xl font-black text-xs" value={formTime} onChange={e => setFormTime(e.target.value)} />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 italic tracking-widest">Internal Guest List (Team Only)</label>
                    <div className="flex flex-wrap gap-2">
                      {teamMembers.map(member => (
                        <button key={member.email} onClick={() => toggleGuest(member.email)}
                          className={`px-4 py-2 rounded-xl border-4 font-black text-[10px] uppercase transition-all ${selectedGuests.includes(member.email) ? 'bg-slate-900 text-white border-slate-900 scale-105' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-900'}`}
                        >
                          {member.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* BOTTOM ACTION BUTTONS */}
                  <div className="flex flex-col gap-3 pt-6 border-t-4 border-slate-100">
                    <button onClick={handleSave} disabled={isSyncing} className="w-full py-5 bg-blue-600 text-white rounded-2xl border-4 border-slate-900 font-black text-sm uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-900 transition-all">
                      {isSyncing ? 'Syncing...' : 'Confirm & Sync'}
                    </button>
                    
                    {/* RESTORED: Delete button only in management mode */}
                    {isManagementMode && (
                      <button onClick={confirmDelete} className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl border-2 border-rose-200 font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all">
                        Delete Schedule
                      </button>
                    )}
                    
                    <button onClick={() => setStep(1)} className="w-full py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:underline">
                      ← Back to List
                    </button>
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