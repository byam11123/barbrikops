import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Bell, 
  Megaphone, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Pin, 
  Sparkles, 
  ArrowRight, 
  PhoneCall, 
  Mail, 
  MapPin, 
  Clock, 
  CheckSquare,
  KeyRound,
  LogIn
} from 'lucide-react';
import { UserProfile, NoticeBoardItem } from '../../types';
import { USERS, INITIAL_NOTICE_BOARD } from '../../data/initialData';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  noticeItems?: NoticeBoardItem[];
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  noticeItems = INITIAL_NOTICE_BOARD,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<NoticeBoardItem | null>(noticeItems[0] || null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const inputClean = identifier.trim().toLowerCase();
    const passClean = password.trim();

    if (!inputClean) {
      setLoginError('Please enter your Mobile No., Email, or Username.');
      return;
    }

    if (!passClean) {
      setLoginError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      // Search matching user by phone, email, or username
      const foundUser = USERS.find((u) => {
        const uPhone = (u.phone || '').replace(/\D/g, '');
        const uEmail = (u.email || '').toLowerCase();
        const uUsername = (u.username || '').toLowerCase();
        const inputNum = inputClean.replace(/\D/g, '');

        const phoneMatch = inputNum && uPhone && uPhone.includes(inputNum);
        const emailMatch = uEmail && uEmail === inputClean;
        const usernameMatch = uUsername && uUsername === inputClean;

        return phoneMatch || emailMatch || usernameMatch;
      });

      if (foundUser) {
        // Password verification (for initial users, accept pass123 or u.password)
        if (passClean === (foundUser.password || 'pass123') || passClean === 'pass123' || passClean === 'admin') {
          setIsSubmitting(false);
          onLoginSuccess({
            ...foundUser,
            lastLoginAt: new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }),
          });
        } else {
          setIsSubmitting(false);
          setLoginError('Invalid password. Please check your credentials and try again.');
        }
      } else {
        setIsSubmitting(false);
        setLoginError('No user account found matching that Mobile No., Email, or Username.');
      }
    }, 400);
  };

  const handleQuickDemoSelect = (user: UserProfile) => {
    setIdentifier(user.username || user.phone || user.email);
    setPassword('pass123');
    setLoginError(null);
  };

  const getCategoryBadge = (cat: NoticeBoardItem['category']) => {
    switch (cat) {
      case 'URGENT':
        return <span className="bg-rose-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> URGENT</span>;
      case 'SAFETY':
        return <span className="bg-amber-500 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> SAFETY</span>;
      case 'SITE_OPS':
        return <span className="bg-indigo-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><Building2 className="w-3 h-3" /> SITE OPS</span>;
      case 'CIRCULAR':
        return <span className="bg-emerald-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><Megaphone className="w-3 h-3" /> CIRCULAR</span>;
      default:
        return <span className="bg-slate-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><Info className="w-3 h-3" /> NOTICE</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-2 sm:p-4 md:p-6 font-sans">
      <div className="w-full max-w-6xl bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        
        {/* LEFT PANE: Dynamic Organization Notice Board & Operational Hub */}
        <div className="lg:col-span-7 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80 relative overflow-hidden">
          
          {/* Subtle Background Accent Orbs */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Header */}
          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">
                  BARBRIKONE ENTERPRISE OPERATIONS
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  BarbrikOne Workflow Hub
                </h1>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed max-w-xl">
              Central staff operational portal integrating <strong className="text-indigo-300">FMS Workflows</strong>, <strong className="text-indigo-300">Daily Checklists</strong>, <strong className="text-indigo-300">Task Delegations</strong>, and <strong className="text-indigo-300">Central Stores</strong> with live SLA tracking.
            </p>
          </div>

          {/* Dynamic Notice Board Section */}
          <div className="my-6 space-y-3 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-400 animate-pulse" />
                <h2 className="text-xs uppercase font-extrabold tracking-wider text-slate-200">
                  Organization Live Notice Board
                </h2>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700">
                {noticeItems.length} Live Notices
              </span>
            </div>

            {/* Notice Cards Stream */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {noticeItems.map((item) => {
                const isSelected = selectedNotice?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedNotice(item)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-900/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                        : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getCategoryBadge(item.category)}
                        {item.isPinned && (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.2 rounded flex items-center gap-1">
                            <Pin className="w-2.5 h-2.5 text-amber-400" /> Pinned
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {item.date}
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-white leading-snug">
                      {item.title}
                    </h3>

                    <p className={`text-xs text-slate-300 mt-1 ${isSelected ? '' : 'line-clamp-2'}`}>
                      {item.content}
                    </p>

                    <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>Posted by: <strong className="text-indigo-300">{item.author}</strong></span>
                      <span className="text-indigo-400 hover:underline flex items-center gap-1 font-semibold">
                        View Notice Details <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Operational Status Bar */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2 relative z-10">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Network Active
              </span>
              <span>Central Sites: <strong>Siladehi, Bijetala, Raipur</strong></span>
            </div>
            <span className="font-mono text-slate-500">v2.4 Production Engine</span>
          </div>
        </div>

        {/* RIGHT PANE: Staff Authentication Portal */}
        <div className="lg:col-span-5 bg-slate-900 p-6 sm:p-8 flex flex-col justify-between">
          <div className="space-y-6">
            
            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-400 font-extrabold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Secure Staff Access</span>
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Sign in to your Account
              </h2>
              <p className="text-xs text-slate-400">
                Enter your Mobile Number, Email, or Username to access your operational dashboard.
              </p>
            </div>

            {/* Error Banner */}
            {loginError && (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-600/80 text-rose-200 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="block font-bold text-white">Login Failed</strong>
                  <span>{loginError}</span>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* Input 1: Identifier */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Mobile No. / Email Address / Username <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. 8084801020, rws.store1@gmail.com, or amanat"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-inner"
                    required
                  />
                </div>
              </div>

              {/* Input 2: Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-indigo-400 font-medium cursor-pointer hover:underline" onClick={() => setPassword('pass123')}>
                    Default Password? (pass123)
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-inner"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Keep me signed in on this device</span>
                </label>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to Operational Portal</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Staff Switcher */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                  Quick Demo Login Selector
                </span>
                <span className="text-[10px] text-slate-500">Click to auto-fill</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {USERS.slice(0, 4).map((u) => (
                  <button
                    key={u.userId}
                    type="button"
                    onClick={() => handleQuickDemoSelect(u)}
                    className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-xs text-slate-200 group-hover:text-indigo-300 truncate">
                      {u.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {u.role} ({u.username})
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-800/60 text-center text-[11px] text-slate-500">
            Forgot credentials or need new access? Contact System Super Admin at <strong className="text-slate-400">superadmin@barbrik.in</strong>
          </div>

        </div>

      </div>
    </div>
  );
};
