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
  const [selectedGuests, setSelectedGuests] = useState([]);
  const [customGuest, setCustomGuest] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formTime, setFormTime] = useState('10:00');

  useEffect(() => {
    const fetchData = async () => {
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
            title: `INTERVIEW: ${app.name}`,
            rawDate: h.date
          }))
      );
      setEvents(calendarEvents);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    setIsSyncing(true);
    try {
      const finalGuests = [...selectedGuests, ...(customGuest ? customGuest.split(',') : [])].join(',');
      
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          name: selectedApp.name,
          role: selectedApp.job_role,
          date: formDate,
          time: formTime,
          guests: finalGuests,
          roomEmail: selectedRoom,
          roomName: MEETING_ROOMS.find(r => r.email === selectedRoom)?.name || 'Office'
        })
      });

      const finalTimestamp = `${formDate}T${formTime}:00+08:00`;
      let history = [...(selectedApp.status_history || []), { status: 'Interviewing', date: finalTimestamp, isManual: true }];
      await supabase.from('applicants').update({ status_history: history }).eq('id', selectedApp.id);
      
      alert("SUCCESS!");
      window.location.reload(); // Force reload to show changes
    } catch (e) { alert(e.message); }
    finally { setIsSyncing(false); }
  };

  if (loading) return <div className="p-20 font-black text-4xl">LOADING...</div>;

  return (
    <div className="p-10 font-sans">
      <div className="flex justify-between items-center mb-10 bg-white p-8 border-4 border-black shadow-[8px_8px_0_0_#000]">
        <h1 className="text-5xl font-black italic uppercase">Scheduler v7</h1>
        <button onClick={() => { setSelectedApp(null); setShowModal(true); }} className="bg-blue-600 text-white p-4 border-4 border-black font-black uppercase shadow-[4px_4px_0_0_#000]">+ New</button>
      </div>

      <div className="h-[700px] border-4 border-black p-4 bg-white shadow-[12px_12px_0_0_#000]">
        <Calendar localizer={localizer} events={events} selectable defaultView="week"
          onSelectEvent={(e) => { setSelectedApp(e.candidate); setShowModal(true); }}
          onSelectSlot={({start}) => { setFormDate(format(start, 'yyyy-MM-dd')); setFormTime(format(start, 'HH:mm')); setSelectedApp(null); setShowModal(true); }}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6">
          <div className="bg-white border-8 border-black w-full max-w-2xl max-h-[90vh] overflow-y-auto p-10 shadow-[20px_20px_0_0_rgba(255,255,255,0.2)]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-4xl font-black italic uppercase">Book Interview</h2>
              <button onClick={() => setShowModal(false)} className="text-4xl font-black">✕</button>
            </div>

            {!selectedApp ? (
              <div className="space-y-4">
                <p className="font-black uppercase">1. Select Candidate</p>
                {applicants.map(app => (
                  <button key={app.id} onClick={() => setSelectedApp(app)} className="w-full text-left p-4 border-4 border-black font-black hover:bg-yellow-400 transition-colors uppercase">{app.name}</button>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-black text-white font-black uppercase italic text-2xl">Target: {selectedApp.name}</div>
                
                {/* THE YELLOW ROOM BOX - IF YOU DON'T SEE THIS, THE CODE DIDN'T UPDATE */}
                <div className="p-6 bg-yellow-300 border-4 border-black space-y-2">
                  <label className="font-black uppercase text-xs leading-none block">Assign Meeting Room</label>
                  <select className="w-full p-4 border-4 border-black font-black bg-white" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
                    <option value="">No Room (Virtual)</option>
                    {MEETING_ROOMS.map(r => <option key={r.email} value={r.email}>{r.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="p-4 border-4 border-black font-black" />
                  <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="p-4 border-4 border-black font-black" />
                </div>

                <div className="space-y-2">
                   <p className="font-black uppercase text-xs">Interviewers</p>
                   <div className="flex flex-wrap gap-2">
                     {teamMembers.map(m => (
                       <button key={m.email} onClick={() => setSelectedGuests(prev => prev.includes(m.email) ? prev.filter(x => x !== m.email) : [...prev, m.email])} className={`p-3 border-4 border-black font-black text-[10px] uppercase ${selectedGuests.includes(m.email) ? 'bg-blue-600 text-white' : 'bg-white'}`}>{m.name}</button>
                     ))}
                   </div>
                </div>

                <div className="space-y-2">
                  <p className="font-black uppercase text-xs">CC Emails (comma sep)</p>
                  <input type="text" value={customGuest} onChange={e => setCustomGuest(e.target.value)} className="w-full p-4 border-4 border-black font-black" placeholder="janice@geniebook.com" />
                </div>

                <button onClick={handleSave} disabled={isSyncing} className="w-full p-6 bg-emerald-500 border-4 border-black font-black uppercase text-xl shadow-[6px_6px_0_0_#000] active:shadow-none active:translate-x-1 active:translate-y-1">{isSyncing ? 'Booking...' : 'Confirm Everything'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}