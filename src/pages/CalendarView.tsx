// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '../db';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbySlwyA0acWsgJJTIZxc3L4i2M8oRE7YDkL50B1vopcgEo0FbUZZbVE7ArYivxm04qG/exec';

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false); 
  
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedApp, setSelectedApp] = useState(null);
  const [activeEventDate, setActiveEventDate] = useState(null); 
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
            title: `INTERVIEW: ${app.name}`,
            rawDate: h.date 
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
    if (!selectedApp) return alert("Please select a candidate first.");
    setIsSyncing(true);

    const finalGuestList = [...selectedGuests];
    if (customGuest.trim()) {
      const additional = customGuest.split(',').map(e => e.trim());
      finalGuestList.push(...additional);
    }

    try {
      let base64File = "";
      let fileName = "resume.pdf";
      let contentType = "application/pdf";

      // Logic for File Processing
      if (resumeFile) {
        const reader = new FileReader();
        base64File = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(resumeFile);
        });
        fileName = resumeFile.name;
        contentType = resumeFile.type || "application/pdf";
      } else if (selectedApp.resume_metadata?.url) {
        const resp = await fetch(selectedApp.resume_metadata.url);
        const blob = await resp.blob();
        base64File = await new Promise((resolve) => {
          const r = new FileReader();
          r.onloadend = () => resolve(r.result.split(',')[1]);
          r.readAsDataURL(blob);
        });
        contentType = blob.type || "application/pdf";
      }

      // 1. POST to Google Script
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          name: selectedApp.name,
          role: selectedApp.job_role,
          date: formDate,
          time: formTime,
          fileName: fileName,
          fileBase64: base64File,
          contentType: contentType, // Added back for safety
          guests: finalGuestList.join(',')
        })
      });

      // 2. Update Supabase History
      const finalTimestamp = `${formDate}T${formTime}:00+08:00`;
      let updatedHistory = [...(selectedApp.status_history || [])];

      if (isManagementMode) {
        const matchIdx = updatedHistory.findIndex(h => h.date === activeEventDate);
        if (matchIdx > -1) updatedHistory[matchIdx].date = finalTimestamp;
      } else {
        updatedHistory.push({ status: 'Interviewing', date: finalTimestamp, isManual: true });
      }

      const { error } = await supabase.from('applicants')
        .update({ status: 'Interviewing', status_history: updatedHistory })
        .eq('id', selectedApp.id);

      if (error) throw error;

      setShowModal(false);
      resetForm();
      fetchData();
      alert("Success! Calendar updated and invitation sent.");
    } catch (err) { 
      alert("Error saving: " + err.message); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const confirmDelete = async () => {
    if (!activeEventDate || !window.confirm("Are you sure you want to delete this interview record?")) return;
    
    try {
      setIsSyncing(true);
      const { data: fresh } = await supabase.from('applicants').select('status_history').eq('id', selectedApp.id).single();
      const newHistory = (fresh.status_history || []).filter(h => h.date !== activeEventDate);
      
      await supabase.from('applicants').update({ status_history: newHistory }).eq('id', selectedApp.id);
      
      setShowModal(false);
      fetchData();
    } catch (e) {
      alert("Delete failed: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const resetForm = () => {
    setSelectedGuests([]);
    setCustomGuest('');
    setResumeFile(null);
    setSearchCandidate('');
    setActiveEventDate(null);
    setStep(1);
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-black text-blue-600 text-4xl italic animate-pulse">
      SYNCING CALENDAR...
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-10 pb-32">
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center mb-10 transition-colors">
        <div>
          <h1 className="text-6xl font-black text-slate-900 dark:text-white italic tracking-tighter uppercase leading-none">Scheduler</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] mt-2 tracking-widest">Manage Interviews & Google Sync</p>
        </div>
        <button 
          onClick={() => { setIsManagementMode(false); setStep(1); setShowModal(true); }} 
          className="bg-blue-600 text-white px-10 py-5 rounded-2xl border-4 border-slate-900 font-black text-xs uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-900 transition-all active:translate-y-1 active:shadow-none"
        >
          + Create Event
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border-4 border-slate-900 shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] h-[850px] transition-colors overflow-hidden">
        <Calendar 
          localizer={localizer} 
          events={events} 
          selectable 
          defaultView="week"
          onSelectEvent={(e) => { 
            setSelectedApp(e.candidate); 
            setActiveEventDate(e.rawDate); 
            setIsManagementMode(true); 
            setStep(2); 
            setShowModal(true); 
            setFormDate(format(e.start, 'yyyy-MM-dd'));
            setFormTime(format(e.start, 'HH:mm'));
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
              backgroundColor: '#2563eb', 
              borderRadius: '12px', 
              border: '3px solid #0f172a', 
              fontWeight: '900', 
              fontSize: '11px',
              boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.1)'
            } 
          })}
        />
      </div>

      {/* Scheduler Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[4rem] border-8 border-slate-900 shadow-[30px_30px_0px_0px_rgba(0,0,0,0.2)] flex flex-col max-h-[90vh] overflow-hidden transition-colors">
            
            <div className={`p-10 text-white flex justify-between items-center shrink-0 ${isManagementMode ? 'bg-blue-600' : 'bg-slate-900'}`}>
              <div>
                <h3 className="text-4xl font-black italic uppercase tracking-tighter">
                  {isManagementMode ? 'Edit Interview' : 'Step ' + step}
                </h3>
                <p className="text-[10px] font-bold uppercase opacity-60 tracking-widest">
                  {isManagementMode ? 'Update existing schedule' : 'Selecting Candidate'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-3xl font-black hover:rotate-90 transition-transform">✕</button>
            </div>

            <div className="p-10 space-y-8 overflow-y-auto flex-grow bg-slate-50/30 dark:bg-slate-800/30">
              {step === 1 ? (
                <div className="space-y-6">
                  <input 
                    type="text" 
                    placeholder="Search candidate name..." 
                    className="w-full p-6 border-4 border-slate-900 rounded-3xl font-black outline-none uppercase text-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:bg-slate-800" 
                    value={searchCandidate} 
                    onChange={e => setSearchCandidate(e.target.value)} 
                  />
                  <div className="grid gap-4">
                    {applicants
                      .filter(a => a.name.toLowerCase().includes(searchCandidate.toLowerCase()))
                      .map(app => (
                        <button key={app.id} onClick={() => { setSelectedApp(app); setStep(2); }} className="w-full text-left p-6 bg-white dark:bg-slate-800 hover:bg-blue-600 hover:text-white rounded-3xl border-4 border-slate-900 flex justify-between items-center transition-all group active:scale-95 shadow-md">
                          <div>
                            <div className="font-black text-xl uppercase italic leading-none">{app.name}</div>
                            <div className="text-[10px] font-black opacity-50 uppercase mt-2 tracking-widest">{app.job_role}</div>
                          </div>
                          <span className="font-black text-xs">SELECT →</span>
                        </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Candidate Profile Box */}
                  <div className="bg-slate-900 dark:bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-[0.2em]">Selected Candidate</p>
                        <div className="text-3xl font-black italic uppercase leading-none">{selectedApp?.name}</div>
                    </div>
                    {isManagementMode && <span className="bg-white/20 px-4 py-2 rounded-full text-[10px] font-black">EDIT MODE</span>}
                  </div>

                  {/* Time & Date Inputs */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase text-slate-400 ml-4 italic">Date</label>
                      <input type="date" className="w-full p-5 border-4 border-slate-900 rounded-[2rem] font-black text-sm outline-none dark:bg-slate-800" value={formDate} onChange={e => setFormDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase text-slate-400 ml-4 italic">Time</label>
                      <input type="time" className="w-full p-5 border-4 border-slate-900 rounded-[2rem] font-black text-sm outline-none dark:bg-slate-800" value={formTime} onChange={e => setFormTime(e.target.value)} />
                    </div>
                  </div>

                  {/* Guest Selection */}
                  <div className="space-y-4">
                    <label className="text-[11px] font-black uppercase text-slate-400 ml-4 italic">Internal Interviewers</label>
                    <div className="flex flex-wrap gap-3 p-2">
                      {teamMembers.map(member => (
                        <button key={member.email} onClick={() => toggleGuest(member.email)}
                          className={`px-6 py-3 rounded-2xl border-4 font-black text-[11px] uppercase transition-all ${selectedGuests.includes(member.email) ? 'bg-blue-600 text-white border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-900'}`}
                        >
                          {member.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-4 pt-10 border-t-8 border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={handleSave} 
                      disabled={isSyncing} 
                      className={`w-full py-6 rounded-[2rem] border-4 border-slate-900 font-black text-sm uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-3 ${isSyncing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-500 text-white hover:bg-slate-900 hover:shadow-none'}`}
                    >
                      {isSyncing ? (
                         <>
                           <span className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></span>
                           SYNCING...
                         </>
                      ) : 'Confirm Schedule & Notify'}
                    </button>
                    
                    {isManagementMode && (
                      <button onClick={confirmDelete} className="w-full py-4 text-rose-500 font-black text-[10px] uppercase tracking-widest hover:underline transition-all">
                        Delete This Schedule Entry
                      </button>
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