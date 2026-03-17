// @ts-nocheck
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../db';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) navigate('/');
    });

    // Listen for sign-in events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) navigate('/');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white border border-slate-200 rounded-[2rem] shadow-xl">
      <div className="text-center mb-8">
        <div className="inline-block bg-blue-600 text-white p-3 rounded-2xl mb-4 font-black text-xl">GB</div>
        <h1 className="text-2xl font-black text-slate-800">GenieBook ATS</h1>
        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-2">Internal Access Only</p>
      </div>

      <Auth
        supabaseClient={supabase}
        appearance={{ 
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: '#2563eb',
                brandAccent: '#1d4ed8',
              },
              radii: {
                borderRadiusButton: '12px',
                inputBorderRadius: '12px',
              }
            }
          }
        }}
        providers={['google']}
        theme="light"
      />
    </div>
  );
}