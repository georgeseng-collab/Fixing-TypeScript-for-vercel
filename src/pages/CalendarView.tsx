// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '../db'; // ENSURE THIS PATH IS CORRECT
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formTime, setFormTime] = useState('10:00');

  // --- 1. THE CONNECTION CHECK ---
  const fetchData = async () => {
    try {
      console.log("Attempting to connect to Supabase...");
      const { data, error } = await supabase.from('applicants').select('*');
      
      if (error) {
        console.error("Supabase Connection Error:", error.message, error.details);
        alert(`Connection Failed: ${error.message}`);
        return;
      }

      console.log("Data received:", data?.length, "rows found.");
      setApplicants(data || []);
      
      const calendarEvents = (data || []).flatMap(app => {
        // Safety check: Ensure status_history exists and is an array
        const history = Array.isArray(app.status_history) ? app.status_history : [];
        return history
          .filter(h => h && (h.status === 'Interviewing' || h.status === 'Hired'))
          .map((h, idx) => {
            try {
              return {
                id: `${app.id}-${idx}`,
                candidateId: app.id,
                candidate: app,
                historyIndex: idx,
                type: h.status,
                start: new Date(h.date),
                end: addHours(new Date(h.date), 1),
                title: `Interviewing: ${app.job_role || 'Role'} - ${app.name}`
              };
            } catch (e) {
              console.warn("Skipping malformed history entry for:", app.name);
              return null;
            }
          }).filter(Boolean);
      });

      setEvents(calendarEvents);
    } catch (err) {
      console.error("Critical System Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- 2. THE SURGICAL DELETE ---
  const confirmDelete = async () => {
    if (!selectedEventId || !selectedApp) return;
    const [candId, idxStr] = selectedEventId.split('-');
    const idx = parseInt(idxStr);

    setShowModal(false);
    setEvents(prev => prev.filter(e => e.id !== selectedEventId));

    try {
      // Fetch fresh data first
      const { data: fresh, error: fErr } = await supabase.from('applicants').select('status_history').eq('id', candId).single();
      if (fErr) throw fErr;

      const newHistory = [...(fresh.status_history || [])];
      newHistory.splice(idx, 1);

      const { error: uErr } = await supabase.from('applicants').update({ status_history: newHistory }).eq('id', candId);
      if (uErr) throw uErr;

      console.log("Successfully deleted from DB");
      fetchData();
    } catch (err) {
      console.error("Delete Operation Failed:", err.message);
      alert(`Delete Failed: ${err.message}`);
      fetchData(); // Rollback
    }
  };

  const handleFinalConfirm = async () => {
    if (!selectedApp) return;
    const finalTimestamp = `${formDate}T${formTime}:00+08:00`;
    const updatedHistory = [...(selectedApp.status_history || []), { status: 'Interviewing', date: finalTimestamp }];

    const { error } = await supabase.from('applicants').update({ status: 'Interviewing', status_history: updatedHistory }).eq('id', selectedApp.id);

    if (error) {
      alert("Save Failed: " + error.message);
      return;
    }

    const gDate = formDate.replace(/-/g, '');
    const gTime = formTime.replace(/:/g, '');
    const resumeUrl = selectedApp.resume_metadata?.url || '';
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Interviewing: ${selectedApp.job_role} - ${selectedApp.name}`)}&dates=${gDate}T${gTime}00/${gDate}T${(parseInt(formTime)+1).toString().padStart(2,'0')}${formTime.split(':')[1]}00&details=${encodeURIComponent('Resume: '+resumeUrl)}&location=${encodeURIComponent(resumeUrl)}&ctz=Asia/Singapore`, '_blank');
    
    setShowModal(false);
    fetchData();
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 text-6xl animate-pulse italic">GENIEBOOK</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 relative">
      <div className="bg-white p-10 rounded-[4rem] shadow-xl border border-slate-50 flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black text-slate-900 italic tracking-tighter">Scheduler</h1>
        <button onClick={() => { setIsDeleting(false); setSelectedApp(null); setStep(1); setShowModal(true); }} className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase shadow-2xl hover:bg-blue-700 transition-all">+ New Schedule</button>
      </div>

      <div className="bg-white p-8 rounded-[4rem] shadow-2xl border border-slate-50" style={{ height: '750px' }}>
        <Calendar localizer={localizer} events={events} selectable 
          onSelectSlot={(slot) => { setFormDate(format(slot.start, 'yyyy-MM-dd')); setFormTime(format(slot.start, 'HH:mm')); setStep(1); setIsDeleting(false); setShowModal(true); }}
          onSelectEvent={(e) => { setSelectedApp(e.candidate); setSelectedEventId(e.id); setIsDeleting(true); setShowModal(true); }}
          defaultView="week"
          eventPropGetter={(event) => ({
            style: { backgroundColor: event.type === 'Hired' ? '#059669' : '#3b82f6', borderRadius: '12px', border: 'none', padding: '6px', fontSize: '11px', fontWeight: '900' }
          })}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in duration-100">
            <div className={`p-10 text-white flex justify-between items-center ${isDeleting ? 'bg-rose-600' : 'bg-slate-900'}`}>
              <h3 className="text-2xl font-black italic">{isDeleting ? 'Delete Schedule?' : 'Arrange Interview'}</h3>
              <button onClick={() => setShowModal(false)} className="text-2xl font-bold opacity-40 hover:opacity-100">✕</button>
            </div>
            <div className="p-10">
              {isDeleting ? (
                <div className="space-y-6 text-center">
                  <p className="font-bold text-slate-600 italic">Remove interview for <br/><span className="text-rose-600 text-2xl font-black underline decoration-rose-200">{selectedApp?.name}</span>?</p>
                  <div className="flex gap-4 pt-4">
                    <button onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400">Cancel</button>
                    <button onClick={confirmDelete} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg">Confirm Delete</button>
                  </div>
                </div>
              ) : step === 1 ? (
                <div className="space-y-4">
                  <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
                    {applicants.filter(a => !['Blacklisted', 'Failed Interview'].includes(a.status)).map(app => (
                      <button key={app.id} onClick={() => { setSelectedApp(app); setStep(2); }} className="w-full text-left p-5 hover:bg-blue-50 rounded-[1.5rem] border border-slate-50 flex items-center justify-between group transition-all">
                        <div><div className="font-black text-slate-800 text-lg group-hover:text-blue-600">{app.name}</div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{app.job_role}</div></div>
                        <span className="text-blue-500 font-black opacity-0 group-hover:opacity-100 transition-all">SELECT →</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in slide-in-from-right-4">
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                    <div className="text-xl font-black text-slate-800">{selectedApp?.name}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedApp?.job_role}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="date" className="p-5 bg-slate-50 rounded-[2rem] font-bold shadow-inner border-none outline-none" value={formDate} onChange={e => setFormDate(e.target.value)} />
                    <input type="time" className="p-5 bg-slate-50 rounded-[2rem] font-bold shadow-inner border-none outline-none" value={formTime} onChange={e => setFormTime(e.target.value)} />
                  </div>
                  <div className="flex gap-4 pt-6">
                    <button onClick={() => setStep(1)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-[2rem] font-black text-[11px] uppercase tracking-widest">Back</button>
                    <button onClick={handleFinalConfirm} className="flex-[2] py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[11px] uppercase shadow-xl active:scale-95 transition-all">Confirm & Sync</button>
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