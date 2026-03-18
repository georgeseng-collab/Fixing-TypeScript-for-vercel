// @ts-nocheck
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../db';

export default function Layout({ children }) {
  const location = useLocation();
  
  // Refined Nav Link with subtle scaling and better colors
  const navLink = (path) => `flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-[13px] transition-all duration-300 ${
    location.pathname === path 
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105' 
      : 'text-slate-500 hover:bg-white hover:text-blue-600 hover:shadow-sm'
  }`;

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-700">
      
      {/* Premium Header with Glassmorphism */}
      <nav className="bg-white/70 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo Section */}
          <div className="flex items-center gap-10">
            <Link to="/" className="group flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white w-10 h-10 flex items-center justify-center rounded-2xl shadow-xl shadow-blue-200 group-hover:rotate-6 transition-transform">
                <span className="font-black text-lg">G</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tighter uppercase italic leading-none">GenieBook</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Talent OS</span>
              </div>
            </Link>

            {/* Main Navigation - Pill Style */}
            <div className="hidden xl:flex items-center gap-1 bg-slate-50/50 p-1.5 rounded-[2rem] border border-slate-100">
              <Link to="/" className={navLink('/')}>📊 Pipeline</Link>
              <Link to="/search" className={navLink('/search')}>🔍 Search</Link>
              <Link to="/leaderboard" className={navLink('/leaderboard')}>🏆 Challenges</Link>
              <Link to="/calendar" className={navLink('/calendar')}>📅 Calendar</Link>
              <Link to="/team" className={navLink('/team')}>👥 Team</Link>
              
              <div className="h-4 w-[1px] bg-slate-200 mx-2"></div>
              
              <Link to="/offers" className={navLink('/offers')}>✨ Offers</Link>
              <Link to="/approvals" className={navLink('/approvals')}>📋 Approvals</Link>
            </div>
          </div>
          
          {/* Action Section */}
          <div className="flex items-center gap-6">
            <Link to="/add" className="hidden sm:flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[11px] uppercase hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-200 transition-all active:scale-95">
              <span>+</span> New Candidate
            </Link>
            
            <button 
              onClick={() => supabase.auth.signOut()}
              className="group flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase transition-all tracking-widest"
            >
              <span>Logout</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Page Container */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Soft, professional entrance animation */}
        <div className="animate-in fade-in zoom-in-95 duration-500 ease-out">
          {children}
        </div>
      </main>

      {/* Minimalist Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center border-t border-slate-50 gap-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-300">
          Built for Geniebook HR • 2026
        </p>
        <div className="flex gap-6">
          <Link to="/archive" className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-600 transition-colors tracking-widest">🗄️ Archive</Link>
          <span className="text-slate-200">|</span>
          <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest italic text-blue-500">System Online</span>
        </div>
      </footer>
    </div>
  );
}