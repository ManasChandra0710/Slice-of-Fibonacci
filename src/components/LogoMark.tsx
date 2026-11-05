import React from 'react';

interface LogoMarkProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Slice of Fibonacci — Distinctive Brand Logo ("The Golden Slice Aperture")
 *
 * Combines two Golden-Ratio (1 : 1.618) logarithmic crescents in deep & electric blue
 * bisected by a luminous diagonal "Slice" aperture with ascending Fibonacci nodes.
 */
export const LogoMark: React.FC<LogoMarkProps> = ({ className = '', size = 'md' }) => {
  const uid = React.useId().replace(/:/g, '');
  const sizeClasses =
    size === 'sm'
      ? 'w-8 h-8 rounded-lg'
      : size === 'lg'
      ? 'w-11 h-11 rounded-2xl'
      : 'w-9 h-9 rounded-xl';

  const svgSizes =
    size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-6 h-6' : 'w-[22px] h-[22px]';

  return (
    <span
      className={`relative inline-flex items-center justify-center ${sizeClasses} bg-gradient-to-br from-[#0d182c] via-[#070d19] to-[#04070f] border border-[#71b9ff]/45 shadow-[0_0_20px_rgba(113,185,255,0.28),inset_0_1px_0_rgba(255,255,255,0.16)] group-hover:border-[#9ecbff]/80 group-hover:shadow-[0_0_26px_rgba(113,185,255,0.48)] transition-all duration-300 overflow-hidden shrink-0 ${className}`}
    >
      {/* Subtle internal radial aura */}
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(113,185,255,0.24),transparent_68%)] opacity-80 group-hover:opacity-100 transition duration-300 pointer-events-none" />

      <svg
        viewBox="0 0 40 40"
        className={`${svgSizes} relative z-10`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`sof-outer-${uid}`} x1="6" y1="34" x2="34" y2="6" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e62b5" />
            <stop offset="52%" stopColor="#5caeff" />
            <stop offset="100%" stopColor="#dff0ff" />
          </linearGradient>
          <linearGradient id={`sof-inner-${uid}`} x1="12" y1="28" x2="31" y2="10" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2c83d6" />
            <stop offset="65%" stopColor="#71b9ff" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
          <linearGradient id={`sof-slice-${uid}`} x1="7" y1="33" x2="33" y2="7" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#71b9ff" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#9ecbff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>
          <filter id={`sof-glow-${uid}`} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="1.1" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Golden-Ratio (Φ) Harmonic Ring */}
        <path
          d="M 8.5 26.5 A 13.5 13.5 0 1 1 28.5 11.2"
          stroke={`url(#sof-outer-${uid})`}
          strokeWidth="2.6"
          strokeLinecap="round"
        />

        {/* Complementary Lower Crescent Arc (Sliced Offset) */}
        <path
          d="M 31.8 15.5 A 12.5 12.5 0 0 1 13.5 31.2"
          stroke="#2c83d6"
          strokeOpacity="0.65"
          strokeWidth="2.1"
          strokeLinecap="round"
        />

        {/* Inner Φ Convergence Spiral */}
        <path
          d="M 13.8 24.2 A 8.4 8.4 0 0 1 22.2 15.8 A 5.2 5.2 0 0 1 27.4 21.0 A 3.2 3.2 0 0 1 24.2 24.2"
          stroke={`url(#sof-inner-${uid})`}
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* The "Slice" — Precision Diagonal Light Aperture */}
        <line
          x1="9.5"
          y1="30.5"
          x2="31.5"
          y2="8.5"
          stroke={`url(#sof-slice-${uid})`}
          strokeWidth="1.9"
          strokeLinecap="round"
          filter={`url(#sof-glow-${uid})`}
        />

        {/* Three Ascending Fibonacci Sequence Nodes along the Slice (1 : 1 : 2 spacing) */}
        <circle cx="14.2" cy="25.8" r="1.55" fill="#5caeff" />
        <circle cx="20.4" cy="19.6" r="1.95" fill="#9ecbff" filter={`url(#sof-glow-${uid})`} />
        <circle cx="28.6" cy="11.4" r="2.35" fill="#ffffff" filter={`url(#sof-glow-${uid})`} />
      </svg>
    </span>
  );
};
