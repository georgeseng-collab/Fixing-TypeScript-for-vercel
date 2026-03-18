// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '../db';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const CustomEvent = ({ event }) => (
  <div className="p-1 flex flex-col h-full leading-tight">
    <div className="text-[8px] uppercase font-black opacity-70">{event.type}</div>
    <div className="text-[10px] font-black truncate">{event.candidateName}</div>
    <div className="text-[8px] font-bold opacity-60 truncate">{event.jobRole}</div>
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

  const handleSchedule = async () => {
    const activeApps = applicants.filter(a => !['Quit', 'Blacklisted', 'Failed Interview'].includes(a.status));
    const selection = window.prompt("Type Candidate Name to Schedule:\n" + activeApps.map(a => `- ${a.name}`).join('\n'));
    const app = activeApps.find(a => a.name.toLowerCase() === selection?.toLowerCase());
    
    if (!app) return alert("Candidate not found.");

    const dateIn = window.prompt(`Date (YYYY-MM-DD):`, new Date().toLocaleDateString('en-CA'));
    const timeIn = window.prompt(`Time (24h HH:MM):`, "10:00");
    
    if (dateIn && timeIn) {
      const timestamp = `${dateIn}T${timeIn}:00+08:00`;
      const newHistory = [...(app.status_history || []), { status: 'Interviewing', date: timestamp }];
      
      await supabase.from('applicants').update({ 
        status: 'Interviewing', 
        status_history: newHistory 
      }).eq('id', app.id);
      
      const gDate = dateIn.replace(/-/g, '');
      const gTime = timeIn.replace(/:/g, '');
      window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=INTERVIEW: ${encodeURIComponent(app.name)}&dates=${gDate}T${gTime}00/${gDate}T${(parseInt(timeIn)+1).toString().padStart(2,'0')}${timeIn.split(':')[1]}00&ctz=Asia/Singapore`, '_blank');
      
      fetchData();
    }
  };

  const handleDelete = async (event) => {
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
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic font-serif">GenieBook Scheduler</h1>
        <button 
          onClick={handleSchedule}
          className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-blue-700 transition-all flex items-center gap-3"
        >
          <span className="text-xl">📅</span> New Schedule
        </button>
      </div>

      <div className="bg-white p-6 rounded-[4rem] shadow-2xl border border-slate-50" style={{ height: '750px' }}>
        <Calendar 
          localizer={localizer} 
          events={events} 
          startAccessor="start" 
          endAccessor="end" 
          onSelectEvent={handleDelete}
          components={{ event: CustomEvent }}
          eventPropGetter={(event) => ({
            style: { backgroundColor: event.type === 'Hired' ? '#10b981' : '#3b82f6', borderRadius: '12px', border: 'none' }
          })}
        />
      </div>
    </div>
  );
}