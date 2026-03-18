// @ts-nocheck
import { useState } from 'react';
import { supabase } from '../db'; 
import { addApplicant } from '../db';
import { useNavigate } from 'react-router-dom';

export default function ApplicantForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    job_role: '', 
    // Mapped to DB columns current_salary and expected_salary
    current_salary: '', 
    expected_salary: '', 
    notice_period: '', 
    status: 'Sourcing', // Changed default to Sourcing to start the pipeline
    interview_date: '' 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      alert("Please upload a resume to proceed.");
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = formData.email.toLowerCase().trim();
      const cleanPhone = formData.phone.replace(/[^0-9]/g, '');

      // Duplicate Check
      const { data: existing, error: checkError } = await supabase
        .from('applicants')
        .select('name, status')
        .or(`email.eq.${cleanEmail},phone.eq.${cleanPhone}`)
        .maybeSingle();

      if (existing) {
        alert(`❌ DUPLICATE DETECTED: ${existing.name} is already in the system (Status: ${existing.status}).`);
        setLoading(false);
        return; 
      }

      const submissionData = { ...formData };

      if (!submissionData.interview_date || submissionData.interview_date.trim() === "") {
        delete submissionData.interview_date;
      }

      submissionData.status_history = [{
        status: 'Sourcing',
        date: new Date().toISOString(),
        remarks: 'Initial Form Submission'
      }];

      // Send to Database
      await addApplicant(submissionData, file);
      
      alert("✅ Candidate successfully added to pipeline!");
      navigate('/');
    } catch (error) {
      console.error("Submission Error:", error);
      alert("Failed to save candidate.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50 hover:bg-white font-medium";
  const labelClass = "block text-[11px] font-black uppercase text-slate-500 mb-1.5 ml-1 tracking-wider";

  return (
    <div className="max-w-3xl mx-auto pb-12 animate-fade-in">
      <div className="mb-10 text-center lg:text-left">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">New Candidate</h1>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Onboarding to Internal Pipeline</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-2xl border-4 border-slate-900 rounded-[3rem] overflow-hidden">
        <div className="p-10 space-y-10">
          
          {/* Section 1: Personal Information */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] border-b-2 border-slate-100 pb-2">01. Identity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. Parvin Paramananthan" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
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

          {/* Section 2: Role & Salary Details */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] border-b-2 border-slate-100 pb-2">02. Compensation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClass}>Position Applied For <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. Outbound Education Consultant" className={inputClass} value={formData.job_role} onChange={e => setFormData({...formData, job_role: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Current Salary ($) <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. 3000" className={inputClass} value={formData.current_salary} onChange={e => setFormData({...formData, current_salary: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Expected Salary ($) <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. 3500" className={inputClass} value={formData.expected_salary} onChange={e => setFormData({...formData, expected_salary: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Notice Period <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. 1 Month" className={inputClass} value={formData.notice_period} onChange={e => setFormData({...formData, notice_period: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Section 3: Scheduling & Files */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] border-b-2 border-slate-100 pb-2">03. Documentation</h3>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className={labelClass}>Resume Upload <span className="text-red-500">*</span></label>
                <input required type="file" accept=".pdf,.doc,.docx" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-black file:bg-blue-600 file:text-white hover:file:bg-slate-900 cursor-pointer" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} />
              </div>
              
              <div className="bg-slate-100 p-6 rounded-3xl border-2 border-dashed border-slate-200">
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
        
        <div className="bg-slate-900 px-10 py-8 flex justify-between items-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">* Mandatory Fields</p>
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-10 py-4 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-white hover:text-blue-600 transition-all shadow-xl active:scale-95">
            {loading ? 'Verifying...' : 'Add to Pipeline'}
          </button>
        </div>
      </form>
    </div>
  );
}