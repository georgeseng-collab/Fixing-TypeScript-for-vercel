// @ts-nocheck
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './db';

// Import all your pages
import Dashboard from './pages/Dashboard';
import ApplicantForm from './pages/ApplicantForm';
import CalendarView from './pages/CalendarView';
import CandidateSearch from './pages/CandidateSearch';
import Login from './pages/Login';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center animate-pulse">
        <div className="bg-blue-600 text-white w-12 h-12 rounded-xl flex items-center justify-center font-black mx-auto mb-4">GB</div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Verifying Identity...</p>
      </div>
    </div>
  );

  const navLink = "flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-all";

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        
        {/* Navigation - Only visible when logged in */}
        {session && (
          <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-8">
                <Link to="/" className="text-xl font-black text-blue-600 flex items-center gap-2">
                  <span className="bg-blue-600 text-white p-1 rounded-lg">GB</span>
                </Link>
                <div className="hidden md:flex items-center gap-6">
                  <Link to="/" className={navLink}>📊 Pipeline</Link>
                  <Link to="/search" className={navLink}>🔍 Search</Link>
                  <Link to="/calendar" className={navLink}>📅 Calendar</Link>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Link to="/add" className="hidden sm:block bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-md shadow-blue-100">
                  + Add Candidate
                </Link>
                <div className="h-6 w-[1px] bg-slate-100 mx-2"></div>
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="text-xs font-black text-slate-400 hover:text-red-500 uppercase tracking-tighter transition-colors"
                >
                  Log Out
                </button>
              </div>
            </div>
          </nav>
        )}

        <main className={`max-w-7xl mx-auto px-6 ${session ? 'py-10' : 'py-0'}`}>
          <Routes>
            {/* If logged in, /login redirects to dashboard */}
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
            
            {/* Protected Routes - If not logged in, redirect to /login */}
            <Route path="/" element={session ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/add" element={session ? <ApplicantForm /> : <Navigate to="/login" />} />
            <Route path="/search" element={session ? <CandidateSearch /> : <Navigate to="/login" />} />
            <Route path="/calendar" element={session ? <CalendarView /> : <Navigate to="/login" />} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}