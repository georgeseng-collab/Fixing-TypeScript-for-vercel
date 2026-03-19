// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '../db';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// --- YOUR LATEST VERIFIED SCRIPT URL ---
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzwKXC3sXVP3BAHcs4PqtF3idLBE8KFWaVeNqgA9cK0vx9PXbhtLqzfyJmWwxWs120Z/exec';

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
  
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(''); 
  const [roomStatus, setRoomStatus] = useState(''); 
  const [selectedGuests, setSelectedGuests] = useState([]);
  const [customGuest, setCustomGuest] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formTime, setFormTime] = useState('10:00');

  // --- LIVE AVAILABILITY CHECK (doGet) ---
  useEffect(() => {
    const checkRoom = async () => {
      if (!selectedRoom || !formDate || !formTime) {
        setRoomStatus('');
        return;
      }
      setRoomStatus('CHECKING');
      try {
        const checkUrl = `${GOOGLE_SCRIPT_URL}?roomEmail=${selectedRoom}&date=${formDate}&time=${formTime}&ts=${new Date().getTime()}`;
        const resp = await fetch(checkUrl);
        const result = await resp.text();
        setRoomStatus(result.trim().toUpperCase());
      } catch (e) {
        setRoomStatus('ERROR');
      }
    };
    const timer = setTimeout(checkRoom, 600);
    return () => clearTimeout(timer);
  }, [selectedRoom, formDate, formTime]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: apps } = await supabase.from('applicants').select('*');
      const { data: team } = await supabase.from('team_members').select('*');
      setApplicants(apps || []);
      setTeamMembers(team || []);
      const evts = (apps || []).flatMap(app => (app.status_history || [])
        .filter(h => h && h.isManual).map((h, i) => ({
          id: `${app.id}_${i}`, candidate: app, start: new Date(h.date), end: addHours(new Date(h.date), 1), title: `INT: ${app.name}`, rawDate: h.date
        })));
      setEvents(evts);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setSelectedApp(null);
    setSelectedRoom('');
    setSelectedGuests([]);
    setCustomGuest('');
    setRoomStatus('');
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
    setFormTime('10:00');
  };

  const handleSave = async () => {
    if (!selectedApp) return alert("Select a candidate!");
    if (roomStatus === 'BUSY') return alert("This room is already occupied!");
    
    setIsSyncing(true);
    try {
      const allGuests = [...selectedGuests, ...(customGuest ? customGuest.split(',').map(e => e.trim()) : [])].join(',');
      
      // Convert Resume for your .gs Drive script
      let base64File = "";
      if (selectedApp.resume_url) {
        try {
          const fileResp = await fetch(selectedApp.resume_url);
          const blob = await fileResp.blob();
          base64File = await new Promise(r => {
            const reader = new FileReader();
            reader.onloadend = () => r(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
          });
        } catch (fError) { console.error("Resume Fetch Error", fError); }
      }

      // POST to Google (doPost) with Handshake Delay
      await Promise.all([
        fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: selectedApp.name,
            role: selectedApp.job_role,
            date: formDate,
            time: formTime,
            guests: allGuests,
            roomEmail: selectedRoom,
            roomName: MEETING_ROOMS.find(r => r.email === selectedRoom)?.name || 'Online',
            fileBase64: base64File
          })
        }),
        new Promise(resolve => setTimeout(resolve, 1500)) // Handshake delay
      ]);

      const ts = `${formDate}T${formTime}:00+08:00`;
      let history = [...(selectedApp.status_history || []), { status: 'Interview Scheduled', date: ts, isManual: true }];
      await supabase.from('applicants').update({ status_history: history }).eq('id', selectedApp.id);
      
      alert("SUCCESS: Request processed. Check your Google Calendar!");
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (e) { alert("Sync Error: " + e.message); }
    finally { setIsSyncing(false); }
  };

  if (loading) return <div className="p-20 font-black text-4xl uppercase text-blue-600 animate-pulse">Syncing...</div>;

  return (
    <div className="p-10 bg-slate-50 min-h-screen font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10 bg-white p-8 border-4 border-black shadow-[8px_8px_0_0_#000]">
        <div>
          <h1 className="text-5xl font-black italic uppercase leading-none">Scheduler</h1>
          <p className="text-[10px] font-bold text-slate-400 mt-2">GenieBook Internal v10.0</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-blue-600 text-white p-4 px-10 border-4 border-black font-black uppercase shadow-[4px_4px_0_0_#000] active:translate-y-1 hover:bg-black transition-all">+ NEW</button>
      </div>

      {/* CALENDAR VIEW */}
      <div className="h-[750px] border-4 border-black p-4 bg-white shadow-[12px_12px_0_0_#000]">
        <Calendar localizer={localizer} events={events} selectable defaultView="week"
          onSelectEvent={(e) => { setSelectedApp(e.candidate); setShowModal(true); }}
          onSelectSlot={({start}) => { resetForm(); setFormDate(format(start, 'yyyy-MM-dd')); setFormTime(format(start, 'HH:mm')); setShowModal(true); }}
          eventPropGetter={() => ({ style: { backgroundColor: '#2563eb', border: '2px solid black' } })}
        />
      </div>

      {/* SETUP MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white border-8 border-black w-full max-w-2xl max-h-[90vh] overflow-y-auto p-10 shadow-[25px_25px_0_0_#000]">
            <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
              <h2 className="text-4xl font-black italic uppercase italic">Interview</h2>
              <button onClick={() => setShowModal(false)} className="text-4xl font-black">✕</button>
            </div>

            <div className="space-y-8">
              {/* 1. ROOM BOX - WITH LIVE VALIDATION */}
              <div className={`p-6 border-4 border-black space-y-3 shadow-[6px_6px_0_0_#000] transition-all ${roomStatus === 'BUSY' ? 'bg-rose-100' : 'bg-yellow-300'}`}>
                <div className="flex justify-between items-center">
                  <label className="font-black uppercase text-sm italic">1. Assign Meeting Room</label>
                  {roomStatus === 'CHECKING' && <span className="text-[10px] font-black animate-pulse text-blue-600">● CHECKING...</span>}
                  {roomStatus === 'AVAILABLE' && <span className="text-[10px] font-black text-emerald-600">✓ AVAILABLE</span>}
                  {roomStatus === 'BUSY' && <span className="text-[10px] font-black text-rose-600">⚠️ OCCUPIED</span>}
                </div>
                <select className="w-full p-4 border-4 border-black font-black bg-white" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
                  <option value="">No Room (Online)</option>
                  {MEETING_ROOMS.map(r => <option key={r.email} value={r.email}>{r.name}</option>)}
                </select>
              </div>

              {/* 2. CANDIDATE SELECTION */}
              <div className="space-y-2">
                <label className="font-black uppercase text-xs opacity-50 italic">2. Select Candidate</label>
                <select className="w-full p-4 border-4 border-black font-black bg-white" value={selectedApp?.id || ''} onChange={e => setSelectedApp(applicants.find(a => a.id === e.target.value))}>
                  <option value="">-- Choose Candidate --</option>
                  {applicants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              {/* 3. DATE/TIME GRID */}
              <div className="grid grid-cols-2 gap-6">
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="p-4 border-4 border-black font-black" />
                <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="p-4 border-4 border-black font-black" />
              </div>

              {/* 4. TEAM GUESTS */}
              <div className="space-y-3">
                 <p className="font-black uppercase text-xs italic">4. Internal Team</p>
                 <div className="flex flex-wrap gap-2 p-2 bg-slate-100 border-4 border-black">
                   {teamMembers.map(m => (
                     <button key={m.email} onClick={() => setSelectedGuests(prev => prev.includes(m.email) ? prev.filter(x => x !== m.email) : [...prev, m.email])} 
                       className={`p-3 border-4 border-black font-black text-[10px] uppercase transition-all ${selectedGuests.includes(m.email) ? 'bg-blue-600 text-white translate-y-1' : 'bg-white shadow-[4px_4px_0_0_#000]'}`}>
                       {m.name}
                     </button>
                   ))}
                 </div>
              </div>

              {/* 5. CC EMAIL FIELD */}
              <div className="space-y-2">
                <p className="font-black uppercase text-xs italic">5. CC Email (Janice/Others)</p>
                <input type="text" value={customGuest} onChange={e => setCustomGuest(e.target.value)} className="w-full p-4 border-4 border-black font-black" placeholder="janice.sia@geniebook.com" />
              </div>

              {/* ACTION BUTTON */}
              <button 
                onClick={handleSave} 
                disabled={isSyncing || roomStatus === 'BUSY' || roomStatus === 'CHECKING'} 
                className={`w-full p-8 border-4 border-black font-black uppercase text-2xl shadow-[10px_10px_0_0_#000] active:shadow-none active:translate-y-1 transition-all ${isSyncing || roomStatus === 'BUSY' ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-500 text-white hover:bg-black hover:text-emerald-500'}`}
              >
                {isSyncing ? 'SYNCING...' : roomStatus === 'BUSY' ? 'ROOM OCCUPIED' : 'CONFIRM & SYNC'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}