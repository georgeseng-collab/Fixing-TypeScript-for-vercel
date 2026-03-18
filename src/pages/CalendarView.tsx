// @ts-nocheck
import React, { useEffect, useState } from 'react';
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
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const fetchData = async () => {
    const { data } = await supabase.from('applicants').select('*');
    setApplicants(data || []);
    const calendarEvents = [];
    data.forEach(app => {
      if (app.status_history) {
        app.status_history.forEach((h, idx) => {
          if (h.status === 'Interviewing' || h.status === 'Hired') {
            calendarEvents.push({
              id: `${app.id}-${idx}`,
              candidate: app,
              type: h.status,
              start: new Date(h.date),
              end: addHours(new Date(h.date), 1),
              title: `${h.status}: ${app.name}`
            });
          }
        });
      }
    });
    setEvents(calendarEvents);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // 1. CLICK & DRAG TO SELECT TIME
  const handleSelectSlot = ({ start }) => {
    setSelectedSlot(start);
    setShowModal(true);
  };

  const confirmSchedule = async (app) => {
    const timeStr = format(selectedSlot, "yyyy-MM-dd'T'HH:mm:00+08:00");
    const newHistory = [...(app.status_history || []), { status: 'Interviewing', date: timeStr }];
    
    // Update Database
    await supabase.from('applicants').update({ 
      status: 'Interviewing', 
      status_history: newHistory 
    }).eq('id', app.id);

    // 2. GOOGLE CALENDAR + RESUME UPLOAD (Via URL)
    const gStart = format(selectedSlot, "yyyyMMdd'T'HHmmss");
    const gEnd = format(addHours(selectedSlot, 1), "yyyyMMdd'T'HHmmss");
    const resumeUrl = app.resume_metadata?.url || 'No resume attached';
    
    const details = encodeURIComponent(
      `Candidate: ${app.name}\nRole: ${app.job_role}\nEmail: ${app.email}\nPhone: ${app.phone}\n\n📄 RESUME LINK: ${resumeUrl}`
    );

    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Interview: ${encodeURIComponent(app.name)}&dates=${gStart}/${gEnd}&details=${details}&ctz=Asia/Singapore`;
    
    window.open(gCalUrl, '_blank');
    setShowModal(false);
    fetchData();
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-slate-300 text-4xl animate-pulse">GENIEBOOK CALENDAR</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 relative">
      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-50 flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">Scheduler</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select a time slot on the grid to book</p>
        </div>
        <button onClick={() => { setSelectedSlot(new Date()); setShowModal(true); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all">
          Quick Schedule
        </button>
      </div>

      <div className="bg-white p-6 rounded-[3rem] shadow-2xl border border-slate-50" style={{ height: '800px' }}>
        <Calendar 
          localizer={localizer} 
          events={events} 
          selectable 
          onSelectSlot={handleSelectSlot}
          startAccessor="start" 
          endAccessor="end" 
          defaultView="week"
          eventPropGetter={(event) => ({
            style: { backgroundColor: event.type === 'Hired' ? '#059669' : '#2563eb', borderRadius: '10px', border: 'none', fontSize: '11px', fontWeight: 'bold' }
          })}
        />
      </div>

      {/* 3. MODERN SELECTION MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">Select Candidate</h3>
                <p className="text-[10px] opacity-60 uppercase font-bold mt-1">
                  Time: {format(selectedSlot, 'PPp')}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-2xl opacity-50 hover:opacity-100">✕</button>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto no-scrollbar">
              {applicants.filter(a => !['Blacklisted', 'Failed Interview'].includes(a.status)).map(app => (
                <button 
                  key={app.id}
                  onClick={() => confirmSchedule(app)}
                  className="w-full text-left p-5 hover:bg-blue-50 rounded-[1.5rem] border border-transparent hover:border-blue-100 transition-all group flex items-center justify-between"
                >
                  <div>
                    <div className="font-black text-slate-800 group-hover:text-blue-600 transition-colors">{app.name}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{app.job_role}</div>
                  </div>
                  <span className="text-xl opacity-0 group-hover:opacity-100 transition-all">📅</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}