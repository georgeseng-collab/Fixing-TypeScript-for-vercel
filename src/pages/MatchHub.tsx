// @ts-nocheck
import React, { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

const pdfVersion = pdfjs.version;
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfVersion}/build/pdf.worker.min.mjs`;

export default function MatchHub() {
  const [files, setFiles] = useState([]);
  const [jdText, setJdText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [results, setResults] = useState([]);

  const handleFileChange = (e) => {
    const uploadedFiles = Array.from(e.target.files);
    if (uploadedFiles.length > 0) { setFiles(uploadedFiles); setResults([]); }
  };

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
    return "";
  };

  const runDiagnostic = (text, jd, fileName) => {
    const currentYear = 2026;
    const lowerText = text.toLowerCase();
    
    // 1. PRIORITY 1: DIRECT DOB (The Janice/Formal Resume Fix)
    const dobMatch = text.match(/(?:birth|dob|born|date of birth).{0,25}\b(\d{4})\b/i);
    let birthYear = dobMatch ? parseInt(dobMatch[1]) : null;

    // 2. GLOBAL & LOCAL MILESTONE MAPPING
    const milestones = [
      { key: "master", age: 25, track: "Post-Grad" },
      { key: "mba", age: 28, track: "Post-Grad" },
      { key: "university", age: 23, track: "Degree" },
      { key: "bachelor", age: 23, track: "Degree" },
      { key: "polytechnic", age: 20, track: "Diploma" },
      { key: "diploma", age: 20, track: "Diploma" },
      { key: "ite", age: 18, track: "ITE/NITEC" },
      { key: "high school", age: 18, track: "International High Sch" },
      { key: "secondary", age: 17, track: "O/N Level" },
      { key: "primary", age: 12, track: "Primary" }
    ];

    let finalAge = null;
    let method = "Manual Review Required";

    // --- LOGIC FLOW ---
    if (birthYear && (currentYear - birthYear) < 75) {
      finalAge = currentYear - birthYear;
      method = "Verified DOB";
    } else {
      // FALLBACK A: Scan for specific Milestones with years (Improved wider search)
      let foundYear = null;
      for (const m of milestones) {
        if (lowerText.includes(m.key)) {
          const mRegex = new RegExp(`${m.key}[\\s\\S]{0,300}\\b(19|20)\\d{2}\\b`, 'gi');
          const mMatch = text.match(mRegex);
          if (mMatch) {
            const mYears = mMatch.join(" ").match(/\b\d{4}\b/g).map(Number);
            foundYear = Math.min(...mYears);
            finalAge = (currentYear - foundYear) + m.age;
            method = `${m.track} Anchor (${foundYear})`;
            break; 
          }
        }
      }

      // FALLBACK B: DECLARYED EXPERIENCE MATH (The Martin "20+ Years" Fix)
      if (!finalAge) {
        const expMatch = text.match(/(\d{1,2})\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i);
        if (expMatch) {
          const yearsExp = parseInt(expMatch[1]);
          // Standard career start (21) + Years of exp + Time buffer
          finalAge = 21 + yearsExp;
          method = `Declared Exp. Backtrack (${yearsExp} yrs)`;
        }
      }

      // FALLBACK C: ABSOLUTE EARLIEST YEAR (For International/Non-Track Resumes)
      if (!finalAge) {
        const allYears = (text.match(/\b(19|20)\d{2}\b/g) || [])
          .map(Number)
          .filter(y => y > 1960 && y < currentYear - 1);
        
        if (allYears.length > 0) {
          const earliestYear = Math.min(...allYears);
          finalAge = (currentYear - earliestYear) + 20; // Assume age 20 at earliest entry
          method = `Earliest Entry Anchor (${earliestYear})`;
        }
      }
    }

    // 3. COMPANY TYPE & PROS/CONS
    const companyTypes = {
      MNC: /apple|google|samsung|amazon|microsoft|patek|chanel|resmed|harvey|deloitte|ey|pwc|kpmg/i,
      SME: /pte ltd|private limited|ltd/i,
      Public: /ministry|statutory|board|council|gov|university/i
    };

    let background = "Private Enterprise";
    Object.entries(companyTypes).forEach(([type, regex]) => {
      if (regex.test(lowerText)) background = type;
    });

    const companyMatches = text.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\s(Pte Ltd|Ltd|Inc|Group|Corp)/g) || ["Professional Experience"];
    const pros = [background === "MNC" ? "MNC Corporate Rigor" : "SME Operational Agility"];
    if (finalAge > 38) pros.push("Seasoned Professionalism");
    if (lowerText.includes("tableau") || lowerText.includes("nav")) pros.push("Technical Tool Mastery");

    const cons = [];
    if (finalAge < 25) cons.push("Limited Tenure Record");
    if (finalAge > 45 && lowerText.includes("assistant")) cons.push("Role Seniority Mismatch");

    // 4. COMPATIBILITY SCORING
    const jdKeywords = jd.toLowerCase().match(/\b(\w{4,})\b/g) || [];
    const matches = [...new Set(jdKeywords)].filter(word => lowerText.includes(word));
    const score = Math.min(Math.round((matches.length / (jdKeywords.length || 1)) * 100) + 25, 99);

    return {
      name: fileName.replace(/\.[^/.]+$/, ""),
      compatibility: score,
      age: finalAge ? `${finalAge - 2}-${finalAge + 1}` : "Manual Review",
      method: method,
      background,
      companies: [...new Set(companyMatches)].slice(0, 2).join(", "),
      pros, cons,
      highlights: matches.slice(0, 5).map(m => m.toUpperCase())
    };
  };

  const handleBulkAnalyze = async () => {
    if (files.length === 0 || !jdText) return alert("Select files and provide JD.");
    setIsAnalyzing(true);
    const allResults = [];
    for (let i = 0; i < files.length; i++) {
      setProgress({ current: i + 1, total: files.length, status: `Analysing: ${files[i].name}` });
      try {
        const text = await extractText(files[i]);
        allResults.push(runDiagnostic(text, jdText, files[i].name));
      } catch (e) { console.error(e); }
    }
    setResults(allResults);
    setIsAnalyzing(false);
  };

  return (
    <div className="max-w-[1650px] mx-auto p-10 bg-slate-50 min-h-screen text-slate-900 font-sans">
      
      {/* HEADER SECTION */}
      <div className="mb-10 bg-slate-900 text-white p-10 rounded-[3rem] shadow-[10px_10px_0_0_#10b981] border-4 border-black flex justify-between items-center">
        <div>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter">Genie Engine v5.6</h1>
          <p className="text-emerald-400 font-bold text-xs uppercase tracking-[0.4em] mt-2 italic">Global Backtrack & Singapore Track Hybrid</p>
        </div>
        {results.length > 0 && <button onClick={() => window.print()} className="bg-emerald-500 px-8 py-3 rounded-2xl font-black text-xs uppercase border-2 border-white">Generate Final Report</button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        
        {/* PANEL: INPUTS */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-emerald-600">1. Bulk Resumes</h3>
            <label className="flex flex-col items-center justify-center w-full h-40 border-4 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-emerald-50 transition-all">
              <span className="text-4xl mb-2">{files.length > 0 ? '📚' : '📄'}</span>
              <p className="text-[10px] font-black uppercase text-slate-400 text-center">{files.length > 0 ? `${files.length} Ready` : 'PDF / DOCX'}</p>
              <input type="file" className="hidden" accept=".pdf,.docx" multiple onChange={handleFileChange} />
            </label>
          </div>
          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-emerald-600">2. Job Profile</h3>
            <textarea value={jdText} onChange={(e) => setJdText(e.target.value)} className="w-full h-64 p-4 border-2 border-black rounded-2xl font-bold bg-slate-50 text-[10px] outline-none" placeholder="Paste JD..."></textarea>
          </div>
          <button onClick={handleBulkAnalyze} disabled={isAnalyzing} className="w-full p-6 bg-emerald-500 text-white rounded-[2rem] font-black uppercase shadow-[8px_8px_0_0_#000] hover:bg-black transition-all">
            {isAnalyzing ? `Analyzing ${progress.current}/${progress.total}` : "Run Professional Scan →"}
          </button>
        </div>

        {/* PANEL: RESULTS */}
        <div className="lg:col-span-3">
          {results.length > 0 && (
            <div className="space-y-10 animate-in fade-in duration-500">
              
              {/* COMPARISON CHART */}
              <div className="bg-white border-4 border-black rounded-[2.5rem] shadow-[12px_12px_0_0_#000] overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="p-6 font-black uppercase italic text-[10px]">Candidate Profile</th>
                      <th className="p-6 font-black uppercase italic text-[10px]">Match Score</th>
                      <th className="p-6 font-black uppercase italic text-[10px]">Est. Age Range</th>
                      <th className="p-6 font-black uppercase italic text-[10px]">Diagnosis Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-4 divide-slate-50">
                    {results.map((res, i) => (
                      <tr key={i} className="hover:bg-emerald-50/50 transition-colors">
                        <td className="p-6 font-black text-sm uppercase">{res.name}</td>
                        <td className="p-6 font-black text-xs text-emerald-600">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-12 bg-slate-100 rounded-full border border-black/10 overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${res.compatibility}%` }}></div>
                                </div>
                                {res.compatibility}%
                            </div>
                        </td>
                        <td className="p-6 font-bold text-xs italic">{res.age} Yrs</td>
                        <td className="p-6 font-black text-[9px] text-slate-400 uppercase italic truncate max-w-[200px]">{res.method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* DETAIL CARDS */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {results.map((res, i) => (
                  <div key={i} className="bg-white border-4 border-black rounded-[3rem] p-8 shadow-[10px_10px_0_0_#000] flex flex-col">
                    <div className="flex justify-between items-start mb-6 border-b-2 border-slate-100 pb-6">
                        <div>
                            <h4 className="font-black text-2xl uppercase italic leading-none">{res.name}</h4>
                            <p className="text-[10px] font-black uppercase text-emerald-600 mt-2">Background: {res.background}</p>
                        </div>
                        <div className="bg-black text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase">RANK #{i+1}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div>
                            <p className="text-[9px] font-black uppercase text-emerald-600 mb-2">✅ Key Strengths</p>
                            <ul className="space-y-1">
                                {res.pros.map(p => <li key={p} className="text-[10px] font-bold bg-emerald-50 p-2 rounded-xl border border-emerald-100">• {p}</li>)}
                            </ul>
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-rose-500 mb-2">⚠️ Potential Cons</p>
                            <ul className="space-y-1">
                                {res.cons.map(c => <li key={c} className="text-[10px] font-bold bg-rose-50 p-2 rounded-xl border border-rose-100">• {c}</li>)}
                            </ul>
                        </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-slate-100 flex flex-wrap gap-2">
                        {res.highlights.map(h => <span key={h} className="bg-slate-100 px-3 py-1 rounded-lg text-[9px] font-black border border-black/5 uppercase tracking-tighter">{h}</span>)}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}