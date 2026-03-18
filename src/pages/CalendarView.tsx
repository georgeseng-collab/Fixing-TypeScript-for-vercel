// @ts-nocheck
import React, { useEffect, ReactElement, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '../db';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// --- YOUR VERIFIED GOOGLE SCRIPT URL ---
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwqDnRSosl9UohVmLslxJ-JQXMpLT97Qbck0YjJp1k1T6Rk0CdKFis3wsvmNTCtOsRI/exec';

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false); 
  
  const [showModal, setShowModal] = useState(false);
  const [isManagementMode, setIsManagementMode] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  
  // INITIALIZE ALL SEARCH/FORM STATES TO PREVENT BLANK PAGE
  const [searchCandidate, setSearchCandidate] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formTime, setFormTime] = useState('10:00');

  const fetchData = async () => {
    try {
      const { data, error } = await supabase.from('applicants').select('*');
      if (error) throw error;
      setApplicants(data || []);
      
      const calendarEvents = (data || []).flatMap(app => 
        (app.status_history || [])
          .filter(h => h && (h.status === 'Interviewing' || h.status === 'Hired'))
          .map((h, idx) => ({
            id: `${app.id}___${idx}`,
            candidate: app,
            start: new Date(h.date),
            end: addHours(new Date(h.date), 1),
            title: `Interview: ${app.job_role || 'Role'} - ${app.name}`
          }))
      );
      setEvents(calendarEvents);
    } catch (e) { 
      console.error("Fetch Error:", e); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!selectedApp) return alert("Select a candidate");
    setIsSyncing(true);

    try {
      if (resumeFile) {
        const reader = new FileReader();
        reader.readAsDataURL(resumeFile);
        
        const base64File = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result.split(',')[1]);
        });

        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: selectedApp.name,
            role: selectedApp.job_role,
            date: formDate,
            time: formTime,
            fileName: resumeFile.name,
            contentType: resumeFile.type,
            fileBase64: base64File
          })
        });
      }

      const finalTimestamp = `${formDate}T${formTime}:00+08:00`;
      let updatedHistory = [...(selectedApp.status_history || [])];

      if (isManagementMode) {
        const idx = parseInt(selectedEventId.split('___')[1]);
        if (updatedHistory[idx]) updatedHistory[idx].date = finalTimestamp;
      } else {
        updatedHistory.push({ status: 'Interviewing', date: finalTimestamp });
      }

      await supabase.from('applicants').update({ 
        status: 'Interviewing', 
        status_history: updatedHistory 
      }).eq('id', selectedApp.id);

      alert("Success! Check your Google Calendar shortly.");
      setShowModal(false);
      setResumeFile(null);
      fetchData();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedEventId) return;
    const [candId, idxStr] = selectedEventId.split('___');
    const { data: fresh } = await supabase.from('applicants').select('status_history').eq('id', candId).single();
    const newHistory = [...(fresh?.status_history || [])];
    newHistory.splice(parseInt(idxStr), 1);
    await supabase.from('applicants').update({ status_history: newHistory }).eq('id', candId);
    setShowModal(false);
    fetchData();
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="font-black text-blue-600 text-6xl animate-pulse italic tracking-tighter">GENIEBOOK</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 relative">
      <div className="bg-white p-10 rounded-[4rem] shadow-xl border border-slate-50 flex justify-between items-center mb-10">
        <h1 className="text-4xl font-black text-slate-900 italic tracking-tighter">Scheduler</h1>
        <button 
          onClick={() => { setIsManagementMode(false); setStep(1); setShowModal(true); }} 
          className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase shadow-2xl hover:bg-blue-700 tracking-widest active:scale-95 transition-all"
        >
          + New Schedule
        </button>
      </div>

      <div className="bg-white p-8 rounded-[4rem] shadow-2xl border border-slate-50" style={{ height: '750px' }}>
        <Calendar 
          localizer={localizer} 
          events={events} 
          selectable 
          onSelectEvent={(e) => { 
            setSelectedApp(e.candidate); 
            setSelectedEventId(e.id); 
            setIsManagementMode(true); 
            setStep(2); 
            setShowModal(true); 
          }}
          onSelectSlot={({start}) => { 
            setIsManagementMode(false); 
            setFormDate(format(start, 'yyyy-MM-dd')); 
            setFormTime(format(start, 'HH:mm')); 
            setStep(1); 
            setShowModal(true); 
          }}
          defaultView="week"
          eventPropGetter={() => ({ style: { backgroundColor: '#3b82f6', borderRadius: '14px', border: 'none', fontWeight: 'bold' } })}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden relative">
            
            {isSyncing && (
              <div className="absolute inset-0 bg-white/90 z-50 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-black text-slate-900 text-[10px] uppercase tracking-widest italic">Syncing to Google...</p>
              </div>
            )}

            <div className={`p-10 text-white flex justify-between items-center ${isManagementMode ? 'bg-blue-600' : 'bg-slate-900'}`}>
              <h3 className="text-2xl font-black italic">{isManagementMode ? 'Manage' : 'Step ' + step}</h3>
              <button onClick={() => setShowModal(false)} className="text-2xl font-bold opacity-40 hover:opacity-100 transition-opacity">✕</button>
            </div>

            <div className="p-10 space-y-6">
              {step === 1 ? (
                <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Search candidate..." 
                    className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold outline-none border focus:border-blue-500 shadow-inner" 
                    value={searchCandidate} 
                    onChange={e => setSearchCandidate(e.target.value)} 
                  />
                  <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                    {applicants
                      .filter(a => a.name.toLowerCase().includes(searchCandidate.toLowerCase()))
                      .map(app => (
                        <button 
                          key={app.id} 
                          onClick={() => { setSelectedApp(app); setStep(2); }} 
                          className="w-full text-left p-6 hover:bg-blue-50 rounded-[2rem] border border-slate-50 flex justify-between group transition-all"
                        >
                          <div>
                            <div className="font-black text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{app.name}</div>
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{app.job_role}</div>
                          </div>
                          <span className="text-blue-500 font-black opacity-0 group-hover:opacity-100 transition-all">SELECT →</span>
                        </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="bg-slate-50 p-6 rounded-[2.5rem] font-black text-slate-800 italic border border-slate-100">
                    {selectedApp?.name}
                    <div className="text-[10px] not-italic font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedApp?.job_role}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-5 tracking-[0.2em]">Upload Attachment (Optional)</label>
                    <input 
                      type="file" 
                      className="w-full p-4 bg-slate-50 rounded-[2rem] text-xs font-bold border-none outline-none shadow-inner" 
                      onChange={(e) => setResumeFile(e.target.files?.[0] || null)} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <input type="date" className="p-5 bg-slate-50 rounded-[2rem] font-bold outline-none shadow-inner" value={formDate} onChange={e => setFormDate(e.target.value)} />
                    <input type="time" className="p-5 bg-slate-50 rounded-[2rem] font-bold outline-none shadow-inner" value={formTime} onChange={e => setFormTime(e.target.value)} />
                  </div>

                  <div className="flex flex-col gap-3 pt-6 border-t border-slate-50">
                    <button 
                      onClick={handleSave} 
                      className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                    >
                        Confirm & Sync
                    </button>
                    {isManagementMode ? (
                        <button onClick={confirmDelete} className="w-full py-4 text-rose-600 font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 rounded-2xl transition-all">Delete Schedule</button>
                    ) : (
                        <button onClick={() => setStep(1)} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Back</button>
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