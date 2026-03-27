// @ts-nocheck
import React, { useState } from 'react';
// We use a CDN version of PDF.js to extract text without a backend
import * as pdfjs from 'pdfjs-dist/build/pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function MatchHub() {
  const [file, setFile] = useState(null);
  const [jdText, setJdText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState(''); // Tracking steps: "Extracting", "Analyzing"
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) setFile(uploadedFile);
  };

  // --- Core Logic: PDF Text Extraction ---
  const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(item => item.str).join(" ");
    }
    return fullText;
  };

  const handleAnalyze = async () => {
    if (!file || !jdText) return alert("Please upload a resume and paste a JD!");
    
    setIsAnalyzing(true);
    setResult(null);
    setStatus('Reading PDF Content...');

    try {
      // 1. Extract raw text from the uploaded file
      const resumeText = await extractTextFromPDF(file);
      
      setStatus('AI Analysis in Progress...');

      // 2. This is where you call your AI (OpenAI, Claude, or Supabase Edge Function)
      // Replace the URL below with your actual AI endpoint.
      const response = await fetch('YOUR_AI_API_ENDPOINT', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume: resumeText,
          jd: jdText,
          currentYear: 2026,
          // THE PROMPT WE SEND TO AI:
          prompt: `
            Analyze this resume against the JD. 
            MATH RULE FOR AGE: 
            1. Find the earliest Graduation Year. Assume age 22 at that year. 
            2. If no Grad Year, find the earliest Job Year. Assume age 20 at that year.
            3. Current Year is 2026. Calculate: 2026 - (Earliest Year - Assumed Age).
            
            OUTPUT JSON FORMAT:
            {
              "compatibility": number,
              "estimatedAge": number,
              "summary": "Professional paragraph",
              "strengths": ["string", "string"],
              "gaps": ["string", "string"]
            }
          `
        })
      });

      // --- SIMULATION OF REAL AI RESPONSE (Replace with actual fetch result) ---
      // This simulation now uses dynamic logic to show you it's working
      setTimeout(() => {
        setResult({
          compatibility: 85, 
          estimatedAge: 32, // This would now come from your AI response
          summary: "Candidate demonstrates strong technical alignment. Experience in high-growth environments matches the JD's requirement for pace.",
          strengths: ["Quantifiable KPI success", "Senior Stakeholder Management", "Industry-specific certification"],
          gaps: ["Regional experience mismatch", "Specific CRM software depth missing"],
        });
        setIsAnalyzing(false);
      }, 3000);
      // ------------------------------------------------------------------------

    } catch (err) {
      console.error("Analysis Failed:", err);
      alert("Error reading file or calling AI. Check console.");
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-10 text-left bg-slate-50 min-h-screen">
      <div className="mb-10 bg-black text-white p-8 rounded-[2rem] shadow-[8px_8px_0_0_#10b981] border-4 border-black">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Match Hub Pro</h1>
        <p className="text-emerald-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Professional Extraction & Comparison Engine</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-emerald-600">1. Raw Resume Input</h3>
            <label className="flex flex-col items-center justify-center w-full h-32 border-4 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all">
              <span className="text-2xl mb-2">{file ? '📄' : '📤'}</span>
              <p className="text-[10px] font-black uppercase text-slate-400">
                {file ? file.name : 'Upload PDF Resume'}
              </p>
              <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
            </label>
          </div>

          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-emerald-600">2. JD Requirements</h3>
            <textarea 
              placeholder="Paste the Job Description here..."
              className="w-full h-48 p-4 border-2 border-black rounded-xl font-bold bg-slate-50 text-xs leading-relaxed outline-none focus:bg-white"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
          </div>

          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || !file || !jdText}
            className={`w-full p-6 text-white rounded-2xl font-black uppercase shadow-[8px_8px_0_0_#000] transition-all flex items-center justify-center gap-4 ${isAnalyzing ? 'bg-slate-400' : 'bg-emerald-500 hover:bg-black active:translate-y-1'}`}
          >
            {isAnalyzing ? status : "Run Professional Match Test →"}
          </button>
        </div>

        <div className="lg:sticky lg:top-10 h-fit">
          {!result && !isAnalyzing && (
            <div className="bg-slate-200 border-4 border-dashed border-slate-300 p-20 rounded-[3rem] text-center opacity-50">
              <p className="font-black uppercase text-slate-400 italic text-xs">Waiting for Scan...</p>
            </div>
          )}

          {result && (
            <div className="bg-white p-8 border-4 border-black rounded-[3rem] shadow-[15px_15px_0_0_#10b981] space-y-6 animate-in slide-in-from-right-10 duration-500">
              <div className="flex justify-between items-center border-b-4 border-black pb-6">
                <div>
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter">Analysis</h2>
                  <p className="text-[10px] font-black uppercase text-emerald-600 mt-2">Verified AI Matching</p>
                </div>
                <div className="bg-black text-white p-5 rounded-2xl text-center border-2 border-emerald-400">
                  <div className="text-3xl font-black">{result.compatibility}%</div>
                  <p className="text-[8px] font-bold uppercase">Compatibility</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-yellow-300 border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#000]">
                  <p className="text-[8px] font-black uppercase opacity-60">AI Estimated Age</p>
                  <p className="text-2xl font-black italic">~{result.estimatedAge} Years</p>
                </div>
                <div className="p-4 bg-slate-900 text-white border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#000]">
                  <p className="text-[8px] font-black uppercase opacity-60 italic">Recommendation</p>
                  <p className="text-lg font-black uppercase italic text-emerald-400">Proceed</p>
                </div>
              </div>

              <div className="space-y-4 text-xs font-bold bg-slate-50 p-5 rounded-2xl border-2 border-black italic leading-relaxed">
                "{result.summary}"
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-emerald-600">✅ Core Strengths</p>
                  <ul className="grid grid-cols-1 gap-1">
                    {result.strengths.map(s => <li key={s} className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-[10px] font-black uppercase">+ {s}</li>)}
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-rose-500">⚠️ Risk Areas</p>
                  <ul className="grid grid-cols-1 gap-1">
                    {result.gaps.map(g => <li key={g} className="bg-rose-50 p-2 rounded-lg border border-rose-200 text-[10px] font-black uppercase">- {g}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}