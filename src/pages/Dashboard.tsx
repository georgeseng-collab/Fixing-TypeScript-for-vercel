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

  // New Candidate Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newApp, setNewApp] = useState({ name: '', email: '', phone: '', job_role: '', last_drawn_salary: '', salary_expectation: '' });

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

  // --- ADD NEW CANDIDATE WITH DUPLICATE CHECK ---
  const handleCreateCandidate = async (e) => {
    e.preventDefault();
    const cleanEmail = (newApp.email || "").toLowerCase().trim();
    const cleanPhone = (newApp.phone || "").replace(/[^0-9]/g, '');

    // Check for duplicates in Email or Phone
    const { data: existing } = await supabase
      .from('applicants')
      .select('name, status')
      .or(`email.eq.${cleanEmail},phone.eq.${cleanPhone}`)
      .maybeSingle();

    if (existing) {
      return alert(`❌ DUPLICATE FOUND: ${existing.name} is already in the system as "${existing.status}"`);
    }

    const { error } = await supabase.from('applicants').insert([{
      ...newApp,
      email: cleanEmail,
      status: 'Applied',
      status_history: [{ status: 'Applied', date: new Date().toISOString(), remarks: 'Manual Entry' }]
    }]);

    if (!error) {
      setIsAddModalOpen(false);
      setNewApp({ name: '', email: '', phone: '', job_role: '', last_drawn_salary: '', salary_expectation: '' });
      fetchData();
    }
  };

  // --- STATUS CHANGE (Gmail removed, kept Salary/Remarks) ---
  const handleStatusChange = async (app, newStatus) => {
    // Fetch fresh data to avoid history overwriting
    const { data: freshApp } = await supabase.from('applicants').select('*').eq('id', app.id).single();
    let remarks = freshApp.remarks || "";
    let offeredSalary = freshApp.offered_salary || "";

    if (newStatus === 'Offered') {
      const sal = window.prompt("Enter Offered Salary:", offeredSalary);
      if (sal === null) return;
      offeredSalary = sal;
    }

    if (['Blacklisted', 'Failed Interview', 'Resigned', 'Rejected Offer'].includes(newStatus)) {
      const msg = window.prompt(`Enter remarks for ${newStatus}:`, remarks);
      if (msg === null) return;
      remarks = msg;
    }

    const history = [...(freshApp.status_history || []), { 
      status: newStatus, 
      date: new Date().toISOString(), 
      remarks,
      salary: newStatus === 'Offered' ? offeredSalary : null 
    }];

    await supabase.from('applicants').update({ 
      status: newStatus, 
      status_history: history, 
      remarks, 
      offered_salary: offeredSalary 
    }).eq('id', app.id);
    
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
    'Archive': applicants.filter(a => ['Failed Interview', 'Blacklisted', 'Resigned', 'Rejected Offer'].includes(a.status)).length,
  };

  const filtered = applicants.filter(a => {
    const matchesSearch = (a.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (a.job_role || "").toLowerCase().includes(searchTerm.toLowerCase());
    if (filterStatus === 'Archive') return matchesSearch && ['Failed Interview', 'Blacklisted', 'Resigned', 'Rejected Offer'].includes(a.status);
    if (filterStatus === 'All') return matchesSearch && !['Failed Interview', 'Blacklisted', 'Resigned', 'Rejected Offer'].includes(a.status);
    return matchesSearch && a.status === filterStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-8 pb-32">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase">GenieBook <span className="text-blue-600">ATS</span></h1>
          <button onClick={() => setIsAddModalOpen(true)} className="mt-4 px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-slate-900 transition-all active:scale-95 border-b-4 border-blue-800">
            + New Candidate
          </button>
        </div>
        <input type="text" placeholder="Search name or role..." className="w-full md:w-80 bg-white px-8 py-5 rounded-[2.5rem] border border-slate-100 shadow-inner font-bold text-sm focus:ring-4 focus:ring-blue-50 outline-none transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {/* FILTER TABS */}
      <div className="flex flex-wrap gap-2 bg-white p-3 rounded-[3rem] border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
        {Object.entries(counts).map(([label, count]) => (
          <button key={label} onClick={() => setFilterStatus(label)} className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${filterStatus === label ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-400'}`}>
            {label} <span className={`px-2.5 py-1 rounded-md text-[9px] ${filterStatus === label ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
          </button>
        ))}
      </div>

      {/* CANDIDATE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(app => (
          <div key={app.id} className="bg-white rounded-[4rem] border border-slate-100 shadow-xl flex flex-col hover:translate-y-[-10px] transition-all duration-300">
            <div className={`p-10 pb-6 ${getStatusTheme(app.status)} rounded-t-[4rem]`}>
              <div className="flex justify-between items-start">
                <div className="flex-grow">
                  {editId === app.id ? (
                    <input className="w-full text-xl font-black bg-white/20 rounded-xl px-3 py-1 outline-none text-white border-none" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                  ) : (
                    <h2 className="text-3xl font-black tracking-tighter italic uppercase leading-none">{app.name}</h2>
                  )}
                  <p className="text-[10px] font-black uppercase opacity-70 tracking-[0.2em] mt-1">{app.job_role}</p>
                </div>
                <button onClick={() => editId === app.id ? saveEdit() : (setEditId(app.id), setEditData(app))} className="p-4 bg-white/20 rounded-2xl hover:bg-white/40 transition-all">{editId === app.id ? '✔️' : '✏️'}</button>
              </div>
            </div>

            <div className="p-10 space-y-8 flex-grow">
              <div className="space-y-3">
                <a href={`mailto:${app.email}`} className="flex items-center gap-3 bg-slate-50 p-5 rounded-[1.5rem] text-[11px] font-black text-slate-600 truncate uppercase border border-slate-100">📧 {app.email}</a>
                <a href={`https://wa.me/${(app.phone || "").replace(/[^0-9]/g, '')}`} target="_blank" className="flex items-center gap-3 bg-emerald-50 p-5 rounded-[1.5rem] text-[11px] font-black text-emerald-700 uppercase border border-emerald-100">📱 {app.phone}</a>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Expected</span>
                  <span className="text-sm font-black text-blue-600">${app.salary_expectation || '—'}</span>
                </div>
                {app.offered_salary && (
                  <div className="flex-1 bg-purple-50 p-5 rounded-[1.5rem] border border-purple-100">
                    <span className="block text-[8px] font-black text-purple-400 uppercase tracking-widest mb-1">Offered</span>
                    <span className="text-sm font-black text-purple-700">${app.offered_salary}</span>
                  </div>
                )}
              </div>

              <div className="relative group">
                <select value={app.status} onChange={e => handleStatusChange(app, e.target.value)} className={`w-full py-5 rounded-[2rem] text-[11px] font-black uppercase text-center appearance-none cursor-pointer shadow-lg transition-all ${getStatusTheme(app.status)}`}>
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offered">Offered</option>
                  <option value="Hired">Hired</option>
                  <option value="Rejected Offer">Rejected Offer</option>
                  <option value="Failed Interview">Failed Interview</option>
                  <option value="Resigned">Resigned</option>
                  <option value="Blacklisted">Blacklisted</option>
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">▼</div>
              </div>

              <div className="flex gap-3">
                <a href={app.resume_metadata?.url} target="_blank" className="flex-[2] text-center bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all">View Resume</a>
                <button onClick={() => setShowHistoryId(showHistoryId === app.id ? null : app.id)} className="flex-1 bg-slate-100 text-slate-400 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all shadow-inner">🕒 Hist</button>
              </div>

              {showHistoryId === app.id && (
                <div className="mt-4 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-3 max-h-40 overflow-y-auto no-scrollbar shadow-inner animate-in slide-in-from-top-2">
                  {app.status_history?.map((h, i) => (
                    <div key={i} className="flex justify-between text-[10px] font-bold border-b pb-2 border-slate-200">
                      <span className="uppercase text-slate-800 tracking-tight">{h.status}</span>
                      <span className="text-slate-400 italic font-medium">{new Date(h.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* INLINE ADD MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[500] flex items-center justify-center p-8">
          <div className="bg-white w-full max-w-xl rounded-[4.5rem] p-16 space-y-8 shadow-[0_50px_100px_rgba(0,0,0,0.4)] border-4 border-white animate-in zoom-in duration-300">
            <h2 className="text-5xl font-black italic uppercase tracking-tighter">New Pipeline Entry</h2>
            <form onSubmit={handleCreateCandidate} className="space-y-6">
              <input required placeholder="Candidate Full Name" className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold outline-none shadow-inner" value={newApp.name} onChange={e => setNewApp({...newApp, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-6">
                <input required type="email" placeholder="Email" className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold outline-none shadow-inner" value={newApp.email} onChange={e => setNewApp({...newApp, email: e.target.value})} />
                <input required placeholder="Phone Number" className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold outline-none shadow-inner" value={newApp.phone} onChange={e => setNewApp({...newApp, phone: e.target.value})} />
              </div>
              <input required placeholder="Target Job Role" className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold outline-none shadow-inner" value={newApp.job_role} onChange={e => setNewApp({...newApp, job_role: e.target.value})} />
              <div className="flex gap-6 pt-6">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-7 bg-slate-100 text-slate-400 rounded-[2.5rem] font-black uppercase text-[12px] tracking-widest hover:bg-slate-200 transition-all">Discard</button>
                <button type="submit" className="flex-[2] py-7 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase text-[12px] tracking-widest shadow-2xl shadow-blue-200 active:scale-95 transition-all">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}