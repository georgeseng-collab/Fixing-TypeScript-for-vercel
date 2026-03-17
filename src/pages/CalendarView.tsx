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
  
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const [currentView, setCurrentView] = useState<any>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchEvents = async () => {
    const data = await getApplicants();
    const active = data.filter(a => a.status !== 'Quit' && a.status !== 'Blacklisted');
    setActiveCandidates(active);

    const mappedEvents = active.filter(app => app.interview_date).map(app => {
      const start = new Date(app.interview_date);
      const end = new Date(start.getTime() + 60 * 60 * 1000); 
      
      const formatForGCal = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
      const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Interview:+${encodeURIComponent(app.name)}+-+${encodeURIComponent(app.job_role)}&dates=${formatForGCal(start)}/${formatForGCal(end)}`;

      return {
        title: `Interview: ${app.name}`,
        start, end, gCalUrl, appName: app.name, role: app.job_role
      };
    });
    setEvents(mappedEvents);
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidateId || !selectedDate) return alert("Please select a candidate and a date/time.");
    
    setIsScheduling(true);
    try {
      const { error } = await supabase
        .from('applicants')
        .update({ interview_date: selectedDate })
        .eq('id', selectedCandidateId);
        
      if (error) throw error;
      
      setSelectedCandidateId('');
      setSelectedDate('');
      await fetchEvents();
      
      setCurrentDate(new Date(selectedDate));
      setCurrentView('week');
      
      alert("Interview successfully scheduled!");
    } catch (error) {
      console.error(error);
      alert("Failed to schedule interview.");
    } finally {
      setIsScheduling(false);
    }
  };

  const CustomEvent = ({ event }: any) => (
    <div className="p-1 h-full overflow-hidden flex flex-col justify-start">
      <div className="font-bold text-xs sm:text-sm truncate">{event.title}</div>
      <div className="text-[10px] sm:text-xs opacity-90 truncate">{event.role}</div>
      <a 
        href={event.gCalUrl} 
        target="_blank" 
        rel="noreferrer" 
        onClick={(e) => e.stopPropagation()}
        className="mt-1 inline-block text-[10px] bg-white text-blue-600 px-1.5 py-0.5 rounded shadow-sm hover:bg-blue-50 transition-colors w-max max-w-full truncate"
      >
        + Google Cal
      </a>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto flex flex-col space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Interview Hub</h1>
        <p className="text-slate-500 mt-1">Schedule new interviews and manage your calendar.</p>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        
        <div className="lg:w-1/3 bg-white p-6 shadow-sm border border-slate-200 rounded-xl h-max sticky top-6">
          <h2 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4">Schedule Interview</h2>
          <form onSubmit={handleScheduleInterview} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Candidate</label>
              <select 
                required
                value={selectedCandidateId}
                onChange={(e) => setSelectedCandidateId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              >
                <option value="" disabled>-- Choose an active candidate --</option>
                {activeCandidates.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.job_role}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date & Time</label>
              <input 
                required
                type="datetime-local" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" 
              />
            </div>

            <button 
              type="submit" 
              disabled={isScheduling}
              className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors mt-2"
            >
              {isScheduling ? 'Scheduling...' : 'Save to Calendar'}
            </button>
          </form>
          <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-xs rounded-lg border border-blue-100">
            <strong>Tip:</strong> You can reschedule an existing interview by selecting the candidate again and picking a new date!
          </div>
        </div>

        <div className="lg:w-2/3 bg-white p-6 shadow-sm border border-slate-200 rounded-xl overflow-x-auto">
          <div style={{ height: '700px', minWidth: '600px' }}>
            <Calendar 
              localizer={localizer} 
              events={events} 
              startAccessor="start" 
              endAccessor="end" 
              
              view={currentView}
              onView={(view: any) => setCurrentView(view)}
              date={currentDate}
              onNavigate={(date: any) => setCurrentDate(date)}
              
              views={['month', 'week', 'day', 'agenda']}
              style={{ height: '100%', fontFamily: 'inherit' }}
              components={{ event: CustomEvent }}
              eventPropGetter={() => ({ className: 'bg-blue-600 rounded-md border-none shadow-md overflow-hidden' })}
            />
          </div>
        </div>

      </div>
    </div>
  );
}