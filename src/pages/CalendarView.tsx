// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours, isWeekend } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '../db';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// --- LATEST SCRIPT URL ---
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyBzu5QfSOF0P-P5vaQYAZk9vgM2r92pfoNKJXTvakQxYpvisRa6GlnAIcjtZvUgqNw/exec';

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
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

  // SCANNING & DIAGNOSTIC DATA
  const [suggestions, setSuggestions] = useState([]); 
  const [unreachableEmails, setUnreachableEmails] = useState([]); 
  const [roomAlt, setRoomAlt] = useState([]); 
  const [busyPeople, setBusyPeople] = useState([]); 
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    setHasScanned(false);
    setSuggestions([]);
    setUnreachableEmails([]);
    setRoomAlt([]);
    setBusyPeople([]);
  }, [formDate, duration, selectedRoom, selectedGuests]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: apps } = await supabase.from('applicants').select('*');
      const { data: team } = await supabase.from('team_members').select('*');
      setApplicants(apps || []);
      setTeamMembers(team || []);
      
      const calendarEvents = (apps || []).flatMap(app => (app.status_history || [])
        .filter(h => h && h.isManual === true)
        .map((h, i) => ({
          id: `${app.id}_${i}`, 
          candidate: app, 
          start: new Date(h.date), 
          end: addHours(new Date(h.date), 1), 
          title: app.name,
          role: app.job_role,
          rawDate: h.date
        })));
      setEvents(calendarEvents);
    } finally { setLoading(false); }
  };

  // --- PREMIUM CALENDAR CUSTOMIZATION ---
  const eventStyleGetter = (event) => ({
    style: {
      backgroundColor: '#0f172a', 
      borderRadius: '8px',
      color: 'white',
      border: 'none',
      borderLeft: '5px solid #3b82f6',
      boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)',
      fontSize: '11px',
      fontWeight: '900',
      padding: '4px 8px'
    }
  });

  const CustomEvent = ({ event }) => (
    <div className="flex flex-col leading-none overflow-hidden text-left">
      <span className="uppercase italic tracking-tighter truncate">{event.title}</span>
      <span className="text-[8px] opacity-50 mt-1 font-bold truncate tracking-widest leading-none">{event.role}</span>
    </div>
  );

  const handleManualScan = async () => {
    const emailsToCheck = [selectedRoom, ...selectedGuests].filter(Boolean).join(',');
    setIsScanning(true);
    setHasScanned(true);
    setBusyPeople([]);

    try {
      const scanUrl = `${GOOGLE_SCRIPT_URL}?emails=${encodeURIComponent(emailsToCheck)}&date=${formDate}&duration=${duration}&time=${formTime || '10:00'}&mode=scan&ts=${new Date().getTime()}`;
      const resp = await fetch(scanUrl);
      const result = await resp.text();

      if (result.includes("UNREACHABLE:")) {
        setUnreachableEmails(result.split("UNREACHABLE:")[1].split("|")[0].split(",").filter(Boolean));
      }
      if (result.includes("SUGGESTIONS:")) {
        setSuggestions(result.split("SUGGESTIONS:")[1].split("|")[0].split(",").filter(s => s.trim() !== ""));
      }
      if (result.includes("BUSY_PEOPLE:")) {
        setBusyPeople(result.split("BUSY_PEOPLE:")[1].split("|")[0].split(",").filter(Boolean));
      }
      if (result.includes("ROOM_ALT:")) {
        const alts = result.split("ROOM_ALT:")[1].split(";").map(str => {
          const [name, email] = str.split("||");
          return { name, email };
        });
        setRoomAlt(alts);
      }
    } catch (e) { console.error("Scan Error:", e); }
    finally { setIsScanning(false); }
  };

  const resetForm = () => {
    setSelectedApp(null); setSelectedRoom(''); setSelectedGuests([]); setDuration(60);
    setStep(1); setBypassConflict(false); setSuggestions([]); setFormTime('');
    setHasScanned(false); setUnreachableEmails([]); setRoomAlt([]); setBusyPeople([]);
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleDelete = async () => {
    if (!selectedApp) return;
    if (!window.confirm(`PERMANENTLY DELETE interview for ${selectedApp.name}?`)) return;
    setIsSyncing(true);
    try {
      const targetDate = `${formDate}T${formTime}:00+08:00`;
      const newHistory = (selectedApp.status_history || []).filter(h => h.date !== targetDate);
      await supabase.from('applicants').update({ status_history: newHistory }).eq('id', selectedApp.id);
      setShowModal(false); resetForm(); fetchData();
    } finally { setIsSyncing(false); }
  };

  const handleSave = async () => {
    if (!formTime && !bypassConflict) return;
    setIsSyncing(true);
    try {
      const allGuests = [...selectedGuests, ...(customGuest ? customGuest.split(',').map(e => e.trim()) : [])].join(',');
      
      let base64Resume = "";
      if (selectedApp.resume_metadata?.url) {
        try {
          const fileResp = await fetch(selectedApp.resume_metadata.url);
          const blob = await fileResp.blob();
          base64Resume = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
          });
        } catch (err) { console.error("Storage fetch failed:", err); }
      }

      const payload = {
        name: selectedApp.name,
        role: selectedApp.job_role,
        date: formDate,
        time: formTime,
        guests: allGuests,
        roomEmail: selectedRoom,
        roomName: MEETING_ROOMS.find(r => r.email === selectedRoom)?.name || 'Online',
        duration: duration,
        fileBase64: base64Resume 
      };

      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST', mode: 'no-cors', 
        body: JSON.stringify(payload)
      });

      const ts = `${formDate}T${formTime}:00+08:00`;
      let history = [...(selectedApp.status_history || []), { status: 'Interview Scheduled', date: ts, isManual: true }];
      await supabase.from('applicants').update({ status_history: history }).eq('id', selectedApp.id);
      
      setShowModal(false);
      setShowSuccessModal(true);
      fetchData();
    } finally { setIsSyncing(false); }
  };

  return (
    <div className="p-10 bg-slate-50 min-h-screen font-sans text-slate-900">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10 bg-white p-8 rounded-3xl border-4 border-black shadow-[8px_8px_0_0_#000]">
        <h1 className="text-5xl font-black italic uppercase leading-none tracking-tighter">GenieBook Scheduler</h1>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-blue-600 text-white p-5 px-10 border-4 border-black font-black uppercase shadow-[4px_4px_0_0_#000] hover:bg-black transition-all">+ NEW BOOKING</button>
      </div>

      {/* CALENDAR BODY */}
      <div className="h-[750px] border-4 border-black p-4 bg-white rounded-3xl shadow-[12px_12px_0_0_#000]">
        <Calendar 
          localizer={localizer} 
          events={events} 
          selectable 
          defaultView="week"
          eventPropGetter={eventStyleGetter}
          components={{ event: CustomEvent }}
          onSelectEvent={(e) => { 
            setSelectedApp(e.candidate); setFormDate(format(e.start, 'yyyy-MM-dd')); setFormTime(format(e.start, 'HH:mm')); setStep(3); setShowModal(true); 
          }}
          onSelectSlot={({start}) => { resetForm(); setFormDate(format(start, 'yyyy-MM-dd')); setShowModal(true); }}
        />
      </div>

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-6 backdrop-blur-md">
            <div className="bg-white border-8 border-black p-12 rounded-[3rem] max-w-md w-full text-center shadow-[20px_20px_0_0_#000] animate-in zoom-in duration-300">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 border-4 border-black font-black">✓</div>
                <h2 className="text-3xl font-black uppercase italic mb-2 text-black">Sync Complete</h2>
                <p className="font-bold text-slate-500 mb-8 uppercase text-xs tracking-widest leading-tight">Calendar invite sent & Resume linked to Drive</p>
                <button onClick={() => { setShowSuccessModal(false); resetForm(); }} className="w-full bg-black text-white p-5 rounded-2xl font-black uppercase tracking-tighter hover:bg-blue-600 transition-all">Back to Dashboard</button>
            </div>
        </div>
      )}

      {/* MAIN WIZARD MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white border-8 border-black w-full max-w-4xl max-h-[95vh] overflow-y-auto p-10 rounded-[3rem] shadow-[25px_25px_0_0_#000] text-left">
            
            <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
                <div className="flex gap-2 w-1/2">
                    {[1, 2, 3].map(i => <div key={i} className={`h-3 flex-1 border-2 border-black ${step >= i ? 'bg-blue-600' : 'bg-slate-200'}`} />)}
                </div>
                <div className="flex items-center gap-4">
                    {selectedApp && <button onClick={handleDelete} className="bg-rose-600 text-white p-2 border-2 border-black font-black text-[10px] uppercase shadow-[3px_3px_0_0_#000] hover:bg-black transition-all">Delete</button>}
                    <button onClick={() => setShowModal(false)} className="text-4xl font-black hover:rotate-90 transition-transform leading-none">✕</button>
                </div>
            </div>

            <div className="space-y-8">
              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="text-4xl font-black italic uppercase leading-none text-black">1. Choose Candidate</h2>
                  <select className="w-full p-5 border-4 border-black font-black bg-white text-xl rounded-2xl" value={selectedApp?.id || ''} onChange={e => setSelectedApp(applicants.find(a => a.id === e.target.value))}>
                    <option value="">-- Search Applicant --</option>
                    {applicants.map(a => <option key={a.id} value={a.id}>{a.name} ({a.job_role})</option>)}
                  </select>
                  
                  {selectedApp && (
                    <div className={`p-4 border-2 border-black rounded-xl font-black text-xs uppercase italic flex items-center gap-3 ${selectedApp.resume_metadata?.url ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        <span>{selectedApp.resume_metadata?.url ? '✓ Resume storage link verified' : '⚠️ No Resume found in storage'}</span>
                    </div>
                  )}
                  <button disabled={!selectedApp} onClick={() => setStep(2)} className="w-full p-6 bg-black text-white font-black uppercase shadow-[8px_8px_0_0_#000] hover:bg-blue-600 transition-all rounded-2xl">Setup Logistics →</button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none text-black">2. Logistics & Scanning</h2>
                  
                  {hasScanned && (busyPeople.length > 0 || (roomAlt.length > 0 && selectedRoom && !suggestions.includes(formTime))) && (
                    <div className="space-y-3">
                      {busyPeople.length > 0 && (
                        <div className="p-5 bg-amber-100 border-4 border-amber-500 rounded-2xl shadow-[6px_6px_0_0_#f59e0b]">
                            <p className="font-black uppercase text-xs text-amber-700">⚠️ Personnel Conflict!</p>
                            <p className="text-[10px] font-bold mt-1 text-amber-900 opacity-80 uppercase leading-none">Busy: {busyPeople.map(email => teamMembers.find(t => t.email === email)?.name || email).join(", ")}</p>
                        </div>
                      )}
                      {roomAlt.length > 0 && selectedRoom && !suggestions.includes(formTime) && (
                        <div className="p-5 bg-rose-600 border-4 border-black shadow-[6px_6px_0_0_#000] text-white animate-pulse rounded-2xl">
                          <p className="font-black uppercase text-xs tracking-widest">⚠️ Room Busy! Suggested:</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {roomAlt.map(alt => ( <button key={alt.email} onClick={() => { setSelectedRoom(alt.email); handleManualScan(); }} className="bg-white text-rose-600 px-4 py-1.5 rounded-lg border-2 border-black font-black text-[10px] hover:bg-yellow-300 transition-all uppercase">Use {alt.name}</button> ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-yellow-300 border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#000]">
                        <label className="font-black text-[10px] uppercase italic text-black">Date {isWeekend(new Date(formDate)) && "⚠️ WKND"}</label>
                        <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full p-2 border-2 border-black font-black bg-white mt-1 rounded-xl text-black" />
                      </div>
                      <div className="p-4 bg-emerald-100 border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#000]">
                        <label className="font-black text-[10px] uppercase italic text-black">Duration</label>
                        <div className="flex gap-2 mt-2">
                          {[30, 60].map(m => ( <button key={m} onClick={() => setDuration(m)} className={`flex-1 p-2 border-2 border-black font-black text-xs rounded-xl ${duration === m ? 'bg-emerald-500 text-white shadow-none' : 'bg-white shadow-[2px_2px_0_0_#000] text-black'}`}>{m} MIN</button> ))}
                        </div>
                      </div>
                      <div className="p-4 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#000]">
                        <label className="font-black text-[10px] uppercase italic text-black">Meeting Room</label>
                        <select className="w-full p-2 border-2 border-black font-black mt-1 outline-none rounded-xl bg-white text-black" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
                            <option value="">Virtual Session</option>
                            {MEETING_ROOMS.map(r => <option key={r.email} value={r.email}>{r.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="font-black text-[10px] uppercase italic ml-2 text-black text-left block">Internal Panel</label>
                      <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 border-4 border-black h-[260px] overflow-y-auto rounded-2xl shadow-[4px_4px_0_0_#000]">
                          {teamMembers.map(m => (
                            <button key={m.email} onClick={() => setSelectedGuests(prev => prev.includes(m.email) ? prev.filter(x => x !== m.email) : [...prev, m.email])}
                                className={`p-2 border-2 border-black font-black text-[10px] uppercase transition-all rounded-xl ${selectedGuests.includes(m.email) ? 'bg-blue-600 text-white translate-y-1' : 'bg-white shadow-[2px_2px_0_0_#000] text-black'} ${unreachableEmails.includes(m.email) ? 'opacity-40 italic' : ''}`}>
                                {m.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div className={`p-6 border-4 border-black bg-blue-50 shadow-[8px_8px_0_0_#000] min-h-[200px] rounded-[2rem] transition-all`}>
                    {!hasScanned ? (
                      <div className="flex flex-col items-center">
                        <button onClick={handleManualScan} className="w-full bg-blue-600 text-white font-black p-5 px-12 border-4 border-black shadow-[4px_4px_0_0_#000] hover:bg-black uppercase italic rounded-2xl transition-all">Scan Available Slots</button>
                        <p className="text-[10px] font-black uppercase mt-4 opacity-40 text-black">10:00 AM - 07:00 PM Organization Window</p>
                      </div>
                    ) : isScanning ? (
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 border-8 border-black border-t-blue-600 animate-spin mb-4 rounded-full"></div>
                        <p className="font-black text-xs animate-pulse text-black uppercase italic tracking-widest">Pinging Google...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="font-black text-[10px] uppercase italic text-black text-center tracking-tighter">Verified Free Gaps ({duration}m):</p>
                        <div className="grid grid-cols-5 gap-2">
                          {suggestions.map(t => (
                            <button key={t} onClick={() => {setFormTime(t); setBypassConflict(false);}} className={`p-2 border-2 border-black font-black text-[10px] rounded-xl transition-all ${formTime === t ? 'bg-emerald-500 text-white' : 'bg-white shadow-[3px_3px_0_0_#000] hover:bg-yellow-100 text-black'}`}>
                              {format(parse(t, 'HH:mm', new Date()), 'hh:mm a')}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-4 border-black bg-slate-100 flex items-center justify-between rounded-2xl">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={bypassConflict} onChange={e => setBypassConflict(e.target.checked)} className="w-6 h-6 border-4 border-black bg-white appearance-none checked:bg-rose-600 cursor-pointer rounded-lg" />
                        <span className="font-black text-xs uppercase italic text-black group-hover:text-blue-600">Bypass Scan (Force Manual)</span>
                    </label>
                    {bypassConflict && ( <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="p-2 border-2 border-black font-black bg-white outline-none rounded-lg text-black" /> )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setStep(1)} className="p-4 border-4 border-black font-black rounded-2xl text-black uppercase tracking-widest">Back</button>
                    <button disabled={!formTime} onClick={() => setStep(3)} className="p-4 bg-black text-white font-black uppercase shadow-[6px_6px_0_0_#000] active:translate-y-1 transition-all rounded-2xl tracking-widest">Finalize →</button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none border-b-4 border-black pb-4 text-black">3. Final Review</h2>
                  
                  <div className="bg-slate-900 text-white p-10 border-4 border-black rounded-[2.5rem] shadow-[12px_12px_0_0_#000] space-y-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-10 opacity-10 font-black text-8xl italic uppercase">ATS</div>
                      <div className="relative z-10 text-left">
                        <div className="border-b border-white/20 pb-4 mb-6">
                            <p className="text-[10px] uppercase font-black opacity-40 mb-1 tracking-widest text-white">Applicant</p>
                            <h3 className="font-black text-5xl uppercase tracking-tighter text-white leading-none truncate">{selectedApp?.name}</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-10">
                            <div>
                                <p className="text-[10px] uppercase font-black opacity-40 text-white tracking-widest">Schedule</p>
                                <p className="font-black text-2xl italic text-white uppercase mt-1">{formDate}</p>
                                <p className="font-black text-4xl text-emerald-400 mt-2 uppercase">{formTime}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black opacity-40 text-white tracking-widest">Venue</p>
                                <p className="font-black text-xl leading-tight uppercase text-white underline decoration-emerald-500 mt-1">{MEETING_ROOMS.find(r => r.email === selectedRoom)?.name || 'Online'}</p>
                                <p className="font-black text-[10px] uppercase opacity-60 mt-3 italic text-white">{duration} Minute Session</p>
                            </div>
                        </div>
                      </div>
                  </div>

                  <div className="space-y-1 text-left">
                    <p className="text-[9px] font-black uppercase italic ml-2 opacity-50 tracking-tighter text-black">Email CC (janice.sia@geniebook.com)</p>
                    <input type="text" value={customGuest} onChange={e => setCustomGuest(e.target.value)} className="w-full p-5 border-4 border-black font-black outline-none bg-white rounded-2xl shadow-inner text-lg text-black" placeholder="Add guest emails..." />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <button onClick={() => setStep(2)} className="p-5 border-4 border-black font-black uppercase hover:bg-slate-50 transition-all rounded-2xl italic text-black">← Logistics</button>
                    <button disabled={isSyncing} onClick={handleSave} className={`p-5 font-black uppercase border-4 border-black shadow-[8px_8px_0_0_#000] active:translate-y-1 transition-all rounded-2xl ${isSyncing ? 'bg-slate-200 text-slate-400 animate-pulse' : 'bg-emerald-500 text-white hover:bg-black underline decoration-white'}`}>
                        {isSyncing ? 'Synchronizing...' : 'Finalize & Sync Booking'}
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