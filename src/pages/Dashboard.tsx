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
      'Hired': 'bg-emerald-600 text-white',
      'Offered': 'bg-purple-600 text-white',
      'Interviewing': 'bg-amber-500 text-white',
      'Applied': 'bg-blue-600 text-white',
      'Rejected Offer': 'bg-rose-500 text-white',
      'Blacklisted': 'bg-slate-900 text-white',
      'Resigned': 'bg-orange-700 text-white',
      'Failed Interview': 'bg-slate-500 text-white'
    };
    return themes[status] || 'bg-slate-400 text-white';
  };

  const handleStatusChange = async (app, newStatus) => {
    let remarks = app.remarks || "";
    if (['Blacklisted', 'Failed Interview', 'Resigned'].includes(newStatus)) {
      const msg = window.prompt(`Enter remarks for ${newStatus}:`, remarks);
      if (msg === null) return;
      remarks = msg;
    }

    const timestamp = new Date().toISOString(); 
    const history = [...(app.status_history || []), { status: newStatus, date: timestamp }];
    await supabase.from('applicants').update({ status: newStatus, status_history: history, remarks }).eq('id', app.id);
    fetchData();
  };

  const saveEdit = async () => {
    await supabase.from('applicants').update(editData).eq('id', editId);
    setEditId(null);
    fetchData();
  };

  const counts = {
    All: applicants.filter(a => !['Blacklisted', 'Resigned', 'Failed Interview'].includes(a.status)).length,
    Applied: applicants.filter(a => a.status === 'Applied').length,
    Interviewing: applicants.filter(a => a.status === 'Interviewing').length,
    Offered: applicants.filter(a => a.status === 'Offered').length,
    Hired: applicants.filter(a => a.status === 'Hired').length,
    'Failed Interview': applicants.filter(a => ['Failed Interview', 'Blacklisted', 'Resigned'].includes(a.status)).length,
  };

  const filtered = applicants.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.job_role.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterStatus === 'Failed Interview') return matchesSearch && ['Failed Interview', 'Blacklisted', 'Resigned'].includes(a.status);
    if (filterStatus === 'All') return matchesSearch && !['Failed Interview', 'Blacklisted', 'Resigned'].includes(a.status);
    return matchesSearch && a.status === filterStatus;
  });

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 text-5xl animate-pulse italic">GENIEBOOK</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-8 pb-24">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic">GenieBook <span className="text-blue-600">ATS</span></h1>
        <input 
          type="text" 
          placeholder="Search name or role..." 
          className="w-full md:w-80 bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
        {Object.entries(counts).map(([label, count]) => (
          <button key={label} onClick={() => setFilterStatus(label)} className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${filterStatus === label ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-400'}`}>
            {label} <span className={`px-2 py-0.5 rounded-md text-[9px] ${filterStatus === label ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(app => (
          <div key={app.id} className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col transition-all hover:translate-y-[-4px]">
            <div className={`p-8 pb-5 ${getStatusTheme(app.status)}`}>
              <div className="flex justify-between items-start">
                <div className="flex-grow space-y-1">
                  {editId === app.id ? (
                    <>
                      <input className="w-full text-xl font-black bg-white/20 rounded px-1 outline-none text-white mb-1" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                      <input className="w-full text-[9px] font-black uppercase bg-white/10 rounded px-1 outline-none text-white/80" value={editData.job_role} onChange={e => setEditData({...editData, job_role: e.target.value})} />
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl font-black tracking-tight">{app.name}</h2>
                      <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">{app.job_role}</p>
                    </>
                  )}
                </div>
                <button onClick={() => editId === app.id ? saveEdit() : (setEditId(app.id), setEditData(app))} className="p-3 bg-white/20 rounded-2xl hover:bg-white/40">
                  {editId === app.id ? '✔️' : '✏️'}
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 flex-grow">
              {/* CONTACT HUB: VISIBLE DIRECTLY */}
              <div className="space-y-2">
                <a href={`mailto:${app.email}`} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl text-xs font-bold text-slate-600 truncate hover:bg-slate-100 border border-slate-100 transition-all">
                  <span className="text-sm">📧</span> {app.email}
                </a>
                <a href={`https://wa.me/${app.phone?.replace(/[^0-9]/g, '')}`} target="_blank" className="flex items-center gap-3 bg-emerald-50 p-4 rounded-2xl text-xs font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-100 transition-all">
                  <span className="text-sm">📱</span> {app.phone || 'No Phone'}
                </a>
              </div>

              {/* Financials Row */}
              <div className="flex gap-3">
                <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="block text-[8px] font-black text-slate-400 uppercase mb-1">Last Drawn</span>
                  <span className="text-xs font-bold text-slate-700">{app.last_drawn_salary || '—'}</span>
                </div>
                <div className="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="block text-[8px] font-black text-slate-400 uppercase mb-1">Expected</span>
                  <span className="text-xs font-black text-blue-600">{app.salary_expectation || '—'}</span>
                </div>
              </div>

              {app.remarks && (
                <div className="bg-slate-50 p-4 rounded-2xl border-l-4 border-slate-300">
                  <span className="block text-[8px] font-black text-slate-400 uppercase mb-1 italic">Internal Remarks</span>
                  <p className="text-[10px] text-slate-600 font-medium italic">"{app.remarks}"</p>
                </div>
              )}

              <div className="space-y-4 pt-2">
                <select 
                  value={app.status} 
                  onChange={e => handleStatusChange(app, e.target.value)} 
                  className={`w-full py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer border-2 appearance-none text-center ${getStatusTheme(app.status)}`}
                >
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offered">Offered</option>
                  <option value="Hired">Hired</option>
                  <option value="Rejected Offer">Declined Offer</option>
                  <option disabled>── ARCHIVE / FAILED ──</option>
                  <option value="Failed Interview">Failed Interview</option>
                  <option value="Resigned">Resigned</option>
                  <option value="Blacklisted">Blacklisted</option>
                </select>

                <div className="flex gap-2">
                  <a href={app.resume_metadata?.url} target="_blank" className="flex-1 text-center bg-slate-900 text-white py-4 rounded-xl font-black text-[9px] uppercase tracking-widest">View Resume</a>
                  <button onClick={() => setShowHistoryId(showHistoryId === app.id ? null : app.id)} className="px-4 bg-slate-50 rounded-xl text-slate-300 font-bold hover:text-blue-500">🕒 History</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}