// @ts-nocheck
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../db';

export default function Layout({ children }) {
  const location = useLocation();
  
  const navLink = (path) => `flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-sm transition-all ${
    location.pathname === path 
      ? 'bg-blue-50 text-blue-600 shadow-sm' 
      : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
  }`;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Logo Section */}
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-black text-blue-600 flex items-center gap-2">
              <span className="bg-blue-600 text-white p-1.5 rounded-xl shadow-lg shadow-blue-200">GB</span>
              <span className="hidden lg:inline tracking-tighter uppercase italic text-sm">GenieBook ATS</span>
            </Link>

            {/* Main Navigation */}
            <div className="hidden md:flex items-center gap-1">
              <Link to="/" className={navLink('/')}>📊 Pipeline</Link>
              <Link to="/search" className={navLink('/search')}>🔍 Search</Link>
              
              {/* CHALLENGES / LEADERBOARD LINK */}
              <Link to="/leaderboard" className={navLink('/leaderboard')}>🏆 Challenges</Link>
              
              <Link to="/calendar" className={navLink('/calendar')}>📅 Calendar</Link>
              <Link to="/team" className={navLink('/team')}>👥 Team</Link>
              
              {/* Internal Tools Group */}
              <div className="h-6 w-[1px] bg-slate-200 mx-2 hidden lg:block"></div>
              
              <Link to="/offers" className={navLink('/offers')}>✨ Offer Hub</Link>
              <Link to="/approvals" className={navLink('/approvals')}>📋 Approval Hub</Link>
              <Link to="/archive" className={navLink('/archive')}>🗄️ Archive</Link>
            </div>
          </div>
          
          {/* Action Section */}
          <div className="flex items-center gap-4">
            <Link to="/add" className="hidden sm:block bg-blue-600 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-slate-900 transition-all shadow-md shadow-blue-100">
              + New Candidate
            </Link>
            
            <div className="h-8 w-[1px] bg-slate-100 mx-1"></div>
            
            <button 
              onClick={() => supabase.auth.signOut()}
              className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase transition-colors tracking-widest"
            >
              Log Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Page Container */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {children}
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="max-w-7xl mx-auto px-6 py-8 border-t border-slate-100 opacity-50 text-center lg:text-left">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
          GenieBook Internal Talent OS v3.0
        </p>
      </footer>
    </div>
  );
}