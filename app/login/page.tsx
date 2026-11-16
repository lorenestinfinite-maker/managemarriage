'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loginStep, setLoginStep] = useState<'request' | 'verify'>('request');
  
  // Registration States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);

  // 1. Simple Session Check - Pass the baton directly to AuthGuard
  useEffect(() => {
    let isMounted = true;

    const handleSession = (session: any) => {
      if (session && isMounted) {
        // As soon as a session exists, push to the root.
        // AuthGuard will instantly intercept this and route to /create-wedding
        window.location.href = '/'; 
      }
    };

    // Check on initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Listen for Google OAuth redirect completing in the URL Hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        handleSession(session);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 2. Google OAuth (Redirects back to /login to safely process the hash token)
  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: { 
        // CHANGE THIS LINE: It is currently pointing to /login
        redirectTo: `${window.location.origin}/auth/callback` 
      } 
    });
    if (error) setError(error.message);
  };

  // 3. STRICT SIGNUP FLOW (Email/Password)
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both fields are identical.');
      setLoading(false);
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a strictly valid email address (e.g., name@domain.com).');
      setLoading(false);
      return;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      setError('Phone number must be exactly 10 digits.');
      setLoading(false);
      return;
    }

    const fullName = `${firstName} ${lastName}`.trim();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      phone, 
      options: { 
        data: { 
          first_name: firstName,
          last_name: lastName,
          full_name: fullName, 
          phone_number: phone 
        } 
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Phantom Login Prevention (If Supabase confirms email is turned off by mistake)
    if (data.session) {
      await supabase.auth.signOut();
    }

    setVerificationPending(true);
    setLoading(false);
  };

  // 4. Request Email OTP (Login Flow)
  const requestEmailOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: { shouldCreateUser: false } 
    });
    
    if (error) {
      setError(error.message);
    } else {
      setLoginStep('verify');
    }
    setLoading(false);
  };

  // 5. Verify Email OTP (Login Flow)
  const verifyEmailOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.verifyOtp({ 
      email, 
      token: otp, 
      type: 'email' 
    });
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } 
    // Success is handled automatically by the onAuthStateChange listener above
  };

  // UI RENDER: Verification Pending Screen (For email signups)
  if (verificationPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-xl border border-gray-200 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 border border-blue-100">
            ✉️
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Verify Your Email</h2>
          <p className="text-sm text-gray-600 mb-8 leading-relaxed">
            We sent a secure verification link to <strong className="text-gray-900">{email}</strong>. 
            You must click that link to activate your account before you can log in.
          </p>
          <button 
            onClick={() => {
              setVerificationPending(false);
              setMode('login');
              setLoginStep('request');
            }} 
            className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-lg hover:bg-gray-800 transition"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // UI RENDER: Main Auth Screen
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button 
            className={`flex-1 pb-3 text-center font-bold transition-colors ${mode === 'login' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400 hover:text-gray-700'}`}
            onClick={() => { setMode('login'); setError(''); }}
          >
            Login
          </button>
          <button 
            className={`flex-1 pb-3 text-center font-bold transition-colors ${mode === 'signup' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-400 hover:text-gray-700'}`}
            onClick={() => { setMode('signup'); setError(''); }}
          >
            Sign Up
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 text-xs font-bold border border-red-200 flex items-start gap-2 leading-relaxed">
            <span className="text-base leading-none">⚠️</span> 
            <span>{error}</span>
          </div>
        )}

        {/* --- SIGNUP FLOW --- */}
        {mode === 'signup' && (
          <div className="space-y-6">
            <form onSubmit={handleSignup} className="space-y-4">
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">First Name</label>
                  <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-sm" placeholder="Jane" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Last Name</label>
                  <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-sm" placeholder="Doe" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Email Address</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-sm" placeholder="name@example.com" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Phone Number (10 Digits)</label>
                <input 
                  type="tel" 
                  required 
                  maxLength={10}
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} 
                  className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-sm" 
                  placeholder="9876543210" 
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Password</label>
                  <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-sm" placeholder="••••••••" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Confirm Password</label>
                  <input 
                    type="password" 
                    required 
                    minLength={6} 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    className={`w-full border p-3 rounded-xl outline-none transition-all text-sm ${
                      confirmPassword && password !== confirmPassword 
                        ? 'border-red-400 bg-red-50 text-red-900 focus:ring-2 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                    }`} 
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading || (confirmPassword.length > 0 && password !== confirmPassword)} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 mt-2 shadow-lg shadow-blue-600/20 active:scale-[0.98]">
                {loading ? 'Processing...' : 'Create Account'}
              </button>
            </form>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase tracking-wider">OR</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <button onClick={handleGoogleAuth} className="w-full flex items-center justify-center gap-3 border border-gray-300 bg-white text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-50 transition shadow-sm active:scale-[0.98]">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Sign up with Google
            </button>
          </div>
        )}

        {/* --- LOGIN FLOW --- */}
        {mode === 'login' && (
          <div className="space-y-6">
            {loginStep === 'request' ? (
              <form onSubmit={requestEmailOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Email Address</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="name@example.com" />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 shadow-lg shadow-blue-600/20 active:scale-[0.98]">
                  {loading ? 'Sending...' : 'Send Login Code to Email'}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyEmailOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 text-center">Enter 6-Digit Code sent to <br/><span className="text-blue-600">{email}</span></label>
                  <input type="text" required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} maxLength={6} className="w-full border border-gray-300 p-4 rounded-xl text-center text-3xl tracking-[0.5em] font-mono focus:ring-2 focus:ring-blue-500 outline-none" placeholder="000000" />
                </div>
                <button type="submit" disabled={loading || otp.length !== 6} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 shadow-lg shadow-blue-600/20 active:scale-[0.98]">
                  Verify & Secure Login
                </button>
                <button type="button" onClick={() => setLoginStep('request')} className="w-full text-xs font-bold text-gray-400 hover:text-blue-600 transition uppercase tracking-wider mt-2">
                  Wrong email? Go back
                </button>
              </form>
            )}

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase tracking-wider">OR</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <button onClick={handleGoogleAuth} className="w-full flex items-center justify-center gap-3 border border-gray-300 bg-white text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-50 transition shadow-sm active:scale-[0.98]">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Sign in with Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
}