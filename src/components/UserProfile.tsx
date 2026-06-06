import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, Mail, Phone, Lock, Calendar, ShieldCheck, 
  ChevronLeft, LogOut, Check, Save, UserCheck, AlertCircle, FileText
} from 'lucide-react';
import { User as UserType } from '../types.js';

interface UserProfileProps {
  user: UserType;
  totalFiles: number;
  onBack: () => void;
  onLogout: () => void;
  onProfileUpdated: (updatedUser: UserType) => void;
}

export default function UserProfile({ 
  user, 
  totalFiles, 
  onBack, 
  onLogout, 
  onProfileUpdated 
}: UserProfileProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [mobileNo, setMobileNo] = useState(user.mobileNo || '');
  const [password, setPassword] = useState(user.password || 'password');
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!name.trim()) {
      setFeedback({ type: 'error', text: 'Full Name cannot be empty.' });
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFeedback({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    if (!mobileNo.trim()) {
      setFeedback({ type: 'error', text: 'Mobile Number cannot be empty.' });
      return;
    }
    if (!password || password.length < 4) {
      setFeedback({ type: 'error', text: 'Password must be at least 4 characters.' });
      return;
    }

    setIsSaving(true);

    setTimeout(() => {
      // Create updated object
      const updatedUser: UserType = {
        ...user,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobileNo: mobileNo.trim(),
        password: password
      };

      // Retrieve all registered users to update this database record too
      const rawUsers = localStorage.getItem('pdf_users');
      if (rawUsers) {
        try {
          const users: UserType[] = JSON.parse(rawUsers);
          const idx = users.findIndex(u => u.id === user.id);
          if (idx !== -1) {
            users[idx] = updatedUser;
            localStorage.setItem('pdf_users', JSON.stringify(users));
          }
        } catch (e) {
          console.error("Failed to parse local users database", e);
        }
      }

      // Update current active user storage
      localStorage.setItem('pdf_current_user', JSON.stringify(updatedUser));
      
      onProfileUpdated(updatedUser);
      setIsSaving(false);
      setFeedback({ type: 'success', text: 'Your profile has been saved successfully!' });
      
      // Auto-dismiss success notification
      setTimeout(() => {
        setFeedback(null);
      }, 3000);
    }, 600);
  };

  const getJoinedDate = () => {
    try {
      return new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return 'June 2026';
    }
  };

  return (
    <div id="profile-workspace" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Visual Navigation Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 mb-8">
        <button
          id="profile-back-btn"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 cursor-pointer transition-colors"
        >
          <ChevronLeft className="h-4.5 w-4.5" />
          <span>Back to Editing Workspace</span>
        </button>

        <button
          id="profile-logout-btn"
          onClick={onLogout}
          className="inline-flex items-center gap-2 text-xs font-extrabold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 px-3.5 py-1.5 rounded-xl border border-red-200/50 dark:border-red-900/30 cursor-pointer transition-all"
        >
          <LogOut className="h-4 w-4" />
          <span>Log Out Account</span>
        </button>
      </div>

      <div className="grid gap-8 md:grid-cols-12">
        {/* Left Stats/Overview Card */}
        <div className="md:col-span-4 space-y-6">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm text-center">
            {/* Monogram circular badge */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 shadow-sm relative group overflow-hidden">
              <span className="text-3xl font-black tracking-tight select-none">
                {name.substring(0, 1).toUpperCase() || 'P'}
              </span>
            </div>

            <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white leading-tight truncate">
              {name || 'PDF Contributor'}
            </h3>
            
            <p className="text-xs text-slate-400 hover:text-indigo-600 dark:text-slate-500 truncate mt-1">
              {email}
            </p>

            <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-2xs font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
              <ShieldCheck className="h-3 w-3 text-indigo-500 shrink-0" />
              <span>{user.role} ACCESS</span>
            </div>

            <hr className="my-5 border-slate-100 dark:border-slate-800" />

            <div className="space-y-4 text-left">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 dark:text-slate-500">Joined</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 font-mono">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {getJoinedDate()}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 dark:text-slate-500">Workspace files</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-mono">
                  <FileText className="h-3.5 w-3.5" />
                  {totalFiles} Documents
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-150 p-5 bg-indigo-50/25 dark:bg-slate-900/50 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">Security Credentials notice</h4>
            <p className="leading-relaxed">
              Your profile values are fully managed in the local sandboxed client. Modifying Name, Mobile configuration, or Password edits takes immediate effect on matching pdf structures.
            </p>
          </div>
        </div>

        {/* Right Editable Profile Form Card */}
        <div className="md:col-span-8">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">
              Profile Configurations
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">
              Customize registration email, coordinates names, or security password key.
            </p>

            {/* Notification Feedback Box */}
            {feedback && (
              <div className={`mb-6 flex items-center gap-3 p-4 rounded-xl border text-xs font-sans ${
                feedback.type === 'success' 
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400' 
                  : 'border-red-200 bg-red-50 text-red-650 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400'
              }`}>
                {feedback.type === 'success' ? <UserCheck className="h-4.5 w-4.5 shrink-0" /> : <AlertCircle className="h-4.5 w-4.5 shrink-0" />}
                <span className="font-semibold">{feedback.text}</span>
              </div>
            )}

            <form onSubmit={handleProfileSave} className="space-y-5">
              
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-405 dark:text-slate-500">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      id="profile-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-405 dark:text-slate-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="profile-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {/* Mobile No */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-405 dark:text-slate-500">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      id="profile-mobile"
                      type="tel"
                      value={mobileNo}
                      onChange={(e) => setMobileNo(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Password Fields */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Security Password Key
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-405 dark:text-slate-500">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="profile-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-xs pl-10 pr-10 py-2.5 rounded-xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:outline-none transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 cursor-pointer text-xs"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-150 dark:border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2 text-2xs font-extrabold uppercase text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="profile-save-btn"
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-2xs uppercase tracking-wider cursor-pointer shadow transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Parameters...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
