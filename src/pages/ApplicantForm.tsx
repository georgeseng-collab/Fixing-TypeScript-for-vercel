// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../db'; 
import { addApplicant } from '../db';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth'; // Word Document Parser

// Connect the PDF reader to a cloud worker so it runs smoothly
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function ApplicantForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false); // AI Parsing State
  const [file, setFile] = useState<File | null>(null);
  const [user, setUser] = useState(null); 

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
    interview_date: '',
    source: '' 
  });

  // --- 🧠 OPENAI PARSER ENGINE (PDF + DOCX) ---
  const handleParseResume = async () => {
    if (!file) return;
    
    setIsParsing(true);
    let extractedText = '';

    try {
      // 1. EXTRACT TEXT BASED ON FILE TYPE
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const maxPages = Math.min(pdf.numPages, 2); // Read first 2 pages max
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          extractedText += content.items.map((item: any) => item.str).join(' ') + ' ';
        }
      } 
      else if (file.name.toLowerCase().endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } 
      else {
        alert("⚠️ The AI parser currently supports .pdf and .docx files. Please fill the form manually for other formats.");
        setIsParsing(false);
        return;
      }

      // 2. SEND TEXT TO OPENAI
      // Ensure VITE_OPENAI_API_KEY is added to your .env file
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY; 
      
      if (!apiKey) {
        alert("Missing OpenAI API Key! Please add VITE_OPENAI_API_KEY to your .env file.");
        setIsParsing(false);
        return;
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a strict resume data extractor. Look at the following resume text and extract the candidate's Full Name, Email, and Phone Number. Return ONLY a valid JSON object in this exact format with no markdown wrappers: {\"name\": \"...\", \"email\": \"...\", \"phone\": \"...\"}. If you cannot find a piece of information, leave the string empty."
            },
            {
              role: "user",
              content: extractedText
            }
          ],
          temperature: 0.1
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      // 3. PARSE JSON & UPDATE FORM
      const aiResult = JSON.parse(data.choices[0].message.content.trim());

      setFormData(prev => ({
        ...prev,
        name: aiResult.name || prev.name,
        email: aiResult.email || prev.email,
        phone: aiResult.phone || prev.phone
      }));

    } catch (error) {
      console.error("AI Parsing Error:", error);
      alert("AI Parser hit a snag: " + error.message);
    } finally {
      setIsParsing(false);
    }
  };

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

      // Prepare Submission Data
      const submissionData = { 
        ...formData,
        created_by: user.id,        
        creator_email: user.email,  
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

  const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50 hover:bg-white font-medium appearance-none";
  const labelClass = "block text-[11px] font-black uppercase text-slate-500 mb-1.5 ml-1 tracking-wider";

  return (
    <div className="max-w-3xl mx-auto pb-12 animate-fade-in text-left">
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

          {/* Section 1: Documentation & Parsing (Moved to top for better UX) */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] border-b-2 border-slate-100 pb-2">01. Documentation & Auto-Fill</h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-slate-50 p-8 rounded-3xl border-2 border-dashed border-slate-300 relative">
                <label className={labelClass}>Resume Upload <span className="text-red-500">*</span></label>
                <input 
                  required 
                  type="file" 
                  accept=".pdf,.doc,.docx" 
                  className="w-full mt-2 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-black file:bg-slate-900 file:text-white hover:file:bg-blue-600 cursor-pointer transition-all" 
                  onChange={e => setFile(e.target.files ? e.target.files[0] : null)} 
                />
                
                {/* ✨ THE MAGIC PARSE BUTTON */}
                {file && (
                  <div className="mt-6 border-t-2 border-slate-200 pt-6 animate-in fade-in duration-300">
                    <button 
                      type="button" 
                      onClick={handleParseResume} 
                      disabled={isParsing}
                      className={`w-full py-4 rounded-2xl border-4 border-slate-900 font-black uppercase text-xs tracking-widest transition-all ${isParsing ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-400 text-slate-900 hover:bg-slate-900 hover:text-emerald-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none'}`}
                    >
                      {isParsing ? '⏳ Extracting Data with AI...' : '✨ Auto-Fill Form from Resume'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Section 2: Identity & Sourcing */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] border-b-2 border-slate-100 pb-2">02. Identity & Origin</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. John Doe" className={`${inputClass} ${formData.name && !isParsing ? 'bg-emerald-50 border-emerald-300' : ''}`} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                <input required type="email" className={`${inputClass} ${formData.email && !isParsing ? 'bg-emerald-50 border-emerald-300' : ''}`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className={labelClass}>Phone <span className="text-red-500">*</span></label>
                <input required type="tel" className={`${inputClass} ${formData.phone && !isParsing ? 'bg-emerald-50 border-emerald-300' : ''}`} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              
              {/* SOURCE TRACKING DROPDOWN */}
              <div className="md:col-span-2">
                <label className={`${labelClass} text-indigo-600`}>Lead Source <span className="text-red-500">*</span></label>
                <select 
                  required 
                  className={`${inputClass} border-2 border-slate-300 font-bold text-slate-700 cursor-pointer`} 
                  value={formData.source} 
                  onChange={e => setFormData({...formData, source: e.target.value})}
                >
                  <option value="" disabled>-- How did you find this candidate? --</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Indeed">Indeed</option>
                  <option value="JobStreet">JobStreet</option>
                  <option value="Employee Referral">Employee Referral</option>
                  <option value="Company Website">Company Website</option>
                  <option value="MyCareerFuture">MyCareerFuture</option>
                  <option value="Fastjobs">Fastjobs</option>
                  <option value="Direct Sourcing">Direct Sourcing</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Compensation & Scheduling */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] border-b-2 border-slate-100 pb-2">03. Compensation</h3>
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
              <div className="md:col-span-1">
                <label className={labelClass}>Notice Period <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="e.g. Immediate / 1 Month" className={inputClass} value={formData.notice_period} onChange={e => setFormData({...formData, notice_period: e.target.value})} />
              </div>
              <div className="md:col-span-1">
                <label className={labelClass}>Initial Interview <span className="text-slate-400 font-normal italic">(Optional)</span></label>
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
        
        <div className="bg-slate-50 px-10 py-8 flex justify-between items-center border-t-4 border-slate-900">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">* Required for Pipeline</p>
          <button type="submit" disabled={loading || !user} className="bg-blue-600 text-white px-12 py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-900 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none disabled:opacity-50 border-4 border-slate-900">
            {loading ? 'SYNCING DATA...' : 'Dispatch to Pipeline'}
          </button>
        </div>
      </form>
    </div>
  );
}