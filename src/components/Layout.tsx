// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../db';

export default function Layout({ children }) {
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);

  // Initialize Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const navLink = (path) => `flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-[14px] transition-all duration-300 ${
    location.pathname === path 
      ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 scale-105' 
      : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800'
  }`;

  return (
    <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#0F172A] font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Expanded Header */}
      <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-8 h-24 flex items-center justify-between">
          
          <div className="flex items-center gap-12">
            <Link to="/" className="group flex items-center gap-4">
              <div className="bg-blue-600 text-white w-12 h-12 flex items-center justify-center rounded-2xl shadow-2xl shadow-blue-500/40">
                <span className="font-black text-xl italic">G</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tighter uppercase italic leading-none">GenieBook</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Talent OS v3.0</span>
              </div>
            </Link>

            {/* Main Navigation - High Visibility */}
            <div className="hidden 2xl:flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-[2rem]">
              <Link to="/" className={navLink('/')}>📊 Pipeline</Link>
              <Link to="/search" className={navLink('/search')}>🔍 Search</Link>
              <Link to="/leaderboard" className={navLink('/leaderboard')}>🏆 Challenges</Link>
              <Link to="/calendar" className={navLink('/calendar')}>📅 Calendar</Link>
              <Link to="/team" className={navLink('/team')}>👥 Team</Link>
              <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 mx-2"></div>
              <Link to="/offers" className={navLink('/offers')}>✨ Offers</Link>
              <Link to="/approvals" className={navLink('/approvals')}>📋 Approvals</Link>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:scale-110 transition-all text-xl"
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            <Link to="/add" className="hidden sm:flex items-center gap-2 bg-slate-900 dark:bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[12px] uppercase hover:shadow-2xl transition-all active:scale-95">
              + NEW CANDIDATE
            </Link>
            
            <button 
              onClick={() => supabase.auth.signOut()}
              className="text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors"
            >
              LOGOUT →
            </button>
          </div>
        </div>
      </nav>

      {/* Ultra-Wide Content Area */}
      <main className="max-w-[1600px] mx-auto px-8 py-12">
        <div className="animate-in fade-in zoom-in-95 duration-500">
          {children}
        </div>
      </main>

      <footer className="max-w-[1600px] mx-auto px-8 py-12 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-slate-300 dark:text-slate-600">
          GenieBook Recruitment Platform • SG
        </p>
        <Link to="/archive" className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-500 tracking-widest transition-colors">
          🗄️ Enter Archive
        </Link>
      </footer>
    </div>
  );
}