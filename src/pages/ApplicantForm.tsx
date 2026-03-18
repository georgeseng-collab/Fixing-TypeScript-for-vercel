// @ts-nocheck
import { useState } from 'react';
import { supabase } from '../db'; // Import supabase directly for the check
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
    last_drawn_salary: '', 
    salary_expectation: '', 
    notice_period: '', 
    status: 'Applied', 
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
      // --- FEATURE: DUPLICATE CHECK ---
      const cleanEmail = formData.email.toLowerCase().trim();
      const cleanPhone = formData.phone.replace(/[^0-9]/g, '');

      // We check if either the email OR the phone already exists
      const { data: existing, error: checkError } = await supabase
        .from('applicants')
        .select('name, status')
        .or(`email.eq.${cleanEmail},phone.eq.${cleanPhone}`)
        .maybeSingle();

      if (checkError) console.error("Check Error:", checkError);

      if (existing) {
        alert(`❌ DUPLICATE DETECTED: ${existing.name} is already in the system (Status: ${existing.status}). Submission cancelled.`);
        setLoading(false);
        return; // STOP submission
      }
      // --------------------------------

      const submissionData = { ...formData };

      // Handle Optional Interview Date
      if (!submissionData.interview_date || submissionData.interview_date.trim() === "") {
        delete submissionData.interview_date;
      }

      // Add default history if it doesn't exist
      submissionData.status_history = [{
        status: 'Applied',
        date: new Date().toISOString(),
        remarks: 'Initial Form Submission'
      }];

      // Send to Database
      await addApplicant(submissionData, file);
      
      alert("✅ Candidate successfully added to pipeline!");
      navigate('/');
    } catch (error) {
      console.error("Submission Error:", error);
      alert("Failed to save candidate. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 hover:bg-white";
  const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";

  return (
    <div className="max-w-3xl mx-auto pb-12 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Add New Candidate</h1>
        <p className="text-slate-500 mt-1">All fields are mandatory except for the initial interview schedule.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-8 space-y-8">
          
          {/* Section 1: Personal Information */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="John Doe" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Email Address <span className="text-red-500">*</span></label>
                <input required type="email" placeholder="john@example.com" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Phone Number <span className="text-red-500">*</span></label>
                <input required type="tel" placeholder="+65 9123 4567" className={inputClass} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Section 2: Role & Salary Details */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4">Role & Compensation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClass}>Position Applied For <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. Senior React Developer" className={inputClass} value={formData.job_role} onChange={e => setFormData({...formData, job_role: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Last Drawn Salary <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. $80,000" className={inputClass} value={formData.last_drawn_salary} onChange={e => setFormData({...formData, last_drawn_salary: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Expected Salary <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. $90,000" className={inputClass} value={formData.salary_expectation} onChange={e => setFormData({...formData, salary_expectation: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Notice Period <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. 1 Month, Immediate, etc." className={inputClass} value={formData.notice_period} onChange={e => setFormData({...formData, notice_period: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Section 3: Scheduling & Files */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4">Next Steps & Attachments</h3>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className={labelClass}>Upload Resume (PDF, DOCX) <span className="text-red-500">*</span></label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors">
                  <input required type="file" accept=".pdf,.doc,.docx" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} />
                </div>
              </div>
              
              <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Schedule Initial Interview <span className="text-slate-400 font-normal">(Optional)</span></label>
                <input 
                  type="datetime-local" 
                  className={inputClass} 
                  value={formData.interview_date}
                  onChange={e => setFormData({...formData, interview_date: e.target.value})} 
                />
              </div>
            </div>
          </div>

        </div>
        
        <div className="bg-slate-50 px-8 py-6 border-t border-slate-200 flex justify-end">
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-10 py-3.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md active:scale-95">
            {loading ? 'Verifying Details...' : 'Add Candidate to Pipeline'}
          </button>
        </div>
      </form>
    </div>
  );
}