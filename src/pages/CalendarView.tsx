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
  
  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [isManagementMode, setIsManagementMode] = useState(false);
  const [step, setStep] = useState(1); 
  
  // Selection States
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [searchCandidate, setSearchCandidate] = useState('');
  
  // Form States
  const [resumeFile, setResumeFile] = useState(null);
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formTime, setFormTime] = useState('10:00');

  const fetchData = async () => {
    try {
      const { data } = await supabase.from('applicants').select('*');
      setApplicants(data || []);
      
      const calendarEvents = (data || []).flatMap(app => 
        (app.status_history || [])
          .filter(h => h && (h.status === 'Interviewing' || h.status === 'Hired'))
          .map((h, idx) => ({
            id: `${app.id}___${idx}`, // Triple underscore for UUID safety
            candidateId: app.id,
            candidate: app,
            historyIndex: idx,
            type: h.status,
            start: new Date(h.date),
            end: addHours(new Date(h.date), 1),
            title: `Interviewing: ${app.job_role || 'Role'} - ${app.name}`
          }))
      );
      setEvents(calendarEvents);
    } catch (e) { console.error("Fetch error:", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- TRIGGER: MANAGE EXISTING EVENT ---
  const handleSelectEvent = (event) => {
    setSelectedApp(event.candidate);
    setSelectedEventId(event.id);
    setFormDate(format(event.start, 'yyyy-MM-dd'));
    setFormTime(format(event.start, 'HH:mm'));
    setIsManagementMode(true);
    setStep(2); // Jump straight to details
    setShowModal(true);
  };

  // --- TRIGGER: NEW SLOT ---
  const handleSelectSlot = ({ start }) => {
    setIsManagementMode(false);
    setSelectedApp(null);
    setFormDate(format(start, 'yyyy-MM-dd'));
    setFormTime(format(start, 'HH:mm'));
    setStep(1);
    setShowModal(true);
  };

  // --- ACTION: DELETE ---
  const confirmDelete = async () => {
    if (!selectedEventId) return;
    const [candId, idxStr] = selectedEventId.split('___');
    const idx = parseInt(idxStr);

    setShowModal(false);
    setEvents(prev => prev.filter(e => e.id !== selectedEventId));

    try {
      const { data: fresh } = await supabase.from('applicants').select('status_history').eq('id', candId).single();
      const newHistory = [...(fresh?.status_history || [])];
      newHistory.splice(idx, 1);

      await supabase.from('applicants').update({ status_history: newHistory }).eq('id', candId);
      fetchData();
    } catch (err) { alert("Delete failed: " + err.message); fetchData(); }
  };

  // --- ACTION: SAVE (NEW OR EDIT) ---
  const handleSave = async () => {
    if (!selectedApp) return;
    const finalTimestamp = `${formDate}T${formTime}:00+08:00`;
    let updatedHistory = [...(selectedApp.status_history || [])];

    if (isManagementMode) {
      const idx = parseInt(selectedEventId.split('___')[1]);
      updatedHistory[idx].date = finalTimestamp;
    } else {
      updatedHistory.push({ status: 'Interviewing', date: finalTimestamp });
    }

    await supabase.from('applicants').update({ 
      status: 'Interviewing', 
      status_history: updatedHistory 
    }).eq('id', selectedApp.id);

    // Google Calendar Sync
    const gDate = formDate.replace(/-/g, '');
    const gTime = formTime.replace(/:/g, '');
    const eventTitle = `Interviewing: ${selectedApp.job_role} - ${selectedApp.name}`;
    const fileNote = resumeFile ? `📄 New Resume Uploaded: ${resumeFile.name}\n` : '';
    const details = encodeURIComponent(`${fileNote}Candidate: ${selectedApp.name}\nRole: ${selectedApp.job_role}\n\n📎 Please verify resume attachment.`);

    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${gDate}T${gTime}00/${gDate}T${(parseInt(formTime)+1).toString().padStart(2,'0')}${formTime.split(':')[1]}00&details=${details}&location=Singapore&ctz=Asia/Singapore`, '_blank');
    
    setShowModal(false);
    setResumeFile(null);
    fetchData();
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 text-6xl animate-pulse italic">GENIEBOOK</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 relative">
      <div className="bg-white p-10 rounded-[4rem] shadow-xl border border-slate-50 flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black text-slate-900 italic tracking-tighter">Scheduler</h1>
        <button onClick={() => { setIsManagementMode(false); setStep(1); setShowModal(true); }} className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase shadow-2xl hover:bg-blue-700 active:scale-95 transition-all tracking-widest">+ New Schedule</button>
      </div>

      <div className="bg-white p-8 rounded-[4rem] shadow-2xl border border-slate-50" style={{ height: '750px' }}>
        <Calendar 
          localizer={localizer} 
          events={events} 
          selectable 
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          defaultView="week"
          eventPropGetter={(event) => ({
            style: { backgroundColor: event.type === 'Hired' ? '#059669' : '#3b82f6', borderRadius: '12px', border: 'none', padding: '6px', fontSize: '11px', fontWeight: '900' }
          })}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in duration-150">
            <div className={`p-10 text-white flex justify-between items-center ${isManagementMode ? 'bg-blue-600' : 'bg-slate-900'}`}>
              <h3 className="text-2xl font-black italic">{isManagementMode ? 'Manage Interview' : step === 1 ? 'Step 1: Who?' : 'Step 2: When?'}</h3>
              <button onClick={() => setShowModal(false)} className="text-2xl font-bold opacity-40 hover:opacity-100 transition-opacity">✕</button>
            </div>

            <div className="p-10">
              {step === 1 ? (
                <div className="space-y-4">
                  <input type="text" placeholder="Search candidate..." className="w-full p-4 bg-slate-50 rounded-2xl font-bold mb-4 outline-none border focus:border-blue-500" value={searchCandidate} onChange={e => setSearchCandidate(e.target.value)} />
                  <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
                    {applicants.filter(a => a.name.toLowerCase().includes(searchCandidate.toLowerCase())).map(app => (
                      <button key={app.id} onClick={() => { setSelectedApp(app); setStep(2); }} className="w-full text-left p-5 hover:bg-blue-50 rounded-[1.5rem] border border-slate-50 flex items-center justify-between group transition-all">
                        <div><div className="font-black text-slate-800 text-lg group-hover:text-blue-600">{app.name}</div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{app.job_role}</div></div>
                        <span className="text-blue-500 font-black">SELECT →</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                    <div className="text-xl font-black text-slate-800">{selectedApp?.name}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedApp?.job_role}</div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Update Resume (Optional)</label>
                    <input type="file" className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold" onChange={(e) => setResumeFile(e.target.files[0])} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <input type="date" className="p-5 bg-slate-50 rounded-[2rem] font-bold shadow-inner" value={formDate} onChange={e => setFormDate(e.target.value)} />
                    <input type="time" className="p-5 bg-slate-50 rounded-[2rem] font-bold shadow-inner" value={formTime} onChange={e => setFormTime(e.target.value)} />
                  </div>

                  <div className="flex flex-col gap-3 pt-6 border-t border-slate-50">
                    <button onClick={handleSave} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                      {isManagementMode ? 'Update & Re-Sync' : 'Confirm & Sync'}
                    </button>
                    {isManagementMode ? (
                      <button onClick={confirmDelete} className="w-full py-4 text-rose-600 font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 rounded-2xl transition-all">
                        Delete Schedule
                      </button>
                    ) : (
                      <button onClick={() => setStep(1)} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">Back</button>
                    )}
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