import React from 'react';
import { LoginIllustration } from './LoginIllustration';
import { ArrowRight, Wifi, Battery, Sparkles, Star } from 'lucide-react';

interface LoginCoverCardProps {
  onStartLogin: () => void;
  schoolName?: string;
  isMobileOnly?: boolean;
}

export const LoginCoverCard: React.FC<LoginCoverCardProps> = ({
  onStartLogin,
  schoolName = 'SMP Negeri 2 Kasihan',
  isMobileOnly = false
}) => {
  // Current time for realistic mobile status bar
  const [currentTime, setCurrentTime] = React.useState('08:30');

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className={`relative w-full max-w-[420px] mx-auto min-h-[690px] h-[92vh] max-h-[860px] rounded-[36px] overflow-hidden shadow-2xl shadow-sky-950/25 border-4 border-white/90 dark:border-slate-800 bg-gradient-to-b from-[#38BDF8] via-[#7DD3FC] to-[#BAE6FD] flex flex-col justify-between select-none ${isMobileOnly ? '' : 'transition-all duration-300'}`}
    >
      {/* ================= 1. BACKGROUND CAMPUS ILLUSTRATION ================= */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        <LoginIllustration className="w-full h-full object-cover" />
      </div>

      {/* Subtle overlay to ensure maximum title contrast */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-sky-400/20 via-transparent to-slate-900/40 pointer-events-none" />

      {/* ================= 2. MOBILE STATUS BAR ================= */}
      <div className="relative z-20 flex items-center justify-between px-6 pt-3 text-white text-[11px] font-bold tracking-wider drop-shadow-md">
        <span>{currentTime}</span>
        <div className="flex items-center gap-1.5 opacity-90">
          <div className="flex items-end gap-0.5 h-3">
            <span className="w-0.5 h-1.5 bg-white rounded-xs"></span>
            <span className="w-0.5 h-2 bg-white rounded-xs"></span>
            <span className="w-0.5 h-2.5 bg-white rounded-xs"></span>
            <span className="w-0.5 h-3 bg-white rounded-xs"></span>
          </div>
          <Wifi className="w-3.5 h-3.5" />
          <Battery className="w-4 h-4" />
        </div>
      </div>

      {/* ================= 3. HERO TITLE & EMBLEM (PRIMARY EMPHASIS) ================= */}
      <div className="relative z-20 text-center px-4 pt-2 sm:pt-4 flex flex-col items-center">
        
        {/* Glowing Star and School Crest Header */}
        <div className="relative mb-1">
          {/* Pulsing light glow behind star */}
          <div className="absolute -inset-3 bg-amber-300/50 rounded-full blur-lg animate-pulse"></div>

          {/* Golden Star with Ray Accents */}
          <div className="relative flex items-center justify-center">
            {/* Sparkle Left */}
            <Sparkles className="w-4 h-4 text-amber-200 animate-spin [animation-duration:8s] mr-1" />

            {/* Glowing Golden 3D Star */}
            <svg 
              viewBox="0 0 100 100" 
              className="w-14 h-14 drop-shadow-[0_4px_12px_rgba(245,158,11,0.7)] animate-bounce [animation-duration:2.8s]"
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <polygon 
                points="50,5 64,34 96,39 73,61 78,93 50,78 22,93 27,61 4,39 36,34" 
                fill="url(#starGradientUI2)"
                stroke="#FFFFFF"
                strokeWidth="4.5"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="starGradientUI2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFF9A6" />
                  <stop offset="45%" stopColor="#FBBF24" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
            </svg>

            {/* Sparkle Right */}
            <Sparkles className="w-4 h-4 text-amber-200 animate-spin [animation-duration:8s] ml-1" />
          </div>

          {/* School Badge Pill */}
          <div className="mt-1 px-3 py-0.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xs border border-white text-[10px] font-black tracking-wider text-blue-900 dark:text-sky-300 uppercase inline-flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
            <span>{schoolName}</span>
          </div>
        </div>

        {/* 3D PLAYFUL TITLE: JURNAL */}
        <div className="relative leading-none mt-2">
          <h1 
            className="text-5xl sm:text-6xl font-black tracking-tight text-[#0072E5] drop-shadow-[0_4px_8px_rgba(0,85,212,0.4)]"
            style={{
              WebkitTextStroke: '6px #FFFFFF',
              paintOrder: 'stroke fill',
            }}
          >
            Jurnal
          </h1>
        </div>

        {/* 3D TITLE: 7 KEBIASAAN (MASSIVE & PROMINENT) */}
        <div className="relative flex items-center justify-center gap-2 leading-none mt-0">
          <span 
            className="text-6xl sm:text-7xl font-black text-[#FBBF24] italic"
            style={{
              WebkitTextStroke: '7px #FFFFFF',
              paintOrder: 'stroke fill',
              textShadow: '0 4px 0 #D97706, 0 7px 0 #B45309, 0 10px 14px rgba(0,0,0,0.3)'
            }}
          >
            7
          </span>
          <span 
            className="text-4xl sm:text-5xl font-black text-[#FBBF24]"
            style={{
              WebkitTextStroke: '6px #FFFFFF',
              paintOrder: 'stroke fill',
              textShadow: '0 4px 0 #D97706, 0 6px 0 #B45309, 0 8px 12px rgba(0,0,0,0.3)'
            }}
          >
            Kebiasaan
          </span>
        </div>

        {/* Curved Blue Ribbon: Anak Indonesia Hebat */}
        <div className="mt-2 relative inline-block">
          <div className="px-6 py-2 rounded-full bg-gradient-to-r from-[#0050C8] via-[#0062E8] to-[#0050C8] text-white font-black text-sm tracking-wider uppercase shadow-xl shadow-blue-900/35 border-2 border-white">
            Anak Indonesia Hebat
          </div>
        </div>

        {/* Subtitle: Yuk, catat kebiasaan baikmu setiap hari! */}
        <p className="mt-3 text-xs sm:text-sm italic font-extrabold text-[#0047AB] drop-shadow-xs max-w-xs">
          Yuk, catat kebiasaan baikmu setiap hari!
        </p>

      </div>

      {/* ================= 4. BOTTOM CONTROLS & TAGLINE ================= */}
      <div className="relative z-20 px-6 pb-7 pt-4 text-center flex flex-col items-center">
        {/* Action Button: Mulai -> */}
        <button
          onClick={onStartLogin}
          id="btn-mulai-jurnal"
          className="w-full max-w-[270px] py-3.5 px-6 rounded-full bg-gradient-to-r from-[#0055D4] via-[#0062E8] to-[#0055D4] hover:from-[#0046B3] hover:to-[#0055D4] active:scale-95 text-white font-black text-base sm:text-lg shadow-xl shadow-blue-950/40 border-2 border-white flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer group"
        >
          <span className="tracking-wide">Mulai</span>
          <div className="w-7 h-7 rounded-full bg-white text-[#0055D4] flex items-center justify-center font-bold text-sm shadow-sm group-hover:translate-x-1 transition-transform">
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </div>
        </button>

        {/* School Name & Bottom Character Tagline */}
        <div className="mt-3.5 max-w-xs">
          <p className="text-white text-[11px] sm:text-xs font-black tracking-wide leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            Bersama membentuk karakter hebat
          </p>
          <p className="text-white text-[11px] sm:text-xs font-black tracking-wide leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            untuk Indonesia maju
          </p>
          <p className="text-white/85 text-[9.5px] font-bold tracking-wider uppercase mt-1 drop-shadow-sm">
            {schoolName}
          </p>
        </div>
      </div>
    </div>
  );
};
