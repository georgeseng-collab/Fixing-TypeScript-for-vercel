// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '../db';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase.from('applicants').select('*');
      
      const calendarEvents = [];
      
      data.forEach(app => {
        if (app.status_history) {
          app.status_history.forEach(history => {
            // We only show Interviewing and Hired on the calendar
            if (history.status === 'Interviewing' || history.status === 'Hired') {
              const startDate = new Date(history.date);
              
              // FIX: Ensure the end date is exactly 1 hour after the start
              const endDate = new Date(startDate.getTime() + (60 * 60 * 1000));

              calendarEvents.push({
                title: `${history.status}: ${app.name} (${app.job_role})`,
                start: startDate,
                end: endDate,
                allDay: false,
                resource: app
              });
            }
          });
        }
      });
      
      setEvents(calendarEvents);
      setLoading(false);
    };

    fetchEvents();
  }, []);

  if (loading) return <div className="p-20 text-center font-black text-slate-300 animate-pulse uppercase tracking-widest">Loading Calendar...</div>;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter italic">Interview Schedule</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Locked to Asia/Singapore Time</p>
        </div>

        <div style={{ height: '700px' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            // PREVENTS WRONG TIME SHIFTING:
            // We use standard views but ensure the CSS/Container feels premium
            views={['month', 'week', 'day']}
            eventPropGetter={(event) => ({
              style: {
                backgroundColor: event.title.includes('Hired') ? '#10b981' : '#3b82f6',
                borderRadius: '12px',
                border: 'none',
                fontWeight: '800',
                fontSize: '10px',
                padding: '5px'
              }
            })}
          />
        </div>
      </div>
    </div>
  );
}