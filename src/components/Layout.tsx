// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../db';

export default function Layout({ children }) {
  const navLink = "flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-all";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-black text-blue-600 flex items-center gap-2">
              <span className="bg-blue-600 text-white p-1.5 rounded-xl">GB</span>
              <span className="hidden sm:inline tracking-tighter">GenieBook ATS</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className={navLink}>📊 Pipeline</Link>
              <Link to="/search" className={navLink}>🔍 Search</Link>
              <Link to="/calendar" className={navLink}>📅 Calendar</Link>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/add" className="bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-md shadow-blue-100">
              + New Candidate
            </Link>
            <div className="h-6 w-[1px] bg-slate-100 mx-2"></div>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest"
            >
              Log Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">
        {children}
      </main>
    </div>
  );
}