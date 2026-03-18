// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../db'; 
import { addApplicant } from '../db';
import { useNavigate } from 'react-router-dom';

export default function ApplicantForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [user, setUser] = useState(null); // Added to track recruiter

  // Fetch current logged-in user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    job_role: '', 
    current_salary: '', 
    expected_salary: '', 
    notice_period: '', 
    status: 'Sourcing', 
    interview_date: '' 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert("⚠️ Error: You must be logged in to upload candidates.");
      return;
    }

    if (!file) {
      alert("Please upload a resume to proceed.");
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = formData.email.toLowerCase().trim();
      const cleanPhone = formData.phone.replace(/[^0-9]/g, '');

      // Duplicate Check
      const { data: existing } = await supabase
        .from('applicants')
        .select('name, status')
        .or(`email.eq.${cleanEmail},phone.eq.${cleanPhone}`)
        .maybeSingle();

      if (existing) {
        alert(`❌ DUPLICATE DETECTED: ${existing.name} is already in the system (Status: ${existing.status}).`);
        setLoading(false);
        return; 
      }

      // Prepare Submission Data with Recruiter Tags and Salary Sync
      const submissionData = { 
        ...formData,
        // 1. RECRUITER TAGGING
        created_by: user.id,        // Tag candidate to this recruiter
        creator_email: user.email,  // For display on Dashboard cards

        // 2. SALARY SYNC (Brute force fix for $0 hubs)
        last_drawn_salary: formData.current_salary,
        salary_expectation: formData.expected_salary,

        status_history: [{
          status: 'Sourcing',
          date: new Date().toISOString(),
          remarks: `Initial submission by ${user.email}`
        }]
      };

      if (!submissionData.interview_date || submissionData.interview_date.trim() === "") {
        delete submissionData.interview_date;
      }

      // Send to Database using your existing helper
      await addApplicant(submissionData, file);
      
      alert("✅ Candidate successfully added and tagged to your profile!");
      navigate('/');
    } catch (error) {
      console.error("Submission Error:", error);
      alert("Failed to save candidate: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50 hover:bg-white font-medium";
  const labelClass = "block text-[11px] font-black uppercase text-slate-500 mb-1.5 ml-1 tracking-wider";

  return (
    <div className="max-w-3xl mx-auto pb-12 animate-fade-in">
      {/* Recruiter Badge */}
      <div className="mb-10 flex justify-between items-center bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none">New Candidate</h1>
          <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">Recruiter: {user?.email || 'Authenticating...'}</p>
        </div>
        <div className="bg-blue-600 px-4 py-2 rounded-full text-[10px] font-black uppercase">Internal Pipeline</div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-2xl border-4 border-slate-900 rounded-[3rem] overflow-hidden">
        <div className="p-10 space-y-10">
          
          {/* Section 1: Identity */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] border-b-2 border-slate-100 pb-2">01. Identity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. John Doe" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                <input required type="email" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Phone <span className="text-red-500">*</span></label>
                <input required type="tel" className={inputClass} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Section 2: Compensation */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] border-b-2 border-slate-100 pb-2">02. Compensation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClass}>Position Applied For <span className="text-red-500">*</span></label>
                <input required type="text" className={inputClass} value={formData.job_role} onChange={e => setFormData({...formData, job_role: e.target.value})} />
              </div>
              <div>
                <label className={`${labelClass} text-blue-600`}>Monthly Last Drawn ($) <span className="text-red-500">*</span></label>
                <input required type="text" className={inputClass} value={formData.current_salary} onChange={e => setFormData({...formData, current_salary: e.target.value})} />
              </div>
              <div>
                <label className={`${labelClass} text-emerald-600`}>Expected Salary ($) <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. 4000 - 5000" className={inputClass} value={formData.expected_salary} onChange={e => setFormData({...formData, expected_salary: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Notice Period <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. Immediate / 1 Month" className={inputClass} value={formData.notice_period} onChange={e => setFormData({...formData, notice_period: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Section 3: Documentation */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] border-b-2 border-slate-100 pb-2">03. Documentation</h3>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className={labelClass}>Resume Upload <span className="text-red-500">*</span></label>
                <input required type="file" accept=".pdf,.doc,.docx" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-black file:bg-slate-900 file:text-white hover:file:bg-blue-600 cursor-pointer" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} />
              </div>
              
              <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200">
                <label className={labelClass}>Initial Interview Schedule <span className="text-slate-400 font-normal italic">(Optional)</span></label>
                <input 
                  type="datetime-local" 
                  className="w-full border-none rounded-xl px-4 py-2.5 bg-white shadow-sm" 
                  value={formData.interview_date}
                  onChange={e => setFormData({...formData, interview_date: e.target.value})} 
                />
              </div>
            </div>
          </div>

        </div>
        
        <div className="bg-slate-50 px-10 py-8 flex justify-between items-center border-t-4 border-slate-900">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">* Required for Pipeline</p>
          <button type="submit" disabled={loading || !user} className="bg-blue-600 text-white px-12 py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-900 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none disabled:opacity-50">
            {loading ? 'SYNCING DATA...' : 'Dispatch to Pipeline'}
          </button>
        </div>
      </form>
    </div>
  );
}