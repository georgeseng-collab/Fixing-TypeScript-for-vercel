// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './db';

import Layout from './components/Layout'; // Import the new layout
import Dashboard from './pages/Dashboard';
import ApplicantForm from './pages/ApplicantForm';
import CalendarView from './pages/CalendarView';
import CandidateSearch from './pages/CandidateSearch';
import Login from './pages/Login';

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black text-blue-600 animate-pulse">BOOTING...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        
        {/* Wrap all internal pages in the Layout */}
        <Route path="/" element={session ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />} />
        <Route path="/add" element={session ? <Layout><ApplicantForm /></Layout> : <Navigate to="/login" />} />
        <Route path="/search" element={session ? <Layout><CandidateSearch /></Layout> : <Navigate to="/login" />} />
        <Route path="/calendar" element={session ? <Layout><CalendarView /></Layout> : <Navigate to="/login" />} />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}