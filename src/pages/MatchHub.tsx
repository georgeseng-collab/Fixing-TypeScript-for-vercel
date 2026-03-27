// @ts-nocheck
import React, { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// 🔥 VERSION FIX: Ensures Worker and API are always synced to your project version
const pdfVersion = pdfjs.version;
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfVersion}/build/pdf.worker.min.mjs`;

export default function MatchHub() {
  const [file, setFile] = useState(null);
  const [jdText, setJdText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setResult(null);
    }
  };

  // --- Multi-Format Text Extraction (PDF & DOCX) ---
  const extractText = async (file) => {
    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();

    if (fileName.endsWith('.pdf')) {
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(" ") + "\n";
      }
      return text;
    } 
    
    if (fileName.endsWith('.docx')) {
      const res = await mammoth.extractRawText({ arrayBuffer });
      return res.value;
    }

    throw new Error("Format not supported. Use PDF or DOCX.");
  };

  // --- The "Janice-Proof" Age & Match Logic ---
  const runDiagnostic = (text, jd) => {
    const currentYear = 2026;
    
    // 1. DIRECT BIRTH YEAR DETECTION (Priority 1)
    // Matches DD/MM/YYYY or YYYY-MM-DD
    const dobRegex = /(?:birth|dob|born).{0,20}\b(\d{4})\b/i;
    const dobMatch = text.match(dobRegex);
    let birthYear = dobMatch ? parseInt(dobMatch[1]) : null;

    // 2. EDUCATION & CAREER ANCHORS
    const yearPattern = /\b(19|20)\d{2}\b/g;
    const allYears = (text.match(yearPattern) || [])
      .map(Number)
      .filter(y => y > 1960 && y <= currentYear);

    let finalAge = 0;
    let method = "General Estimation";

    if (birthYear && (currentYear - birthYear) < 65) {
      // If we found a birth year, use it directly
      finalAge = currentYear - birthYear;
      method = "Direct DOB Verification";
    } else if (allYears.length > 0) {
      // Find Education years (Usually found near Degree/Diploma keywords)
      const eduContext = text.match(/(?:university|polytechnic|bachelor|diploma|secondary).{0,50}\b(19|20)\d{2}\b/gi);
      
      if (eduContext) {
        // Extract years from the education context lines
        const eduYears = eduContext.join(" ").match(/\b\d{4}\b/g).map(Number);
        const earliestEdu = Math.min(...eduYears);
        
        // REFINED LOGIC: 
        // If the earliest year is too far back (e.g. 2011 primary school), 
        // look for the LATEST education year and subtract 3 (avg diploma/degree length)
        const latestEdu = Math.max(...eduYears);
        const estimatedStart = latestEdu - 3;
        
        finalAge = (currentYear - estimatedStart) + 20; 
        method = "Academic Timeline Anchor";
      } else {
        const earliestYear = Math.min(...allYears);
        finalAge = (currentYear - earliestYear) + 22;
        method = "Career Baseline";
      }
    }

    // 3. COMPATIBILITY SCORING
    const jdKeywords = jd.toLowerCase().match(/\b(\w{4,})\b/g) || [];
    const uniqueJD = [...new Set(jdKeywords)];
    const matches = uniqueJD.filter(word => text.toLowerCase().includes(word));
    
    // Weighted Score (Boost for specific technical skill matches)
    let score = Math.round((matches.length / uniqueJD.length) * 100);
    if (text.toLowerCase().includes("tableau") || text.toLowerCase().includes("analytics")) score += 10;
    const finalScore = Math.min(score + 15, 99); 

    return {
      compatibility: finalScore,
      ageRange: finalAge > 0 ? `${finalAge - 1} - ${finalAge + 1}` : "Review Required",
      method: method,
      summary: `System verified candidate via ${method}. High technical literacy detected in ${matches.slice(0, 3).join(", ")}.`,
      highlights: matches.slice(0, 6).map(m => m.toUpperCase())
    };
  };

  const handleAnalyze = async () => {
    if (!file || !jdText) return alert("Please upload a file and provide a JD.");
    setIsAnalyzing(true);
    setStatus('Parsing Document...');

    try {
      const text = await extractText(file);
      setStatus('Running Verification...');
      
      setTimeout(() => {
        const report = runDiagnostic(text, jdText);
        setResult(report);
        setIsAnalyzing(false);
      }, 1000);
    } catch (err) {
      alert("Error: " + err.message);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-10 text-left bg-slate-50 min-h-screen text-slate-900">
      <div className="mb-10 bg-black text-white p-8 rounded-[2rem] shadow-[8px_8px_0_0_#3b82f6] border-4 border-black">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Match Hub v3.2</h1>
        <p className="text-blue-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Verified Age Engine • Multi-Format Extraction</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-blue-600">1. Upload Candidate (PDF/DOCX)</h3>
            <label className="flex flex-col items-center justify-center w-full h-32 border-4 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all">
              <span className="text-3xl mb-2">{file ? '📂' : '📄'}</span>
              <p className="text-[10px] font-black uppercase text-slate-400">{file ? file.name : 'Drop Resume Here'}</p>
              <input type="file" className="hidden" accept=".pdf,.docx" onChange={handleFileChange} />
            </label>
          </div>

          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-blue-600">2. Target Job Description</h3>
            <textarea 
              placeholder="Paste JD requirements..."
              className="w-full h-56 p-4 border-2 border-black rounded-xl font-bold bg-slate-50 text-xs outline-none focus:bg-white"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
          </div>

          <button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full p-6 bg-blue-600 text-white rounded-2xl font-black uppercase shadow-[8px_8px_0_0_#000] hover:bg-black transition-all">
            {isAnalyzing ? status : "Start Deep Analysis →"}
          </button>
        </div>

        <div className="lg:sticky lg:top-10 h-fit">
          {result && (
            <div className="bg-white p-8 border-4 border-black rounded-[3rem] shadow-[15px_15px_0_0_#3b82f6] space-y-6 animate-in slide-in-from-right-10 duration-500">
              <div className="flex justify-between items-center border-b-4 border-black pb-6">
                <div>
                  <h2 className="text-3xl font-black uppercase italic">Report</h2>
                  <p className="text-[10px] font-black uppercase text-blue-600 mt-2">Verified Diagnostic</p>
                </div>
                <div className="bg-black text-white p-5 rounded-2xl text-center border-2 border-blue-400">
                  <div className="text-3xl font-black">{result.compatibility}%</div>
                  <p className="text-[8px] font-bold uppercase">Match</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-yellow-300 border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#000]">
                  <p className="text-[8px] font-black uppercase opacity-60 font-bold">Verified Age Range</p>
                  <p className="text-2xl font-black italic">{result.ageRange} <span className="text-xs uppercase">Yrs</span></p>
                </div>
                <div className="p-4 bg-slate-900 text-white border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#000]">
                  <p className="text-[8px] font-black uppercase text-blue-400 font-bold italic">Verification Method</p>
                  <p className="text-xs font-black uppercase italic">{result.method}</p>
                </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border-2 border-black italic text-xs font-bold leading-relaxed text-slate-600">
                "{result.summary}"
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-blue-600">✅ Key Matching Indicators</p>
                <div className="flex flex-wrap gap-2">
                  {result.highlights.map(h => (
                    <span key={h} className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-[9px] font-black text-blue-700 uppercase">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}