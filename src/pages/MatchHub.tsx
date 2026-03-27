// @ts-nocheck
import React, { useState, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

const pdfVersion = pdfjs.version;
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfVersion}/build/pdf.worker.min.mjs`;

export default function MatchHub() {
  const [files, setFiles] = useState([]);
  const [jdText, setJdText] = useState('');
  const [jdTitle, setJdTitle] = useState('');
  const [savedJDs, setSavedJDs] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [results, setResults] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem('genie_jd_library');
    if (stored) setSavedJDs(JSON.parse(stored));
  }, []);

  const saveCurrentJD = () => {
    if (!jdText || !jdTitle) return alert("Enter both a Title and JD content to save.");
    const newJD = { id: Date.now(), title: jdTitle, content: jdText };
    const updated = [newJD, ...savedJDs];
    setSavedJDs(updated);
    localStorage.setItem('genie_jd_library', JSON.stringify(updated));
    setJdTitle('');
    alert("JD Saved to Library!");
  };

  const deleteJD = (id) => {
    const updated = savedJDs.filter(item => item.id !== id);
    setSavedJDs(updated);
    localStorage.setItem('genie_jd_library', JSON.stringify(updated));
  };

  const selectJD = (item) => {
    setJdText(item.content);
    setJdTitle(item.title);
  };

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

  // --- UPDATED DIAGNOSTIC LOGIC WITH GLOBAL FEATURES ---
  const runDiagnostic = (text, jd, fileName) => {
    const currentYear = 2026;
    const lowerText = text.toLowerCase();
    
    // 1. DOB SHIELD (Primary)
    const dobMatch = text.match(/(?:birth|dob|born|date of birth).{0,25}\b(\d{4})\b/i);
    let birthYear = dobMatch ? parseInt(dobMatch[1]) : null;

    // 2. GLOBAL & LOCAL MILESTONES (Expanded for Global Mapping)
    const milestones = [
      { key: "phd", age: 30 }, { key: "doctorate", age: 30 },
      { key: "master", age: 25 }, { key: "mba", age: 28 },
      { key: "university", age: 23 }, { key: "bachelor", age: 23 }, { key: "college", age: 22 },
      { key: "polytechnic", age: 20 }, { key: "diploma", age: 20 },
      { key: "ite", age: 18 }, { key: "nitec", age: 18 },
      { key: "junior college", age: 18 }, { key: "high school", age: 18 },
      { key: "secondary", age: 17 }, { key: "primary", age: 12 }
    ];

    let finalAge = null;
    let method = "Manual Review Required";

    // --- STRATEGY A: Verified DOB ---
    if (birthYear && (currentYear - birthYear) < 75 && (currentYear - birthYear) > 18) {
      finalAge = currentYear - birthYear;
      method = "Verified DOB (Shield)";
    } else {
      let oldestYearFound = Infinity;
      let mAge = 22;

      // --- STRATEGY B: Milestone Anchor (Global + Local) ---
      milestones.forEach(m => {
        if (lowerText.includes(m.key)) {
          // Look for years within 300 characters of the keyword
          const mRegex = new RegExp(`${m.key}[\\s\\S]{0,300}\\b(19|20)\\d{2}\\b`, 'gi');
          const mMatch = text.match(mRegex);
          if (mMatch) {
            const mYears = mMatch.join(" ").match(/\b\d{4}\b/g).map(Number);
            const earliest = Math.min(...mYears);
            if (earliest < oldestYearFound && earliest > 1960) {
              oldestYearFound = earliest;
              mAge = m.age;
              method = `Global Anchor: ${m.key.toUpperCase()} (${earliest})`;
            }
          }
        }
      });

      // --- STRATEGY C: Earliest Work/Date Anchor (Mathematical Backtracking) ---
      // If no specific milestone keywords, sweep the document for the absolute earliest date
      if (oldestYearFound === Infinity) {
        const allYears = text.match(/\b(19|20)\d{2}\b/g);
        if (allYears) {
          const validYears = allYears.map(Number).filter(y => y > 1960 && y < (currentYear - 2));
          if (validYears.length > 0) {
            oldestYearFound = Math.min(...validYears);
            mAge = 20; // Assume 20 as base age for earliest year found
            method = `Global Sweep (Earliest: ${oldestYearFound})`;
          }
        }
      }

      if (oldestYearFound !== Infinity) {
        finalAge = (currentYear - oldestYearFound) + mAge;
      } else {
        // --- STRATEGY D: Experience Backtrack Fallback ---
        const expMatch = text.match(/(\d{1,2})\+?\s*(?:years?|yrs?)\s*(?:experience|exp)/i);
        if (expMatch) {
            finalAge = 22 + parseInt(expMatch[1]);
            method = `Exp. Backtrack (${expMatch[1]} yrs exp)`;
        }
      }
    }

    // 3. COMPANY & MATCH ANALYSIS
    const companyMatches = text.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\s(Pte Ltd|Ltd|Inc|Group|Corp|LLC|GmbH)/g) || ["Professional Experience"];
    const jdKeywords = jd.toLowerCase().match(/\b(\w{4,})\b/g) || [];
    const matches = [...new Set(jdKeywords)].filter(word => lowerText.includes(word));
    const score = Math.min(Math.round((matches.length / (jdKeywords.length || 1)) * 100) + 25, 99);

    return {
      name: fileName.replace(/\.[^/.]+$/, ""),
      compatibility: score,
      age: finalAge ? `${finalAge - 2}-${finalAge + 1}` : "Review Required",
      method,
      companies: [...new Set(companyMatches)].slice(0, 2).join(", "),
      pros: [finalAge > 35 ? "Strategic Seniority" : "Active Career Path"],
      cons: [score < 60 ? "Skill Alignment Gap" : "Verify References"],
      highlights: matches.slice(0, 5).map(m => m.toUpperCase())
    };
  };

  const handleBulkAnalyze = async () => {
    if (files.length === 0 || !jdText) return alert("Upload files and select a JD.");
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
    <div className="max-w-[1700px] mx-auto p-10 bg-slate-50 min-h-screen text-slate-900 font-sans">
      
      {/* Header */}
      <div className="mb-10 bg-slate-900 text-white p-10 rounded-[3rem] shadow-[10px_10px_0_0_#10b981] border-4 border-black flex justify-between items-center">
        <div>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter">Genie Match Hub</h1>
          <p className="text-emerald-400 font-bold text-xs uppercase tracking-[0.4em] mt-2 italic">Enterprise JD Library • Global Milestone Engine</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        
        {/* LEFT: CONTROLS & JD LIBRARY */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-white p-6 border-4 border-black rounded-[2rem] shadow-[6px_6px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-emerald-600">Saved JD Library</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 no-scrollbar">
              {savedJDs.length === 0 && <p className="text-[10px] font-bold text-slate-400 uppercase">Library Empty</p>}
              {savedJDs.map(item => (
                <div key={item.id} className="flex gap-2">
                  <button onClick={() => selectJD(item)} className="flex-1 text-left p-3 bg-slate-50 border-2 border-black rounded-xl font-black text-[10px] uppercase hover:bg-emerald-50 transition-all truncate">
                    📂 {item.title}
                  </button>
                  <button onClick={() => deleteJD(item.id)} className="p-3 bg-rose-50 border-2 border-black rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all">✕</button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-blue-600">Resume Upload</h3>
            <label className="flex flex-col items-center justify-center w-full h-32 border-4 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-blue-50 transition-all">
              <span className="text-3xl mb-1">{files.length > 0 ? '📚' : '📄'}</span>
              <p className="text-[10px] font-black uppercase text-slate-400">{files.length > 0 ? `${files.length} Files` : 'PDF/DOCX'}</p>
              <input type="file" className="hidden" accept=".pdf,.docx" multiple onChange={handleFileChange} />
            </label>
          </div>

          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000] space-y-4">
            <h3 className="font-black uppercase italic text-xs text-blue-600">JD Context</h3>
            <input 
              type="text" 
              placeholder="JD Title (e.g. Senior HR)" 
              className="w-full p-3 border-2 border-black rounded-xl font-black text-[10px] uppercase bg-slate-50"
              value={jdTitle}
              onChange={(e) => setJdTitle(e.target.value)}
            />
            <textarea 
              value={jdText} 
              onChange={(e) => setJdText(e.target.value)} 
              className="w-full h-48 p-4 border-2 border-black rounded-xl font-bold bg-slate-50 text-[10px] outline-none" 
              placeholder="Paste JD requirements..."
            />
            <button onClick={saveCurrentJD} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase hover:bg-emerald-600 transition-all">
              Save to Library
            </button>
          </div>

          <button onClick={handleBulkAnalyze} disabled={isAnalyzing} className="w-full p-6 bg-emerald-500 text-white rounded-[2rem] font-black uppercase shadow-[8px_8px_0_0_#000] hover:bg-black transition-all">
            {isAnalyzing ? `Scanning ${progress.current}/${progress.total}` : "Execute Match Test →"}
          </button>
        </div>

        {/* RIGHT: COMPARISON HUB */}
        <div className="lg:col-span-3">
          {results.length > 0 && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="bg-white border-4 border-black rounded-[2.5rem] shadow-[12px_12px_0_0_#000] overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="p-6 font-black uppercase italic text-[10px]">Candidate</th>
                      <th className="p-6 font-black uppercase italic text-[10px]">Score</th>
                      <th className="p-6 font-black uppercase italic text-[10px]">Age Range</th>
                      <th className="p-6 font-black uppercase italic text-[10px]">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-4 divide-slate-50">
                    {results.map((res, i) => (
                      <tr key={i} className="hover:bg-emerald-50/50 transition-colors">
                        <td className="p-6 font-black text-sm uppercase">{res.name}</td>
                        <td className="p-6 font-black text-xs text-emerald-600">{res.compatibility}%</td>
                        <td className="p-6 font-bold text-xs italic">{res.age} Yrs</td>
                        <td className="p-6 font-black text-[9px] text-slate-400 uppercase italic truncate">{res.method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {results.map((res, i) => (
                  <div key={i} className="bg-white border-4 border-black rounded-[3rem] p-8 shadow-[10px_10px_0_0_#000] flex flex-col">
                    <div className="flex justify-between items-start mb-6 border-b-2 border-slate-100 pb-6">
                        <h4 className="font-black text-2xl uppercase italic leading-none">{res.name}</h4>
                        <div className="bg-black text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase">RANK #{i+1}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div>
                            <p className="text-[9px] font-black uppercase text-emerald-600 mb-2">✅ Key Strengths</p>
                            <ul className="space-y-1">{res.pros.map(p => <li key={p} className="text-[10px] font-bold bg-emerald-50 p-2 rounded-xl border border-emerald-100">• {p}</li>)}</ul>
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-rose-500 mb-2">⚠️ Potential Cons</p>
                            <ul className="space-y-1">{res.cons.map(c => <li key={c} className="text-[10px] font-bold bg-rose-50 p-2 rounded-xl border border-rose-100">• {c}</li>)}</ul>
                        </div>
                    </div>
                    <div className="mt-auto pt-4 flex flex-wrap gap-2">
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