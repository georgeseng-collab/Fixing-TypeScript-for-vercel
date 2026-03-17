// @ts-nocheck
import React, { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../db';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate('/');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border p-10 rounded-[2rem] shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-block bg-blue-600 text-white p-3 rounded-2xl mb-4 font-black">GB</div>
          <h1 className="text-2xl font-black text-slate-800">GenieBook ATS</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">@geniebook.com only</p>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          theme="light"
        />
      </div>
    </div>
  );
}