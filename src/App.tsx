// @ts-nocheck
import React, { useState, useEffect } from 'react';
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
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black text-blue-600">
      AUTHENTICATING...
    </div>
  );

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        {session && (
          <nav className="bg-white border-b h-16 flex items-center justify-between px-6 sticky top-0 z-50">
            <Link to="/" className="text-xl font-black text-blue-600">GB</Link>
            <div className="flex gap-4">
              <Link to="/" className="text-sm font-bold text-slate-500">Pipeline</Link>
              <Link to="/search" className="text-sm font-bold text-slate-500">Search</Link>
              <button onClick={() => supabase.auth.signOut()} className="text-[10px] font-black text-red-500 uppercase">Logout</button>
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