// @ts-nocheck
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../db';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    // If already logged in, kick to dashboard
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate('/');
    };
    checkUser();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border-2 border-slate-100 p-10 rounded-[2.5rem] shadow-xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center bg-blue-600 text-white w-14 h-14 rounded-2xl mb-4 font-black text-2xl shadow-lg shadow-blue-200">
            GB
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">GenieBook ATS</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3">
            Recruitment Portal • Internal
          </p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{ 
            theme: ThemeSupa,
            style: {
              button: { background: '#2563eb', color: 'white', borderRadius: '14px', fontWeight: 'bold' },
              input: { borderRadius: '14px', backgroundColor: '#f8fafc' },
              anchor: { color: '#2563eb', fontSize: '12px', fontWeight: 'bold' }
            }
          }}
          providers={[]} // We want email only for the domain restriction to work easily
          theme="light"
          localization={{
            variables: {
              sign_up: {
                email_label: 'GenieBook Email',
                password_label: 'Create Password',
                button_label: 'Request Access',
              },
            },
          }}
        />
        
        <div className="mt-8 pt-6 border-t border-slate-50 text-center">
          <p className="text-[10px] text-slate-400 font-medium">
            Strictly @geniebook.com emails only. <br/>Unauthorized attempts are logged.
          </p>
        </div>
      </div>
    </div>
  );
}