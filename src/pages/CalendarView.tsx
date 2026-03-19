// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '../db';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// --- LATEST DEPLOYED GOOGLE SCRIPT ---
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzv6nCvwKtR9vxki_2XTWr5LBS49SYk2LBay_QbVwAnv6wNUK1h_NOplJVYEP7QdCBd/exec';

const MEETING_ROOMS = [
  { name: 'Germanium (GE)', email: 'c_18887npjdt67ih5lmtfgahccqnne8@resource.calendar.google.com' },
  { name: 'Boron', email: 'c_188dehdj2pgbkg8cigve2t5ii5m04@resource.calendar.google.com' },
  { name: 'Einsteinium (2)', email: 'c_188fbblj7f592i03ltk3fiu7lifpu@resource.calendar.google.com' },
  { name: 'Nickel (NI)', email: 'c_188dn1p1rq3ceisunrtpj7nr39d6a@resource.calendar.google.com' },
  { name: 'Room Beside Nickel', email: 'c_1889vgtnlh5dcgvohmmbpskbt1dpm@resource.calendar.google.com' },
  { name: 'Oxygen', email: 'c_18865uvgkdjnihgmmo8sn66r2iadk@resource.calendar.google.com' },
];

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // WIZARD CONTROL
  const [step, setStep] = useState(1);
  const [bypassConflict, setBypassConflict] = useState(false);
  const [duration, setDuration] = useState(60); 

  // FORM DATA
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(''); 
  const [selectedGuests, setSelectedGuests] = useState([]);
  const [customGuest, setCustomGuest] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formTime, setFormTime] = useState('');

  // SCANNING DATA
  const [suggestions, setSuggestions] = useState([]); 
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => { fetchData(); }, []);

  // --- TRIGGER SCAN ON STEP 2 VARIABLES ---
  useEffect(() => {
    if (step === 2 && showModal) {
      handleGenerateSlots();
    }
  }, [formDate, duration, selectedRoom, selectedGuests, step]);

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
            id: `${app.id}_${idx}`,
            candidate: app,
            start: new Date(h.date),
            end: addHours(new Date(h.date), 1),
            title: `INT: ${app.name}`,
            rawDate: h.date
          }))
      );
      setEvents(calendarEvents);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleGenerateSlots = async () => {
    const emailsToCheck = [selectedRoom, ...selectedGuests].filter(Boolean).join(',');
    if (!emailsToCheck) return;
    setIsScanning(true);
    setSuggestions([]);
    try {
      const scanUrl = `${GOOGLE_SCRIPT_URL}?emails=${emailsToCheck}&date=${formDate}&duration=${duration}&mode=scan&ts=${new Date().getTime()}`;
      const resp = await fetch(scanUrl);
      const result = await resp.text();
      if (result.startsWith("SUGGESTIONS:")) {
        setSuggestions(result.split(":")[1].split(",").filter(Boolean));
      }
    } catch (e) { console.error(e); }
    finally { setIsScanning(false); }
  };

  const resetForm = () => {
    setSelectedApp(null); setSelectedRoom(''); setSelectedGuests([]); setDuration(60);
    setStep(1); setBypassConflict(false); setSuggestions([]); setFormTime('');
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleDelete = async () => {
    if (!selectedApp) return;
    if (!window.confirm(`Delete the interview for ${selectedApp.name}?`)) return;

    setIsSyncing(true);
    try {
      const targetDate = `${formDate}T${formTime}:00+08:00`;
      const newHistory = (selectedApp.status_history || []).filter(h => h.date !== targetDate);
      await supabase.from('applicants').update({ status_history: newHistory }).eq('id', selectedApp.id);
      alert("Deleted from ATS!");
      setShowModal(false); resetForm(); fetchData();
    } catch (e) { alert("Error: " + e.message); }
    finally { setIsSyncing(false); }
  };

  const handleSave = async () => {
    if (!formTime && !bypassConflict) return alert("Please select a time slot!");
    setIsSyncing(true);
    try {
      const allGuests = [...selectedGuests, ...(customGuest ? customGuest.split(',').map(e => e.trim()) : [])].join(',');
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST', mode: 'no-cors', 
        body: JSON.stringify({
          name: selectedApp.name, role: selectedApp.job_role, date: formDate, time: formTime,
          guests: allGuests, roomEmail: selectedRoom, duration: duration,
          roomName: MEETING_ROOMS.find(r => r.email === selectedRoom)?.name || 'Online',
          fileBase64: "" 
        })
      });

      const ts = `${formDate}T${formTime}:00+08:00`;
      let history = [...(selectedApp.status_history || []), { status: 'Interview Scheduled', date: ts, isManual: true }];
      await supabase.from('applicants').update({ status_history: history }).eq('id', selectedApp.id);
      
      alert("SUCCESS: Interview Synced!");
      setShowModal(false); resetForm(); fetchData();
    } catch (e) { alert("Error: " + e.message); }
    finally { setIsSyncing(false); }
  };

  if (loading) return <div className="p-20 font-black text-4xl italic uppercase animate-pulse text-blue-600">Loading Scheduler...</div>;

  return (
    <div className="p-10 bg-slate-50 min-h-screen font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10 bg-white p-8 border-4 border-black shadow-[8px_8px_0_0_#000]">
        <div>
          <h1 className="text-5xl font-black italic uppercase leading-none text-slate-900 tracking-tighter">GenieBook</h1>
          <p className="font-bold text-[10px] text-slate-400 mt-2 uppercase italic tracking-widest leading-none">Scheduler v12.0</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-blue-600 text-white p-5 px-10 border-4 border-black font-black uppercase shadow-[4px_4px_0_0_#000] hover:bg-black transition-all">+ NEW BOOKING</button>
      </div>

      {/* CALENDAR VIEW */}
      <div className="h-[750px] border-4 border-black p-4 bg-white shadow-[12px_12px_0_0_#000]">
        <Calendar 
          localizer={localizer} 
          events={events} 
          selectable 
          defaultView="week"
          onSelectEvent={(e) => { 
            setSelectedApp(e.candidate); 
            setFormDate(format(e.start, 'yyyy-MM-dd'));
            setFormTime(format(e.start, 'HH:mm'));
            setStep(3); // Jump straight to finalize
            setShowModal(true); 
          }}
          onSelectSlot={({start}) => { 
            resetForm(); 
            setFormDate(format(start, 'yyyy-MM-dd')); 
            setShowModal(true); 
          }}
          eventPropGetter={() => ({ style: { backgroundColor: '#2563eb', border: '3px solid black' } })}
        />
      </div>

      {/* 3-STEP WIZARD MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white border-8 border-black w-full max-w-4xl max-h-[95vh] overflow-y-auto p-10 shadow-[25px_25px_0_0_#000]">
            
            {/* STEP PROGRESS */}
            <div className="flex gap-2 mb-10">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`h-3 flex-1 border-2 border-black ${step >= i ? 'bg-blue-600' : 'bg-slate-200'}`} />
                ))}
            </div>

            <div className="space-y-8">
              {/* --- STEP 1: CANDIDATE --- */}
              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter">1. Choose Candidate</h2>
                  <select className="w-full p-5 border-4 border-black font-black bg-white text-xl outline-none" value={selectedApp?.id || ''} onChange={e => setSelectedApp(applicants.find(a => a.id === e.target.value))}>
                    <option value="">-- Select Candidate --</option>
                    {applicants.map(a => <option key={a.id} value={a.id}>{a.name} ({a.job_role})</option>)}
                  </select>
                  <button disabled={!selectedApp} onClick={() => setStep(2)} className="w-full p-6 bg-black text-white font-black uppercase shadow-[6px_6px_0_0_#000] hover:bg-blue-600 transition-all">Next: Setup Details →</button>
                </div>
              )}

              {/* --- STEP 2: SETUP & SLOTS --- */}
              {step === 2 && (
                <div className="space-y-6">
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">2. Logistics & Availability</h2>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-yellow-300 border-4 border-black">
                        <label className="font-black text-xs uppercase italic">Interview Date</label>
                        <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full p-3 border-4 border-black font-black bg-white mt-1 outline-none" />
                      </div>

                      <div className="p-4 bg-emerald-100 border-4 border-black">
                        <label className="font-black text-xs uppercase italic">Length</label>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => setDuration(30)} className={`flex-1 p-2 border-4 border-black font-black text-xs ${duration === 30 ? 'bg-emerald-500 text-white' : 'bg-white'}`}>30 MIN</button>
                          <button onClick={() => setDuration(60)} className={`flex-1 p-2 border-4 border-black font-black text-xs ${duration === 60 ? 'bg-emerald-500 text-white' : 'bg-white'}`}>1 HOUR</button>
                        </div>
                      </div>

                      <div className="p-4 bg-white border-4 border-black">
                        <label className="font-black text-xs uppercase italic">Meeting Room</label>
                        <select className="w-full p-3 border-4 border-black font-black mt-2 bg-white outline-none" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
                            <option value="">Virtual Meeting</option>
                            {MEETING_ROOMS.map(r => <option key={r.email} value={r.email}>{r.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="font-black text-xs uppercase italic ml-2">Internal Interviewers</label>
                      <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 border-4 border-black h-[280px] overflow-y-auto">
                          {teamMembers.map(m => (
                              <button key={m.email} onClick={() => setSelectedGuests(prev => prev.includes(m.email) ? prev.filter(x => x !== m.email) : [...prev, m.email])}
                                  className={`p-3 border-4 border-black font-black text-[10px] uppercase transition-all ${selectedGuests.includes(m.email) ? 'bg-blue-600 text-white shadow-none translate-y-1' : 'bg-white shadow-[3px_3px_0_0_#000]'}`}>
                                  {m.name}
                              </button>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* SLOT GENERATOR */}
                  <div className="p-5 border-4 border-black bg-blue-50 space-y-4 shadow-[4px_4px_0_0_#000]">
                    <div className="flex justify-between items-center border-b-2 border-black pb-2">
                        <label className="font-black text-[10px] uppercase italic text-blue-800 tracking-widest">Available Slots (10am - 7pm)</label>
                        {isScanning && <span className="text-[10px] font-black animate-pulse">Scanning...</span>}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {!isScanning && suggestions.map(t => (
                            <button key={t} onClick={() => {setFormTime(t); setBypassConflict(false);}} className={`p-3 border-2 border-black font-black text-[10px] transition-all ${formTime === t ? 'bg-emerald-500 text-white translate-y-1 shadow-none' : 'bg-white shadow-[3px_3px_0_0_#000] hover:bg-yellow-100'}`}>
                                {format(parse(t, 'HH:mm', new Date()), 'hh:mm a')}
                            </button>
                        ))}
                    </div>
                    {!isScanning && suggestions.length === 0 && (
                        <p className="text-rose-600 font-black text-[10px] uppercase text-center py-2 italic tracking-tighter underline">No common free gaps found. Try another date or bypass.</p>
                    )}
                  </div>

                  {/* BYPASS */}
                  <div className="p-4 border-4 border-black bg-slate-100 flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={bypassConflict} onChange={e => setBypassConflict(e.target.checked)} className="w-6 h-6 border-4 border-black bg-white appearance-none checked:bg-rose-600 cursor-pointer transition-all" />
                        <span className="font-black text-xs uppercase italic">Bypass Timing (Force Manual)</span>
                    </label>
                    {bypassConflict && (
                        <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="p-3 border-4 border-black font-black bg-white outline-none" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setStep(1)} className="p-6 border-4 border-black font-black uppercase hover:bg-slate-50">Back</button>
                    <button disabled={!formTime} onClick={() => setStep(3)} className="p-6 bg-black text-white font-black uppercase shadow-[6px_6px_0_0_#000] hover:bg-blue-600 active:translate-y-1 active:shadow-none transition-all">Next: Finalize →</button>
                  </div>
                </div>
              )}

              {/* --- STEP 3: FINALIZE --- */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <h2 className="text-4xl font-black italic uppercase leading-none tracking-tighter">3. Confirmation</h2>
                    {selectedApp && (
                      <button onClick={handleDelete} className="bg-rose-500 text-white p-2 border-2 border-black font-black text-[10px] uppercase shadow-[3px_3px_0_0_#000]">Delete Event</button>
                    )}
                  </div>
                  
                  <div className="bg-slate-900 text-white p-10 border-4 border-black shadow-[10px_10px_0_0_#000] space-y-6">
                      <div className="border-b border-white/20 pb-4">
                        <p className="text-[10px] uppercase font-black opacity-40 mb-1 tracking-widest leading-none">Candidate Name</p>
                        <h3 className="font-black text-4xl uppercase tracking-tighter leading-none">{selectedApp?.name}</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-10">
                        <div>
                          <p className="text-[10px] uppercase font-black opacity-40 mb-1 tracking-widest leading-none">Schedule</p>
                          <p className="font-black text-xl leading-none">{formDate}</p>
                          <p className="font-black text-2xl text-emerald-400 mt-2 leading-none uppercase">{formTime ? format(parse(formTime, 'HH:mm', new Date()), 'hh:mm a') : 'MANUAL'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-black opacity-40 mb-1 tracking-widest leading-none">Room & Duration</p>
                          <p className="font-black text-sm uppercase leading-tight">{MEETING_ROOMS.find(r => r.email === selectedRoom)?.name || 'Online'}</p>
                          <p className="font-black text-sm uppercase opacity-60 mt-2">{duration} Minutes</p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/20">
                         <p className="text-[10px] uppercase font-black opacity-40 mb-2 tracking-widest leading-none">Internal Team</p>
                         <p className="text-xs font-bold leading-relaxed">{selectedGuests.length > 0 ? selectedGuests.join(', ') : 'None selected'}</p>
                      </div>
                  </div>

                  <div className="space-y-2">
                    <p className="font-black uppercase text-xs italic ml-2 leading-none opacity-50 tracking-tighter">Add CC Emails (Janice/Others)</p>
                    <input type="text" value={customGuest} onChange={e => setCustomGuest(e.target.value)} className="w-full p-5 border-4 border-black font-black outline-none bg-white shadow-inner" placeholder="janice.sia@geniebook.com" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <button onClick={() => setStep(2)} className="p-6 border-4 border-black font-black uppercase hover:bg-slate-50 transition-all">← Back</button>
                    <button disabled={isSyncing} onClick={handleSave} className={`p-6 font-black uppercase border-4 border-black shadow-[8px_8px_0_0_#000] active:shadow-none active:translate-y-1 transition-all ${isSyncing ? 'bg-slate-200 text-slate-400 animate-pulse' : 'bg-emerald-500 text-white hover:bg-black hover:text-emerald-500'}`}>
                        {isSyncing ? 'Synchronizing...' : 'Finalize & Sync'}
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