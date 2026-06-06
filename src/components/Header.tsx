import React from 'react';
import { FileText, User, ShieldCheck, Sun, Moon, Sparkles } from 'lucide-react';

interface HeaderProps {
  currentUser: { name: string; role: string; email: string } | null;
  activeProjectName?: string;
  isSaving?: boolean;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onViewProfile?: () => void;
  activeTab: 'home' | 'services' | 'about' | 'contact' | 'editor';
  onTabChange: (tab: 'home' | 'services' | 'about' | 'contact' | 'editor') => void;
}

export default function Header({ 
  currentUser, 
  activeProjectName, 
  isSaving, 
  darkMode, 
  onToggleDarkMode,
  onViewProfile,
  activeTab,
  onTabChange
}: HeaderProps) {
  
  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'services', label: 'Services' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Contact' },
  ] as const;

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-md shadow-sm dark:bg-slate-900/95 dark:border-slate-800">
      
      {/* Brand Logo & Name */}
      <div 
        onClick={() => onTabChange('home')}
        className="flex items-center space-x-3 cursor-pointer group"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform dark:shadow-none">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white sm:text-base">
            AI-Powered Universal PDF
          </span>
          <span className="ml-2.5 hidden sm:inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
            Editor
          </span>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <nav className="hidden md:flex items-center space-x-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider cursor-pointer ${
                isActive 
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' 
                  : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/40'
              }`}
            >
              {item.label}
            </button>
          );
        })}
        
        {/* Editor option inside logged-in or out tab */}
        <button
          onClick={() => onTabChange('editor')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'editor'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-slate-800/40'
          }`}
        >
          {currentUser ? (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              <span>Workspace</span>
            </>
          ) : (
            <span>Edit PDF Console</span>
          )}
        </button>
      </nav>

      {/* Right Side Options & Actions */}
      <div className="flex items-center space-x-3">
        
        {/* Mobile View Navigation Dropdown Indicator */}
        <div className="flex md:hidden items-center space-x-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
          {['home', 'services', 'contact', 'editor'].includes(activeTab) && (
            <select
              value={activeTab}
              onChange={(e) => onTabChange(e.target.value as any)}
              className="bg-transparent border-none text-[10px] font-bold text-slate-700 dark:text-slate-350 px-2 py-1 focus:outline-none uppercase tracking-wide cursor-pointer"
            >
              <option value="home">Home</option>
              <option value="services">Services</option>
              <option value="about">About</option>
              <option value="contact">Contact</option>
              <option value="editor">{currentUser ? 'Workspace' : 'Sign In'}</option>
            </select>
          )}
        </div>

        {onToggleDarkMode && (
          <button
            onClick={onToggleDarkMode}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-amber-400 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? (
              <Sun className="h-5 w-5 text-amber-400" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        )}

        {/* User Session Profile display or Fast Sign-In button */}
        {currentUser ? (
          <div 
            onClick={onViewProfile}
            className="flex items-center space-x-2 pl-3 border-l border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 p-1 rounded-xl cursor-pointer transition-colors"
            title="View user profile settings"
          >
            <div className="text-right hidden lg:block">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 font-mono flex items-center justify-end select-none dark:text-slate-550">
                {currentUser.role}
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 ring-1 ring-slate-100 dark:bg-indigo-950/30 dark:ring-slate-800 shrink-0">
              <User className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        ) : (
          <button
            onClick={() => onTabChange('editor')}
            className="hidden sm:inline-flex items-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] py-2 px-3.5 shadow uppercase tracking-wider transition-colors cursor-pointer"
          >
            Sign-In
          </button>
        )}
      </div>
    </header>
  );
}
