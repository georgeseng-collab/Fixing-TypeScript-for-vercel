// @ts-nocheck
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../db';

export default function Layout({ children }) {
  const location = useLocation();
  const navLink = (path) => `flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-sm transition-all ${
    location.pathname === path ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
  }`;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-black text-blue-600 flex items-center gap-2">
              <span className="bg-blue-600 text-white p-1.5 rounded-xl">GB</span>
              <span className="hidden lg:inline tracking-tighter">GenieBook ATS</span>
            </Link>
            <div className="hidden md:flex items-center gap-2">
              <Link to="/" className={navLink('/')}>📊 Pipeline</Link>
              <Link to="/search" className={navLink('/search')}>🔍 Search</Link>
              <Link to="/calendar" className={navLink('/calendar')}>📅 Calendar</Link>
              {/* ADDED OFFER GENERATOR LINK BELOW */}
              <Link to="/offers" className={navLink('/offers')}>✨ Offer Hub</Link>
              <Link to="/archive" className={navLink('/archive')}>🗄️ Archive</Link>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/add" className="hidden sm:block bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-md shadow-blue-100">
              + New Candidate
            </Link>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {children}
      </main>
    </div>
  );
}