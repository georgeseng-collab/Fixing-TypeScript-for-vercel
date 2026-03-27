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
    
    // 1. DATE OF BIRTH DETECTION
    const dobMatch = text.match(/(?:birth|dob|born|date of birth).{0,25}\b(\d{4})\b/i);
    let birthYear = dobMatch ? parseInt(dobMatch[1]) : null;

    // 2. THE "OLDEST STUDY ANCHOR" LOGIC (Singapore Milestones)
    const milestones = [
      { key: "primary", age: 12 },
      { key: "secondary", age: 16 },
      { key: "gce 'n'", age: 16 },
      { key: "gce 'o'", age: 16 },
      { key: "gce 'a'", age: 18 },
      { key: "junior college", age: 18 },
      { key: "ite", age: 18 },
      { key: "nitec", age: 18 },
      { key: "polytechnic", age: 19 },
      { key: "diploma", age: 19 },
      { key: "university", age: 22 },
      { key: "bachelor", age: 22 }
    ];

    let estimatedAge = null;
    let anchorFound = "General Experience";

    if (birthYear && (currentYear - birthYear) < 70) {
      estimatedAge = currentYear - birthYear;
      anchorFound = "Verified DOB";
    } else {
      // Find the OLDEST educational milestone to estimate birth year correctly
      // (Even if they took a degree at age 40, their O-Levels remain at age 16)
      let oldestYearFound = Infinity;
      let milestoneAge = 22;

      milestones.forEach(m => {
        if (lowerText.includes(m.key)) {
          const mRegex = new RegExp(`${m.key}[\\s\\S]{0,150}\\b(19|20)\\d{2}\\b`, 'gi');
          const mMatch = text.match(mRegex);
          if (mMatch) {
            const years = mMatch.join(" ").match(/\b\d{4}\b/g).map(Number);
            const earliestInContext = Math.min(...years);
            if (earliestInContext < oldestYearFound) {
              oldestYearFound = earliestInContext;
              milestoneAge = m.age;
              anchorFound = `Oldest Anchor: ${m.key.toUpperCase()} (${earliestInContext})`;
            }
          }
        }
      });

      if (oldestYearFound !== Infinity) {
        estimatedAge = (currentYear - oldestYearFound) + milestoneAge;
      } else {
        // Fallback: Years of Experience mentions
        const expMatch = text.match(/(\d{1,2})\+?\s*(?:years?|yrs?)\s*(?:experience|exp)/i);
        if (expMatch) {
            estimatedAge = 20 + parseInt(expMatch[1]);
            anchorFound = "Declared Experience Anchor";
        }
      }
    }

    // 3. COMPANY TYPE & EXPERIENCE ANALYSIS
    const companyTypes = {
      MNC: /apple|google|samsung|amazon|microsoft|patek|chanel|xiaomi|resmed|harvey/i,
      SME: /pte ltd|private limited/i,
      Startup: /startup|tech lab|incubator/i,
      Group: /group|holdings/i
    };

    let detectedType = "Private Enterprise";
    Object.entries(companyTypes).forEach(([type, regex]) => {
      if (regex.test(lowerText)) detectedType = type;
    });

    const companyMatches = text.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\s(Pte Ltd|Ltd|Inc|Group|Corp)/g) || ["Previous Employer"];
    
    // 4. PROS & CONS
    const pros = [];
    if (detectedType === "MNC") pros.push("Experienced with MNC Standards");
    if (estimatedAge > 40) pros.push("Deep Professional Seniority");
    if (lowerText.includes("tableau") || lowerText.includes("nav")) pros.push("Advanced Software Literacy");

    const cons = [];
    if (estimatedAge < 25) cons.push("Limited Career Track Record");
    if (lowerText.includes("short-term") || text.match(/months?/g)?.length > 10) cons.push("Potential Job-Hopping Pattern");

    // 5. COMPATIBILITY
    const jdKeywords = jd.toLowerCase().match(/\b(\w{4,})\b/g) || [];
    const matches = [...new Set(jdKeywords)].filter(word => lowerText.includes(word));
    const score = Math.min(Math.round((matches.length / (jdKeywords.length || 10)) * 100) + 20, 99);

    return {
      name: fileName.replace(/\.[^/.]+$/, ""),
      compatibility: score,
      age: estimatedAge ? `${estimatedAge - 1}-${estimatedAge + 1}` : "Manual Review",
      method: anchorFound,
      companyType: detectedType,
      companies: [...new Set(companyMatches)].slice(0, 2).join(", "),
      pros: pros.slice(0, 3),
      cons: cons.slice(0, 2),
      highlights: matches.slice(0, 5).map(m => m.toUpperCase())
    };
  };

  const handleBulkAnalyze = async () => {
    if (files.length === 0 || !jdText) return alert("Upload files and JD!");
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
    <div className="max-w-[1600px] mx-auto p-10 text-left bg-slate-50 min-h-screen text-slate-900 font-sans">
      <div className="mb-10 bg-black text-white p-10 rounded-[3rem] shadow-[10px_10px_0_0_#3b82f6] border-4 border-black">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter">Match Engine v5.4</h1>
        <p className="text-blue-400 font-bold text-xs uppercase tracking-[0.4em] mt-2">Oldest Study Anchor • Singapore Multi-Track System</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-blue-600">1. Bulk Resumes</h3>
            <label className="flex flex-col items-center justify-center w-full h-40 border-4 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:bg-blue-50 transition-all">
              <span className="text-4xl mb-2">{files.length > 0 ? '📂' : '📄'}</span>
              <p className="text-[10px] font-black uppercase text-slate-400 text-center px-4">{files.length > 0 ? `${files.length} Files Ready` : 'Upload Multiple (PDF/DOCX)'}</p>
              <input type="file" className="hidden" accept=".pdf,.docx" multiple onChange={handleFileChange} />
            </label>
          </div>
          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-blue-600">2. JD Context</h3>
            <textarea value={jdText} onChange={(e) => setJdText(e.target.value)} className="w-full h-64 p-4 border-2 border-black rounded-2xl font-bold bg-slate-50 text-[10px] outline-none focus:bg-white" placeholder="Paste JD Requirements..."></textarea>
          </div>
          <button onClick={handleBulkAnalyze} disabled={isAnalyzing} className="w-full p-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase shadow-[8px_8px_0_0_#000] hover:bg-black transition-all">
            {isAnalyzing ? `Analyzing ${progress.current}/${progress.total}` : "Run Bulk Diagnostic →"}
          </button>
        </div>

        <div className="lg:col-span-3">
          {results.length > 0 && (
            <div className="space-y-8 animate-in fade-in duration-700">
              <div className="bg-white border-4 border-black rounded-[2.5rem] shadow-[12px_12px_0_0_#000] overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="p-6 font-black uppercase italic text-[10px] border-r border-white/10">Candidate</th>
                      <th className="p-6 font-black uppercase italic text-[10px] border-r border-white/10">Match</th>
                      <th className="p-6 font-black uppercase italic text-[10px] border-r border-white/10">Age Range</th>
                      <th className="p-6 font-black uppercase italic text-[10px]">Anchor Applied</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-4 divide-slate-50">
                    {results.map((res, i) => (
                      <tr key={i} className="hover:bg-blue-50/50">
                        <td className="p-6 font-black text-sm uppercase border-r border-slate-100">{res.name}</td>
                        <td className="p-6 font-black text-xs text-blue-600 border-r border-slate-100">{res.compatibility}%</td>
                        <td className="p-6 font-bold text-xs border-r border-slate-100 italic">{res.age} Yrs</td>
                        <td className="p-6 font-black text-[10px] text-slate-400 uppercase italic truncate max-w-[200px]">{res.method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {results.map((res, i) => (
                  <div key={i} className="bg-white border-4 border-black rounded-[3rem] p-8 shadow-[10px_10px_0_0_#000] flex flex-col">
                    <div className="flex justify-between items-center mb-6 border-b-2 border-slate-100 pb-6">
                        <div>
                            <h4 className="font-black text-2xl uppercase italic leading-none">{res.name}</h4>
                            <p className="text-[10px] font-black uppercase text-blue-600 mt-2">Background: {res.companyType}</p>
                        </div>
                        <div className="bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase">#{i+1} RANK</div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div>
                            <p className="text-[9px] font-black uppercase text-emerald-600 mb-2">✅ Pros</p>
                            <ul className="space-y-1">{res.pros.map(p => <li key={p} className="text-[10px] font-bold bg-emerald-50 p-2 rounded-xl border border-emerald-100 tracking-tight">• {p}</li>)}</ul>
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-rose-500 mb-2">⚠️ Potential Cons</p>
                            <ul className="space-y-1">{res.cons.map(c => <li key={c} className="text-[10px] font-bold bg-rose-50 p-2 rounded-xl border border-rose-100 tracking-tight">• {c}</li>)}</ul>
                        </div>
                    </div>
                    <div className="mt-auto pt-4 flex flex-wrap gap-2">
                        {res.highlights.map(h => <span key={h} className="bg-slate-100 px-2 py-1 rounded-lg text-[9px] font-black border border-black/5 uppercase">{h}</span>)}
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