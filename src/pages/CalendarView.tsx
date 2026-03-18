// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours, setHours, setMinutes } from 'date-fns';
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
  const [step, setStep] = useState(1); // 1: Candidate, 2: Date/Time
  const [selectedApp, setSelectedApp] = useState(null);
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formTime, setFormTime] = useState('10:00');

  const fetchData = async () => {
    const { data } = await supabase.from('applicants').select('*');
    setApplicants(data || []);
    const calendarEvents = data.flatMap(app => 
      (app.status_history || [])
        .filter(h => h.status === 'Interviewing' || h.status === 'Hired')
        .map((h, idx) => ({
          id: `${app.id}-${idx}`,
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
    setSelectedApp(null);
    setFormDate(format(start, 'yyyy-MM-dd'));
    setFormTime(format(start, 'HH:mm'));
    setStep(1);
    setShowModal(true);
  };

  const handleFinalSchedule = async () => {
    if (!selectedApp) return;

    const finalTimestamp = `${formDate}T${formTime}:00+08:00`;
    const newHistory = [...(selectedApp.status_history || []), { status: 'Interviewing', date: finalTimestamp }];
    
    // Update Supabase
    await supabase.from('applicants').update({ 
      status: 'Interviewing', 
      status_history: newHistory 
    }).eq('id', selectedApp.id);

    // Google Calendar Logic
    const gStart = formDate.replace(/-/g, '') + 'T' + formTime.replace(/:/g, '') + '00';
    const gEnd = formDate.replace(/-/g, '') + 'T' + (parseInt(formTime.split(':')[0]) + 1).toString().padStart(2, '0') + formTime.split(':')[1] + '00';
    
    const resumeUrl = selectedApp.resume_metadata?.url || '';
    const details = encodeURIComponent(`Candidate: ${selectedApp.name}\nRole: ${selectedApp.job_role}\nResume: ${resumeUrl}`);
    
    // Attempting to attach via 'attachments' param and 'src'
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Interview: ${encodeURIComponent(selectedApp.name)}&dates=${gStart}/${gEnd}&details=${details}&ctz=Asia/Singapore&add=${encodeURIComponent(resumeUrl)}`;
    
    window.open(gCalUrl, '_blank');
    setShowModal(false);
    fetchData();
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 text-4xl animate-pulse">GENIEBOOK</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-50 flex justify-between items-center mb-8">
        <h1 className="text-4xl font-black text-slate-900 italic">Scheduler</h1>
        <button onClick={() => { setStep(1); setShowModal(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg">
          + Quick Schedule
        </button>
      </div>

      <div className="bg-white p-6 rounded-[3rem] shadow-2xl border border-slate-50" style={{ height: '750px' }}>
        <Calendar 
          localizer={localizer} 
          events={events} 
          selectable 
          onSelectSlot={handleSelectSlot}
          defaultView="week"
          eventPropGetter={(event) => ({
            style: { backgroundColor: event.type === 'Hired' ? '#059669' : '#2563eb', borderRadius: '10px', border: 'none' }
          })}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-xl font-black">{step === 1 ? 'Step 1: Pick Candidate' : 'Step 2: Date & Time'}</h3>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="p-6 space-y-4">
              {step === 1 ? (
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {applicants.filter(a => !['Blacklisted', 'Failed Interview'].includes(a.status)).map(app => (
                    <button 
                      key={app.id}
                      onClick={() => { setSelectedApp(app); setStep(2); }}
                      className="w-full text-left p-4 hover:bg-blue-50 rounded-2xl border border-slate-100 flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{app.name}</div>
                        <div className="text-[10px] uppercase text-slate-400">{app.job_role}</div>
                      </div>
                      <span className="opacity-0 group-hover:opacity-100">→</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Interview Date</label>
                    <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl border-none mt-1 font-bold" value={formDate} onChange={e => setFormDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Start Time (24h)</label>
                    <input type="time" className="w-full p-4 bg-slate-50 rounded-2xl border-none mt-1 font-bold" value={formTime} onChange={e => setFormTime(e.target.value)} />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase">Back</button>
                    <button onClick={handleFinalSchedule} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg">Confirm & Sync</button>
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