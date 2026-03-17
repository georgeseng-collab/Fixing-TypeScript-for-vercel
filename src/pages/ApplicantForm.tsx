// @ts-nocheck
import { useState } from 'react';
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
    
    // 1. Strict File Validation
    if (!file) {
      alert("Please upload a resume to proceed.");
      return;
    }

    setLoading(true);

    try {
      // 2. Prepare Data for Supabase
      // We create a shallow copy so we don't mess with the UI state
      const submissionData = { ...formData };

      // 3. FIX: Handle Optional Interview Date
      // If the user left it blank, we DELETE the key so Supabase treats it as NULL
      if (!submissionData.interview_date || submissionData.interview_date.trim() === "") {
        delete submissionData.interview_date;
      }

      // 4. Send to Database
      await addApplicant(submissionData, file);
      
      // 5. Success! Redirect to Dashboard
      navigate('/');
    } catch (error) {
      console.error("Submission Error:", error);
      alert("Failed to save candidate. Please check your internet connection or database settings.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 hover:bg-white";
  const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";

  return (
    <div className="max-w-3xl mx-auto pb-12 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Add New Candidate</h1>
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
                <input required type="text" placeholder="John Doe" className={inputClass} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Email Address <span className="text-red-500">*</span></label>
                <input required type="email" placeholder="john@example.com" className={inputClass} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Phone Number <span className="text-red-500">*</span></label>
                <input required type="tel" placeholder="+65 9123 4567" className={inputClass} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Section 2: Role & Salary Details */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4">Role & Compensation</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClass}>Position Applied For <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. Senior React Developer" className={inputClass} onChange={e => setFormData({...formData, job_role: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Last Drawn Salary <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. $80,000" className={inputClass} onChange={e => setFormData({...formData, last_drawn_salary: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Expected Salary <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. $90,000" className={inputClass} onChange={e => setFormData({...formData, salary_expectation: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Notice Period <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. 1 Month, Immediate, etc." className={inputClass} onChange={e => setFormData({...formData, notice_period: e.target.value})} />
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
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
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
        
        <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 flex justify-end">
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg">
            {loading ? 'Saving Candidate...' : 'Add Candidate to Pipeline'}
          </button>
        </div>
      </form>
    </div>
  );
}