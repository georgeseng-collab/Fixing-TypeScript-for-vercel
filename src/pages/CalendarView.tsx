// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '../db';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formTime, setFormTime] = useState('10:00');

  const fetchData = async () => {
    const { data } = await supabase.from('applicants').select('*');
    if (!data) return;
    setApplicants(data);
    
    const calendarEvents = data.flatMap(app => 
      (app.status_history || [])
        .filter(h => h.status === 'Interviewing' || h.status === 'Hired')
        .map((h, idx) => ({
          id: `${app.id}-${idx}`,
          candidateId: app.id,
          historyIndex: idx,
          candidate: app,
          type: h.status,
          start: new Date(h.date),
          end: addHours(new Date(h.date), 1),
          title: `${h.status}: ${app.name}`
        }))
    );
    setEvents(calendarEvents);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSelectSlot = ({ start }) => {
    setIsEditing(false);
    setSelectedApp(null);
    setFormDate(format(start, 'yyyy-MM-dd'));
    setFormTime(format(start, 'HH:mm'));
    setStep(1);
    setShowModal(true);
  };

  const handleSelectEvent = (event) => {
    setIsEditing(true);
    setSelectedApp(event.candidate);
    setSelectedEventId(event.id);
    setFormDate(format(event.start, 'yyyy-MM-dd'));
    setFormTime(format(event.start, 'HH:mm'));
    setStep(2);
    setShowModal(true);
  };

  // --- OPTIMIZED SAVE LOGIC ---
  const handleSaveSchedule = async () => {
    if (!selectedApp) return;
    const finalTimestamp = `${formDate}T${formTime}:00+08:00`;
    let updatedHistory = [...(selectedApp.status_history || [])];

    if (isEditing) {
      const idx = parseInt(selectedEventId.split('-')[1]);
      updatedHistory[idx].date = finalTimestamp;
    } else {
      updatedHistory.push({ status: 'Interviewing', date: finalTimestamp });
    }
    
    // Close modal immediately for speed
    setShowModal(false);

    const { error } = await supabase.from('applicants').update({ 
      status: 'Interviewing', 
      status_history: updatedHistory 
    }).eq('id', selectedApp.id);

    if (!error) {
      const gStart = formDate.replace(/-/g, '') + 'T' + formTime.replace(/:/g, '') + '00';
      const gEnd = formDate.replace(/-/g, '') + 'T' + (parseInt(formTime.split(':')[0]) + 1).toString().padStart(2, '0') + formTime.split(':')[1] + '00';
      const resumeUrl = selectedApp.resume_metadata?.url || '';
      const details = encodeURIComponent(`Candidate: ${selectedApp.name}\nResume: ${resumeUrl}`);
      
      window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=Interview: ${encodeURIComponent(selectedApp.name)}&dates=${gStart}/${gEnd}&details=${details}&ctz=Asia/Singapore`, '_blank');
      fetchData(); // Sync final state
    }
  };

  // --- OPTIMIZED INSTANT DELETE ---
  const handleDeleteEvent = async () => {
    if (!window.confirm("Delete this schedule?")) return;
    
    const [candId, idxStr] = selectedEventId.split('-');
    const idx = parseInt(idxStr);

    // 1. Optimistic Update: Remove from UI instantly
    setEvents(prev => prev.filter(e => e.id !== selectedEventId));
    setShowModal(false);

    // 2. Background Database Update
    const app = applicants.find(a => a.id === candId);
    if (app) {
      const updatedHistory = [...(app.status_history || [])];
      updatedHistory.splice(idx, 1);
      await supabase.from('applicants').update({ status_history: updatedHistory }).eq('id', candId);
      fetchData(); // Subtle background refresh
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 text-4xl animate-pulse italic">GENIEBOOK</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-50 flex justify-between items-center mb-8">
        <div>
           <h1 className="text-4xl font-black text-slate-900 italic">Scheduler</h1>
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">SGT Timezone Locked</p>
        </div>
        <button onClick={() => { setIsEditing(false); setStep(1); setShowModal(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-blue-700 transition-all">
          + New Schedule
        </button>
      </div>

      <div className="bg-white p-6 rounded-[3rem] shadow-2xl border border-slate-50" style={{ height: '750px' }}>
        <Calendar 
          localizer={localizer} 
          events={events} 
          selectable 
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          defaultView="week"
          eventPropGetter={(event) => ({
            style: { backgroundColor: event.type === 'Hired' ? '#059669' : '#3b82f6', borderRadius: '12px', border: 'none', padding: '4px' }
          })}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-75">
            <div className={`p-8 ${isEditing ? 'bg-blue-600' : 'bg-slate-900'} text-white flex justify-between items-center`}>
              <h3 className="text-xl font-black tracking-tight">{isEditing ? 'Management' : 'Pick Candidate'}</h3>
              <button onClick={() => setShowModal(false)} className="text-2xl font-bold opacity-40 hover:opacity-100 transition-opacity">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {step === 1 ? (
                <div className="max-h-[350px] overflow-y-auto space-y-2 no-scrollbar pr-1">
                  {applicants.filter(a => !['Blacklisted', 'Failed Interview'].includes(a.status)).map(app => (
                    <button key={app.id} onClick={() => { setSelectedApp(app); setStep(2); }} className="w-full text-left p-5 hover:bg-blue-50 rounded-2xl border border-slate-50 flex items-center justify-between group transition-all">
                      <div>
                        <div className="font-black text-slate-800 group-hover:text-blue-600">{app.name}</div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">{app.job_role}</div>
                      </div>
                      <span className="text-slate-300 group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {isEditing && (
                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                      <div className="font-black text-slate-800 text-lg">{selectedApp?.name}</div>
                      <div className="text-[10px] uppercase font-bold text-blue-500 tracking-widest">{selectedApp?.job_role}</div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Interview Date</label>
                      <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-700" value={formDate} onChange={e => setFormDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Start Time</label>
                      <input type="time" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-700" value={formTime} onChange={e => setFormTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <button onClick={handleSaveSchedule} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-lg hover:bg-blue-700 active:scale-95 transition-all">
                      {isEditing ? 'Update & Sync' : 'Confirm & Sync'}
                    </button>
                    {isEditing && (
                      <button onClick={handleDeleteEvent} className="w-full py-4 text-rose-500 font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 rounded-2xl transition-all">
                        Remove from Calendar
                      </button>
                    )}
                    {!isEditing && <button onClick={() => setStep(1)} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">Back</button>}
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