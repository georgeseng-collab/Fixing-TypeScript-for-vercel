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
      'Rejected Offer': 'bg-rose-500 text-white',
      'Blacklisted': 'bg-slate-900 text-white',
      'Resigned': 'bg-orange-700 text-white'
    };
    return themes[status] || 'bg-slate-400 text-white';
  };

  const handleStatusChange = async (app, newStatus) => {
    let remarks = app.remarks || "";
    
    if (newStatus === 'Blacklisted') {
      const msg = window.prompt("Reason for Blacklisting:", remarks);
      if (msg === null) return;
      remarks = msg;
    }

    const timestamp = new Date().toISOString(); 
    const history = [...(app.status_history || []), { status: newStatus, date: timestamp }];
    
    await supabase.from('applicants').update({ 
      status: newStatus, 
      status_history: history,
      remarks: remarks
    }).eq('id', app.id);
    
    fetchData();
  };

  const saveEdit = async () => {
    await supabase.from('applicants').update(editData).eq('id', editId);
    setEditId(null);
    fetchData();
  };

  // Stats for the header
  const stats = {
    Total: applicants.filter(a => !['Blacklisted', 'Resigned', 'Failed Interview'].includes(a.status)).length,
    Applied: applicants.filter(a => a.status === 'Applied').length,
    Interviewing: applicants.filter(a => a.status === 'Interviewing').length,
    Hired: applicants.filter(a => a.status === 'Hired').length
  };

  const filtered = applicants.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.job_role.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterStatus === 'Archive') {
      return matchesSearch && ['Blacklisted', 'Resigned', 'Failed Interview'].includes(a.status);
    }
    if (filterStatus === 'All') {
      return matchesSearch && !['Blacklisted', 'Resigned', 'Failed Interview'].includes(a.status);
    }
    return matchesSearch && a.status === filterStatus;
  });

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-blue-600 text-5xl animate-pulse italic">GENIEBOOK</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12 pb-24">
      
      {/* 📈 STATS HEADER */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(stats).map(([label, count]) => (
          <div key={label} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            <span className="text-3xl font-black text-slate-900">{count}</span>
          </div>
        ))}
      </div>

      {/* 📊 NAVIGATION TABS */}
      <div className="flex flex-wrap gap-3">
        {['All', 'Applied', 'Interviewing', 'Offered', 'Hired', 'Archive'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === s ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}>
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
              {/* Financials Edit Section */}
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

              {/* Remarks for Blacklisted */}
              {app.status === 'Blacklisted' && app.remarks && (
                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-[10px] text-rose-800 italic">
                  <strong>Reason:</strong> {app.remarks}
                </div>
              )}

              {/* Full Status Movement Suite */}
              <div className="space-y-2">
                <span className="text-[8px] font-black text-slate-300 uppercase px-2">Stage Control:</span>
                <select 
                  value={app.status} 
                  onChange={e => handleStatusChange(app, e.target.value)} 
                  className={`w-full py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer border-2 appearance-none text-center ${getStatusTheme(app.status)}`}
                >
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offered">Offered</option>
                  <option value="Rejected Offer">Rejected Offer</option>
                  <option value="Hired">Hired</option>
                  <option disabled>── ARCHIVE ACTIONS ──</option>
                  <option value="Resigned">Resigned</option>
                  <option value="Blacklisted">Blacklisted</option>
                  <option value="Failed Interview">Failed Interview</option>
                </select>
              </div>

              {/* Contact Edit Fields */}
              {editId === app.id ? (
                <div className="space-y-2">
                  <input className="w-full p-3 bg-slate-50 rounded-xl text-[10px] border" value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} placeholder="Email" />
                  <input className="w-full p-3 bg-slate-50 rounded-xl text-[10px] border" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} placeholder="Phone" />
                </div>
              ) : (
                <div className="flex gap-2">
                  <a href={`mailto:${app.email}`} className="flex-1 bg-slate-100 py-3 rounded-2xl text-[9px] font-black text-center text-slate-500 uppercase">Email</a>
                  <a href={`https://wa.me/${app.phone?.replace(/[^0-9]/g, '')}`} target="_blank" className="flex-1 bg-emerald-100 py-3 rounded-2xl text-[9px] font-black text-center text-emerald-700 uppercase">WhatsApp</a>
                  <button onClick={() => setShowHistoryId(showHistoryId === app.id ? null : app.id)} className="px-5 bg-slate-50 rounded-2xl text-slate-300 font-bold hover:text-blue-500 transition-colors text-xs">🕒</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}