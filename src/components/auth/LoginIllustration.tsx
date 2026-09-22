import React from 'react';

interface LoginIllustrationProps {
  className?: string;
}

export const LoginIllustration: React.FC<LoginIllustrationProps> = ({ className = "w-full h-full" }) => {
  return (
    <svg
      viewBox="0 0 500 700"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Latar Belakang Kampus Sekolah SMP Negeri 2 Kasihan"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/* Sky Gradient */}
        <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="35%" stopColor="#7DD3FC" />
          <stop offset="70%" stopColor="#BAE6FD" />
          <stop offset="100%" stopColor="#E0F2FE" />
        </linearGradient>

        {/* Sun Glow */}
        <radialGradient id="sunGlow" cx="50%" cy="18%" r="45%">
          <stop offset="0%" stopColor="#FFFBEB" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#FEF08A" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FEF08A" stopOpacity="0" />
        </radialGradient>

        {/* School Roof Gradient */}
        <linearGradient id="roofGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="45%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>

        {/* School Wall Gradient */}
        <linearGradient id="wallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>

        {/* School Pillars & Trim */}
        <linearGradient id="trimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="50%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        {/* School Windows Glass */}
        <linearGradient id="winGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        {/* Courtyard Walkway */}
        <linearGradient id="walkwayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        {/* Lawn Green Gradients */}
        <linearGradient id="lawnGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#86EFAC" />
          <stop offset="50%" stopColor="#4ADE80" />
          <stop offset="100%" stopColor="#22C55E" />
        </linearGradient>

        {/* Foliage Green Gradients */}
        <linearGradient id="leafGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="60%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>

        <linearGradient id="leafGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#86EFAC" />
          <stop offset="50%" stopColor="#16A34A" />
          <stop offset="100%" stopColor="#14532D" />
        </linearGradient>

        <linearGradient id="treeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>

        {/* Soft shadow */}
        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.12" floodColor="#0F172A" />
        </filter>
      </defs>

      {/* ================= 1. SKY & SUNLIGHT ================= */}
      <rect width="500" height="700" fill="url(#skyGrad)" />
      
      {/* Sun glow */}
      <circle cx="250" cy="120" r="240" fill="url(#sunGlow)" />

      {/* Radiant Sunburst Rays */}
      <g opacity="0.32">
        <polygon points="250,120 40,0 80,0" fill="#FFFFFF" />
        <polygon points="250,120 140,0 180,0" fill="#FFFFFF" />
        <polygon points="250,120 230,0 270,0" fill="#FFFFFF" />
        <polygon points="250,120 320,0 360,0" fill="#FFFFFF" />
        <polygon points="250,120 420,0 460,0" fill="#FFFFFF" />
        <polygon points="250,120 500,40 500,80" fill="#FFFFFF" />
        <polygon points="250,120 500,160 500,200" fill="#FFFFFF" />
        <polygon points="250,120 0,80 0,40" fill="#FFFFFF" />
        <polygon points="250,120 0,200 0,160" fill="#FFFFFF" />
      </g>

      {/* Soft Floating Clouds */}
      <g opacity="0.85">
        <path d="M -20 160 Q 20 130 65 150 Q 110 130 145 160 Q 170 180 140 200 L -20 200 Z" fill="#FFFFFF" opacity="0.75" />
        <path d="M 350 140 Q 390 110 435 130 Q 470 120 500 150 Q 520 180 470 190 L 350 190 Z" fill="#FFFFFF" opacity="0.65" />
      </g>

      {/* ================= 2. BACKGROUND CAMPUS TREES ================= */}
      <g id="campus-trees">
        {/* Left Side Trees */}
        <circle cx="60" cy="340" r="85" fill="url(#treeGrad)" opacity="0.95" />
        <circle cx="120" cy="360" r="70" fill="#10B981" opacity="0.9" />
        <circle cx="30" cy="380" r="75" fill="#047857" opacity="0.9" />

        {/* Right Side Trees */}
        <circle cx="440" cy="340" r="85" fill="url(#treeGrad)" opacity="0.95" />
        <circle cx="380" cy="360" r="70" fill="#10B981" opacity="0.9" />
        <circle cx="470" cy="380" r="75" fill="#047857" opacity="0.9" />
      </g>

      {/* ================= 3. GRAND INDONESIAN SMP SCHOOL BUILDING ================= */}
      <g id="school-building" filter="url(#softShadow)">
        {/* Foundation & Steps */}
        <rect x="70" y="475" width="360" height="25" fill="#94A3B8" rx="2" />
        <rect x="55" y="490" width="390" height="15" fill="#64748B" rx="3" />

        {/* Left Wing & Right Wing Walls */}
        <rect x="80" y="360" width="340" height="120" fill="url(#wallGrad)" stroke="#CBD5E1" strokeWidth="2" />

        {/* Upper Cornice / Trim */}
        <rect x="75" y="354" width="350" height="10" fill="url(#trimGrad)" stroke="#CBD5E1" strokeWidth="1" />

        {/* Red Terracotta Roofs for Wings */}
        <polygon points="70,355 210,300 210,355" fill="url(#roofGrad)" />
        <polygon points="430,355 290,300 290,355" fill="url(#roofGrad)" />
        <rect x="68" y="352" width="364" height="6" fill="#991B1B" rx="2" />

        {/* Left Wing Windows (Upper & Lower Floors) */}
        <g fill="url(#winGrad)">
          {/* Top Floor Left */}
          <rect x="100" y="375" width="22" height="32" rx="3" stroke="#CBD5E1" strokeWidth="1.5" />
          <rect x="135" y="375" width="22" height="32" rx="3" stroke="#CBD5E1" strokeWidth="1.5" />
          <rect x="170" y="375" width="22" height="32" rx="3" stroke="#CBD5E1" strokeWidth="1.5" />

          {/* Ground Floor Left */}
          <rect x="100" y="425" width="22" height="32" rx="3" stroke="#CBD5E1" strokeWidth="1.5" />
          <rect x="135" y="425" width="22" height="32" rx="3" stroke="#CBD5E1" strokeWidth="1.5" />
          <rect x="170" y="425" width="22" height="32" rx="3" stroke="#CBD5E1" strokeWidth="1.5" />

          {/* Top Floor Right */}
          <rect x="308" y="375" width="22" height="32" rx="3" stroke="#CBD5E1" strokeWidth="1.5" />
          <rect x="343" y="375" width="22" height="32" rx="3" stroke="#CBD5E1" strokeWidth="1.5" />
          <rect x="378" y="375" width="22" height="32" rx="3" stroke="#CBD5E1" strokeWidth="1.5" />

          {/* Ground Floor Right */}
          <rect x="308" y="425" width="22" height="32" rx="3" stroke="#CBD5E1" strokeWidth="1.5" />
          <rect x="343" y="425" width="22" height="32" rx="3" stroke="#CBD5E1" strokeWidth="1.5" />
          <rect x="378" y="425" width="22" height="32" rx="3" stroke="#CBD5E1" strokeWidth="1.5" />
        </g>

        {/* Window Pane Lines */}
        <g stroke="#FFFFFF" strokeWidth="1" opacity="0.75">
          <line x1="111" y1="375" x2="111" y2="407" />
          <line x1="100" y1="391" x2="122" y2="391" />
          <line x1="146" y1="375" x2="146" y2="407" />
          <line x1="135" y1="391" x2="157" y2="391" />
          <line x1="319" y1="375" x2="319" y2="407" />
          <line x1="308" y1="391" x2="330" y2="391" />
          <line x1="354" y1="375" x2="354" y2="407" />
          <line x1="343" y1="391" x2="365" y2="391" />
        </g>

        {/* Center Clock Tower Section */}
        <rect x="205" y="275" width="90" height="205" fill="url(#wallGrad)" stroke="#CBD5E1" strokeWidth="2" />
        
        {/* Classical Columns at entrance */}
        <rect x="212" y="420" width="8" height="60" fill="url(#trimGrad)" rx="2" />
        <rect x="235" y="420" width="8" height="60" fill="url(#trimGrad)" rx="2" />
        <rect x="257" y="420" width="8" height="60" fill="url(#trimGrad)" rx="2" />
        <rect x="280" y="420" width="8" height="60" fill="url(#trimGrad)" rx="2" />

        {/* Center Entrance Grand Arch */}
        <path d="M 230 435 A 20 20 0 0 1 270 435 L 270 480 L 230 480 Z" fill="#1E3A8A" />
        <line x1="250" y1="420" x2="250" y2="480" stroke="#FFFFFF" strokeWidth="1.5" />
        
        {/* School Name Plaque over Main Entrance */}
        <rect x="215" y="405" width="70" height="14" rx="2" fill="#1E3A8A" />
        <text x="250" y="415" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="bold" fontFamily="sans-serif">
          SMPN 2 KASIHAN
        </text>

        {/* Tower Upper Balcony / Arch Windows */}
        <path d="M 226 335 A 8 8 0 0 1 242 335 L 242 365 L 226 365 Z" fill="url(#winGrad)" />
        <path d="M 258 335 A 8 8 0 0 1 274 335 L 274 365 L 258 365 Z" fill="url(#winGrad)" />

        {/* Tower Clock Face */}
        <circle cx="250" cy="305" r="18" fill="#FFFFFF" stroke="#0F172A" strokeWidth="3" />
        <circle cx="250" cy="305" r="2.5" fill="#0F172A" />
        {/* Clock Hands pointing to 07:00 (School Bell Time) */}
        <line x1="250" y1="305" x2="250" y2="293" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="250" y1="305" x2="242" y2="313" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />

        {/* Steeple Pyramid Roof */}
        <polygon points="198,275 250,195 302,275" fill="url(#roofGrad)" />
        {/* Gold Finial Spire */}
        <line x1="250" y1="195" x2="250" y2="175" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        <circle cx="250" cy="172" r="5" fill="#FBBF24" stroke="#D97706" strokeWidth="1" />
      </g>

      {/* ================= 4. INDONESIAN NATIONAL FLAGPOLE (SANG MERAH PUTIH) ================= */}
      <g id="courtyard-flag">
        {/* Flagpole Base */}
        <rect x="186" y="525" width="8" height="6" fill="#94A3B8" rx="1" />
        {/* Pole */}
        <line x1="190" y1="525" x2="190" y2="435" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
        {/* Gold Ball Top */}
        <circle cx="190" cy="433" r="2.5" fill="#FBBF24" />
        {/* Merah Putih Flag (Fluttering in the wind) */}
        <path d="M 190 436 Q 205 432 220 436 Q 225 440 220 446 Q 205 442 190 446 Z" fill="#DC2626" />
        <path d="M 190 446 Q 205 442 220 446 Q 225 450 220 456 Q 205 452 190 456 Z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.5" />
      </g>

      {/* ================= 5. COURTYARD LAWN & WALKWAY ================= */}
      <g id="courtyard-landscape">
        {/* Front Lawn */}
        <path d="M 0 500 L 500 500 L 500 700 L 0 700 Z" fill="url(#lawnGrad)" />

        {/* Central Stone Pathway */}
        <polygon points="215,500 285,500 360,700 140,700" fill="url(#walkwayGrad)" opacity="0.8" />
        {/* Pathway paving texture */}
        <line x1="200" y1="540" x2="300" y2="540" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.5" />
        <line x1="180" y1="590" x2="320" y2="590" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="8 5" opacity="0.5" />
        <line x1="160" y1="650" x2="340" y2="650" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="10 6" opacity="0.5" />

        {/* Flowering Bushes flanking the path */}
        {/* Left Bushes */}
        <circle cx="130" cy="515" r="16" fill="#15803D" />
        <circle cx="150" cy="520" r="14" fill="#22C55E" />
        <circle cx="120" cy="528" r="12" fill="#16A34A" />
        {/* Flower dots */}
        <circle cx="135" cy="514" r="3" fill="#F43F5E" />
        <circle cx="152" cy="518" r="2.5" fill="#FBBF24" />

        {/* Right Bushes */}
        <circle cx="370" cy="515" r="16" fill="#15803D" />
        <circle cx="350" cy="520" r="14" fill="#22C55E" />
        <circle cx="380" cy="528" r="12" fill="#16A34A" />
        {/* Flower dots */}
        <circle cx="365" cy="514" r="3" fill="#F43F5E" />
        <circle cx="348" cy="518" r="2.5" fill="#FBBF24" />
      </g>

      {/* ================= 6. LUSH TROPICAL FOREGROUND LEAVES (FRAMING BOTTOM) ================= */}
      <g id="bottom-framing-leaves">
        {/* Left Side Leaves */}
        <path d="M -30 700 Q 20 590 60 610 Q 25 655 10 700 Z" fill="url(#leafGrad2)" />
        <path d="M 0 700 Q 55 570 105 590 Q 60 645 35 700 Z" fill="url(#leafGrad1)" />
        <path d="M 60 700 Q 120 590 155 625 Q 100 670 75 700 Z" fill="url(#leafGrad2)" />
        <path d="M -20 700 Q 30 635 85 660 Q 30 685 5 700 Z" fill="#15803D" />

        {/* Right Side Leaves */}
        <path d="M 530 700 Q 480 590 440 610 Q 475 655 490 700 Z" fill="url(#leafGrad2)" />
        <path d="M 500 700 Q 445 570 395 590 Q 440 645 465 700 Z" fill="url(#leafGrad1)" />
        <path d="M 440 700 Q 380 590 345 625 Q 400 670 425 700 Z" fill="url(#leafGrad2)" />
        <path d="M 520 700 Q 470 635 415 660 Q 470 685 495 700 Z" fill="#15803D" />

        {/* Center Low Garden Grass Trim */}
        <path d="M 120 700 Q 185 660 250 675 Q 195 695 160 700 Z" fill="url(#leafGrad1)" opacity="0.95" />
        <path d="M 380 700 Q 315 660 250 675 Q 305 695 340 700 Z" fill="url(#leafGrad1)" opacity="0.95" />
      </g>
    </svg>
  );
};
