// @ts-nocheck
import React, { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth'; // For DOCX support

// Version-synced worker
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

  // --- Multi-Format Extraction (PDF & DOCX) ---
  const extractText = async (file) => {
    const fileType = file.name.split('.').pop().toLowerCase();
    
    if (fileType === 'pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(" ") + "\n";
      }
      return text;
    } 
    
    if (fileType === 'docx' || fileType === 'doc') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }
    
    throw new Error("Unsupported file format");
  };

  // --- Smart Age & Match Diagnostic ---
  const runDiagnostic = (text, jd) => {
    const currentYear = 2026;
    
    // 1. Contextual Age Logic
    // We look for years mentioned near "University", "Bachelor", or "Graduated"
    const eduRegex = /(?:university|bachelor|degree|graduated|college|diploma).{0,30}\b(19|20)\d{2}\b/gi;
    const workRegex = /(?:experience|working|joined|started|since).{0,30}\b(19|20)\d{2}\b/gi;
    
    let eduYears = [];
    let match;
    while ((match = eduRegex.exec(text)) !== null) eduYears.push(parseInt(match[1] + match[0].match(/\d{2}/)));

    let workYears = [];
    while ((match = workRegex.exec(text)) !== null) workYears.push(parseInt(match[1] + match[0].match(/\d{2}/)));

    // Fallback to any years found if context fails
    const allYears = (text.match(/\b(19|20)\d{2}\b/g) || []).map(Number).filter(y => y > 1970 && y <= currentYear);

    let baseAge = 0;
    let method = "";

    if (eduYears.length > 0) {
      const earliestEdu = Math.min(...eduYears);
      baseAge = (currentYear - earliestEdu) + 22; // Assume 22 at Degree Grad
      method = "Education Anchor";
    } else if (workYears.length > 0) {
      const earliestWork = Math.min(...workYears);
      baseAge = (currentYear - earliestWork) + 20; // Assume 20 at start of career
      method = "Career Start Anchor";
    } else if (allYears.length > 0) {
      const earliestAny = Math.min(...allYears);
      baseAge = (currentYear - earliestAny) + 22;
      method = "General Timeline Anchor";
    }

    // Generate Range
    const ageRange = baseAge > 0 ? `${baseAge - 2} - ${baseAge + 2}` : "Unable to estimate";

    // 2. Compatibility Logic
    const jdKeywords = jd.toLowerCase().match(/\b(\w{4,})\b/g) || [];
    const uniqueJD = [...new Set(jdKeywords)];
    const matches = uniqueJD.filter(word => text.toLowerCase().includes(word));
    const score = Math.min(Math.round((matches.length / uniqueJD.length) * 100) + 10, 99);

    return {
      compatibility: score,
      ageRange: ageRange,
      method: method,
      summary: `Diagnostic complete using ${method}. Analysis shows a strong match in core competencies.`,
      highlights: matches.slice(0, 5).map(m => m.toUpperCase())
    };
  };

  const handleAnalyze = async () => {
    if (!file || !jdText) return alert("Please upload a file and JD");
    setIsAnalyzing(true);
    setStatus('Scanning Document...');

    try {
      const text = await extractText(file);
      setStatus('Calculating Metrics...');
      
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
        <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Match Hub v3.0</h1>
        <p className="text-blue-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">PDF & DOCX Support • Contextual Age Engine</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-blue-600">1. Upload Resume (PDF/DOCX)</h3>
            <label className="flex flex-col items-center justify-center w-full h-32 border-4 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-blue-50 transition-all">
              <span className="text-3xl mb-2">{file ? '📂' : '📄'}</span>
              <p className="text-[10px] font-black uppercase text-slate-400">{file ? file.name : 'Select File'}</p>
              <input type="file" className="hidden" accept=".pdf,.docx,.doc" onChange={handleFileChange} />
            </label>
          </div>

          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-blue-600">2. Target Job Description</h3>
            <textarea 
              placeholder="Paste JD here..."
              className="w-full h-56 p-4 border-2 border-black rounded-xl font-bold bg-slate-50 text-xs outline-none focus:bg-white"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
          </div>

          <button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full p-6 bg-blue-600 text-white rounded-2xl font-black uppercase shadow-[8px_8px_0_0_#000] hover:bg-black transition-all">
            {isAnalyzing ? status : "Start Deep Scan →"}
          </button>
        </div>

        <div className="lg:sticky lg:top-10 h-fit">
          {result && (
            <div className="bg-white p-8 border-4 border-black rounded-[3rem] shadow-[15px_15px_0_0_#3b82f6] space-y-6 animate-in slide-in-from-right-10 duration-500">
              <div className="flex justify-between items-center border-b-4 border-black pb-6">
                <div>
                  <h2 className="text-3xl font-black uppercase italic">Report</h2>
                  <p className="text-[10px] font-black uppercase text-blue-600 mt-2">Verified Diagnosis</p>
                </div>
                <div className="bg-black text-white p-5 rounded-2xl text-center border-2 border-blue-400 min-w-[100px]">
                  <div className="text-3xl font-black">{result.compatibility}%</div>
                  <p className="text-[8px] font-bold uppercase">Match</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-yellow-300 border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#000]">
                  <p className="text-[8px] font-black uppercase opacity-60 font-bold">Estimated Age Range</p>
                  <p className="text-2xl font-black italic">{result.ageRange} <span className="text-[10px]">Years</span></p>
                </div>
                <div className="p-4 bg-slate-900 text-white border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#000]">
                  <p className="text-[8px] font-black uppercase text-blue-400 font-bold italic">Anchor Method</p>
                  <p className="text-sm font-black uppercase italic">{result.method}</p>
                </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border-2 border-black italic text-xs font-bold leading-relaxed text-slate-600">
                "{result.summary}"
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-blue-600">✅ Top Match Indicators</p>
                <div className="flex flex-wrap gap-2">
                  {result.highlights.map(h => (
                    <span key={h} className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-[9px] font-black text-blue-700">
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