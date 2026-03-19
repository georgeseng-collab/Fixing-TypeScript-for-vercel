import { useState, useEffect } from 'react';
import { supabase } from '../db'; 
import { addApplicant } from '../db';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';

// Configure PDF.js Worker using the stable local URL method
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function ApplicantForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [user, setUser] = useState<any>(null); 

  // Identity Check: Ensure we know which recruiter is adding the candidate
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

  // --- 🧠 AI RESUME PARSER ENGINE ---
  const handleParseResume = async () => {
    if (!file) return;
    
    setIsParsing(true);
    let extractedText = '';

    try {
      // 1. Text Extraction
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const maxPages = Math.min(pdf.numPages, 2); 
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
        alert("⚠️ AI parsing supports .pdf and .docx. Please fill manually for other formats.");
        setIsParsing(false);
        return;
      }

      // 2. OpenAI Integration
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY; 
      if (!apiKey) throw new Error("API Key configuration missing.");

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
              content: "You are a resume data extractor. Extract the Full Name, Email, and Phone. Return ONLY JSON: {\"name\": \"...\", \"email\": \"...\", \"phone\": \"...\"}"
            },
            { role: "user", content: extractedText }
          ],
          temperature: 0.1
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const aiResult = JSON.parse(data.choices[0].message.content.trim());

      // 3. Update State with AI results
      setFormData(prev => ({
        ...prev,
        name: aiResult.name || prev.name,
        email: aiResult.email || prev.email,
        phone: aiResult.phone || prev.phone
      }));

    } catch (error: any) {
      console.error("AI Parsing Error:", error);
      alert("AI Parser Error: " + error.message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file) {
      alert("⚠️ Error: Authentication or File missing.");
      return;
    }

    setLoading(true);

    try {
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

      if (!submissionData.interview_date) delete (submissionData as any).interview_date;

      await addApplicant(submissionData, file);
      alert("✅ Candidate successfully added to Pipeline!");
      navigate('/');
    } catch (error: any) {
      alert("Failed to save: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-slate-50 hover:bg-white font-medium";
  const labelClass = "block text-[11px] font-black uppercase text-slate-500 mb-1.5 ml-1 tracking-wider";

  return (
    <div className="max-w-3xl mx-auto pb-12 animate-fade-in text-left">
      <div className="mb-10 flex justify-between items-center bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic leading-none">New Candidate</h1>
          <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">Recruiter: {user?.email || 'Checking session...'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-2xl border-4 border-slate-900 rounded-[3rem] overflow-hidden">
        <div className="p-10 space-y-10">
          
          {/* STEP 1: RESUME & AI */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] border-b-2 border-slate-100 pb-2">01. Smart Upload</h3>
            <div className="bg-slate-50 p-8 rounded-3xl border-2 border-dashed border-slate-300">
              <label className={labelClass}>Resume File (PDF/DOCX)</label>
              <input 
                required 
                type="file" 
                accept=".pdf,.docx" 
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-black file:bg-slate-900 file:text-white cursor-pointer" 
                onChange={e => setFile(e.target.files ? e.target.files[0] : null)} 
              />
              
              {file && (
                <button 
                  type="button" 
                  onClick={handleParseResume} 
                  disabled={isParsing}
                  className={`w-full mt-6 py-4 rounded-2xl border-4 border-slate-900 font-black uppercase text-xs tracking-widest transition-all ${isParsing ? 'bg-slate-100 text-slate-400' : 'bg-emerald-400 text-slate-900 hover:bg-slate-900 hover:text-emerald-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none'}`}
                >
                  {isParsing ? '⏳ AI IS READING...' : '✨ Auto-Fill from Resume'}
                </button>
              )}
            </div>
          </div>

          {/* STEP 2: DETAILS */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] border-b-2 border-slate-100 pb-2">02. Candidate Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClass}>Full Name</label>
                <input required type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <input required type="email" placeholder="Email Address" className={inputClass} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <input required type="tel" placeholder="Phone Number" className={inputClass} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <div className="md:col-span-2">
                <label className={labelClass}>Lead Source</label>
                <select required className={inputClass} value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})}>
                  <option value="">-- Select Source --</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Indeed">Indeed</option>
                  <option value="Direct Sourcing">Direct Sourcing</option>
                  <option value="Employee Referral">Employee Referral</option>
                </select>
              </div>
            </div>
          </div>

          {/* STEP 3: LOGISTICS */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] border-b-2 border-slate-100 pb-2">03. Logistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input required placeholder="Position" className={inputClass} value={formData.job_role} onChange={e => setFormData({...formData, job_role: e.target.value})} />
              <input required placeholder="Expected Salary" className={inputClass} value={formData.expected_salary} onChange={e => setFormData({...formData, expected_salary: e.target.value})} />
              <input required placeholder="Notice Period" className={inputClass} value={formData.notice_period} onChange={e => setFormData({...formData, notice_period: e.target.value})} />
              <input type="datetime-local" className={inputClass} value={formData.interview_date} onChange={e => setFormData({...formData, interview_date: e.target.value})} />
            </div>
          </div>

        </div>
        
        <div className="bg-slate-50 px-10 py-8 border-t-4 border-slate-900 flex justify-end">
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-12 py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-900 transition-all active:translate-y-1 active:shadow-none">
            {loading ? 'SAVING...' : 'Dispatch to Pipeline'}
          </button>
        </div>
      </form>
    </div>
  );
}