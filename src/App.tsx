// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { supabase } from './db';

import Dashboard from './pages/Dashboard';
import ApplicantForm from './pages/ApplicantForm';
import CalendarView from './pages/CalendarView';
import CandidateSearch from './pages/CandidateSearch';
import Login from './pages/Login';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-blue-600 font-black animate-pulse">VERIFYING ACCESS...</div>
      </div>
    );
  }

  const navLink = "text-slate-500 hover:text-blue-600 font-bold text-sm transition-all";

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        {session && (
          <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-8">
                <Link to="/" className="text-xl font-black text-blue-600">GB</Link>
                <div className="hidden md:flex items-center gap-6">
                  <Link to="/" className={navLink}>📊 Pipeline</Link>
                  <Link to="/search" className={navLink}>🔍 Search</Link>
                  <Link to="/calendar" className={navLink}>📅 Calendar</Link>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Link to="/add" className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs">
                  + Add Candidate
                </Link>
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="text-xs font-black text-slate-400 hover:text-red-500 uppercase"
                >
                  Logout
                </button>
              </div>
            </div>
          </nav>
        )}

        <main className="max-w-7xl mx-auto px-6 py-8">
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