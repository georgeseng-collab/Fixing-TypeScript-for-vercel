// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './db';

// Components & Layout
import Layout from './components/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import ApplicantForm from './pages/ApplicantForm';
import CalendarView from './pages/CalendarView';
import CandidateSearch from './pages/CandidateSearch';
import Archive from './pages/Archive';
import Login from './pages/Login';
import EmailHub from './pages/EmailHub'; 
import ApprovalHub from './pages/ApprovalHub';
import TeamSettings from './pages/TeamSettings';
import Leaderboard from './pages/Leaderboard';
import WhatsAppOutreach from './pages/WhatsAppOutreach'; // <--- NEW IMPORT

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Loading state while checking session
  if (session === undefined) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center font-black text-blue-500 animate-pulse uppercase tracking-tighter italic text-4xl">
      Geniebook Secure Boot...
    </div>
  );

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Route */}
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        
        {/* Protected Routes wrapped in Layout */}
        <Route path="/" element={session ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />} />
        <Route path="/add" element={session ? <Layout><ApplicantForm /></Layout> : <Navigate to="/login" />} />
        <Route path="/search" element={session ? <Layout><CandidateSearch /></Layout> : <Navigate to="/login" />} />
        <Route path="/calendar" element={session ? <Layout><CalendarView /></Layout> : <Navigate to="/login" />} />
        <Route path="/archive" element={session ? <Layout><Archive /></Layout> : <Navigate to="/login" />} />
        
        {/* NEW WHATSAPP OUTREACH ROUTE */}
        <Route path="/whatsapp" element={session ? <Layout><WhatsAppOutreach /></Layout> : <Navigate to="/login" />} />
        
        {/* Management & Internal Tools */}
        <Route path="/offers" element={session ? <Layout><EmailHub /></Layout> : <Navigate to="/login" />} />
        <Route path="/approvals" element={session ? <Layout><ApprovalHub /></Layout> : <Navigate to="/login" />} />
        
        {/* NEW LEADERBOARD ROUTE (Challenges) */}
        <Route path="/leaderboard" element={session ? <Layout><Leaderboard /></Layout> : <Navigate to="/login" />} />
        
        {/* Team Settings */}
        <Route path="/team" element={session ? <Layout><TeamSettings /></Layout> : <Navigate to="/login" />} />
        
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}