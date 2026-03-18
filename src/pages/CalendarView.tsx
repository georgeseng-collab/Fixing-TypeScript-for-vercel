// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '../db';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// 1. Setup Calendar Localizer
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ 
  format, 
  parse, 
  startOfWeek, 
  getDay, 
  locales 
});

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Navigation States
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [step, setStep] = useState(1); 
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [searchCandidate, setSearchCandidate] = useState('');
  
  // Date/Time Form States
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formTime, setFormTime] = useState('10:00');

  // 2. Fetch Data from Supabase
  const fetchData = async () => {
    try {
      const { data, error } = await supabase.from('applicants').select('*');
      if (error) throw error;
      setApplicants(data || []);
      
      const calendarEvents = (data || []).flatMap(app => 
        (app.status_history || [])
          .filter(h => h.status === 'Interviewing' || h.status === 'Hired')
          .map((h, idx) => ({
            id: `${app.id}-${idx}`,
            candidateId: app.id,
            candidate: app,
            historyIndex: idx,
            type: h.status,
            start: new Date(h.date),
            end: addHours(new Date(h.date), 1),
            title: `${h.status}: ${app.job_role} - ${app.name}`
          }))
      );
      setEvents(calendarEvents);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // 3. Handle Selecting Existing Event (Delete Mode)
  const handleSelectEvent = (event) => {
    setSelectedApp(event.candidate);
    setSelectedEventId(event.id);
    setIsDeleting(true);
    setShowModal(true);
  };

  // 4. Robust Optimistic Deletion
  const confirmDelete = async () => {
    if (!selectedEventId || !selectedApp) return;
    const [candId, idxStr] = selectedEventId.split('-');
    const idx = parseInt(idxStr);

    setShowModal(false);
    
    // Optimistic UI: Remove from screen immediately
    const previousEvents = [...events];
    setEvents(prev => prev.filter(e => e.id !== selectedEventId));

    try {
      // Fetch fresh row to ensure array integrity
      const { data: freshApp } = await supabase
        .from('applicants')
        .select('status_history')
        .eq('id', candId)
        .single();

      const currentHistory = freshApp?.status_history || [];
      const updatedHistory = Array.isArray(currentHistory) ? [...currentHistory] : [];
      
      if (updatedHistory.length > 0) {
        updatedHistory.splice(idx, 1);
      }

      const { error } = await supabase
        .from('applicants')
        .update({ status_history: updatedHistory })
        .eq('id', candId);

      if (error) throw error;
      fetchData(); // Background refresh
    } catch (err) {
      console.error("Delete failed:", err);
      setEvents(previousEvents); // Rollback UI if DB fails
      alert("Database Sync Failed. Ensure RLS policies allow UPDATE.");
    }
  };

  // 5. Create Schedule Logic
  const handleFinalConfirm = async () => {
    if (!selectedApp) return;

    // Force Singapore Timezone Offset (+08:00)
    const finalTimestamp = `${formDate}T${formTime}:00+08:00`;
    const updatedHistory = [...(selectedApp.status_history || []), { status: 'Interviewing', date: finalTimestamp }];

    try {
      const { error } = await supabase.from('applicants').update({ 
        status: 'Interviewing', 
        status_history: updatedHistory 
      }).eq('id', selectedApp.id);

      if (error) throw error;

      // Google Calendar Logic
      const gDate = formDate.replace(/-/g, '');
      const gTime = formTime.replace(/:/g, '');
      const eventTitle = `Interviewing: ${selectedApp.job_role} - ${selectedApp.name}`;
      const resumeUrl = selectedApp.resume_metadata?.url || 'No Resume Attached';

      const details = encodeURIComponent(`Candidate: ${selectedApp.name}\nRole: ${selectedApp.job_role}\n\n📄 Resume: ${resumeUrl}`);
      const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${gDate}T${gTime}00/${gDate}T${(parseInt(formTime.split(':')[0]) + 1).toString().padStart(2, '0')}${formTime.split(':')[1]}00&details=${details}&location=${encodeURIComponent(resumeUrl)}&ctz=Asia/Singapore`;
      
      window.open(gCalUrl, '_blank');
      setShowModal(false);
      setSearchCandidate('');
      fetchData();
    } catch (err) {
      alert("Error saving schedule: " + err.message);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="font-black text-blue-600 text-6xl animate-pulse italic tracking-tighter">GENIEBOOK</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 relative">
      
      {/* Header */}
      <div className="bg-white p-10 rounded-[4rem] shadow-xl border border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">Interview Scheduler</h1>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">Timezone: Asia/Singapore (SGT)</p>
        </div>
        <button 
          onClick={() => { setIsDeleting(false); setSelectedApp(null); setStep(1); setShowModal(true); }} 
          className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-blue-700 active:scale-95 transition-all"
        >
          + New Schedule
        </button>
      </div>

      {/* Calendar */}
      <div className="bg-white p-8 rounded-[4rem] shadow-2xl border border-slate-50 overflow-hidden" style={{ height: '750px' }}>
        <Calendar 
          localizer={localizer} 
          events={events} 
          selectable 
          onSelectSlot={(slot) => { 
            setFormDate(format(slot.start, 'yyyy-MM-dd')); 
            setFormTime(format(slot.start, 'HH:mm')); 
            setStep(1); 
            setIsDeleting(false); 
            setShowModal(true); 
          }}
          onSelectEvent={handleSelectEvent}
          defaultView="week"
          eventPropGetter={(event) => ({
            style: { 
              backgroundColor: event.type === 'Hired' ? '#059669' : '#3b82f6', 
              borderRadius: '14px', 
              border: 'none', 
              padding: '6px', 
              fontSize: '11px', 
              fontWeight: '900',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
            }
          })}
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden animate-in zoom-in duration-150">
            
            <div className={`p-10 text-white flex justify-between items-center ${isDeleting ? 'bg-rose-600' : 'bg-slate-900'}`}>
              <h3 className="text-2xl font-black italic">
                {isDeleting ? 'Remove Schedule' : step === 1 ? 'Step 1: Select Candidate' : 'Step 2: Set Time'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-2xl font-bold opacity-40 hover:opacity-100 transition-opacity">✕</button>
            </div>

            <div className="p-10">
              {isDeleting ? (
                <div className="space-y-6 text-center">
                  <p className="font-bold text-slate-600 italic leading-relaxed">
                    Remove interview for <br/>
                    <span className="text-rose-600 text-2xl font-black underline decoration-4 underline-offset-8 decoration-rose-200">{selectedApp?.name}</span>?
                  </p>
                  <div className="flex gap-4 pt-4">
                    <button onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-slate-200 transition-colors">Cancel</button>
                    <button onClick={confirmDelete} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Confirm Delete</button>
                  </div>
                </div>
              ) : step === 1 ? (
                <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Search candidate..." 
                    className="w-full p-5 bg-slate-50 rounded-[1.8rem] font-bold text-sm mb-4 outline-none border-2 border-transparent focus:border-blue-500 transition-all shadow-inner" 
                    value={searchCandidate} 
                    onChange={(e) => setSearchCandidate(e.target.value)} 
                  />
                  <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                    {applicants
                      .filter(a => !['Blacklisted', 'Failed Interview', 'Resigned'].includes(a.status) && a.name.toLowerCase().includes(searchCandidate.toLowerCase()))
                      .map(app => (
                        <button 
                          key={app.id} 
                          onClick={() => { setSelectedApp(app); setStep(2); }} 
                          className="w-full text-left p-6 hover:bg-blue-50 rounded-[2rem] border border-slate-50 flex items-center justify-between group transition-all"
                        >
                          <div>
                            <div className="font-black text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{app.name}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{app.job_role}</div>
                          </div>
                          <span className="text-blue-500 font-black opacity-0 group-hover:opacity-100 transition-all">SELECT →</span>
                        </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
                    <div className="text-xl font-black text-slate-800">{selectedApp?.name}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedApp?.job_role}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Interview Date</label>
                      <input type="date" className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold shadow-inner border-none outline-none" value={formDate} onChange={e => setFormDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-400 ml-4">Start Time</label>
                      <input type="time" className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold shadow-inner border-none outline-none" value={formTime} onChange={e => setFormTime(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6 border-t border-slate-50">
                    <button onClick={() => setStep(1)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-[2rem] font-black text-[11px] uppercase tracking-widest">Back</button>
                    <button onClick={handleFinalConfirm} className="flex-[2] py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Confirm & Sync</button>
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