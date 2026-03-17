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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-slate-200 p-10 rounded-[2.5rem] shadow-xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center bg-blue-600 text-white w-14 h-14 rounded-2xl mb-4 font-black text-2xl">
            GB
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">GenieBook ATS</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Internal Portal</p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{ 
            theme: ThemeSupa,
            variables: {
              default: {
                colors: { brand: '#2563eb', brandAccent: '#1d4ed8' },
                radii: { borderRadiusButton: '12px', inputBorderRadius: '12px' }
              }
            }
          }}
          providers={[]} 
          theme="light"
        />
        
        <p className="mt-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
          Strictly @geniebook.com only
        </p>
      </div>
    </div>
  );
}