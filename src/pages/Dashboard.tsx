// @ts-nocheck
import { useEffect, useState } from 'react';
import { supabase } from '../db';

export default function Dashboard() {
  const [applicants, setApplicants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showHistoryId, setShowHistoryId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});

  const fetchData = async () => {
    try {
      const { data } = await supabase.from('applicants').select('*').order('created_at', { ascending: false });
      setApplicants(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const getStatusTheme = (status) => {
    const themes = {
      'Hired': 'bg-emerald-500 text-white',
      'Offered': 'bg-purple-600 text-white',
      'Interviewing': 'bg-amber-500 text-white',
      'Applied': 'bg-blue-600 text-white',
      'Rejected Offer': 'bg-rose-500 text-white'
    };
    return themes[status] || 'bg-slate-400 text-white';
  };

  const handleStatusChange = async (app, newStatus) => {
    // Simple movement logic - no prompts here to keep it fast
    const timestamp = new Date().toISOString(); 
    const history = [...(app.status_history || []), { status: newStatus, date: timestamp }];
    
    await supabase.from('applicants').update({ 
      status: newStatus, 
      status_history: history 
    }).eq('id', app.id);
    
    fetchData();
  };

  const saveEdit = async () => {
    await supabase.from('applicants').update(editData).eq('id', editId);
    setEditId(null);
    fetchData();
  };

  const filtered = applicants.filter(a => !['Quit', 'Blacklisted', 'Failed Interview'].includes(a.status))
    .filter(a => (a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.job_role.toLowerCase().includes(searchTerm.toLowerCase())))
    .filter(a => (filterStatus === 'All' || a.status === filterStatus));

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 text-5xl animate-pulse italic">GENIEBOOK</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12 pb-24">
      <div className="flex flex-wrap gap-3">
        {['All', 'Applied', 'Interviewing', 'Offered', 'Hired'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === s ? 'bg-slate-900 text-white shadow-xl scale-105' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {filtered.map(app => (
          <div key={app.id} className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl flex flex-col overflow-hidden transition-all hover:scale-[1.01]">
            <div className={`p-8 pb-6 ${getStatusTheme(app.status)}`}>
              <div className="flex justify-between items-start">
                <div className="flex-grow space-y-1">
                  {editId === app.id ? (
                    <>
                      <input className="w-full text-xl font-black bg-white/20 rounded px-2 outline-none text-white mb-1" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                      <input className="w-full text-[9px] font-black uppercase bg-white/10 rounded px-2 outline-none text-white/80" value={editData.job_role} onChange={e => setEditData({...editData, job_role: e.target.value})} />
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl font-black tracking-tight leading-none">{app.name}</h2>
                      <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">{app.job_role}</p>
                    </>
                  )}
                </div>
                <button onClick={() => editId === app.id ? saveEdit() : (setEditId(app.id), setEditData(app))} className="p-3 bg-white/20 hover:bg-white/40 rounded-2xl transition-all ml-2">
                  {editId === app.id ? '✔️' : '✏️'}
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 flex-grow">
              {/* Financials & Contact Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Drawn</span>
                  {editId === app.id ? <input className="w-full text-xs font-bold bg-transparent border-b" value={editData.last_drawn_salary} onChange={e => setEditData({...editData, last_drawn_salary: e.target.value})} /> : <span className="text-xs font-bold text-slate-700">{app.last_drawn_salary || '—'}</span>}
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Expected</span>
                  {editId === app.id ? <input className="w-full text-xs font-black bg-transparent border-b text-blue-600" value={editData.salary_expectation} onChange={e => setEditData({...editData, salary_expectation: e.target.value})} /> : <span className="text-xs font-black text-blue-600">{app.salary_expectation || '—'}</span>}
                </div>
              </div>

              {/* Status Mover */}
              <div className="space-y-2">
                <span className="text-[8px] font-black text-slate-300 uppercase px-2">Move Candidate To:</span>
                <select 
                  value={app.status} 
                  onChange={e => handleStatusChange(app, e.target.value)} 
                  className={`w-full py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer border-2 appearance-none text-center ${getStatusTheme(app.status)}`}
                >
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offered">Offered</option>
                  <option value="Hired">Hired</option>
                  <option value="Rejected Offer">Rejected Offer</option>
                </select>
              </div>

              <div className="flex gap-2">
                <a href={`mailto:${app.email}`} className="flex-1 bg-slate-100 py-3 rounded-2xl text-[9px] font-black text-center text-slate-500 uppercase">Email</a>
                <a href={`https://wa.me/${app.phone?.replace(/[^0-9]/g, '')}`} target="_blank" className="flex-1 bg-emerald-100 py-3 rounded-2xl text-[9px] font-black text-center text-emerald-700 uppercase">WhatsApp</a>
                <button onClick={() => setShowHistoryId(showHistoryId === app.id ? null : app.id)} className="px-5 bg-slate-50 rounded-2xl text-slate-300 font-bold hover:text-blue-500">🕒</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}