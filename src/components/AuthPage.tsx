import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Phone, FileText, Sparkles, AlertCircle, CheckCircle, Eye, EyeOff, Key } from 'lucide-react';
import { User as UserType } from '../types.js';

interface AuthPageProps {
  onLoginSuccess: (user: UserType) => void;
  darkMode: boolean;
}

export default function AuthPage({ onLoginSuccess, darkMode }: AuthPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Retrieve existing users from local storage or seed default
  const getLocalUsers = (): UserType[] => {
    const raw = localStorage.getItem('pdf_users');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return [];
      }
    }
    // Seed default admin user so existing assets don't get lost
    const seeded: UserType[] = [
      {
        id: "usr_default_01",
        email: "pdf.architect@aistudio.build",
        name: "Senior Architect",
        role: "ADMIN",
        mobileNo: "1234567890",
        password: "password",
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem('pdf_users', JSON.stringify(seeded));
    return seeded;
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (isSignUp && (!name || !mobileNo)) {
      setErrorMessage('Please fill in your name and mobile number.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const users = getLocalUsers();

      if (isSignUp) {
        // Sign-up process
        const emailExists = users.some(u => u.email.toLowerCase() === email.trim().toLowerCase());
        if (emailExists) {
          setErrorMessage('This email is already registered. Please login instead.');
          setIsLoading(false);
          return;
        }

        const newUser: UserType = {
          id: 'usr_local_' + Math.random().toString(36).substring(2, 9),
          email: email.trim().toLowerCase(),
          name: name.trim(),
          mobileNo: mobileNo.trim(),
          password: password,
          role: "EDITOR",
          createdAt: new Date().toISOString()
        };

        const updatedUsers = [...users, newUser];
        localStorage.setItem('pdf_users', JSON.stringify(updatedUsers));
        
        setSuccessMessage('Account created successfully! Logging you in...');
        
        setTimeout(() => {
          setIsLoading(false);
          onLoginSuccess(newUser);
        }, 1200);

      } else {
        // Login process
        const foundUser = users.find(
          u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
        );

        if (!foundUser) {
          setErrorMessage('Invalid email or password. Try with standard credentials.');
          setIsLoading(false);
          return;
        }

        setSuccessMessage(`Welcome back, ${foundUser.name}!`);
        setTimeout(() => {
          setIsLoading(false);
          onLoginSuccess(foundUser);
        }, 1000);
      }
    }, 600);
  };

  const loadDemoAdmin = () => {
    // Quick Demo prefill
    setEmail('pdf.architect@aistudio.build');
    setPassword('password');
    setIsSignUp(false);
    setErrorMessage('');
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      
      const response = await fetch(`/api/auth/google/url?origin=${encodeURIComponent(window.location.origin)}`);
      if (!response.ok) {
        throw new Error('Failed to retrieve authentication url from server endpoints.');
      }
      const { url } = await response.json();

      const authWindow = window.open(
        url,
        'google_oauth_popup',
        'width=600,height=700,status=no,resizable=yes,scrollbars=yes'
      );

      if (!authWindow) {
        setErrorMessage('Popup window was blocked by your browser. Please permit popups to log in with Google.');
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Google Auth Init Error:', error);
      setErrorMessage(error.message || 'Could not instantiate Google authentication redirect.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const googleUser = event.data?.user;
        if (googleUser) {
          const users = getLocalUsers();
          const exists = users.find(u => u.email.toLowerCase() === googleUser.email.toLowerCase());
          let finalUser = exists;
          if (!exists) {
            finalUser = {
              id: googleUser.id || 'usr_google_' + Math.random().toString(36).substring(2, 9),
              email: googleUser.email.trim().toLowerCase(),
              name: googleUser.name.trim(),
              mobileNo: googleUser.mobileNo || '(Not Provided)',
              password: 'google_oauth_provider_no_pwd',
              role: "EDITOR",
              createdAt: new Date().toISOString()
            };
            const updatedUsers = [...users, finalUser];
            localStorage.setItem('pdf_users', JSON.stringify(updatedUsers));
          }
          
          setSuccessMessage(`Welcome back, ${finalUser!.name}! Logging you in...`);
          setTimeout(() => {
            setIsLoading(false);
            onLoginSuccess(finalUser!);
          }, 1200);
        } else {
          setErrorMessage('Failed to sign in with Google account details.');
          setIsLoading(false);
        }
      } else if (event.data?.type === 'OAUTH_AUTH_FAILURE') {
        setErrorMessage(event.data?.message || 'Google Authentication cancelled or failed.');
        setIsLoading(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div id="auth-container" className="flex min-h-screen w-full max-w-full overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div id="auth-card" className="grid w-full min-h-screen md:grid-cols-12 bg-white dark:bg-slate-900">
        
        {/* Visual Brand Side Column - Immersive Full Height */}
        <div id="auth-branding" className="relative hidden md:flex flex-col justify-between bg-zinc-950 p-12 text-white md:col-span-5 border-r border-slate-200/50 dark:border-slate-800/80 overflow-hidden">
          {/* Majestic ambient background lights */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(79,70,229,0.18),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.12),transparent_40%)]" />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-slate-950 to-zinc-950 opacity-98" />
          
          <div className="relative z-10">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 backdrop-blur-md shadow-inner mb-8">
              <FileText className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-black tracking-tight leading-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              AI-Powered Universal PDF Editor
            </h2>
            <p className="mt-3 text-slate-400 text-sm leading-relaxed max-w-sm">
              Advanced Vector Coordinate Manipulation & In-place Baseline Character Text Modification Platform.
            </p>
          </div>

          <div className="relative z-10 space-y-6 my-auto py-12">
            <div className="flex items-start gap-4">
              <div className="mt-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-2 text-indigo-400 shrink-0">
                <Sparkles className="h-4.5 w-4.5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-300">Baseline Alignment</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Modify individual PDF text strings on specific coordinate segments without degrading standard rendering quality.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2 text-emerald-400 shrink-0">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-300">Sandboxed Environment</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Authentication records and editing sessions are persisted locally, ensuring absolute data sovereignty.
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Powered by PDF-Lib Web Assembly</span>
            <span>v2.4.0</span>
          </div>
        </div>

        {/* Actionable Form Fields - Fluid Right Panel */}
        <div id="auth-form-panel" className="flex flex-col justify-between p-8 sm:p-16 md:col-span-7 bg-white dark:bg-slate-900 min-h-screen">
          
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center space-x-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow shadow-indigo-600/25">
                <FileText className="h-5 w-5" />
              </div>
              <span className="font-extrabold text-sm tracking-tight text-slate-950 dark:text-white">
                AI-Powered Universal PDF Editor
              </span>
            </div>

            <div className="flex rounded-full bg-slate-100 p-1 dark:bg-slate-800">
              <button
                id="tab-login"
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className={`px-4.5 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  !isSignUp 
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                id="tab-signup"
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className={`px-4.5 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  isSignUp 
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          <div className="my-auto max-w-md w-full mx-auto py-12">
            <div className="mb-8">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white font-sans leading-tight">
                {isSignUp ? "Create your workspace profile" : "Welcome back to AI-Powered Universal PDF Editor"}
              </h1>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                {isSignUp 
                  ? "Setup email, password, and mobile coordinates to segment editing workspaces cleanly." 
                  : "Sign in with your local browser credentials to access documents."
                }
              </p>
            </div>

            {/* Feedback banners */}
            <AnimatePresence mode="wait">
              {errorMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-6 flex items-center gap-3 p-4 rounded-xl border border-red-200/80 bg-red-50 text-xs text-red-600 font-sans"
                >
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span className="font-semibold">{errorMessage}</span>
                </motion.div>
              )}

              {successMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-6 flex items-center gap-3 p-4 rounded-xl border border-emerald-250/80 bg-emerald-50 text-xs text-emerald-700 font-sans"
                >
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  <span className="font-bold">{successMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              
              {/* NAME FIELD (Sign Up Only) */}
              {isSignUp && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      id="input-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full text-sm pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-805 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:border-indigo-500 dark:focus:border-indigo-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
              )}

              {/* MOBILE NUMBER FIELD (Sign Up Only) */}
              {isSignUp && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      id="input-mobile"
                      type="tel"
                      value={mobileNo}
                      onChange={(e) => setMobileNo(e.target.value)}
                      placeholder="e.g. +1 (555) 123-4567"
                      className="w-full text-sm pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-805 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:border-indigo-500 dark:focus:border-indigo-505 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
              )}

              {/* EMAIL ADRESS FIELD */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="input-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full text-sm pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-805 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:border-indigo-500 dark:focus:border-indigo-505 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              {/* PASSWORD FIELD */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="input-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-sm pl-10 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-805 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:border-indigo-500 dark:focus:border-indigo-505 focus:outline-none transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                id="submit-auth-btn"
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-indigo-505/10 transition-all cursor-pointer uppercase tracking-wider flex items-center justify-center space-x-2 disabled:opacity-50 mt-6"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    <span>Configuring Profile Security...</span>
                  </>
                ) : (
                  <span>{isSignUp ? "Create Free Account" : "Access Workspace"}</span>
                )}
              </button>
            </form>

            {/* Social Authentication Separation */}
            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-slate-100 dark:border-slate-800/60"></div>
              <span className="flex-shrink mx-4 text-[10px] uppercase tracking-widest text-slate-400 font-bold font-mono">or continue with</span>
              <div className="flex-grow border-t border-slate-100 dark:border-slate-800/60"></div>
            </div>

            <button
              id="btn-google-login"
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4.5 py-3.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 transition-all cursor-pointer shadow-sm disabled:opacity-50 uppercase tracking-widest leading-none"
            >
              <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Quick Demo Pre-fill section */}
            {!isSignUp && (
              <div className="mt-6 pt-5 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-450 dark:text-slate-550">Reviewing & Testing?</span>
                <button
                  id="btn-demo-creds"
                  type="button"
                  onClick={loadDemoAdmin}
                  className="text-indigo-600 hover:text-indigo-500 font-extrabold flex items-center gap-1 hover:underline cursor-pointer dark:text-indigo-400"
                >
                  <Key className="h-3.5 w-3.5" />
                  Seeded Account
                </button>
              </div>
            )}
          </div>

          <div className="text-center text-xs text-slate-400 dark:text-slate-600 py-3 mt-4 border-t border-slate-100 dark:border-slate-800/40">
            <span>By entering coordinates, you accept local encryption guidelines.</span>
          </div>

        </div>
      </div>
    </div>
  );
}
