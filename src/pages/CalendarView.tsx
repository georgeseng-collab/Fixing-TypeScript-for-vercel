// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '../db';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// --- CONFIGURATION ---
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbww-gHuHg0p7pD9_jrW67jruE3q7ClWCUcqzuT0k2SylvMNGYwLcyaER8N64RrHfvHw/exec';

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
  
  // Form States
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(''); 
  const [roomStatus, setRoomStatus] = useState(''); 
  const [busyEmails, setBusyEmails] = useState([]); // Track specifically who is busy
  const [suggestions, setSuggestions] = useState([]); // Smart time proposals
  const [selectedGuests, setSelectedGuests] = useState([]);
  const [customGuest, setCustomGuest] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formTime, setFormTime] = useState('10:00');

  // --- SMART AVAILABILITY & SCAN ---
  useEffect(() => {
    const checkAndScan = async () => {
      // Check both the Room and the Selected Team Members
      const emailsToCheck = [selectedRoom, ...selectedGuests].filter(Boolean).join(',');
      
      if (!emailsToCheck || !formDate || !formTime) {
        setRoomStatus('');
        setBusyEmails([]);
        setSuggestions([]);
        return;
      }

      setRoomStatus('CHECKING');
      try {
        // 1. Primary Check (mode=check)
        const checkUrl = `${GOOGLE_SCRIPT_URL}?emails=${emailsToCheck}&date=${formDate}&time=${formTime}&mode=check&ts=${new Date().getTime()}`;
        const resp = await fetch(checkUrl);
        const result = await resp.text();
        
        if (result.startsWith("BUSY:")) {
          setRoomStatus('BUSY');
          setBusyEmails(result.split(":")[1].split(","));
          
          // 2. Automatic Smart Proposal (mode=scan)
          const scanUrl = `${GOOGLE_SCRIPT_URL}?emails=${emailsToCheck}&date=${formDate}&time=${formTime}&mode=scan`;
          const scanResp = await fetch(scanUrl);
          const scanResult = await scanResp.text();
          if (scanResult.startsWith("SUGGESTIONS:")) {
            setSuggestions(scanResult.split(":")[1].split(",").filter(Boolean));
          }
        } else {
          setRoomStatus('AVAILABLE');
          setBusyEmails([]);
          setSuggestions([]);
        }
      } catch (e) { 
        setRoomStatus('ERROR'); 
      }
    };

    const timer = setTimeout(checkAndScan, 600);
    return () => clearTimeout(timer);
  }, [selectedRoom, selectedGuests, formDate, formTime]);

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

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setSelectedApp(null);
    setSelectedRoom('');
    setSelectedGuests([]);
    setCustomGuest('');
    setRoomStatus('');
    setBusyEmails([]);
    setSuggestions([]);
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
    setFormTime('10:00');
  };

  const handleDelete = async () => {
    if (!selectedApp) return;
    if (!window.confirm(`Are you sure you want to remove the interview for ${selectedApp.name}?`)) return;

    setIsSyncing(true);
    try {
      const targetDate = `${formDate}T${formTime}:00+08:00`;
      const newHistory = (selectedApp.status_history || []).filter(h => h.date !== targetDate);
      await supabase.from('applicants').update({ status_history: newHistory }).eq('id', selectedApp.id);
      alert("Interview deleted from ATS!");
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (e) { alert("Delete Error: " + e.message); }
    finally { setIsSyncing(false); }
  };

  const handleSave = async () => {
    if (!selectedApp) return alert("Select a candidate first!");
    if (roomStatus === 'BUSY') return alert("Schedule conflict detected!");
    
    setIsSyncing(true);
    try {
      const allGuests = [...selectedGuests, ...(customGuest ? customGuest.split(',').map(e => e.trim()) : [])].join(',');
      
      // Post to Google (doPost)
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
            fileBase64: "" // Ensure this logic exists in your upload component
          })
        }),
        new Promise(resolve => setTimeout(resolve, 1500)) 
      ]);

      const ts = `${formDate}T${formTime}:00+08:00`;
      let history = [...(selectedApp.status_history || []), { status: 'Interview Scheduled', date: ts, isManual: true }];
      await supabase.from('applicants').update({ status_history: history }).eq('id', selectedApp.id);
      
      alert("SUCCESS: Interview synced!");
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (e) { alert("Sync Error: " + e.message); }
    finally { setIsSyncing(false); }
  };

  if (loading) return <div className="p-20 font-black text-4xl italic uppercase animate-pulse text-blue-600">Syncing GenieBook...</div>;

  return (
    <div className="p-10 bg-slate-50 min-h-screen font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10 bg-white p-8 border-4 border-black shadow-[8px_8px_0_0_#000]">
        <div>
          <h1 className="text-5xl font-black italic uppercase leading-none text-slate-900">Scheduler</h1>
          <p className="font-bold text-[10px] text-slate-400 mt-2 tracking-widest uppercase italic">Internal System v10.5</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-blue-600 text-white p-5 px-10 border-4 border-black font-black uppercase shadow-[4px_4px_0_0_#000] active:translate-y-1 hover:bg-black transition-all">+ NEW BOOKING</button>
      </div>

      {/* CALENDAR */}
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
            setShowModal(true); 
          }}
          onSelectSlot={({start}) => { 
            resetForm();
            setFormDate(format(start, 'yyyy-MM-dd')); 
            setFormTime(format(start, 'HH:mm')); 
            setShowModal(true); 
          }}
          eventPropGetter={() => ({ style: { backgroundColor: '#2563eb', border: '3px solid black', fontWeight: 'bold' } })}
        />
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white border-8 border-black w-full max-w-2xl max-h-[90vh] overflow-y-auto p-10 shadow-[30px_30px_0_0_rgba(0,0,0,0.5)]">
            
            {/* MODAL HEADER */}
            <div className="flex justify-between items-center mb-10 border-b-4 border-black pb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter">Interview</h2>
                {selectedApp?.id && (
                  <button onClick={handleDelete} className="bg-rose-500 text-white p-2 px-4 border-2 border-black font-black text-[10px] uppercase shadow-[3px_3px_0_0_#000] hover:bg-black transition-all">Delete</button>
                )}
              </div>
              <button onClick={() => setShowModal(false)} className="text-4xl font-black hover:rotate-90 transition-transform">✕</button>
            </div>

            <div className="space-y-8">
              {/* SMART CONFLICT ALERT BANNER */}
              {roomStatus === 'BUSY' && (
                <div className="p-4 bg-rose-600 text-white border-4 border-black shadow-[4px_4px_0_0_#000]">
                  <p className="font-black uppercase text-xs">⚠️ Conflict: {busyEmails.map(e => MEETING_ROOMS.find(r => r.email === e)?.name || e.split('@')[0]).join(', ')}</p>
                  <div className="mt-3">
                    <p className="text-[10px] font-black uppercase opacity-80 mb-2 italic">Recommended Free Slots:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.length > 0 ? suggestions.map(t => (
                        <button key={t} onClick={() => setFormTime(t)} className="bg-white text-rose-600 border-2 border-black p-1 px-3 font-black text-xs hover:bg-yellow-300">
                          {t}
                        </button>
                      )) : <span className="text-[10px] italic animate-pulse">Scanning for green slots...</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* 1. ROOM BOX */}
              <div className={`p-6 border-4 border-black space-y-3 shadow-[6px_6px_0_0_#000] transition-all ${roomStatus === 'BUSY' && busyEmails.includes(selectedRoom) ? 'bg-rose-100' : 'bg-yellow-300'}`}>
                <div className="flex justify-between items-center">
                  <label className="font-black uppercase text-sm block italic leading-none">1. Assign Meeting Room</label>
                  {roomStatus === 'CHECKING' && <span className="text-[10px] font-black animate-pulse">● CHECKING...</span>}
                  {roomStatus === 'AVAILABLE' && <span className="text-[10px] font-black text-emerald-600">✓ AVAILABLE</span>}
                </div>
                <select className="w-full p-4 border-4 border-black font-black bg-white outline-none cursor-pointer" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
                  <option value="">No Room (Virtual/Online)</option>
                  {MEETING_ROOMS.map(r => <option key={r.email} value={r.email}>{r.name}</option>)}
                </select>
              </div>

              {/* 2. CANDIDATE */}
              <div className="space-y-2">
                <label className="font-black uppercase text-xs opacity-50 italic ml-2">2. Candidate Target</label>
                <select className="w-full p-4 border-4 border-black font-black bg-white" value={selectedApp?.id || ''} onChange={e => setSelectedApp(applicants.find(a => a.id === e.target.value))}>
                  <option value="">-- Choose Candidate --</option>
                  {applicants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              {/* 3. DATE/TIME */}
              <div className="grid grid-cols-2 gap-6">
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full p-4 border-4 border-black font-black outline-none" />
                <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="w-full p-4 border-4 border-black font-black outline-none" />
              </div>

              {/* 4. GUESTS - WITH BUSY INDICATORS */}
              <div className="space-y-3">
                 <p className="font-black uppercase text-xs italic ml-2">4. Internal Guests</p>
                 <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border-4 border-black">
                   {teamMembers.map(m => (
                     <button 
                       key={m.email} 
                       onClick={() => setSelectedGuests(prev => prev.includes(m.email) ? prev.filter(x => x !== m.email) : [...prev, m.email])} 
                       className={`p-3 border-4 border-black font-black text-[10px] uppercase transition-all 
                        ${selectedGuests.includes(m.email) ? 'bg-blue-600 text-white translate-x-1 shadow-none' : 'bg-white shadow-[3px_3px_0_0_#000]'} 
                        ${busyEmails.includes(m.email) ? 'border-rose-600 text-rose-600 ring-2 ring-rose-500' : ''}`}
                     >
                       {m.name} {busyEmails.includes(m.email) ? '🛑' : ''}
                     </button>
                   ))}
                 </div>
              </div>

              {/* 5. CC EMAIL */}
              <div className="space-y-2">
                <p className="font-black uppercase text-xs italic ml-2">5. CC Email</p>
                <input type="text" value={customGuest} onChange={e => setCustomGuest(e.target.value)} className="w-full p-5 border-4 border-black font-black outline-none" placeholder="janice.sia@geniebook.com" />
              </div>

              <button 
                onClick={handleSave} 
                disabled={isSyncing || roomStatus === 'BUSY' || roomStatus === 'CHECKING'} 
                className={`w-full p-8 border-4 border-black font-black uppercase text-2xl shadow-[10px_10px_0_0_#000] active:translate-y-1 active:shadow-none transition-all ${isSyncing || roomStatus === 'BUSY' ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-500 text-white hover:bg-black hover:text-emerald-500'}`}
              >
                {isSyncing ? 'Synchronizing...' : roomStatus === 'BUSY' ? 'CONFLICT' : 'Finalize & Sync'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}