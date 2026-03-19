// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '../db';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

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
  
  const [step, setStep] = useState(1);
  const [bypassConflict, setBypassConflict] = useState(false);
  const [duration, setDuration] = useState(60); 

  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(''); 
  const [selectedGuests, setSelectedGuests] = useState([]);
  const [customGuest, setCustomGuest] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formTime, setFormTime] = useState('');

  const [suggestions, setSuggestions] = useState([]); 
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => { fetchData(); }, []);

  // Trigger Scan when Step 2 criteria change
  useEffect(() => {
    if (step === 2 && showModal) {
      const timer = setTimeout(handleGenerateSlots, 500); // Debounce to prevent rapid hits
      return () => clearTimeout(timer);
    }
  }, [formDate, duration, selectedRoom, selectedGuests, step]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: apps } = await supabase.from('applicants').select('*');
      const { data: team } = await supabase.from('team_members').select('*');
      setApplicants(apps || []);
      setTeamMembers(team || []);
      const evts = (apps || []).flatMap(app => (app.status_history || [])
        .filter(h => h && h.isManual).map((h, i) => ({
          id: `${app.id}_${i}`, candidate: app, start: new Date(h.date), end: addHours(new Date(h.date), 1), title: `INT: ${app.name}`
        })));
      setEvents(evts);
    } finally { setLoading(false); }
  };

  const handleGenerateSlots = async () => {
    const emailsToCheck = [selectedRoom, ...selectedGuests].filter(Boolean).join(',');
    if (!emailsToCheck) return;
    
    setIsScanning(true);
    setSuggestions([]); // Clear old results
    
    try {
      const scanUrl = `${GOOGLE_SCRIPT_URL}?emails=${encodeURIComponent(emailsToCheck)}&date=${formDate}&duration=${duration}&mode=scan&ts=${new Date().getTime()}`;
      const resp = await fetch(scanUrl);
      const result = await resp.text();
      
      if (result.includes("SUGGESTIONS:")) {
        const slots = result.split("SUGGESTIONS:")[1].split(",").filter(s => s.trim() !== "");
        setSuggestions(slots);
      } else {
        setSuggestions([]);
      }
    } catch (e) {
      console.error("Scanning Error:", e);
      setSuggestions([]);
    } finally {
      setIsScanning(false);
    }
  };

  const resetForm = () => {
    setSelectedApp(null); setSelectedRoom(''); setSelectedGuests([]); setDuration(60);
    setStep(1); setBypassConflict(false); setSuggestions([]); setFormTime('');
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleSave = async () => {
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
      alert("SUCCESS: Calendar Synced!");
      setShowModal(false); resetForm(); fetchData();
    } finally { setIsSyncing(false); }
  };

  if (loading) return <div className="p-20 font-black text-4xl uppercase animate-pulse text-blue-600">Syncing...</div>;

  return (
    <div className="p-10 bg-slate-50 min-h-screen font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10 bg-white p-8 border-4 border-black shadow-[8px_8px_0_0_#000]">
        <h1 className="text-5xl font-black italic uppercase leading-none text-slate-900 tracking-tighter">Scheduler</h1>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-blue-600 text-white p-5 px-10 border-4 border-black font-black shadow-[4px_4px_0_0_#000]">+ NEW</button>
      </div>

      {/* CALENDAR */}
      <div className="h-[750px] border-4 border-black p-4 bg-white shadow-[12px_12px_0_0_#000]">
        <Calendar localizer={localizer} events={events} selectable defaultView="week"
          onSelectSlot={({start}) => { resetForm(); setFormDate(format(start, 'yyyy-MM-dd')); setShowModal(true); }}
        />
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white border-8 border-black w-full max-w-4xl max-h-[95vh] overflow-y-auto p-10 shadow-[25px_25px_0_0_#000]">
            
            <div className="flex gap-2 mb-8">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`h-3 flex-1 border-2 border-black ${step >= i ? 'bg-blue-600' : 'bg-slate-200'}`} />
                ))}
            </div>

            <div className="space-y-8">
              {/* --- STEP 1: CANDIDATE --- */}
              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter">1. Select Candidate</h2>
                  <select className="w-full p-5 border-4 border-black font-black bg-white text-xl" value={selectedApp?.id || ''} onChange={e => setSelectedApp(applicants.find(a => a.id === e.target.value))}>
                    <option value="">-- Choose Candidate --</option>
                    {applicants.map(a => <option key={a.id} value={a.id}>{a.name} ({a.job_role})</option>)}
                  </select>
                  <button disabled={!selectedApp} onClick={() => setStep(2)} className="w-full p-6 bg-black text-white font-black uppercase shadow-[6px_6px_0_0_#000]">Next →</button>
                </div>
              )}

              {/* --- STEP 2: LOGISTICS & LIVE SCAN --- */}
              {step === 2 && (
                <div className="space-y-6">
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter">2. Availability Setup</h2>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-yellow-300 border-4 border-black">
                        <label className="font-black text-[10px] uppercase italic">Interview Date</label>
                        <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full p-2 border-2 border-black font-black bg-white mt-1 outline-none" />
                      </div>

                      <div className="p-4 bg-emerald-100 border-4 border-black">
                        <label className="font-black text-[10px] uppercase italic">Duration</label>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => setDuration(30)} className={`flex-1 p-2 border-2 border-black font-black text-xs ${duration === 30 ? 'bg-emerald-500 text-white' : 'bg-white'}`}>30m</button>
                          <button onClick={() => setDuration(60)} className={`flex-1 p-2 border-2 border-black font-black text-xs ${duration === 60 ? 'bg-emerald-500 text-white' : 'bg-white'}`}>1h</button>
                        </div>
                      </div>

                      <div className="p-4 bg-white border-4 border-black">
                        <label className="font-black text-[10px] uppercase italic">Room</label>
                        <select className="w-full p-2 border-2 border-black font-black mt-1 bg-white" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
                            <option value="">Virtual</option>
                            {MEETING_ROOMS.map(r => <option key={r.email} value={r.email}>{r.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="font-black text-[10px] uppercase italic ml-2">Team</label>
                      <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 border-4 border-black h-[240px] overflow-y-auto">
                          {teamMembers.map(m => (
                              <button key={m.email} onClick={() => setSelectedGuests(prev => prev.includes(m.email) ? prev.filter(x => x !== m.email) : [...prev, m.email])}
                                  className={`p-2 border-2 border-black font-black text-[10px] uppercase transition-all ${selectedGuests.includes(m.email) ? 'bg-blue-600 text-white shadow-none translate-y-1' : 'bg-white shadow-[2px_2px_0_0_#000]'}`}>
                                  {m.name}
                              </button>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* SLOT SCANNER SECTION */}
                  <div className="p-6 border-4 border-black bg-blue-50 shadow-[4px_4px_0_0_#000] min-h-[180px]">
                    <p className="font-black text-[10px] uppercase italic mb-4 border-b-2 border-black pb-2">Available Time Gaps (10am - 7pm)</p>
                    
                    {isScanning ? (
                      <div className="flex flex-col items-center justify-center py-6">
                        <div className="w-8 h-8 border-4 border-black border-t-blue-600 animate-spin mb-2"></div>
                        <p className="font-black text-[10px] animate-pulse">Scanning Calendars...</p>
                      </div>
                    ) : suggestions.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2">
                        {suggestions.map(t => (
                          <button key={t} onClick={() => {setFormTime(t); setBypassConflict(false);}} className={`p-2 border-2 border-black font-black text-[10px] transition-all ${formTime === t ? 'bg-emerald-500 text-white translate-y-1 shadow-none' : 'bg-white shadow-[2px_2px_0_0_#000] hover:bg-yellow-100'}`}>
                            {format(parse(t, 'HH:mm', new Date()), 'hh:mm a')}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 border-2 border-dashed border-black/20">
                        <p className="text-rose-600 font-black text-[10px] uppercase">No availability found for this selection.</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-4 border-black bg-slate-100 flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={bypassConflict} onChange={e => setBypassConflict(e.target.checked)} className="w-6 h-6 border-4 border-black bg-white appearance-none checked:bg-rose-600 cursor-pointer" />
                        <span className="font-black text-xs uppercase italic">Bypass Timing</span>
                    </label>
                    {bypassConflict && (
                        <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="p-2 border-2 border-black font-black bg-white" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setStep(1)} className="p-4 border-4 border-black font-black uppercase">Back</button>
                    <button disabled={!formTime} onClick={() => setStep(3)} className="p-4 bg-black text-white font-black uppercase shadow-[4px_4px_0_0_#000]">Finalize →</button>
                  </div>
                </div>
              )}

              {/* --- STEP 3: FINALIZE --- */}
              {step === 3 && (
                <div className="space-y-6">
                  <h2 className="text-4xl font-black italic uppercase tracking-tighter">3. Confirmation</h2>
                  
                  <div className="bg-slate-900 text-white p-8 border-4 border-black shadow-[10px_10px_0_0_#000] space-y-4">
                      <h3 className="font-black text-3xl border-b border-white/20 pb-2 tracking-tighter uppercase">{selectedApp?.name}</h3>
                      <div className="grid grid-cols-2 gap-6 text-[10px] font-black uppercase">
                        <div>
                          <p className="opacity-40">Schedule</p>
                          <p className="text-xl">{formDate}</p>
                          <p className="text-xl text-emerald-400">{format(parse(formTime, 'HH:mm', new Date()), 'hh:mm a')}</p>
                        </div>
                        <div>
                          <p className="opacity-40">Logistics</p>
                          <p className="text-sm">{MEETING_ROOMS.find(r => r.email === selectedRoom)?.name || 'Online'}</p>
                          <p className="text-sm opacity-60">{duration} Minutes</p>
                        </div>
                      </div>
                  </div>

                  <input type="text" value={customGuest} onChange={e => setCustomGuest(e.target.value)} className="w-full p-4 border-4 border-black font-black outline-none" placeholder="Add CC Emails (Janice/Others)" />

                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setStep(2)} className="p-4 border-4 border-black font-black uppercase">← Back</button>
                    <button disabled={isSyncing} onClick={handleSave} className={`p-4 font-black uppercase border-4 border-black shadow-[6px_6px_0_0_#000] ${isSyncing ? 'bg-slate-200' : 'bg-emerald-500 text-white hover:bg-black'}`}>
                        {isSyncing ? 'Syncing...' : 'Confirm & Sync'}
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