// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../db';

export default function TeamSettings() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: '' });

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('team_members').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setMembers(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchTeam(); }, []);

  const handleAdd = async () => {
    if (!newMember.name || !newMember.email) return alert("Name and Email required!");
    const { error } = await supabase.from('team_members').insert([newMember]);
    if (error) {
      alert("Error: " + error.message);
    } else {
      setNewMember({ name: '', email: '', role: '' });
      setShowAddModal(false);
      fetchTeam();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Remove this team member?")) return;
    await supabase.from('team_members').delete().eq('id', id);
    fetchTeam();
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-8 pb-32">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-8 border-slate-900 pb-8">
        <div>
          <h1 className="text-7xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Team</h1>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em] mt-2 italic">Manage Interviewers & Guest Lists</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-500 text-white px-10 py-5 rounded-[2rem] border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all active:translate-y-1"
        >
          + Add Member
        </button>
      </div>

      {/* Team Table */}
      <div className="bg-white rounded-[4rem] border-4 border-slate-900 shadow-[20px_20px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b-4 border-slate-900">
              <th className="p-8 text-[11px] font-black uppercase tracking-widest italic text-slate-400">Interviewer</th>
              <th className="p-8 text-[11px] font-black uppercase tracking-widest italic text-slate-400">Email Address</th>
              <th className="p-8 text-[11px] font-black uppercase tracking-widest italic text-slate-400">Role</th>
              <th className="p-8 text-[11px] font-black uppercase tracking-widest italic text-slate-400 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b-2 border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="p-8">
                  <div className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">{m.name}</div>
                </td>
                <td className="p-8">
                  <div className="text-sm font-bold text-slate-600 font-mono">{m.email}</div>
                </td>
                <td className="p-8">
                  <span className="px-4 py-2 bg-blue-100 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    {m.role || 'Member'}
                  </span>
                </td>
                <td className="p-8 text-right">
                  <button 
                    onClick={() => handleDelete(m.id)}
                    className="w-12 h-12 flex items-center justify-center bg-rose-50 text-rose-600 rounded-2xl border-2 border-rose-200 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan="4" className="p-20 text-center font-black text-slate-300 uppercase italic tracking-widest">
                  No team members added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[4rem] border-8 border-slate-900 shadow-[25px_25px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-3xl font-black italic uppercase">New Member</h3>
              <button onClick={() => setShowAddModal(false)} className="text-2xl font-black opacity-40 hover:opacity-100">✕</button>
            </div>
            <div className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Full Name</label>
                <input 
                  type="text" 
                  className="w-full p-5 bg-slate-50 border-4 border-slate-900 rounded-[2rem] font-black text-sm uppercase outline-none" 
                  value={newMember.name}
                  onChange={e => setNewMember({...newMember, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Work Email</label>
                <input 
                  type="email" 
                  className="w-full p-5 bg-slate-50 border-4 border-slate-900 rounded-[2rem] font-black text-sm outline-none" 
                  value={newMember.email}
                  onChange={e => setNewMember({...newMember, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Department / Role</label>
                <input 
                  type="text" 
                  className="w-full p-5 bg-slate-50 border-4 border-slate-900 rounded-[2rem] font-black text-sm uppercase outline-none" 
                  value={newMember.role}
                  onChange={e => setNewMember({...newMember, role: e.target.value})}
                />
              </div>
              <button 
                onClick={handleAdd}
                className="w-full py-6 bg-emerald-500 text-white rounded-[2.5rem] border-4 border-slate-900 font-black text-sm uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-900 transition-all active:translate-y-1"
              >
                Save Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}