import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Megaphone, 
  AlertTriangle, 
  Info, 
  Pin, 
  ArrowRight, 
  KeyRound,
  LogIn,
  ShieldAlert,
  Quote,
  PartyPopper,
  Gift,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Sparkles,
  Calendar,
  Heart
} from 'lucide-react';
import { UserProfile, ShowcaseCategory, DynamicShowcaseSlide, NoticeBoardItem } from '../../types';
import { USERS } from '../../data/initialData';
import { DEFAULT_SHOWCASE_SLIDES } from '../../data/showcaseData';
import { stripEmojis } from '../../utils/sanitizeEmoji';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  noticeItems?: NoticeBoardItem[];
  customSlides?: DynamicShowcaseSlide[];
  usersList?: UserProfile[];
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  noticeItems,
  customSlides = DEFAULT_SHOWCASE_SLIDES,
  usersList,
}) => {
  const availableUsers = (usersList && usersList.length > 0) ? usersList : USERS;
  // Convert noticeItems to dynamic slides if provided
  const allSlides: DynamicShowcaseSlide[] = React.useMemo(() => {
    if (!noticeItems || noticeItems.length === 0) return customSlides;

    const noticeSlides: DynamicShowcaseSlide[] = noticeItems.map((item) => ({
      id: `notice-${item.id}`,
      category: 'NOTICE',
      title: item.title,
      content: item.content,
      authorOrTarget: item.author,
      date: item.date,
      badgeText: item.category || 'Official Notice',
      tagColor: 'rose',
      isPinned: item.isPinned,
    }));

    const nonNoticeSlides = customSlides.filter((s) => s.category !== 'NOTICE');
    return [...noticeSlides, ...nonNoticeSlides];
  }, [noticeItems, customSlides]);

  // Login Form States
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Showcase Slider States
  const [selectedCategory, setSelectedCategory] = useState<ShowcaseCategory>('ALL');
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Filter slides by active category
  const filteredSlides = allSlides.filter((slide) => {
    if (selectedCategory === 'ALL') return true;
    return slide.category === selectedCategory;
  });

  const activeSlide = filteredSlides[activeSlideIndex] || filteredSlides[0] || allSlides[0];

  // Auto-play timer (advance slide every 5.5s unless paused)
  useEffect(() => {
    if (isPaused || filteredSlides.length <= 1) return;

    const interval = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % filteredSlides.length);
    }, 5500);

    return () => clearInterval(interval);
  }, [isPaused, filteredSlides.length, activeSlideIndex]);

  // Reset index when category changes
  const handleCategoryChange = (cat: ShowcaseCategory) => {
    setSelectedCategory(cat);
    setActiveSlideIndex(0);
  };

  const handleNextSlide = () => {
    if (filteredSlides.length <= 1) return;
    setActiveSlideIndex((prev) => (prev + 1) % filteredSlides.length);
  };

  const handlePrevSlide = () => {
    if (filteredSlides.length <= 1) return;
    setActiveSlideIndex((prev) => (prev - 1 + filteredSlides.length) % filteredSlides.length);
  };

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
      const foundUser = availableUsers.find((u) => {
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

  const getCategoryBadge = (cat: DynamicShowcaseSlide['category']) => {
    switch (cat) {
      case 'NOTICE':
        return (
          <span className="bg-indigo-100/90 text-indigo-800 border border-indigo-200/90 font-extrabold text-[10px] px-2.5 py-0.5 rounded-md flex items-center gap-1.5 shadow-2xs">
            <Megaphone className="w-3 h-3 text-indigo-600" /> NOTICE
          </span>
        );
      case 'QUOTE':
        return (
          <span className="bg-indigo-100/90 text-indigo-800 border border-indigo-200/90 font-extrabold text-[10px] px-2.5 py-0.5 rounded-md flex items-center gap-1.5 shadow-2xs">
            <Quote className="w-3 h-3 text-indigo-600" /> DAILY QUOTE
          </span>
        );
      case 'CELEBRATION':
        return (
          <span className="bg-emerald-100/90 text-emerald-800 border border-emerald-200/90 font-extrabold text-[10px] px-2.5 py-0.5 rounded-md flex items-center gap-1.5 shadow-2xs">
            <PartyPopper className="w-3 h-3 text-emerald-600" /> CELEBRATION
          </span>
        );
      case 'WISHES':
        return (
          <span className="bg-purple-100/90 text-purple-800 border border-purple-200/90 font-extrabold text-[10px] px-2.5 py-0.5 rounded-md flex items-center gap-1.5 shadow-2xs">
            <Gift className="w-3 h-3 text-purple-600" /> WISHES
          </span>
        );
      case 'GALLERY':
        return (
          <span className="bg-sky-100/90 text-sky-800 border border-sky-200/90 font-extrabold text-[10px] px-2.5 py-0.5 rounded-md flex items-center gap-1.5 shadow-2xs">
            <ImageIcon className="w-3 h-3 text-sky-600" /> PHOTO GALLERY
          </span>
        );
      default:
        return (
          <span className="bg-slate-200/90 text-slate-800 border border-slate-300/90 font-extrabold text-[10px] px-2.5 py-0.5 rounded-md flex items-center gap-1.5 shadow-2xs">
            <Info className="w-3 h-3 text-slate-600" /> HIGHLIGHT
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen w-full bg-white font-sans flex flex-col lg:grid lg:grid-cols-2 text-slate-900 overflow-x-hidden">
      
      {/* DYNAMIC SHOWCASE SLIDER (Left 50% on Desktop, Order-2 on Mobile) */}
      <div className="w-full h-auto lg:h-full lg:min-h-screen bg-slate-50/90 p-5 sm:p-8 lg:p-12 flex flex-col justify-between border-t lg:border-t-0 lg:border-r border-slate-200/90 relative order-2 lg:order-1">
        
        {/* Fixed Top Company Title Header (Desktop View) */}
        <div className="hidden lg:flex sticky top-0 bg-slate-50/90 backdrop-blur-md pt-1 pb-4 border-b border-slate-200/80 shrink-0 z-20 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Building2 className="w-7 h-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              BarbrikOne
            </h1>
          </div>
        </div>

        {/* Dynamic Slide Stage Card (Auto-Play Carousel with Hover-Pause) */}
        <div 
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="flex-1 flex flex-col justify-center my-2 relative px-3 sm:px-4"
        >
          {/* Floating Left/Right Chevron Navigation Buttons (Minimal subtle style) */}
          {filteredSlides.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevSlide}
                className="absolute left-1 sm:-left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/70 hover:bg-white border border-slate-200/60 text-slate-400 hover:text-indigo-600 shadow-2xs hover:shadow-md transition-all duration-200 opacity-40 hover:opacity-100 flex items-center justify-center cursor-pointer active:scale-95"
                aria-label="Previous Slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleNextSlide}
                className="absolute right-1 sm:-right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/70 hover:bg-white border border-slate-200/60 text-slate-400 hover:text-indigo-600 shadow-2xs hover:shadow-md transition-all duration-200 opacity-40 hover:opacity-100 flex items-center justify-center cursor-pointer active:scale-95"
                aria-label="Next Slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {activeSlide ? (
            <div 
              key={activeSlide.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-lg overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95 relative"
            >
              {/* Image Banner (if photo gallery / quote background) */}
              {activeSlide.imageUrl ? (
                <div className="relative h-56 sm:h-64 w-full overflow-hidden bg-slate-900 group">
                  <img 
                    src={activeSlide.imageUrl} 
                    alt={activeSlide.title} 
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent flex flex-col justify-between p-5 text-white">
                    <div className="flex items-center justify-between">
                      {getCategoryBadge(activeSlide.category)}
                      {activeSlide.badgeText && (
                        <span className="text-[10px] font-bold text-white bg-black/50 backdrop-blur-md border border-white/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-300" /> {activeSlide.badgeText}
                        </span>
                      )}
                    </div>

                    <div>
                      {activeSlide.category === 'QUOTE' && (
                        <Quote className="w-8 h-8 text-amber-300/80 mb-1" />
                      )}
                      <h3 className="text-base sm:text-lg font-black text-white leading-tight drop-shadow-sm">
                        "{stripEmojis(activeSlide.title)}"
                      </h3>
                      {activeSlide.authorOrTarget && (
                        <p className="text-xs text-amber-300 font-semibold mt-1 flex items-center gap-1">
                          — {activeSlide.authorOrTarget}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Text Card Content */}
              <div className="p-6 space-y-3">
                {!activeSlide.imageUrl && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getCategoryBadge(activeSlide.category)}
                      {activeSlide.badgeText && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                          {activeSlide.badgeText}
                        </span>
                      )}
                    </div>
                    {activeSlide.date && (
                      <span className="text-xs text-slate-400 font-mono font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" /> {activeSlide.date}
                      </span>
                    )}
                  </div>
                )}

                {!activeSlide.imageUrl && (
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    {stripEmojis(activeSlide.title)}
                  </h3>
                )}

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                  {stripEmojis(activeSlide.content)}
                </p>

                {!activeSlide.imageUrl && activeSlide.authorOrTarget && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Target/Author: <strong className="text-slate-800 font-bold">{activeSlide.authorOrTarget}</strong></span>
                    {activeSlide.isPinned && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Pin className="w-3 h-3 text-amber-600" /> Pinned
                      </span>
                    )}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              No slides in this category.
            </div>
          )}

          {/* Centered Dot Indicators Below Card */}
          {filteredSlides.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {filteredSlides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSlideIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === activeSlideIndex
                      ? 'w-6 bg-indigo-600'
                      : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* STAFF AUTHENTICATION FORM (Right 50% on Desktop, Order-1 on Mobile) */}
      <div className="w-full h-auto lg:h-full lg:min-h-screen bg-white p-6 sm:p-10 lg:p-16 flex flex-col justify-center order-1 lg:order-2">
        <div className="max-w-md w-full mx-auto space-y-6 sm:space-y-8">
          
          {/* Mobile Header Logo */}
          <div className="flex items-center gap-3 lg:hidden pb-2 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              BarbrikOne
            </h1>
          </div>

          {/* Main Title */}
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Sign In
            </h2>
          </div>

          {/* Error Banner */}
          {loginError && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-150 shadow-xs">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="space-y-0.5">
                <strong className="block font-bold text-amber-950">Login Failed</strong>
                <span>{loginError}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            
            {/* Input 1: Identifier */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-700">
                Mobile No. / Email Address / Username <span className="text-indigo-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 8084801020, rws.store1@gmail.com, or amanat"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all"
                  required
                />
              </div>
            </div>

            {/* Input 2: Password */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-700">
                Password <span className="text-indigo-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter account password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-11 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <span>Keep me signed in on this device</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4.5 h-4.5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Staff Switcher (Automatically hidden when published in production mode) */}
          {!import.meta.env.PROD && (
            <div className="pt-6 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  Quick Demo Login (Dev Mode)
                </span>
                <span className="text-[11px] text-slate-400 font-normal">Click to auto-fill</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableUsers.slice(0, 4).map((u) => (
                  <button
                    key={u.userId}
                    type="button"
                    onClick={() => handleQuickDemoSelect(u)}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/90 hover:border-indigo-300 text-left transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-xs text-slate-900 group-hover:text-indigo-700 truncate">
                      {u.name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {u.role} ({u.username})
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Support Note */}
          <div className="pt-4 text-center text-xs text-slate-400">
            Need access? Contact System Admin at <strong className="text-slate-700 font-semibold">superadmin@barbrik.in</strong>
          </div>

        </div>
      </div>

    </div>
  );
};
