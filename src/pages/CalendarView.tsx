// @ts-nocheck
import { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { getApplicants, supabase } from '../db';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export default function CalendarView() {
  const [events, setEvents] = useState<any[]>([]);
  const [activeCandidates, setActiveCandidates] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<any>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const fetchEvents = async () => {
    const data = await getApplicants();
    const active = data.filter(a => a.status !== 'Quit' && a.status !== 'Blacklisted');
    setActiveCandidates(active);
    setEvents(active.filter(a => a.interview_date).map(app => ({
      id: app.id,
      title: `Interview: ${app.name}`,
      start: new Date(app.interview_date),
      end: new Date(new Date(app.interview_date).getTime() + 3600000),
      role: app.job_role,
      gCalUrl: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Interview+${encodeURIComponent(app.name)}`
    })));
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleAction = async (id: string, date: string | null) => {
    if (!id && !selectedCandidateId) return;
    const { error } = await supabase.from('applicants').update({ interview_date: date }).eq('id', id || selectedCandidateId);
    if (!error) { fetchEvents(); setSelectedCandidateId(''); setSelectedDate(''); }
  };

  const CustomEvent = ({ event }: any) => (
    <div className="p-1 h-full overflow-hidden text-[10px] group">
      <div className="font-bold truncate">{event.title}</div>
      <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a href={event.gCalUrl} target="_blank" className="bg-white text-blue-600 px-1 rounded shadow-xs">+ Cal</a>
        <button onClick={() => handleAction(event.id, null)} className="bg-red-500 text-white px-1 rounded shadow-xs">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 pb-12">
      <div className="lg:w-1/3 bg-white p-6 border rounded-xl h-max">
        <h2 className="font-bold mb-4">Schedule Interview</h2>
        <div className="space-y-4">
          <select value={selectedCandidateId} onChange={e => setSelectedCandidateId(e.target.value)} className="w-full border p-2 rounded-lg text-sm bg-slate-50">
            <option value="">Select Candidate</option>
            {activeCandidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="datetime-local" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full border p-2 rounded-lg text-sm bg-slate-50" />
          <button onClick={() => handleAction(selectedCandidateId, selectedDate)} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg">Save</button>
        </div>
      </div>
      <div className="lg:w-2/3 bg-white p-6 border rounded-xl" style={{ height: '700px' }}>
        <Calendar 
          localizer={localizer} events={events} startAccessor="start" endAccessor="end" 
          view={currentView} onView={v => setCurrentView(v)} 
          date={currentDate} onNavigate={d => setCurrentDate(d)}
          style={{ height: '100%' }} components={{ event: CustomEvent }}
          eventPropGetter={() => ({ className: 'bg-blue-600 border-none rounded shadow-md' })}
        />
      </div>
    </div>
  );
}