// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '../db';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

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
        app.status_history.forEach((history, index) => {
          if (history.status === 'Interviewing' || history.status === 'Hired') {
            const startDate = new Date(history.date);
            calendarEvents.push({
              id: `${app.id}-${index}`, // Unique ID for finding the event
              candidateId: app.id,
              historyIndex: index,
              title: `${history.status}: ${app.name}`,
              start: startDate,
              end: new Date(startDate.getTime() + (60 * 60 * 1000)),
              resource: app
            });
          }
        });
      }
    });
    setEvents(calendarEvents);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // --- THE NEW DELETE FUNCTION ---
  const handleSelectEvent = async (event) => {
    if (window.confirm(`Do you want to DELETE the schedule for ${event.title}? This will remove it from the candidate's history.`)) {
      const app = applicants.find(a => a.id === event.candidateId);
      if (!app) return;

      const updatedHistory = [...app.status_history];
      updatedHistory.splice(event.historyIndex, 1); // Remove the specific log

      await supabase.from('applicants').update({ status_history: updatedHistory }).eq('id', event.candidateId);
      fetchData(); // Refresh calendar
    }
  };

  const handleQuickSchedule = async () => {
    const activeApps = applicants.filter(a => !['Quit', 'Blacklisted', 'Failed Interview'].includes(a.status));
    const selection = window.prompt("Enter Candidate Name:\n" + activeApps.map(a => `- ${a.name}`).join('\n'));
    const app = activeApps.find(a => a.name.toLowerCase() === selection?.toLowerCase());
    if (!app) return;

    const dateIn = window.prompt(`Date (YYYY-MM-DD):`, new Date().toLocaleDateString('en-CA'));
    const timeIn = window.prompt(`Time (24h HH:MM):`, "10:00");
    
    if (dateIn && timeIn) {
      const timestamp = `${dateIn}T${timeIn}:00+08:00`;
      const newHistory = [...(app.status_history || []), { status: 'Interviewing', date: timestamp }];
      await supabase.from('applicants').update({ status: 'Interviewing', status_history: newHistory }).eq('id', app.id);
      fetchData();
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-slate-200 text-3xl animate-pulse">GENIEBOOK CALENDAR</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-10 rounded-[3rem] shadow-xl border border-slate-50">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic font-serif">Interview Schedule</h1>
        <button onClick={handleQuickSchedule} className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-3">
          <span className="text-xl">📅</span> Schedule Interview
        </button>
      </div>

      <div className="bg-white p-8 rounded-[4rem] shadow-2xl border border-slate-50" style={{ height: '750px' }}>
        <Calendar 
          localizer={localizer} 
          events={events} 
          startAccessor="start" 
          endAccessor="end" 
          onSelectEvent={handleSelectEvent} // TRiggers the delete flow
          style={{ height: '100%' }} 
        />
      </div>
    </div>
  );
}