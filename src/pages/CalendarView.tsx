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
  const [step, setStep] = useState(1);
  const [selectedApp, setSelectedApp] = useState(null);
  
  // NEW: File state for resume upload
  const [resumeFile, setResumeFile] = useState(null);
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formTime, setFormTime] = useState('10:00');

  const fetchData = async () => {
    const { data } = await supabase.from('applicants').select('*');
    setApplicants(data || []);
    const calendarEvents = (data || []).flatMap(app => 
      (app.status_history || [])
        .filter(h => h.status === 'Interviewing')
        .map((h, idx) => ({
          id: `${app.id}___${idx}`,
          candidate: app,
          start: new Date(h.date),
          end: addHours(new Date(h.date), 1),
          title: `Interviewing: ${app.job_role} - ${app.name}`
        }))
    );
    setEvents(calendarEvents);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleFinalConfirm = async () => {
    if (!selectedApp) return;

    // NOTE: For a real "Direct to Drive" upload, you would typically use 
    // a service like Zapier or a small Edge Function to handle the Google OAuth.
    // For now, we will store the 'Intent' and use the link.
    
    const finalTimestamp = `${formDate}T${formTime}:00+08:00`;
    const updatedHistory = [...(selectedApp.status_history || []), { status: 'Interviewing', date: finalTimestamp }];

    await supabase.from('applicants').update({ 
      status: 'Interviewing', 
      status_history: updatedHistory 
    }).eq('id', selectedApp.id);

    // If a new file was selected, we'd ideally upload it here.
    // For this prototype, we'll proceed to the Google Calendar UI.
    const gDate = formDate.replace(/-/g, '');
    const gTime = formTime.replace(/:/g, '');
    const eventTitle = `Interviewing: ${selectedApp.job_role} - ${selectedApp.name}`;
    
    // We add a reminder in the description to upload the file if not already on Drive
    const details = encodeURIComponent(
      `CANDIDATE: ${selectedApp.name}\n` +
      `ROLE: ${selectedApp.job_role}\n\n` +
      `📎 Please attach the resume file manually in the 'Attachments' section below if it is not already in Drive.`
    );

    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
                    `&text=${encodeURIComponent(eventTitle)}` +
                    `&dates=${gDate}T${gTime}00/${gDate}T${(parseInt(formTime)+1).toString().padStart(2,'0')}${formTime.split(':')[1]}00` +
                    `&details=${details}` +
                    `&ctz=Asia/Singapore`;
    
    window.open(gCalUrl, '_blank');
    setShowModal(false);
    fetchData();
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 text-6xl animate-pulse italic">GENIEBOOK</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="bg-white p-10 rounded-[4rem] shadow-xl border border-slate-50 flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black text-slate-900 italic tracking-tighter">Scheduler</h1>
        <button onClick={() => { setSelectedApp(null); setStep(1); setResumeFile(null); setShowModal(true); }} className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest">+ New Schedule</button>
      </div>

      <div className="bg-white p-8 rounded-[4rem] shadow-2xl border border-slate-50" style={{ height: '750px' }}>
        <Calendar localizer={localizer} events={events} defaultView="week" />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in duration-150">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-2xl font-black italic">{step === 1 ? 'Step 1: Candidate' : 'Step 2: File & Time'}</h3>
              <button onClick={() => setShowModal(false)} className="text-2xl font-bold opacity-40 hover:opacity-100">✕</button>
            </div>

            <div className="p-10">
              {step === 1 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
                  {applicants.map(app => (
                    <button key={app.id} onClick={() => { setSelectedApp(app); setStep(2); }} className="w-full text-left p-6 hover:bg-blue-50 rounded-[2rem] border border-slate-50 flex items-center justify-between group transition-all">
                      <div>
                        <div className="font-black text-slate-800 text-lg">{app.name}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{app.job_role}</div>
                      </div>
                      <span className="text-blue-500 font-black">SELECT →</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* UPLOAD SECTION */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Upload Resume to Sync</label>
                    <div className="relative group">
                      <input 
                        type="file" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        onChange={(e) => setResumeFile(e.target.files[0])}
                      />
                      <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] text-center group-hover:border-blue-400 transition-colors">
                        <span className="text-sm font-bold text-slate-400 group-hover:text-blue-500">
                          {resumeFile ? `📄 ${resumeFile.name}` : "Click to select resume file"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <input type="date" className="p-5 bg-slate-50 rounded-[2rem] font-bold outline-none" value={formDate} onChange={e => setFormDate(e.target.value)} />
                    <input type="time" className="p-5 bg-slate-50 rounded-[2rem] font-bold outline-none" value={formTime} onChange={e => setFormTime(e.target.value)} />
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-slate-50">
                    <button onClick={() => setStep(1)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-[2rem] font-black text-[11px] uppercase tracking-widest">Back</button>
                    <button onClick={handleFinalConfirm} className="flex-[2] py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Sync to Google</button>
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