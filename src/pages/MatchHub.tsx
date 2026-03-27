// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../db';

export default function MatchHub() {
  const [applicants, setApplicants] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [jdText, setJdText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchApplicants();
  }, []);

  const fetchApplicants = async () => {
    const { data } = await supabase.from('applicants').select('*').order('name');
    setApplicants(data || []);
  };

  const selectedApp = applicants.find(a => a.id === selectedAppId);

  const handleAnalyze = async () => {
    if (!selectedApp || !jdText) return alert("Please select a candidate and provide a JD!");
    
    setIsAnalyzing(true);
    setResult(null);

    try {
      // In your actual implementation, you would send the selectedApp.resume_text 
      // (or the PDF URL) and the jdText to your OpenAI/AI Edge function.
      
      // --- THE AI PROMPT LOGIC ---
      /* Prompt: "Compare this Resume and Job Description. 
        1. Calculate Estimated Age: Find earliest Grad Year (assume age 22) or earliest Job (assume age 20).
        2. Compatibility %: Score out of 100 based on skills/experience match.
        3. Justification: Short summary of why they match or don't."
      */

      // Simulating AI Response for Demo
      setTimeout(() => {
        setResult({
          compatibility: Math.floor(Math.random() * (95 - 60 + 1)) + 60, // Mock score
          estimatedAge: 28, // Mock calculation
          strengths: ["Relevant industry experience", "Skill alignment", "Local availability"],
          gaps: ["Missing specific software certification", "Notice period longer than preferred"],
          summary: `${selectedApp.name} shows strong alignment with the core technical requirements. Their background in similar roles suggest a fast ramp-up time.`
        });
        setIsAnalyzing(false);
      }, 2000);

    } catch (err) {
      console.error(err);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-10 text-left bg-slate-50 min-h-screen">
      <div className="mb-10 bg-blue-600 text-white p-8 rounded-[2rem] shadow-[8px_8px_0_0_#000] border-4 border-black">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">AI Match Hub</h1>
        <p className="text-blue-100 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Resume vs. Job Description Analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* LEFT SIDE: INPUTS */}
        <div className="space-y-6">
          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-blue-600">1. Select Candidate</h3>
            <select 
              className="w-full p-4 border-2 border-black rounded-xl font-bold bg-white outline-none"
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
            >
              <option value="">-- Choose from Pipeline --</option>
              {applicants.map(app => (
                <option key={app.id} value={app.id}>{app.name} ({app.job_role})</option>
              ))}
            </select>
          </div>

          <div className="bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[8px_8px_0_0_#000]">
            <h3 className="font-black uppercase italic text-xs mb-4 text-blue-600">2. Job Description</h3>
            <textarea 
              placeholder="Paste the JD requirements here..."
              className="w-full h-64 p-4 border-2 border-black rounded-xl font-bold bg-slate-50 outline-none focus:bg-white transition-all text-sm"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
          </div>

          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || !selectedAppId || !jdText}
            className="w-full p-6 bg-black text-white rounded-2xl font-black uppercase shadow-[8px_8px_0_0_#3b82f6] hover:bg-blue-600 transition-all active:translate-y-1 disabled:opacity-50"
          >
            {isAnalyzing ? "🧠 AI Thinking..." : "Compare Profile →"}
          </button>
        </div>

        {/* RIGHT SIDE: RESULTS */}
        <div className="lg:sticky lg:top-10 h-fit">
          {!result && !isAnalyzing && (
            <div className="bg-slate-200 border-4 border-dashed border-slate-400 p-20 rounded-[3rem] text-center">
              <p className="font-black uppercase text-slate-400 italic">Results will appear here after analysis</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="bg-white p-10 border-4 border-black rounded-[3rem] shadow-[12px_12px_0_0_#000] text-center animate-pulse">
               <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-6 flex items-center justify-center border-4 border-black text-3xl">🤖</div>
               <p className="font-black uppercase italic">Parsing Resume History...</p>
               <p className="text-[10px] font-bold opacity-40 mt-2">Calculating Compatibility & Estimating Age</p>
            </div>
          )}

          {result && (
            <div className="bg-white p-8 border-4 border-black rounded-[3rem] shadow-[15px_15px_0_0_#000] space-y-6">
              <div className="flex justify-between items-start border-b-4 border-black pb-6">
                <div>
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">{selectedApp?.name}</h2>
                  <p className="text-[10px] font-black uppercase text-blue-600 mt-2 tracking-widest">Analysis Result</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black text-blue-600 leading-none">{result.compatibility}%</div>
                  <p className="text-[8px] font-bold uppercase opacity-50">Match Score</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-yellow-300 border-2 border-black rounded-2xl">
                  <p className="text-[8px] font-black uppercase opacity-60">Estimated Age</p>
                  <p className="text-2xl font-black italic">~{result.estimatedAge} Years</p>
                </div>
                <div className="p-4 bg-emerald-100 border-2 border-black rounded-2xl">
                  <p className="text-[8px] font-black uppercase opacity-60">Status</p>
                  <p className="text-lg font-black uppercase italic">High Match</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-bold leading-relaxed bg-slate-50 p-4 border-2 border-black rounded-xl italic">
                  "{result.summary}"
                </p>
                
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-emerald-600">✅ Key Strengths</p>
                  <div className="flex flex-wrap gap-2">
                    {result.strengths.map(s => <span key={s} className="px-3 py-1 bg-emerald-50 border border-emerald-500 rounded-lg text-[9px] font-bold uppercase">{s}</span>)}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-rose-600">⚠️ Skill Gaps</p>
                  <div className="flex flex-wrap gap-2">
                    {result.gaps.map(g => <span key={g} className="px-3 py-1 bg-rose-50 border border-rose-500 rounded-lg text-[9px] font-bold uppercase">{g}</span>)}
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