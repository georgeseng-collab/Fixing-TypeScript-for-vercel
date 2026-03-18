// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '../db';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// --- CUSTOM EVENT COMPONENT FOR BETTER VISIBILITY ---
const CustomEvent = ({ event }) => (
  <div className="p-1 flex flex-col h-full leading-tight">
    <div className="text-[9px] uppercase font-black opacity-80">{event.type}</div>
    <div className="text-[11px] font-black truncate uppercase">{event.candidateName}</div>
    <div className="text-[9px] font-bold opacity-70 italic truncate">{event.jobRole}</div>
  </div>
);

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data } = await supabase.from('applicants').select('*');
    setApplicants(data || []);
    
    const calendarEvents = [];
    data.forEach(app => {
      if (app.status_history) {
        app.status_history.forEach((h, idx) => {
          if (h.status === 'Interviewing' || h.status === 'Hired') {
            const start = new Date(h.date);
            calendarEvents.push({
              id: `${app.id}-${idx}`,
              candidateId: app.id,
              historyIndex: idx,
              type: h.status,
              candidateName: app.name,
              jobRole: app.job_role,
              title: `${h.status}: ${app.name}`, // Fallback
              start: start,
              end: new Date(start.getTime() + (60 * 60 * 1000)),
            });
          }
        });
      }
    });
    setEvents(calendarEvents);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSelectEvent = async (event) => {
    if (window.confirm(`Delete Interview for ${event.candidateName}?`)) {
      const app = applicants.find(a => a.id === event.candidateId);
      const updatedHistory = [...app.status_history];
      updatedHistory.splice(event.historyIndex, 1);
      await supabase.from('applicants').update({ status_history: updatedHistory }).eq('id', event.candidateId);
      fetchData();
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-slate-200 text-3xl italic animate-pulse">LOADING...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 pb-24">
      <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-50 flex justify-between items-center">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">SGT Schedule</h1>
        <div className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Click events to delete</div>
      </div>

      <div className="bg-white p-6 rounded-[4rem] shadow-2xl border border-slate-50" style={{ height: '800px' }}>
        <Calendar 
          localizer={localizer} 
          events={events} 
          startAccessor="start" 
          endAccessor="end" 
          onSelectEvent={handleSelectEvent}
          components={{
            event: CustomEvent // Using our custom renderer
          }}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor: event.type === 'Hired' ? '#10b981' : '#3b82f6',
              borderRadius: '16px',
              border: 'none',
              padding: '6px'
            }
          })}
        />
      </div>
    </div>
  );
}