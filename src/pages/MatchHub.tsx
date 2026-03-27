// @ts-nocheck
import React, { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// Sync worker version
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

  const extractText = async (file) => {
    const fileName = file.name.toLowerCase();
    
    // --- 1. HANDLE PDF ---
    if (fileName.endsWith('.pdf')) {
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
    
    // --- 2. HANDLE DOCX ---
    if (fileName.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      try {
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
      } catch (err) {
        throw new Error("DOCX Corrupted: Please save the file again and re-upload.");
      }
    }

    // --- 3. HANDLE OLD .DOC (The Error Source) ---
    if (fileName.endsWith('.doc')) {
      throw new Error("Old .DOC files are not supported. Please save as .PDF or .DOCX before uploading.");
    }
    
    throw new Error("Unsupported file format. Please use PDF or DOCX.");
  };

  const runDiagnostic = (text, jd) => {
    const currentYear = 2026;
    
    // 🧠 Improved Age Logic: Searching for Years near "Education/Work" keywords
    const eduKeywords = ["university", "bachelor", "degree", "graduated", "college", "diploma", "education"];
    const workKeywords = ["experience", "working", "joined", "started", "employment"];
    
    const lines = text.split('\n');
    let anchorYear = null;
    let anchorType = "General Timeline";

    // Scan lines for Education context first (most accurate for age)
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const hasEdu = eduKeywords.some(k => lowerLine.includes(k));
      const yearMatch = lowerLine.match(/\b(19|20)\d{2}\b/);
      
      if (hasEdu && yearMatch) {
        anchorYear = parseInt(yearMatch[0]);
        anchorType = "Education Anchor";
        break; 
      }
    }

    // Fallback to Work Experience if Education isn't found
    if (!anchorYear) {
      for (const line of lines) {
        const lowerLine = line.toLowerCase();
        const hasWork = workKeywords.some(k => lowerLine.includes(k));
        const yearMatch = lowerLine.match(/\b(19|20)\d{2}\b/);
        
        if (hasWork && yearMatch) {
          anchorYear = parseInt(yearMatch[0]);
          anchorType = "Career Start Anchor";
          break;
        }
      }
    }

    // Final Fallback: Earliest year in the whole document
    if (!anchorYear) {
      const allYears = (text.match(/\b(19|20)\d{2}\b/g) || [])
        .map(Number)
        .filter(y => y > 1970 && y <= currentYear);
      if (allYears.length > 0) anchorYear = Math.min(...allYears);
    }

    // 🧮 Calculation Logic
    let baseAge = anchorYear ? (currentYear - anchorYear) + (anchorType === "Education Anchor" ? 22 : 20) : 0;
    
    // Sanity Cap
    if (baseAge > 65) baseAge = 60;
    if (baseAge < 18 && baseAge > 0) baseAge = 22;

    const ageRange = baseAge > 0 ? `${baseAge - 1} - ${baseAge + 3}` : "Manual Review Needed";

    // 🎯 Professional Compatibility Logic
    const jdKeywords = jd.toLowerCase().match(/\b(\w{4,})\b/g) || [];
    const uniqueJD = [...new Set(jdKeywords)];
    const matches = uniqueJD.filter(word => text.toLowerCase().includes(word));
    const score = Math.min(Math.round((matches.length / uniqueJD.length) * 100) + 15, 98);

    return {
      compatibility: score,
      ageRange: ageRange,
      method: anchorType,
      summary: `Diagnostic successful. Identified ${matches.length} core skill overlaps. Age estimated via ${anchorType}.`,
      highlights: matches.slice(0, 5).map(m => m.toUpperCase())
    };
  };

  const handleAnalyze = async () => {
    if (!file || !jdText) return alert("Missing File or JD Text");
    setIsAnalyzing(true);
    setStatus('Scanning...');
    
    try {
      const text = await extractText(file);
      setStatus('Analyzing...');
      
      const report = runDiagnostic(text, jdText);
      setResult(report);
    } catch (err) {
      alert(err.message); // Clear error message for the user
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-10 text-left bg-slate-50 min-h-screen text-slate-900">
      <div className="mb-10 bg-black text-white p-8 rounded-[2rem] shadow-[8px_8px_0_0_#3b82f6] border-4 border-black">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Match Engine v3.1</h1>
        <p className="text-blue-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Professional Extraction • Multi-Format Support</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-blue-600">1. Upload Resume (PDF or DOCX)</h3>
            <label className="flex flex-col items-center justify-center w-full h-32 border-4 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all">
              <span className="text-3xl mb-2">{file ? '📂' : '📄'}</span>
              <p className="text-[10px] font-black uppercase text-slate-400 text-center px-4">
                {file ? file.name : 'Upload Candidate File'}
              </p>
              <input type="file" className="hidden" accept=".pdf,.docx" onChange={handleFileChange} />
            </label>
            <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase text-center">*Note: Old .doc files must be saved as PDF first</p>
          </div>

          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-blue-600">2. Job Description</h3>
            <textarea 
              placeholder="Paste JD requirements..."
              className="w-full h-56 p-4 border-2 border-black rounded-xl font-bold bg-slate-50 text-xs outline-none focus:bg-white"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
          </div>

          <button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full p-6 bg-blue-600 text-white rounded-2xl font-black uppercase shadow-[8px_8px_0_0_#000] hover:bg-black transition-all">
            {isAnalyzing ? status : "Run Professional Match →"}
          </button>
        </div>

        <div className="lg:sticky lg:top-10 h-fit">
          {result && (
            <div className="bg-white p-8 border-4 border-black rounded-[3rem] shadow-[15px_15px_0_0_#3b82f6] space-y-6 animate-in slide-in-from-right-10 duration-500">
              <div className="flex justify-between items-center border-b-4 border-black pb-6">
                <div>
                  <h2 className="text-3xl font-black uppercase italic">Analysis</h2>
                  <p className="text-[10px] font-black uppercase text-blue-600 mt-2">Verified Diagnosis</p>
                </div>
                <div className="bg-black text-white p-5 rounded-2xl text-center border-2 border-blue-400">
                  <div className="text-3xl font-black">{result.compatibility}%</div>
                  <p className="text-[8px] font-bold uppercase">Match</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-yellow-300 border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#000]">
                  <p className="text-[8px] font-black uppercase opacity-60 font-bold">Age Estimation</p>
                  <p className="text-2xl font-black italic">{result.ageRange} <span className="text-xs uppercase">Yrs</span></p>
                </div>
                <div className="p-4 bg-slate-900 text-white border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#000]">
                  <p className="text-[8px] font-black uppercase text-blue-400 font-bold italic">Calculation Mode</p>
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