// @ts-nocheck
import React, { useState, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// PDF Worker Setup
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

  // Load Library on Mount
  useEffect(() => {
    const stored = localStorage.getItem('genie_jd_library');
    if (stored) setSavedJDs(JSON.parse(stored));
  }, []);

  // --- JD Library Logic ---
  const saveCurrentJD = () => {
    if (!jdText || !jdTitle) return alert("Enter both a Title and JD content.");
    const newJD = { id: Date.now(), title: jdTitle, content: jdText };
    const updated = [newJD, ...savedJDs];
    setSavedJDs(updated);
    localStorage.setItem('genie_jd_library', JSON.stringify(updated));
    setJdTitle('');
    alert("JD Saved!");
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
    if (uploadedFiles.length > 0) { 
        setFiles(uploadedFiles); 
        setResults([]); 
    }
  };

  // --- File Extraction ---
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

  // --- THE CAREFUL READER ENGINE (REWORKED) ---
  const runDiagnostic = (text, jd, fileName) => {
    const currentYear = 2026;
    const lowerText = text.toLowerCase();
    
    // 1. Initial Year Cleanse (Ignore 2025/2026 footer years)
    const rawYears = (text.match(/\b(19|20)\d{2}\b/g) || []).map(Number);
    const validYears = rawYears.filter(y => y > 1965 && y < (currentYear - 1));

    // 2. TIER 1: Proximity DOB Check
    const dobRegex = /(?:birth|dob|born|date of birth).{0,15}\b(19\d{2}|20\d{2})\b/i;
    const dobMatch = text.match(dobRegex);
    let birthYear = dobMatch ? parseInt(dobMatch[1]) : null;

    // 3. TIER 2: Global Education Milestones
    const milestones = [
      { key: "phd", age: 30 }, { key: "doctorate", age: 30 },
      { key: "master", age: 25 }, { key: "mba", age: 27 },
      { key: "university", age: 22 }, { key: "bachelor", age: 22 }, { key: "degree", age: 22 },
      { key: "college", age: 21 }, { key: "polytechnic", age: 20 }, { key: "diploma", age: 20 },
      { key: "high school", age: 18 }, { key: "secondary", age: 17 }
    ];

    let calculatedAge = null;
    let logicUsed = "Global Estimate";

    if (birthYear && (currentYear - birthYear) < 70) {
      calculatedAge = currentYear - birthYear;
      logicUsed = "Verified DOB Context";
    } else {
      let anchorYear = null;
      let anchorAge = 22;

      // Scan for Education years specifically
      for (let m of milestones) {
        const eduPattern = new RegExp(`${m.key}[\\s\\S]{0,100}\\b(19|20)\\d{2}\\b`, 'gi');
        const match = text.match(eduPattern);
        if (match) {
          const eduYears = match[0].match(/\b\d{4}\b/g).map(Number).filter(y => y < currentYear);
          anchorYear = Math.max(...eduYears); 
          anchorAge = m.age;
          logicUsed = `Edu: ${m.key.toUpperCase()}`;
          break;
        }
      }

      // TIER 3: Absolute Oldest Realistic Date (Global Sweep)
      if (!anchorYear && validYears.length > 0) {
        anchorYear = Math.min(...validYears);
        anchorAge = 19; // Assume oldest date is post-secondary/early career
        logicUsed = "Deep Math Backtrack";
      }

      if (anchorYear) {
        calculatedAge = (currentYear - anchorYear) + anchorAge;
      }
    }

    // TIER 4: Experience-Only Fallback
    if (!calculatedAge) {
      const expMatch = text.match(/(\d{1,2})\+?\s*(?:years?|yrs?)\s*(?:experience|exp)/i);
      if (expMatch) {
        calculatedAge = 23 + parseInt(expMatch[1]);
        logicUsed = `Exp-String Backtrack`;
      }
    }

    // --- JD ANALYSIS ---
    const jdKeywords = jd.toLowerCase().match(/\b(\w{4,})\b/g) || [];
    const matchedKeywords = [...new Set(jdKeywords)].filter(word => lowerText.includes(word));
    const score = Math.min(Math.round((matchedKeywords.length / (jdKeywords.length || 1)) * 100) + 25, 99);

    const companies = text.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\s(Pte Ltd|Ltd|Inc|Group|Corp|LLC|GmbH|Bhd)/g) || ["Experience Found"];

    return {
      name: fileName.replace(/\.[^/.]+$/, ""),
      compatibility: score,
      age: calculatedAge ? `${calculatedAge - 1}-${calculatedAge + 1}` : "Review Date",
      method: logicUsed,
      companies: [...new Set(companies)].slice(0, 2).join(", "),
      pros: [calculatedAge > 40 ? "Senior Leadership" : "High Growth Potential"],
      cons: [score < 60 ? "Skill Gap" : "Check Culture Fit"],
      highlights: matchedKeywords.slice(0, 5).map(m => m.toUpperCase())
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
      } catch (e) { console.error("Error processing file:", e); }
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
          <p className="text-emerald-400 font-bold text-xs uppercase tracking-[0.4em] mt-2 italic">Global Context Engine • Verified 2026 Logic</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        
        {/* SIDEBAR */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 border-4 border-black rounded-[2rem] shadow-[6px_6px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-emerald-600">Saved JDs</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 no-scrollbar">
              {savedJDs.map(item => (
                <div key={item.id} className="flex gap-2">
                  <button onClick={() => selectJD(item)} className="flex-1 text-left p-3 bg-slate-50 border-2 border-black rounded-xl font-black text-[10px] uppercase truncate">
                    📂 {item.title}
                  </button>
                  <button onClick={() => deleteJD(item.id)} className="p-3 text-rose-500 font-bold">✕</button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-blue-600">Upload Resumes</h3>
            <label className="flex flex-col items-center justify-center w-full h-32 border-4 border-dashed border-slate-200 rounded-3xl cursor-pointer">
              <span className="text-3xl mb-1">{files.length > 0 ? '📚' : '📄'}</span>
              <p className="text-[10px] font-black uppercase text-slate-400">{files.length > 0 ? `${files.length} Files Ready` : 'Click to Upload'}</p>
              <input type="file" className="hidden" accept=".pdf,.docx" multiple onChange={handleFileChange} />
            </label>
          </div>

          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000] space-y-4">
            <h3 className="font-black uppercase italic text-xs text-blue-600">Current JD Context</h3>
            <input type="text" placeholder="Job Title" className="w-full p-3 border-2 border-black rounded-xl font-black text-[10px] uppercase" value={jdTitle} onChange={(e) => setJdTitle(e.target.value)} />
            <textarea value={jdText} onChange={(e) => setJdText(e.target.value)} className="w-full h-48 p-4 border-2 border-black rounded-xl font-bold bg-slate-50 text-[10px]" placeholder="Paste JD requirements here..." />
            <button onClick={saveCurrentJD} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase hover:bg-emerald-600 transition-all">Save JD</button>
          </div>

          <button onClick={handleBulkAnalyze} disabled={isAnalyzing} className="w-full p-6 bg-emerald-500 text-white rounded-[2rem] font-black uppercase shadow-[8px_8px_0_0_#000] hover:bg-black transition-all active:translate-y-1">
            {isAnalyzing ? `Analyzing ${progress.current}/${progress.total}...` : "Execute Analysis →"}
          </button>
        </div>

        {/* RESULTS HUB */}
        <div className="lg:col-span-3">
          {results.length > 0 && (
            <div className="space-y-10 animate-in slide-in-from-bottom-5 duration-500">
              <div className="bg-white border-4 border-black rounded-[2.5rem] shadow-[12px_12px_0_0_#000] overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="p-6 font-black uppercase text-[10px]">Candidate</th>
                      <th className="p-6 font-black uppercase text-[10px]">Compatibility</th>
                      <th className="p-6 font-black uppercase text-[10px]">Estimated Age</th>
                      <th className="p-6 font-black uppercase text-[10px]">Engine Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-4 divide-slate-50">
                    {results.map((res, i) => (
                      <tr key={i} className="hover:bg-emerald-50 transition-colors">
                        <td className="p-6 font-black text-sm uppercase">{res.name}</td>
                        <td className="p-6 font-black text-xs text-emerald-600">{res.compatibility}%</td>
                        <td className="p-6 font-bold text-xs italic">{res.age} Yrs</td>
                        <td className="p-6 font-black text-[9px] text-slate-400 uppercase italic">{res.method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {results.map((res, i) => (
                  <div key={i} className="bg-white border-4 border-black rounded-[3rem] p-8 shadow-[10px_10px_0_0_#000]">
                    <div className="flex justify-between items-start mb-6 border-b-2 border-slate-100 pb-4">
                        <h4 className="font-black text-2xl uppercase italic">{res.name}</h4>
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg font-black text-[10px]">SCORE: {res.compatibility}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                            <p className="text-[9px] font-black uppercase text-emerald-600 mb-2">Strengths</p>
                            <ul className="space-y-1">{res.pros.map(p => <li key={p} className="text-[10px] font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-100">• {p}</li>)}</ul>
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-rose-500 mb-2">Risks</p>
                            <ul className="space-y-1">{res.cons.map(c => <li key={c} className="text-[10px] font-bold bg-rose-50 p-2 rounded-lg border border-rose-100">• {c}</li>)}</ul>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {res.highlights.map(h => <span key={h} className="bg-slate-100 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-black/10">{h}</span>)}
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