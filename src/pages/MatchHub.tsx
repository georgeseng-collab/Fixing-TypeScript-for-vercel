// @ts-nocheck
import React, { useState } from 'react';

export default function MatchHub() {
  const [file, setFile] = useState(null);
  const [jdText, setJdText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  // Handle File Selection
  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) setFile(uploadedFile);
  };

  const handleAnalyze = async () => {
    if (!file || !jdText) return alert("Please upload a resume and paste a JD!");
    
    setIsAnalyzing(true);
    setResult(null);

    try {
      // 1. Convert File to Base64 for the AI to read
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64File = reader.result.split(',')[1];

        // 2. Call your AI Endpoint (OpenAI / Claude / Edge Function)
        // Note: You would replace this fetch with your actual AI API call
        /* PROMPT SUGGESTION:
           "Analyze this resume and JD. 
           1. Extract earliest graduation/work year to estimate age (assume age 22 at grad).
           2. Score compatibility (0-100%) based on JD requirements.
           3. List 3 key strengths and 2 missing gaps."
        */

        // SIMULATED AI RESPONSE
        setTimeout(() => {
          setResult({
            compatibility: 88,
            estimatedAge: 27,
            summary: "Highly qualified candidate with direct experience in Sales. Strong cultural fit based on previous company background.",
            strengths: ["Direct Competitor Experience", "Proven KPI Achievement", "Local Market Knowledge"],
            gaps: ["No experience with Salesforce", "Short notice period requirement"],
          });
          setIsAnalyzing(false);
        }, 2500);
      };
    } catch (err) {
      console.error("AI Analysis Error:", err);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-10 text-left bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-10 bg-black text-white p-8 rounded-[2rem] shadow-[8px_8px_0_0_#10b981] border-4 border-black">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Match Engine v2.0</h1>
        <p className="text-emerald-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Deep Resume Analysis • AI Extraction</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* INPUT SECTION */}
        <div className="space-y-6">
          {/* File Upload Zone */}
          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-emerald-600">1. Upload Candidate Resume</h3>
            <label className="flex flex-col items-center justify-center w-full h-32 border-4 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-emerald-400 transition-all">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <span className="text-2xl mb-2">{file ? '📄' : '📤'}</span>
                <p className="text-[10px] font-black uppercase text-slate-400">
                  {file ? file.name : 'Drop PDF here or click to upload'}
                </p>
              </div>
              <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
            </label>
          </div>

          {/* JD Input */}
          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-emerald-600">2. Target Job Description</h3>
            <textarea 
              placeholder="Paste specific JD requirements or key skills here..."
              className="w-full h-48 p-4 border-2 border-black rounded-xl font-bold bg-slate-50 outline-none focus:bg-white transition-all text-xs leading-relaxed"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
          </div>

          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || !file || !jdText}
            className={`w-full p-6 text-white rounded-2xl font-black uppercase shadow-[8px_8px_0_0_#000] transition-all active:translate-y-1 active:shadow-none flex items-center justify-center gap-4 ${
              isAnalyzing ? 'bg-slate-400' : 'bg-emerald-500 hover:bg-black'
            }`}
          >
            {isAnalyzing ? (
              <>
                <div className="w-5 h-5 border-4 border-white border-t-transparent animate-spin rounded-full"></div>
                Scanning Document...
              </>
            ) : "Start AI Match Test"}
          </button>
        </div>

        {/* RESULTS SECTION */}
        <div className="lg:sticky lg:top-10 h-fit">
          {!result && !isAnalyzing && (
            <div className="bg-slate-200 border-4 border-dashed border-slate-300 p-20 rounded-[3rem] text-center">
              <div className="text-4xl opacity-20 mb-4">🔬</div>
              <p className="font-black uppercase text-slate-400 italic text-xs">Ready for analysis</p>
            </div>
          )}

          {result && (
            <div className="bg-white p-8 border-4 border-black rounded-[3rem] shadow-[15px_15px_0_0_#10b981] space-y-6 animate-in slide-in-from-right-10 duration-500">
              <div className="flex justify-between items-center border-b-4 border-black pb-6">
                <div>
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Result</h2>
                  <p className="text-[10px] font-black uppercase text-emerald-600 mt-2 tracking-widest">Calculated by AI Engine</p>
                </div>
                <div className="bg-black text-white p-4 rounded-2xl text-center min-w-[100px] border-2 border-emerald-400">
                  <div className="text-3xl font-black leading-none">{result.compatibility}%</div>
                  <p className="text-[8px] font-bold uppercase text-emerald-400">Match</p>
                </div>
              </div>

              {/* Age & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-yellow-300 border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#000]">
                  <p className="text-[8px] font-black uppercase opacity-60">Estimated Age</p>
                  <p className="text-2xl font-black italic">~{result.estimatedAge} Years</p>
                </div>
                <div className="p-4 bg-slate-900 text-white border-2 border-black rounded-2xl shadow-[4px_4px_0_0_#000]">
                  <p className="text-[8px] font-black uppercase text-slate-500 font-bold">Recommendation</p>
                  <p className="text-lg font-black uppercase italic text-emerald-400">Shortlist</p>
                </div>
              </div>

              {/* Analysis Text */}
              <div className="space-y-6">
                <div className="bg-slate-50 p-5 border-2 border-black rounded-2xl italic">
                  <p className="text-xs font-bold text-slate-700 leading-relaxed">
                    "{result.summary}"
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Match Strengths
                    </p>
                    <ul className="space-y-1">
                      {result.strengths.map(s => (
                        <li key={s} className="text-[11px] font-black uppercase bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                          + {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-rose-500 flex items-center gap-2">
                      <span className="w-2 h-2 bg-rose-500 rounded-full"></span> Potential Gaps
                    </p>
                    <ul className="space-y-1">
                      {result.gaps.map(g => (
                        <li key={g} className="text-[11px] font-black uppercase bg-rose-50 p-2 rounded-lg border border-rose-200">
                          - {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}