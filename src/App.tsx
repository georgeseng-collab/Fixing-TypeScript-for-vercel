// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './db';

import Dashboard from './pages/Dashboard';
import ApplicantForm from './pages/ApplicantForm';
import CalendarView from './pages/CalendarView';
import CandidateSearch from './pages/CandidateSearch';
import Login from './pages/Login';

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div className="min-h-screen bg-white flex items-center justify-center font-bold">GENIEBOOK ATS</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={session ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/add" element={session ? <ApplicantForm /> : <Navigate to="/login" />} />
        <Route path="/search" element={session ? <CandidateSearch /> : <Navigate to="/login" />} />
        <Route path="/calendar" element={session ? <CalendarView /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}