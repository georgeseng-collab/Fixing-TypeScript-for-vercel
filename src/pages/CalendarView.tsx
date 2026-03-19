// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '../db';
import confetti from 'canvas-confetti';
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
  const [step, setStep] = useState(1);
  const [selectedApp, setSelectedApp] = useState(null);
  const [activeEventDate, setActiveEventDate] = useState(null);
  const [isManagementMode, setIsManagementMode] = useState(false);
  const [searchCandidate, setSearchCandidate] = useState('');
  const [selectedGuests, setSelectedGuests] = useState([]);
  const [customGuest, setCustomGuest] = useState(''); 
  const [selectedRoom, setSelectedRoom] = useState(''); 
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
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleGuest = (email) => {
    setSelectedGuests(prev => prev.includes(email) ? prev.filter(g => g !== email) : [...prev, email]);
  };

  const handleSave = async () => {
    if (!selectedApp) return alert("Select candidate");
    setIsSyncing(true);

    const finalGuestList = [...selectedGuests];
    if (customGuest.trim()) {
      const additional = customGuest.split(',').map(e => e.trim()).filter(e => e !== "");
      finalGuestList.push(...additional);
    }

    try {
      let base64File = "";
      if (selectedApp.resume_metadata?.url) {
        const resp = await fetch(selectedApp.resume_metadata.url);
        const blob = await resp.blob();
        base64File = await new Promise((resolve) => {
          const r = new FileReader();
          r.onloadend = () => resolve(r.result.split(',')[1]);
          r.readAsDataURL(blob);
        });
      }

      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          name: selectedApp.name,
          role: selectedApp.job_role,
          date: formDate,
          time: formTime,
          fileBase64: base64File,
          guests: finalGuestList.join(','),
          roomEmail: selectedRoom,
          roomName: MEETING_ROOMS.find(r => r.email === selectedRoom)?.name || 'Online'
        })
      });

      const finalTimestamp = `${formDate}T${formTime}:00+08:00`;
      let updatedHistory = [...(selectedApp.status_history || [])];

      if (isManagementMode) {
        const matchIdx = updatedHistory.findIndex(h => h.date === activeEventDate);
        if (matchIdx > -1) updatedHistory[matchIdx].date = finalTimestamp;
      } else {
        updatedHistory.push({ status: 'Interviewing', date: finalTimestamp, isManual: true });
      }

      await supabase.from('applicants').update({ status: 'Interviewing', status_history: updatedHistory }).eq('id', selectedApp.id);

      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) { alert("Error: " + err.message); }
    finally { setIsSyncing(false); }
  };

  const resetForm = () => {
    setSelectedGuests([]);
    setSelectedRoom('');
    setCustomGuest('');
    setSearchCandidate('');
    setActiveEventDate(null);
    setStep(1);
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 text-4xl italic animate-pulse">SYNCING...</div>;

  return (
    <div className="max-w-[1700px] mx-auto px-8 py-10 pb-32">
      {/* HEADER SECTION */}
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center mb-10">
        <div>
          <h1 className="text-6xl font-black text-slate-900 dark:text-white italic tracking-tighter uppercase leading-none">Scheduler</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] mt-2 tracking-[0.3em]">GenieBook Room Sync v6.0</p>
        </div>
        <button onClick={() => { setIsManagementMode(false); setStep(1); setShowModal(true); }} className="bg-blue-600 text-white px-10 py-5 rounded-2xl border-4 border-slate-900 font-black text-xs uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-900 transition-all active:scale-95">+ New Interview</button>
      </div>

      {/* CALENDAR SECTION */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border-4 border-slate-900 shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] h-[850px] overflow-hidden">
        <Calendar 
          localizer={localizer} events={events} selectable defaultView="week"
          onSelectEvent={(e) => { setSelectedApp(e.candidate); setActiveEventDate(e.rawDate); setIsManagementMode(true); setStep(2); setShowModal(true); setFormDate(format(e.start, 'yyyy-MM-dd')); setFormTime(format(e.start, 'HH:mm')); }}
          onSelectSlot={({start}) => { setIsManagementMode(false); setFormDate(format(start, 'yyyy-MM-dd')); setFormTime(format(start, 'HH:mm')); setStep(1); setShowModal(true); }}
          eventPropGetter={() => ({ style: { backgroundColor: '#2563eb', borderRadius: '15px', border: '3px solid #0f172a', fontWeight: '900', fontSize: '11px' } })}
        />
      </div>

      {/* MODAL SECTION */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[4rem] border-8 border-slate-900 shadow-[30px_30px_0px_0px_rgba(0,0,0,0.2)] flex flex-col max-h-[90vh] overflow-hidden">
            
            <div className={`p-10 text-white flex justify-between items-center shrink-0 ${isManagementMode ? 'bg-blue-600' : 'bg-slate-900'}`}>
              <h3 className="text-4xl font-black italic uppercase tracking-tighter">{isManagementMode ? 'Edit' : 'Step ' + step}</h3>
              <button onClick={() => setShowModal(false)} className="text-3xl font-black hover:rotate-90 transition-transform">✕</button>
            </div>

            <div className="p-10 space-y-8 overflow-y-auto no-scrollbar flex-grow bg-slate-50/30 dark:bg-slate-800/30">
              {step === 1 ? (
                <div className="space-y-6">
                  <input type="text" placeholder="Search candidate..." className="w-full p-6 border-4 border-slate-900 rounded-[2rem] font-black outline-none uppercase bg-white dark:bg-slate-800 dark:text-white" value={searchCandidate} onChange={e => setSearchCandidate(e.target.value)} />
                  <div className="grid gap-4">
                    {applicants.filter(a => a.name.toLowerCase().includes(searchCandidate.toLowerCase())).map(app => (
                        <button key={app.id} onClick={() => { setSelectedApp(app); setStep(2); }} className="w-full text-left p-6 bg-white dark:bg-slate-800 hover:bg-blue-600 hover:text-white rounded-[2rem] border-4 border-slate-900 flex justify-between items-center transition-all group active:scale-95 shadow-md">
                          <span className="font-black text-xl uppercase italic dark:text-white group-hover:text-white">{app.name}</span>
                          <span className="font-black text-xs text-blue-600 group-hover:text-white">SELECT →</span>
                        </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* CANDIDATE BOX */}
                  <div className="bg-slate-900 dark:bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl">
                    <p className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-[0.2em]">Selected Target</p>
                    <div className="text-3xl font-black italic uppercase leading-none">{selectedApp?.name}</div>
                  </div>

                  {/* DATE & TIME */}
                  <div className="grid grid-cols-2 gap-6">
                    <input type="date" className="p-5 border-4 border-slate-900 rounded-[2rem] font-black text-sm outline-none dark:bg-slate-800 dark:text-white" value={formDate} onChange={e => setFormDate(e.target.value)} />
                    <input type="time" className="p-5 border-4 border-slate-900 rounded-[2rem] font-black text-sm outline-none dark:bg-slate-800 dark:text-white" value={formTime} onChange={e => setFormTime(e.target.value)} />
                  </div>

                  {/* ROOM SELECTOR */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase text-slate-400 ml-4 italic">Book Room Slot</label>
                    <select className="w-full p-5 border-4 border-slate-900 rounded-[2rem] font-black text-sm outline-none bg-white dark:bg-slate-800 dark:text-white" value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)}>
                      <option value="">No Room (Virtual Interview)</option>
                      {MEETING_ROOMS.map(room => (<option key={room.email} value={room.email}>{room.name}</option>))}
                    </select>
                  </div>

                  {/* INTERVIEWERS */}
                  <div className="space-y-4">
                    <label className="text-[11px] font-black uppercase text-slate-400 ml-4 italic">Select Interviewers</label>
                    <div className="flex flex-wrap gap-3">
                      {teamMembers.map(member => (
                        <button key={member.email} onClick={() => toggleGuest(member.email)}
                          className={`px-6 py-3 rounded-2xl border-4 font-black text-[11px] uppercase transition-all ${selectedGuests.includes(member.email) ? 'bg-blue-600 text-white border-slate-900 shadow-md scale-105' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 hover:border-slate-900'}`}
                        >
                          {member.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* EXTERNAL GUESTS / CC */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase text-slate-400 ml-4 italic">External Guest Emails (CC)</label>
                    <input type="text" placeholder="boss@geniebook.com, recruitment@geniebook.com" className="w-full p-5 border-4 border-slate-900 rounded-[2rem] font-black text-sm outline-none bg-white dark:bg-slate-800 dark:text-white" value={customGuest} onChange={e => setCustomGuest(e.target.value)} />
                  </div>

                  {/* ACTION BUTTON */}
                  <div className="pt-6 border-t-8 border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={handleSave} 
                      disabled={isSyncing} 
                      className={`w-full py-6 rounded-[2.5rem] border-4 border-slate-900 font-black text-sm uppercase shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${isSyncing ? 'bg-slate-200 text-slate-400' : 'bg-emerald-500 text-white hover:bg-slate-900'}`}
                    >
                      {isSyncing ? 'Syncing to Google...' : 'Confirm Schedule & Room'}
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