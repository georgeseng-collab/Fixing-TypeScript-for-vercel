// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '../db'; 
import { addApplicant } from '../db';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';

// Connect the PDF reader to the local worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function ApplicantForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [user, setUser] = useState(null); 

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);
  
  const [formData, setFormData] = useState({ 
    name: '', email: '', phone: '', job_role: '', 
    current_salary: '', expected_salary: '', notice_period: '', 
    status: 'Sourcing', interview_date: '', source: '' 
  });

  // --- 🧠 AI PARSER ENGINE ---
  const handleParseResume = async () => {
    if (!file) return;

    // 🔍 DIAGNOSTIC LOGS: Open your Browser Console (F12) to see these!
    console.log("--- AI PARSE ATTEMPT ---");
    console.log("1. Checking Vite Environment:", import.meta.env);
    console.log("2. Checking Specific Key:", import.meta.env.VITE_OPENAI_API_KEY);
    
    setIsParsing(true);
    let extractedText = '';

    try {
      // 1. EXTRACT TEXT
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
      else if (file.name.toLowerCase().endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      }

      // 2. RETRIEVE KEY
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY; 
      
      if (!apiKey) {
        console.error("❌ ERROR: VITE_OPENAI_API_KEY is undefined in the browser.");
        alert("Missing OpenAI API Key! Check the console (F12) for diagnostic logs.");
        setIsParsing(false);
        return;
      }

      // 3. CALL OPENAI
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
              content: "Extract Name, Email, and Phone from the text. Return JSON: {\"name\": \"...\", \"email\": \"...\", \"phone\": \"...\"}"
            },
            { role: "user", content: extractedText }
          ],
          temperature: 0.1
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

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
    if (!user || !file) return alert("User or file missing");
    setLoading(true);
    try {
      await addApplicant({ ...formData, created_by: user.id, creator_email: user.email }, file);
      alert("✅ Candidate Added!");
      navigate('/');
    } catch (err) { alert(err.message); } 
    finally { setLoading(false); }
  };

  // UI rendering code...
  return (
    <div className="max-w-3xl mx-auto p-6 text-left">
      <div className="bg-slate-900 text-white p-6 rounded-3xl mb-6 shadow-xl">
        <h1 className="text-2xl font-black uppercase italic italic">New Candidate</h1>
        <p className="text-xs text-slate-400">Authenticated: {user?.email}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border-4 border-slate-900 rounded-[2rem] p-8 shadow-2xl space-y-6">
        <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-300">
          <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Resume Upload</label>
          <input type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="text-sm" />
          
          {file && (
            <button 
              type="button" 
              onClick={handleParseResume} 
              className="w-full mt-4 bg-emerald-400 border-4 border-slate-900 p-3 font-black uppercase text-xs hover:bg-slate-900 hover:text-white transition-all shadow-[4px_4px_0_0_rgba(0,0,0,1)]"
            >
              {isParsing ? '⏳ AI is Reading...' : '✨ Auto-Fill from Resume'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input placeholder="Name" className="border p-3 rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <input placeholder="Email" className="border p-3 rounded-lg" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          <input placeholder="Phone" className="border p-3 rounded-lg" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          <input placeholder="Job Role" className="border p-3 rounded-lg" value={formData.job_role} onChange={e => setFormData({...formData, job_role: e.target.value})} />
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-xl font-black uppercase border-4 border-slate-900 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
          {loading ? 'Saving...' : 'Dispatch to Pipeline'}
        </button>
      </form>
    </div>
  );
}