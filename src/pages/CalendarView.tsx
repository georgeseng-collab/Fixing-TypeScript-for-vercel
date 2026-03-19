// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours, isWeekend } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '../db';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// --- UPDATED GOOGLE SCRIPT URL ---
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx97V6FDvGhHmQ3m-SJOZVHnuWVM8luEsclreT0N9TtFOIXbtdSdYaqqVwNtVTMg8jE/exec';

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

  // SCANNING & VALIDATION DATA
  const [suggestions, setSuggestions] = useState([]); 
  const [unreachableEmails, setUnreachableEmails] = useState([]); 
  const [roomAlt, setRoomAlt] = useState([]); // New: Suggestion storage
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  useEffect(() => { fetchData(); }, []);

  // Reset scan results if logistics change
  useEffect(() => {
    setHasScanned(false);
    setSuggestions([]);
    setUnreachableEmails([]);
    setRoomAlt([]);
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
          title: `INT: ${app.name}`,
          rawDate: h.date
        })));
      setEvents(calendarEvents);
    } finally { setLoading(false); }
  };

  const handleManualScan = async () => {
    const emailsToCheck = [selectedRoom, ...selectedGuests].filter(Boolean).join(',');
    setIsScanning(true);
    setHasScanned(true);
    setUnreachableEmails([]);
    setRoomAlt([]);

    try {
      // Logic: If room is busy, the script returns ROOM_ALT data
      const scanUrl = `${GOOGLE_SCRIPT_URL}?emails=${encodeURIComponent(emailsToCheck)}&date=${formDate}&duration=${duration}&time=${formTime || '10:00'}&mode=scan&ts=${new Date().getTime()}`;
      const resp = await fetch(scanUrl);
      const result = await resp.text();

      if (result.includes("UNREACHABLE:")) {
        const list = result.split("UNREACHABLE:")[1].split("|")[0].split(",").filter(Boolean);
        setUnreachableEmails(list);
      }

      if (result.includes("SUGGESTIONS:")) {
        const slots = result.split("SUGGESTIONS:")[1].split("|")[0].split(",").filter(s => s.trim() !== "");
        setSuggestions(slots);
      }

      // NEW: Catch Alternative Room Recommendations from Script
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
    setHasScanned(false); setUnreachableEmails([]); setRoomAlt([]); setFormDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleDelete = async () => {
    if (!selectedApp) return;
    if (!window.confirm(`PERMANENTLY DELETE interview for ${selectedApp.name}?`)) return;
    setIsSyncing(true);
    try {
      const targetDate = `${formDate}T${formTime}:00+08:00`;
      const newHistory = (selectedApp.status_history || []).filter(h => h.date !== targetDate);
      await supabase.from('applicants').update({ status_history: newHistory }).eq('id', selectedApp.id);
      alert("DELETED");
      setShowModal(false); resetForm(); fetchData();
    } finally { setIsSyncing(false); }
  };

  const handleSave = async () => {
    if (!formTime && !bypassConflict) return alert("Please select a time slot or use Bypass.");
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
      alert("SYNCED");
      setShowModal(false); resetForm(); fetchData();
    } finally { setIsSyncing(false); }
  };

  return (
    <div className="p-10 bg-slate-50 min-h-screen font-sans text-slate-900">
      <div className="flex justify-between items-center mb-10 bg-white p-8 border-4 border-black shadow-[8px_8px_0_0_#000]">
        <h1 className="text-5xl font-black italic uppercase leading-none text-slate-900 tracking-tighter">GenieBook Scheduler</h1>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-blue-600 text-white p-5 px-10 border-4 border-black font-black uppercase shadow-[4px_4px_0_0_#000] transition-all hover:bg-black">+ NEW</button>
      </div>

      <div className="h-[750px] border-4 border-black p-4 bg-white shadow-[12px_12px_0_0_#000]">
        <Calendar localizer={localizer} events={events} selectable defaultView="week"
          onSelectEvent={(e) => { 
            setSelectedApp(e.candidate); 
            setFormDate(format(e.start, 'yyyy-MM-dd')); 
            setFormTime(format(e.start, 'HH:mm')); 
            setStep(3); 
            setShowModal(true); 
          }}
          onSelectSlot={({start}) => { resetForm(); setFormDate(format(start, 'yyyy-MM-dd')); setShowModal(true); }}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white border-8 border-black w-full max-w-4xl max-h-[95vh] overflow-y-auto p-10 shadow-[25px_25px_0_0_#000]">
            
            <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
                <div className="flex gap-2 w-1/2">
                    {[1, 2, 3].map(i => <div key={i} className={`h-3 flex-1 border-2 border-black ${step >= i ? 'bg-blue-600' : 'bg-slate-200'}`} />)}
                </div>
                <div className="flex items-center gap-4">
                    {selectedApp && <button onClick={handleDelete} className="bg-rose-600 text-white p-2 border-2 border-black font-black text-[10px] uppercase shadow-[3px_3px_0_0_#000] hover:bg-black">Delete Interview</button>}
                    <button onClick={() => setShowModal(false)} className="text-4xl font-black hover:rotate-90 transition-transform">✕</button>
                </div>
            </div>

            <div className="space-y-8">
              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="text-4xl font-black italic uppercase leading-none">1. Choose Candidate</h2>
                  <select className="w-full p-5 border-4 border-black font-black bg-white text-xl outline-none" value={selectedApp?.id || ''} onChange={e => setSelectedApp(applicants.find(a => a.id === e.target.value))}>
                    <option value="">-- Choose Candidate --</option>
                    {applicants.map(a => <option key={a.id} value={a.id}>{a.name} ({a.job_role})</option>)}
                  </select>
                  <button disabled={!selectedApp} onClick={() => setStep(2)} className="w-full p-6 bg-black text-white font-black uppercase shadow-[8px_8px_0_0_#000] hover:bg-blue-600 transition-all">Setup Logistics →</button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">2. Logistics & Scanning</h2>
                  
                  {/* ROOM RECOMMENDATION ALERT */}
                  {hasScanned && roomAlt.length > 0 && selectedRoom && !suggestions.includes(formTime) && (
                    <div className="p-4 bg-rose-600 border-4 border-black shadow-[6px_6px_0_0_#000] text-white animate-pulse">
                      <p className="font-black uppercase text-xs">⚠️ Room Conflict Detected!</p>
                      <p className="text-[10px] font-bold opacity-80 mb-3">"{MEETING_ROOMS.find(r => r.email === selectedRoom)?.name}" is busy. These rooms are free at {formTime || "selected time"}:</p>
                      <div className="flex flex-wrap gap-2">
                        {roomAlt.map(alt => (
                          <button 
                            key={alt.email}
                            onClick={() => { setSelectedRoom(alt.email); handleManualScan(); }}
                            className="bg-white text-rose-600 px-3 py-1 border-2 border-black font-black text-[10px] hover:bg-yellow-300 transition-all"
                          >
                            Use {alt.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-yellow-300 border-4 border-black">
                        <label className="font-black text-[10px] uppercase italic">Date {isWeekend(new Date(formDate)) && "⚠️ WEEKEND"}</label>
                        <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full p-2 border-2 border-black font-black bg-white mt-1 outline-none" />
                      </div>
                      <div className="p-4 bg-emerald-100 border-4 border-black">
                        <label className="font-black text-[10px] uppercase italic">Duration</label>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => setDuration(30)} className={`flex-1 p-2 border-2 border-black font-black text-xs ${duration === 30 ? 'bg-emerald-500 text-white shadow-none' : 'bg-white shadow-[2px_2px_0_0_#000]'}`}>30 MIN</button>
                          <button onClick={() => setDuration(60)} className={`flex-1 p-2 border-2 border-black font-black text-xs ${duration === 60 ? 'bg-emerald-500 text-white shadow-none' : 'bg-white shadow-[2px_2px_0_0_#000]'}`}>1 HOUR</button>
                        </div>
                      </div>
                      <div className="p-4 bg-white border-4 border-black">
                        <label className="font-black text-[10px] uppercase italic">Meeting Room</label>
                        <select className="w-full p-2 border-2 border-black font-black mt-1 bg-white outline-none" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
                            <option value="">Virtual (Zoom/Google Meet)</option>
                            {MEETING_ROOMS.map(r => <option key={r.email} value={r.email}>{r.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="font-black text-[10px] uppercase italic ml-2">Internal Panel</label>
                      <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 border-4 border-black h-[260px] overflow-y-auto">
                          {teamMembers.map(m => {
                            const isUnreachable = unreachableEmails.includes(m.email);
                            return (
                              <button key={m.email} onClick={() => setSelectedGuests(prev => prev.includes(m.email) ? prev.filter(x => x !== m.email) : [...prev, m.email])}
                                  className={`p-2 border-2 border-black font-black text-[10px] uppercase transition-all flex justify-between items-center ${selectedGuests.includes(m.email) ? 'bg-blue-600 text-white translate-y-1 shadow-none' : 'bg-white shadow-[2px_2px_0_0_#000]'} ${isUnreachable ? 'bg-amber-100 border-amber-500 text-amber-700 italic' : ''}`}>
                                  <span>{m.name}</span>
                                  {isUnreachable && <span className="text-[8px] bg-amber-500 text-white px-1 ml-1 font-black">PRIVATE</span>}
                              </button>
                            );
                          })}
                      </div>
                      {unreachableEmails.length > 0 && (
                        <p className="text-[9px] text-amber-600 font-bold p-2 bg-amber-50 border-2 border-amber-200 uppercase leading-tight italic">⚠️ Private Calendars Detected.</p>
                      )}
                    </div>
                  </div>

                  <div className="p-6 border-4 border-black bg-blue-50 shadow-[6px_6px_0_0_#000] min-h-[220px]">
                    {!hasScanned ? (
                      <div className="flex flex-col items-center justify-center py-10">
                        <button disabled={!selectedRoom && selectedGuests.length === 0} onClick={handleManualScan} className="bg-blue-600 text-white font-black p-5 px-12 border-4 border-black shadow-[4px_4px_0_0_#000] hover:bg-black uppercase italic tracking-widest disabled:opacity-30">Generate Available Slots</button>
                      </div>
                    ) : isScanning ? (
                      <div className="flex flex-col items-center justify-center py-10">
                        <div className="w-10 h-10 border-8 border-black border-t-blue-600 animate-spin mb-4"></div>
                        <p className="font-black text-xs animate-pulse tracking-widest uppercase italic">Checking Google...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b-2 border-black pb-2">
                           <p className="font-black text-[10px] uppercase italic">Free Slots Found ({duration}m gaps)</p>
                           <button onClick={handleManualScan} className="text-[8px] font-black underline uppercase">Refresh Scan</button>
                        </div>
                        {suggestions.length > 0 ? (
                          <div className="grid grid-cols-5 gap-2">
                            {suggestions.map(t => (
                              <button key={t} onClick={() => {setFormTime(t); setBypassConflict(false);}} className={`p-2 border-2 border-black font-black text-[10px] transition-all ${formTime === t ? 'bg-emerald-500 text-white translate-y-1 shadow-none' : 'bg-white shadow-[2px_2px_0_0_#000] hover:bg-yellow-100'}`}>
                                {format(parse(t, 'HH:mm', new Date()), 'hh:mm a')}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-rose-600 font-black uppercase text-[10px] italic">No common availability found. Use Bypass or try another date.</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-4 border-black bg-slate-100 flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={bypassConflict} onChange={e => setBypassConflict(e.target.checked)} className="w-6 h-6 border-4 border-black bg-white appearance-none checked:bg-rose-600 cursor-pointer" />
                        <span className="font-black text-xs uppercase italic tracking-tighter">Bypass Conflicts (Manual Force)</span>
                    </label>
                    {bypassConflict && (
                        <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="p-2 border-2 border-black font-black bg-white outline-none shadow-inner" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <button onClick={() => setStep(1)} className="p-4 border-4 border-black font-black uppercase hover:bg-slate-100 transition-all">Back</button>
                    <button disabled={!formTime} onClick={() => setStep(3)} className="p-4 bg-black text-white font-black uppercase shadow-[6px_6px_0_0_#000] active:translate-y-1 transition-all">Next: Final Confirmation →</button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 text-left">
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none border-b-4 border-black pb-4">3. Final Review</h2>
                  <div className="bg-slate-900 text-white p-8 border-4 border-black shadow-[10px_10px_0_0_#000] space-y-6">
                      <div className="border-b border-white/20 pb-4">
                        <p className="text-[10px] uppercase font-black opacity-40 mb-1 tracking-widest leading-none">Candidate</p>
                        <h3 className="font-black text-4xl uppercase tracking-tighter leading-none">{selectedApp?.name}</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-10">
                        <div>
                          <p className="text-[10px] uppercase font-black opacity-40 mb-1 tracking-widest leading-none">Schedule</p>
                          <p className="font-black text-xl leading-none">{formDate}</p>
                          <p className="font-black text-3xl text-emerald-400 mt-1 uppercase leading-none">{formTime ? format(parse(formTime, 'HH:mm', new Date()), 'hh:mm a') : 'MANUAL'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-black opacity-40 mb-1 tracking-widest leading-none">Logistics</p>
                          <p className="font-black text-sm uppercase leading-tight">{MEETING_ROOMS.find(r => r.email === selectedRoom)?.name || 'Online'}</p>
                          <p className="font-black text-xs uppercase opacity-60 mt-2 italic tracking-tighter">Duration: {duration} Mins</p>
                        </div>
                      </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase italic ml-2 opacity-50 tracking-tighter">Email CC (Janice, etc.)</p>
                    <input type="text" value={customGuest} onChange={e => setCustomGuest(e.target.value)} className="w-full p-5 border-4 border-black font-black outline-none bg-white shadow-inner" placeholder="janice.sia@geniebook.com" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <button onClick={() => setStep(2)} className="p-5 border-4 border-black font-black uppercase hover:bg-slate-50 transition-all">← Back</button>
                    <button disabled={isSyncing} onClick={handleSave} className={`p-5 font-black uppercase border-4 border-black shadow-[8px_8px_0_0_#000] active:translate-y-1 transition-all ${isSyncing ? 'bg-slate-200 text-slate-400' : 'bg-emerald-500 text-white hover:bg-black hover:text-emerald-500 underline decoration-white'}`}>
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