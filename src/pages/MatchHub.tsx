// @ts-nocheck
import React, { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// Ensures Worker and API always match
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
    if (uploadedFiles.length > 0) {
      setFiles(uploadedFiles);
      setResults([]);
    }
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
    
    // 1. DOB SHIELD (Janice Fix: 20/01/2003)
    const dobRegex = /(?:birth|dob|born|date of birth).{0,25}\b(\d{4})\b/i;
    const dobMatch = text.match(dobRegex);
    let birthYear = dobMatch ? parseInt(dobMatch[1]) : null;

    // 2. SINGAPORE MILESTONE MAP (Education Track Logic)
    const milestones = [
      { key: "university", age: 23, track: "Degree" },
      { key: "bachelor", age: 23, track: "Degree" },
      { key: "polytechnic", age: 20, track: "Diploma/Poly" },
      { key: "diploma", age: 20, track: "Diploma/Poly" },
      { key: "ite", age: 18, track: "ITE/NITEC" },
      { key: "nitec", age: 18, track: "ITE/NITEC" },
      { key: "junior college", age: 18, track: "A-Level" },
      { key: "gce 'a'", age: 18, track: "A-Level" },
      { key: "gce 'o'", age: 16, track: "O-Level" },
      { key: "gce 'n'", age: 16, track: "N-Level" },
      { key: "primary", age: 12, track: "Primary Sch" }
    ];

    let finalAge = null;
    let method = "General Timeline";

    if (birthYear && (currentYear - birthYear) < 70) {
      finalAge = currentYear - birthYear;
      method = "Direct DOB Verification";
    } else {
      // Loop through Singapore milestones from highest to lowest
      for (const m of milestones) {
        if (lowerText.includes(m.key)) {
          const yearRegex = new RegExp(`${m.key}.{0,60}\\b(19|20)\\d{2}\\b`, 'gi');
          const yearMatch = text.match(yearRegex);
          if (yearMatch) {
            const years = yearMatch.join(" ").match(/\b\d{4}\b/g).map(Number);
            const latestYear = Math.max(...years);
            finalAge = (currentYear - latestYear) + m.age;
            method = `${m.track} Anchor`;
            break; 
          }
        }
      }
    }

    // 3. PROS, CONS & COMPANY EXTRACTION
    const companyMatches = text.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\s(Pte Ltd|Ltd|Inc|Group|SME)/g) || ["Local Enterprise"];
    const pros = [];
    if (lowerText.includes("tableau") || lowerText.includes("analytics") || lowerText.includes("nav")) pros.push("High Technical Literacy");
    if (lowerText.includes("internship") || lowerText.includes("assistant")) pros.push("Operational Support Experience");
    if (pros.length === 0) pros.push("Clear Education Milestone");

    const cons = [];
    if (finalAge < 25) cons.push("Junior/Entry Level Experience");
    if (!lowerText.includes("management") && finalAge > 30) cons.push("Individual Contributor Focus");

    // 4. MATCH SCORING
    const jdKeywords = jd.toLowerCase().match(/\b(\w{4,})\b/g) || [];
    const uniqueJD = [...new Set(jdKeywords)];
    const matches = uniqueJD.filter(word => lowerText.includes(word));
    const score = Math.min(Math.round((matches.length / (uniqueJD.length || 1)) * 100) + 25, 99);

    return {
      name: fileName.replace(/\.[^/.]+$/, ""),
      compatibility: score,
      age: finalAge ? `${finalAge - 1}-${finalAge + 1}` : "Manual Review",
      track: method,
      companies: [...new Set(companyMatches)].slice(0, 2).join(", "),
      pros: pros.slice(0, 3),
      cons: cons.slice(0, 2),
      highlights: matches.slice(0, 5).map(m => m.toUpperCase())
    };
  };

  const handleBulkAnalyze = async () => {
    if (files.length === 0 || !jdText) return alert("Please upload files and provide a JD.");
    setIsAnalyzing(true);
    const allResults = [];
    for (let i = 0; i < files.length; i++) {
      setProgress({ current: i + 1, total: files.length, status: `Scanning: ${files[i].name}` });
      try {
        const text = await extractText(files[i]);
        allResults.push(runDiagnostic(text, jdText, files[i].name));
      } catch (e) { console.error(e); }
    }
    setResults(allResults);
    setIsAnalyzing(false);
  };

  return (
    <div className="max-w-[1600px] mx-auto p-10 text-left bg-slate-50 min-h-screen text-slate-900">
      {/* Header */}
      <div className="mb-10 bg-black text-white p-10 rounded-[3rem] shadow-[10px_10px_0_0_#3b82f6] border-4 border-black flex justify-between items-center">
        <div>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter">Bulk Match v5.2</h1>
          <p className="text-blue-400 font-bold text-xs uppercase tracking-[0.4em] mt-2">Professional Comparison & Singapore Track Diagnostic</p>
        </div>
        {results.length > 0 && (
          <button onClick={() => window.print()} className="bg-blue-600 px-8 py-3 rounded-2xl font-black text-xs uppercase border-2 border-white hover:invert">
            Export Chart
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-blue-600">1. Bulk Resumes</h3>
            <label className="flex flex-col items-center justify-center w-full h-40 border-4 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-blue-50 transition-all">
              <span className="text-4xl mb-2">{files.length > 0 ? '📂' : '📄'}</span>
              <p className="text-[10px] font-black uppercase text-slate-400 text-center px-4">
                {files.length > 0 ? `${files.length} Files Loaded` : 'Upload Multiple (PDF/DOCX)'}
              </p>
              <input type="file" className="hidden" accept=".pdf,.docx" multiple onChange={handleFileChange} />
            </label>
          </div>
          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-blue-600">2. JD Requirement</h3>
            <textarea value={jdText} onChange={(e) => setJdText(e.target.value)} className="w-full h-64 p-4 border-2 border-black rounded-2xl font-bold bg-slate-50 text-[10px] outline-none" placeholder="Paste JD Requirements..."></textarea>
          </div>
          <button onClick={handleBulkAnalyze} disabled={isAnalyzing} className="w-full p-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase shadow-[8px_8px_0_0_#000] hover:bg-black transition-all active:translate-y-1">
            {isAnalyzing ? `Analyzing ${progress.current}/${progress.total}` : "Execute Bulk Scan →"}
          </button>
        </div>

        {/* Comparison Dashboard */}
        <div className="lg:col-span-3">
          {results.length > 0 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
              {/* Table */}
              <div className="bg-white border-4 border-black rounded-[2.5rem] shadow-[12px_12px_0_0_#000] overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="p-6 font-black uppercase italic text-[10px] border-r border-white/10">Candidate</th>
                      <th className="p-6 font-black uppercase italic text-[10px] border-r border-white/10">Match Score</th>
                      <th className="p-6 font-black uppercase italic text-[10px] border-r border-white/10">Age Range</th>
                      <th className="p-6 font-black uppercase italic text-[10px]">Verification Anchor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-4 divide-slate-50">
                    {results.map((res, i) => (
                      <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                        <td className="p-6 font-black text-sm uppercase border-r border-slate-100">{res.name}</td>
                        <td className="p-6 border-r border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-16 bg-slate-100 rounded-full overflow-hidden border border-black/10">
                              <div className="h-full bg-blue-600" style={{ width: `${res.compatibility}%` }}></div>
                            </div>
                            <span className="font-black text-xs">{res.compatibility}%</span>
                          </div>
                        </td>
                        <td className="p-6 font-bold text-xs border-r border-slate-100 italic">{res.age} Yrs</td>
                        <td className="p-6 font-black text-[10px] text-blue-600 uppercase">{res.track}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Individual Analysis Cards */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {results.map((res, i) => (
                  <div key={i} className="bg-white border-4 border-black rounded-[3rem] p-8 shadow-[10px_10px_0_0_#000] flex flex-col hover:scale-[1.01] transition-transform">
                    <div className="flex justify-between items-center mb-6 border-b-2 border-slate-100 pb-6">
                      <h4 className="font-black text-2xl uppercase italic leading-none">{res.name}</h4>
                      <div className="bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase">#{i+1} RANK</div>
                    </div>
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-4">Past Experience: {res.companies}</p>
                    <div className="grid grid-cols-2 gap-6 mb-8">
                      <div>
                        <p className="text-[9px] font-black uppercase text-emerald-600 mb-2">✅ Top Strengths</p>
                        <ul className="space-y-1">{res.pros.map(p => <li key={p} className="text-[10px] font-bold bg-emerald-50 p-2 rounded-xl border border-emerald-100 tracking-tight">• {p}</li>)}</ul>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase text-rose-500 mb-2">⚠️ Potential Risks</p>
                        <ul className="space-y-1">{res.cons.map(c => <li key={c} className="text-[10px] font-bold bg-rose-50 p-2 rounded-xl border border-rose-100 tracking-tight">• {c}</li>)}</ul>
                      </div>
                    </div>
                    <div className="mt-auto pt-4 flex flex-wrap gap-2">
                      {res.highlights.map(h => <span key={h} className="bg-slate-100 px-2 py-1 rounded-lg text-[9px] font-black border border-black/5 uppercase tracking-tighter">{h}</span>)}
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