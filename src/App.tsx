// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { supabase } from './db';

// Pages
import Dashboard from './pages/Dashboard';
import ApplicantForm from './pages/ApplicantForm';
import CalendarView from './pages/CalendarView';
import CandidateSearch from './pages/CandidateSearch';
import Login from './pages/Login';

export default function App() {
  const [session, setSession] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    // 2. Listen for login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setInitialized(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Prevent the "useState" error by not rendering anything until initialized
  if (!initialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="font-black text-blue-600 animate-pulse tracking-widest">
          GENIEBOOK SECURE LINK...
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        {session && (
          <nav className="bg-white border-b border-slate-100 h-16 flex items-center justify-between px-6 sticky top-0 z-50">
            <Link to="/" className="text-xl font-black text-blue-600">GB</Link>
            <div className="flex items-center gap-6">
              <Link to="/" className="text-sm font-bold text-slate-500">Pipeline</Link>
              <Link to="/search" className="text-sm font-bold text-slate-500">Search</Link>
              <button 
                onClick={() => supabase.auth.signOut()}
                className="text-[10px] font-black text-red-400 uppercase tracking-tighter"
              >
                Logout
              </button>
            </div>
          </nav>
        )}

        <main className="max-w-7xl mx-auto p-6">
          <Routes>
            <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
            <Route path="/" element={session ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/add" element={session ? <ApplicantForm /> : <Navigate to="/login" />} />
            <Route path="/search" element={session ? <CandidateSearch /> : <Navigate to="/login" />} />
            <Route path="/calendar" element={session ? <CalendarView /> : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}