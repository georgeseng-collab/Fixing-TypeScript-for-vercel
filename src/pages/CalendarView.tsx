// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '../db';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzPtaJGgrcP6YQqNkbZz0J25iS7_FuXjPCzEtBex5jq-WrPKf9C867z3zhhH99NUheR/exec';

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false); 
  
  const [showModal, setShowModal] = useState(false);
  const [isManagementMode, setIsManagementMode] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  
  const [searchCandidate, setSearchCandidate] = useState('');
  const [guestEmails, setGuestEmails] = useState(''); // NEW: Guest list state
  const [resumeFile, setResumeFile] = useState(null);
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formTime, setFormTime] = useState('10:00');

  const fetchData = async () => {
    try {
      const { data, error } = await supabase.from('applicants').select('*');
      if (error) throw error;
      setApplicants(data || []);
      
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

  const handleSave = async () => {
    if (!selectedApp) return alert("Select a candidate first");
    setIsSyncing(true);

    try {
      let base64File = "";
      let fileName = "resume.pdf";
      let contentType = "application/pdf";

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
        } catch (e) { console.warn("Resume retrieval failed:", e); }
      }

      // Sync to Google including Guests
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
          guests: guestEmails // NEW: Sending guest list string
        })
      });

      const finalTimestamp = `${formDate}T${formTime}:00+08:00`;
      let updatedHistory = [...(selectedApp.status_history || [])];

      if (isManagementMode) {
        const idx = parseInt(selectedEventId.split('___')[1]);
        if (updatedHistory[idx]) {
          updatedHistory[idx].date = finalTimestamp;
          updatedHistory[idx].isManual = true;
        }
      } else {
        updatedHistory.push({ 
          status: 'Interviewing', 
          date: finalTimestamp, 
          isManual: true 
        });
      }

      await supabase.from('applicants').update({ 
        status: 'Interviewing', 
        status_history: updatedHistory 
      }).eq('id', selectedApp.id);

      alert("Success! Google Calendar updated and Invites Sent.");
      setShowModal(false);
      setGuestEmails(''); // Clear guests
      setResumeFile(null);
      fetchData();
    } catch (err) {
      alert("Sync Error: " + err.message);
    } finally { setIsSyncing(false); }
  };

  const confirmDelete = async () => {
    if (!selectedEventId) return;
    const [candId, idxStr] = selectedEventId.split('___');
    const { data: fresh } = await supabase.from('applicants').select('status_history').eq('id', candId).single();
    const newHistory = [...(fresh?.status_history || [])];
    newHistory.splice(parseInt(idxStr), 1);
    await supabase.from('applicants').update({ status_history: newHistory }).eq('id', candId);
    setShowModal(false);
    fetchData();
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="font-black text-blue-600 text-6xl animate-pulse italic tracking-tighter uppercase">GENIEBOOK</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 relative pb-32">
      <div className="bg-white p-12 rounded-[4rem] border-4 border-slate-900 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center mb-12">
        <div>
          <h1 className="text-6xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">Scheduler</h1>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mt-2">Manual Interview Bookings Only</p>
        </div>
        <button 
          onClick={() => { setIsManagementMode(false); setStep(1); setShowModal(true); }} 
          className="bg-blue-600 text-white px-12 py-6 rounded-[2.5rem] border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-black text-xs uppercase tracking-widest hover:translate-y-[-4px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          + New Schedule
        </button>
      </div>

      <div className="bg-white p-10 rounded-[4.5rem] border-4 border-slate-900 shadow-[20px_20px_0px_0px_rgba(15,23,42,1)]" style={{ height: '800px' }}>
        <Calendar 
          localizer={localizer} 
          events={events} 
          selectable 
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
          defaultView="week"
          eventPropGetter={() => ({ 
            style: { 
              backgroundColor: '#3b82f6', 
              borderRadius: '20px', 
              border: '3px solid #0f172a', 
              fontWeight: '900',
              textTransform: 'uppercase',
              fontSize: '10px',
              padding: '4px 10px'
            } 
          })}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[4rem] border-8 border-slate-900 shadow-[25px_25px_0px_0px_rgba(0,0,0,1)] overflow-hidden relative animate-in zoom-in duration-200">
            
            {isSyncing && (
              <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 border-8 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-black text-slate-900 text-xs uppercase tracking-widest italic">Syncing to Google...</p>
              </div>
            )}

            <div className={`p-12 text-white flex justify-between items-center ${isManagementMode ? 'bg-blue-600' : 'bg-slate-900'}`}>
              <h3 className="text-4xl font-black italic uppercase tracking-tighter">{isManagementMode ? 'Manage' : 'Step ' + step}</h3>
              <button onClick={() => setShowModal(false)} className="text-3xl font-black opacity-30 hover:opacity-100 transition-opacity">✕</button>
            </div>

            <div className="p-12 space-y-8">
              {step === 1 ? (
                <div className="space-y-6">
                  <input 
                    type="text" 
                    placeholder="Search candidate..." 
                    className="w-full p-6 bg-slate-50 border-4 border-slate-900 rounded-[2rem] font-black outline-none shadow-inner uppercase text-sm" 
                    value={searchCandidate} 
                    onChange={e => setSearchCandidate(e.target.value)} 
                  />
                  <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar">
                    {applicants
                      .filter(a => a.name.toLowerCase().includes(searchCandidate.toLowerCase()))
                      .map(app => (
                        <button 
                          key={app.id} 
                          onClick={() => { setSelectedApp(app); setStep(2); }} 
                          className="w-full text-left p-6 bg-white hover:bg-blue-50 rounded-[2.5rem] border-4 border-slate-900 flex justify-between items-center group transition-all shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:translate-x-1 hover:translate-y-[-2px]"
                        >
                          <div>
                            <div className="font-black text-slate-900 text-xl uppercase tracking-tighter italic">{app.name}</div>
                            <div className="text-[9px] uppercase font-black text-slate-400 tracking-widest">{app.job_role}</div>
                          </div>
                          <span className="text-blue-600 font-black text-xs opacity-0 group-hover:opacity-100 transition-all">SELECT →</span>
                        </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="bg-slate-900 p-8 rounded-[3rem] text-white border-4 border-slate-900">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Target Candidate</p>
                    <div className="text-3xl font-black italic uppercase tracking-tighter leading-none">{selectedApp?.name}</div>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Date & Time</label>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="date" className="p-5 bg-slate-50 border-4 border-slate-900 rounded-[2rem] font-black outline-none uppercase text-xs" value={formDate} onChange={e => setFormDate(e.target.value)} />
                      <input type="time" className="p-5 bg-slate-50 border-4 border-slate-900 rounded-[2rem] font-black outline-none uppercase text-xs" value={formTime} onChange={e => setFormTime(e.target.value)} />
                    </div>
                  </div>

                  {/* NEW GUEST INVITE FIELD */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest italic">Invite Interviewers (Emails)</label>
                    <input 
                      type="text" 
                      placeholder="interviewer1@geniebook.com, boss@geniebook.com"
                      className="w-full p-5 bg-slate-50 border-4 border-slate-900 rounded-[2rem] font-bold outline-none text-xs" 
                      value={guestEmails}
                      onChange={e => setGuestEmails(e.target.value)}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Attachment</label>
                    <input 
                      type="file" 
                      className="w-full p-4 bg-slate-50 border-4 border-slate-900 rounded-[2rem] text-[10px] font-black uppercase" 
                      onChange={(e) => setResumeFile(e.target.files?.[0] || null)} 
                    />
                  </div>

                  <div className="flex flex-col gap-4 pt-4">
                    <button 
                      onClick={handleSave} 
                      className="w-full py-6 bg-blue-600 text-white rounded-[2.5rem] border-4 border-slate-900 font-black text-sm uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-4px] active:translate-y-[2px] transition-all"
                    >
                        Confirm & Sync
                    </button>
                    {isManagementMode ? (
                        <button onClick={confirmDelete} className="w-full py-4 text-rose-600 font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 rounded-2xl transition-all">Delete Schedule</button>
                    ) : (
                        <button onClick={() => setStep(1)} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Back</button>
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