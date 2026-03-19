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
      // Fetch basic list for the dropdown
      const { data: apps } = await supabase.from('applicants').select('id, name, job_role, status_history');
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

  // NEW FEATURE: Explicitly Fetch Resume Data on selection
  const handleSelectCandidate = async (appId) => {
    const baseCandidate = applicants.find(a => a.id === appId);
    if (!baseCandidate) return;

    // Direct retrieve from Supabase to ensure resume_base64 isn't lost or null
    const { data: fullData } = await supabase
      .from('applicants')
      .select('*')
      .eq('id', appId)
      .single();

    setSelectedApp(fullData || baseCandidate);
  };

  const handleManualScan = async () => {
    const emailsToCheck = [selectedRoom, ...selectedGuests].filter(Boolean).join(',');
    setIsScanning(true);
    setHasScanned(true);
    setBusyPeople([]);

    try {
      const scanUrl = `${GOOGLE_SCRIPT_URL}?emails=${encodeURIComponent(emailsToCheck)}&date=${formDate}&duration=${duration}&time=${formTime || '10:00'}&mode=scan&ts=${new Date().getTime()}`;
      const resp = await fetch(scanUrl);
      const result = await resp.text();

      if (result.includes("UNREACHABLE:")) setUnreachableEmails(result.split("UNREACHABLE:")[1].split("|")[0].split(",").filter(Boolean));
      if (result.includes("SUGGESTIONS:")) setSuggestions(result.split("SUGGESTIONS:")[1].split("|")[0].split(",").filter(s => s.trim() !== ""));
      if (result.includes("BUSY_PEOPLE:")) setBusyPeople(result.split("BUSY_PEOPLE:")[1].split("|")[0].split(",").filter(Boolean));
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
      
      // CRITICAL: Pull from retrieved Supabase data
      const finalResume = selectedApp.resume_base64 || selectedApp.resume || "";

      const payload = {
        name: selectedApp.name,
        role: selectedApp.job_role,
        date: formDate,
        time: formTime,
        guests: allGuests,
        roomEmail: selectedRoom,
        roomName: MEETING_ROOMS.find(r => r.email === selectedRoom)?.name || 'Online',
        duration: duration,
        fileBase64: finalResume // THE CORE FIX
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
        <h1 className="text-5xl font-black italic uppercase leading-none tracking-tighter">Scheduler</h1>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-blue-600 text-white p-5 px-10 border-4 border-black font-black shadow-[4px_4px_0_0_#000] hover:bg-black transition-all">+ NEW</button>
      </div>

      <div className="h-[750px] border-4 border-black p-4 bg-white rounded-3xl shadow-[12px_12px_0_0_#000]">
        <Calendar localizer={localizer} events={events} selectable defaultView="week"
          onSelectEvent={(e) => { 
            handleSelectCandidate(e.candidate.id); setFormDate(format(e.start, 'yyyy-MM-dd')); setFormTime(format(e.start, 'HH:mm')); setStep(3); setShowModal(true); 
          }}
          onSelectSlot={({start}) => { resetForm(); setFormDate(format(start, 'yyyy-MM-dd')); setShowModal(true); }}
        />
      </div>

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-6 backdrop-blur-md">
            <div className="bg-white border-8 border-black p-12 rounded-[3rem] max-w-md w-full text-center shadow-[20px_20px_0_0_#000]">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 border-4 border-black font-black">✓</div>
                <h2 className="text-2xl font-black uppercase italic mb-4">Interview Synced</h2>
                <button onClick={() => { setShowSuccessModal(false); resetForm(); }} className="w-full bg-black text-white p-4 rounded-xl font-black uppercase hover:bg-blue-600 transition-all">Back to Calendar</button>
            </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6 backdrop-blur-sm text-left">
          <div className="bg-white border-8 border-black w-full max-w-4xl max-h-[95vh] overflow-y-auto p-10 rounded-[3rem] shadow-[25px_25px_0_0_#000]">
            
            <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
                <div className="flex gap-2 w-1/2">
                    {[1, 2, 3].map(i => <div key={i} className={`h-3 flex-1 border-2 border-black ${step >= i ? 'bg-blue-600' : 'bg-slate-200'}`} />)}
                </div>
                <button onClick={() => setShowModal(false)} className="text-4xl font-black leading-none">✕</button>
            </div>

            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-4xl font-black italic uppercase">1. Choose Candidate</h2>
                <select className="w-full p-5 border-4 border-black font-black bg-white text-xl rounded-2xl" value={selectedApp?.id || ''} onChange={e => handleSelectCandidate(e.target.value)}>
                  <option value="">-- Choose Candidate --</option>
                  {applicants.map(a => <option key={a.id} value={a.id}>{a.name} ({a.job_role})</option>)}
                </select>
                
                {selectedApp && (
                  <div className={`p-4 border-2 border-black rounded-xl font-black text-xs uppercase italic ${ (selectedApp.resume_base64 || selectedApp.resume) ? 'bg-emerald-50 text-emerald-700 border-emerald-500' : 'bg-rose-50 text-rose-700 border-rose-500'}`}>
                      <span>{ (selectedApp.resume_base64 || selectedApp.resume) ? '✓ Base64 Data Verified from Supabase' : '⚠️ Missing Resume in DB'}</span>
                  </div>
                )}
                <button disabled={!selectedApp} onClick={() => setStep(2)} className="w-full p-6 bg-black text-white font-black uppercase shadow-[8px_8px_0_0_#000] hover:bg-blue-600 transition-all rounded-2xl">Setup Logistics →</button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">2. Logistics & Scanning</h2>
                
                {hasScanned && busyPeople.length > 0 && (
                    <div className="p-4 bg-amber-50 border-4 border-amber-500 rounded-2xl font-black text-[10px] text-amber-900 uppercase">
                        Personnel Busy: {busyPeople.map(email => teamMembers.find(t => t.email === email)?.name || email).join(", ")}
                    </div>
                )}

                {hasScanned && roomAlt.length > 0 && selectedRoom && !suggestions.includes(formTime) && (
                    <div className="p-4 bg-rose-600 border-4 border-black text-white rounded-2xl">
                      <p className="font-black uppercase text-xs">Room Busy. Suggested Alts:</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {roomAlt.map(alt => ( <button key={alt.email} onClick={() => { setSelectedRoom(alt.email); handleManualScan(); }} className="bg-white text-rose-600 px-3 py-1 rounded border-2 border-black font-black text-[10px]">Use {alt.name}</button> ))}
                      </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="p-4 bg-yellow-300 border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#000]">
                          <label className="font-black text-[10px] uppercase italic">Date {isWeekend(new Date(formDate)) && "⚠️ WKND"}</label>
                          <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full p-2 border-2 border-black font-black mt-1" />
                        </div>
                        <div className="p-4 bg-white border-4 border-black rounded-2xl">
                          <label className="font-black text-[10px] uppercase italic">Room</label>
                          <select className="w-full p-2 border-2 border-black font-black mt-1" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
                              <option value="">Virtual Session</option>
                              {MEETING_ROOMS.map(r => <option key={r.email} value={r.email}>{r.name}</option>)}
                          </select>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-4 border-black h-[220px] overflow-y-auto rounded-2xl">
                      <label className="font-black text-[10px] uppercase italic">Panel</label>
                      <div className="space-y-2 mt-2">
                        {teamMembers.map(m => (
                          <button key={m.email} onClick={() => setSelectedGuests(prev => prev.includes(m.email) ? prev.filter(x => x !== m.email) : [...prev, m.email])}
                              className={`w-full p-2 border-2 border-black font-black text-[10px] uppercase transition-all rounded-xl ${selectedGuests.includes(m.email) ? 'bg-blue-600 text-white' : 'bg-white shadow-[2px_2px_0_0_#000]'}`}>
                              {m.name}
                          </button>
                        ))}
                      </div>
                    </div>
                </div>

                <div className="p-6 border-4 border-black bg-blue-50 rounded-[2rem]">
                  {!hasScanned ? (
                    <button onClick={handleManualScan} className="w-full bg-blue-600 text-white font-black p-5 border-4 border-black shadow-[4px_4px_0_0_#000] uppercase italic rounded-2xl">Scan Free Slots</button>
                  ) : isScanning ? (
                    <p className="font-black text-xs animate-pulse text-center">Contacting Google...</p>
                  ) : (
                    <div className="grid grid-cols-5 gap-2">
                      {suggestions.map(t => ( <button key={t} onClick={() => {setFormTime(t); setBypassConflict(false);}} className={`p-2 border-2 border-black font-black text-[10px] rounded-xl transition-all ${formTime === t ? 'bg-emerald-500 text-white' : 'bg-white shadow-[3px_3px_0_0_#000]'}`}>{format(parse(t, 'HH:mm', new Date()), 'hh:mm a')}</button> ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setStep(1)} className="p-4 border-4 border-black font-black rounded-2xl">Back</button>
                  <button disabled={!formTime} onClick={() => setStep(3)} className="p-4 bg-black text-white font-black uppercase rounded-2xl">Review →</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none border-b-4 border-black pb-4 text-left">3. Final Review</h2>
                <div className="bg-slate-900 text-white p-10 border-4 border-black rounded-[2.5rem] shadow-[12px_12px_0_0_#000] text-left">
                    <h3 className="font-black text-5xl uppercase mb-6">{selectedApp?.name}</h3>
                    <div className="grid grid-cols-2 gap-10">
                        <div><p className="text-[10px] uppercase opacity-40">Schedule</p><p className="font-black text-2xl">{formDate}</p><p className="font-black text-4xl text-emerald-400">{formTime}</p></div>
                        <div><p className="text-[10px] uppercase opacity-40">Venue</p><p className="font-black text-xl uppercase underline decoration-emerald-500">{MEETING_ROOMS.find(r => r.email === selectedRoom)?.name || 'Online'}</p></div>
                    </div>
                </div>
                <input type="text" value={customGuest} onChange={e => setCustomGuest(e.target.value)} className="w-full p-5 border-4 border-black font-black bg-white rounded-2xl" placeholder="CC Janice etc." />
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setStep(2)} className="p-5 border-4 border-black font-black rounded-2xl">← Back</button>
                  <button disabled={isSyncing} onClick={handleSave} className={`p-5 font-black uppercase border-4 border-black shadow-[8px_8px_0_0_#000] active:translate-y-1 transition-all rounded-2xl ${isSyncing ? 'bg-slate-200' : 'bg-emerald-500 text-white hover:bg-black underline'}`}>Finalize & Sync</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}