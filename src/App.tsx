import React, { useState, useEffect, useRef } from 'react';
import { FibonacciCanvas } from './components/FibonacciCanvas';
import { searchFibonacciTerm, FibonacciMatchResult, DIGIT_RULES } from './math/fibonacci';
import { soundEngine } from './audio/sound';
import { ShareModal } from './components/ShareModal';
import {
  generateShareCard,
  GeneratedShareCard,
  ORIGINAL_HOMEPAGE_URL,
  SHARE_CAPTION,
} from './utils/shareCard';
import { Volume2, VolumeX, Sparkles, Send, Music, Share2, Check, X, RotateCcw } from 'lucide-react';

/**
 * Extracts searched number from current URL path (/13, /144, /1000).
 * Gracefully ignores non-digit paths (e.g. /about, /) and cleans up malformed input.
 */
function extractNumberFromPathname(pathname: string): string {
  if (!pathname) return '';
  const cleanPath = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '');
  const segments = cleanPath.split('/').filter(Boolean);
  if (segments.length === 0) return '';
  const lastSegment = segments[segments.length - 1];
  if (/^\d+$/.test(lastSegment)) {
    return lastSegment;
  }
  return '';
}

function getInitialSearchNumber(): string {
  if (typeof window === 'undefined') return '';
  const pathNum = extractNumberFromPathname(window.location.pathname);
  if (pathNum) return pathNum;

  // Fallback support for query parameter (?q=13 or ?number=13)
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q') || params.get('number');
  if (q && /^\d+$/.test(q)) {
    return q;
  }
  return '';
}

export default function App() {
  const [inputValue, setInputValue] = useState('');
  const [previewQuery, setPreviewQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [matchResult, setMatchResult] = useState<FibonacciMatchResult | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(soundEngine.getIsPlaying());
  const [shareCopied, setShareCopied] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareCard, setShareCard] = useState<GeneratedShareCard | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const resultRef = useRef<HTMLElement>(null);

  // Restart background music from 00:00 on page refresh/initial load
  useEffect(() => {
    soundEngine.playInterstellar(true).catch(() => {});
  }, []);

  // Subscribe to background music state
  useEffect(() => {
    const unsub = soundEngine.subscribe((state) => {
      setIsPlaying(state.isPlaying);
    });
    return unsub;
  }, []);

  // Clear search and cleanly return URL to root '/'
  const handleClear = () => {
    setInputValue('');
    setPreviewQuery('');
    setMatchResult(null);
    if (typeof document !== 'undefined') {
      document.title = 'Slice of Fibonacci';
    }
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
  };

  // Search logic with History API integration: updates browser URL to /{number}
  const handleSearch = async (val: string, pushToHistory: boolean = true) => {
    const clean = val.replace(/[^0-9]/g, '').trim();
    if (!clean) {
      handleClear();
      return;
    }

    setIsSearching(true);
    setPreviewQuery(clean);

    // Update browser URL using History API to /{number} without full page reload
    if (pushToHistory && typeof window !== 'undefined') {
      const targetPath = `/${clean}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ number: clean }, '', targetPath);
      }
    }

    // Update document title for searched number
    if (typeof document !== 'undefined') {
      document.title = `${clean} in Fibonacci - Slice of Fibonacci`;
    }

    try {
      const res = await searchFibonacciTerm(clean);
      setMatchResult(res);

      setTimeout(() => {
        if (resultRef.current && window.innerWidth < 768) {
          resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 300);
    } catch {
      // Handled cleanly without cluttering UI
    } finally {
      setIsSearching(false);
    }
  };

  // Load searched number directly from URL path (/13, /144, /1000) on page load or refresh
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initialNum = getInitialSearchNumber();
    if (initialNum) {
      setInputValue(initialNum);
      handleSearch(initialNum, false);

      // Clean up any query parameters like ?number=13 to pure /{number}
      if (window.location.search && window.history.replaceState) {
        window.history.replaceState({ number: initialNum }, '', `/${initialNum}`);
      }
    } else if (window.location.pathname !== '/' && window.location.pathname !== '') {
      // Handle malformed paths like /abc gracefully by returning to clean homepage
      if (window.history.replaceState) {
        window.history.replaceState({}, '', '/');
      }
    }
  }, []);

  // Browser navigation history support (Back / Forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const num = extractNumberFromPathname(window.location.pathname);
      if (num) {
        setInputValue(num);
        handleSearch(num, false);
      } else {
        // Navigated back to root '/' or invalid path -> restore clean initial state
        setInputValue('');
        setPreviewQuery('');
        setMatchResult(null);
        if (typeof document !== 'undefined') {
          document.title = 'Slice of Fibonacci';
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(inputValue, true);
  };

  // Generate clean shareable URL for the current searched number
  const getShareUrl = (query: string) => {
    if (typeof window === 'undefined') {
      return `${ORIGINAL_HOMEPAGE_URL}${query}`;
    }
    return `${window.location.origin}/${query}`;
  };

  const handleShare = async () => {
    if (!matchResult) return;
    setIsGeneratingShare(true);

    try {
      const card = await generateShareCard(matchResult);
      setShareCard(card);

      // Attempt native share with image file on supported mobile/desktop browsers
      if (typeof navigator !== 'undefined' && navigator.share) {
        const shareData: ShareData = {
          title: 'Slice of Fibonacci',
          text: SHARE_CAPTION,
          url: ORIGINAL_HOMEPAGE_URL,
        };

        if (
          navigator.canShare &&
          card.file &&
          navigator.canShare({ ...shareData, files: [card.file] })
        ) {
          try {
            await navigator.share({ ...shareData, files: [card.file] });
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2500);
            setIsGeneratingShare(false);
            return;
          } catch (err: unknown) {
            if ((err as Error)?.name === 'AbortError') {
              setIsGeneratingShare(false);
              return;
            }
          }
        }
      }

      // If native file sharing is not directly handled or user wants to download/preview, open modal
      setIsShareModalOpen(true);
    } catch (err) {
      console.error('Failed to generate share card', err);
      try {
        await navigator.clipboard.writeText(`${SHARE_CAPTION}\n${ORIGINAL_HOMEPAGE_URL}`);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      } catch {}
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const handleToggleSound = () => {
    soundEngine.togglePlayPause();
  };

  // Live preview digits for input
  const liveDigits = inputValue.split('').filter((c) => /^[0-9]$/.test(c)).map(Number);

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-8 pt-6 sm:pt-8 pb-24 text-[#f2f4f8] min-h-screen flex flex-col justify-between">
      {/* Floating Glass Navigation Header */}
      <header className="glass-panel rounded-2xl px-5 py-3.5 flex justify-between items-center text-xs tracking-wide">
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-3 font-semibold text-sm sm:text-base tracking-tight cursor-pointer text-left focus:outline-none group"
          title="Return to Slice of Fibonacci Homepage (/)"
        >
          <span className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#121c2e] via-[#0b1320] to-[#1c1810] border border-[#71b9ff]/40 shadow-[0_0_18px_rgba(113,185,255,0.28)] group-hover:border-[#f0c978]/60 group-hover:shadow-[0_0_24px_rgba(240,201,120,0.4)] transition-all duration-300 overflow-hidden shrink-0">
            <span className="absolute inset-0 bg-gradient-to-tr from-[#71b9ff]/20 via-transparent to-[#f0c978]/25 opacity-70 group-hover:opacity-100 transition duration-300 pointer-events-none" />
            <svg
              viewBox="0 0 32 32"
              className="w-5 h-5 relative z-10 filter drop-shadow-[0_0_6px_rgba(113,185,255,0.7)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="fib-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#71b9ff" />
                  <stop offset="55%" stopColor="#9ecbff" />
                  <stop offset="100%" stopColor="#f0c978" />
                </linearGradient>
                <filter id="fib-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="0.8" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              {/* Subtle Golden Ratio Subdivision Geometry */}
              <line x1="18" y1="9" x2="18" y2="23.5" stroke="rgba(113,185,255,0.22)" strokeWidth="0.75" strokeDasharray="1.5 1.5" />
              <line x1="18" y1="18" x2="27" y2="18" stroke="rgba(240,201,120,0.22)" strokeWidth="0.75" strokeDasharray="1.5 1.5" />

              {/* Fibonacci Logarithmic Golden Spiral */}
              <path
                d="M 4 23 A 14 14 0 0 1 18 9 A 9 9 0 0 1 27 18 A 5.5 5.5 0 0 1 21.5 23.5 A 3.5 3.5 0 0 1 18 20 A 2 2 0 0 1 20 18 A 1.2 1.2 0 0 1 21.2 19.2"
                stroke="url(#fib-grad)"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Radiant Golden Singularity Node & Fibonacci Points */}
              <circle cx="21" cy="18.8" r="1.7" fill="#f0c978" filter="url(#fib-glow)" />
              <circle cx="4" cy="23" r="1.3" fill="#71b9ff" />
              <circle cx="18" cy="9" r="1.3" fill="#9ecbff" />
              <circle cx="27" cy="18" r="1.3" fill="#f0c978" />
            </svg>
          </span>
          <span className="text-white font-medium tracking-tight text-[15px] sm:text-[16px] group-hover:text-[#9ecbff] transition">
            Slice of Fibonacci
          </span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">

          {/* Interstellar Music Control */}
          <div className="flex items-center gap-2 p-1.5 pl-2.5 pr-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-[#71b9ff]/40 transition duration-300 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.35)]">
            <button
              onClick={handleToggleSound}
              className="flex items-center gap-2 text-left cursor-pointer group"
              title={isPlaying ? 'Pause Interstellar Soundtrack' : 'Play Interstellar Soundtrack'}
            >
              {/* Dynamic Equalizer / Music Icon */}
              <div className="w-4 h-4 flex items-end justify-center gap-[2.5px] shrink-0">
                {isPlaying ? (
                  <>
                    <span className="w-[2.5px] bg-[#f0c978] rounded-full animate-eq-1 shadow-[0_0_6px_rgba(240,201,120,0.8)]" />
                    <span className="w-[2.5px] bg-[#71b9ff] rounded-full animate-eq-2 shadow-[0_0_6px_rgba(113,185,255,0.8)]" />
                    <span className="w-[2.5px] bg-[#9ecbff] rounded-full animate-eq-3 shadow-[0_0_6px_rgba(158,203,255,0.8)]" />
                  </>
                ) : (
                  <Music className="w-3.5 h-3.5 text-[#6b7588] group-hover:text-[#a2aab8] transition" />
                )}
              </div>

              <div className="flex flex-col leading-none pr-1 select-none">
                <span className={`text-[9px] font-mono tracking-wider uppercase ${isPlaying ? 'text-[#71b9ff]' : 'text-[#8e96a5]'}`}>
                  {isPlaying ? 'Now Playing' : 'Paused'}
                </span>
                <span className="text-[11px] font-medium text-white/90 group-hover:text-white transition">
                  Interstellar
                </span>
              </div>
            </button>

            <button
              onClick={handleToggleSound}
              title={isPlaying ? 'Pause Interstellar Music' : 'Play Interstellar Music'}
              className="p-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#8e96a5] hover:text-[#71b9ff] transition cursor-pointer"
            >
              {isPlaying ? <Volume2 className="w-3.5 h-3.5 text-[#71b9ff]" /> : <VolumeX className="w-3.5 h-3.5 text-[#606977]" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Futuristic Glass Hero Console */}
        <section className="max-w-[760px] mx-auto mt-10 sm:mt-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#71b9ff]/10 border border-[#71b9ff]/30 text-[#71b9ff] text-[11px] font-mono tracking-[0.16em] uppercase mb-4 shadow-[0_0_20px_rgba(113,185,255,0.15)]">
            <Sparkles className="w-3.5 h-3.5" />
            Infinite Sequence Orb Space
          </div>

          <h1 className="font-semibold text-[34px] sm:text-[52px] md:text-[62px] tracking-[-0.05em] leading-[1.08] mx-auto mb-4 text-[#f2f4f8]">
            Your number is hiding inside{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#71b9ff] via-[#9ecbff] to-[#f0c978]">
              Fibonacci.
            </span>
          </h1>

          <p className="max-w-[560px] mx-auto text-[#a2aab8] text-sm sm:text-[15px] leading-relaxed">
            Every digit in the sequence is a radiant glass orb in 3D space. Type your number and watch its exact sequence of orbs illuminate in the swirl.
          </p>

          {/* Glass Search Console */}
          <div className="max-w-[460px] mx-auto mt-7">
            <form
              onSubmit={handleSubmit}
              className="glass-panel-glow rounded-2xl p-2 flex items-center gap-2 transition duration-300"
            >
              <div className="relative flex-1 flex items-center">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={12}
                  value={inputValue}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setInputValue(val);
                    if (val) setPreviewQuery(val);
                  }}
                  aria-label="Number sequence to search"
                  placeholder="Type any number (e.g. 13, 144, 1000)..."
                  className="w-full bg-transparent text-[#f2f4f8] border-0 outline-none px-4 py-2.5 text-base sm:text-[18px] tracking-[0.16em] font-mono placeholder:text-[#556173] placeholder:tracking-normal font-semibold"
                  required
                />

                {/* Clear search input button */}
                {inputValue && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1 rounded-md text-[#6e7d94] hover:text-white hover:bg-white/[0.08] transition mr-1 cursor-pointer"
                    title="Clear search and return to homepage (/)"
                    aria-label="Clear search input"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Live typing glass orb preview inside input */}
                {liveDigits.length > 0 && (
                  <div className="hidden sm:flex items-center gap-1.5 pr-3 pointer-events-none">
                    {liveDigits.map((d, i) => (
                      <span
                        key={i}
                        className="w-4 h-4 rounded-full glass-orb"
                        style={{
                          backgroundColor: DIGIT_RULES[d].color,
                          color: DIGIT_RULES[d].color,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#71b9ff] to-[#2c83d6] hover:from-[#8ec8ff] hover:to-[#3891e8] text-[#060b14] font-semibold text-xs sm:text-[13px] tracking-wide font-mono cursor-pointer whitespace-nowrap shadow-[0_0_20px_rgba(113,185,255,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition duration-200 disabled:opacity-55 disabled:cursor-wait flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSearching ? 'Scanning…' : 'Find it'}</span>
              </button>
            </form>
          </div>

          {/* Futuristic Glass Color Legend Bar (Uniform Size, 10 Colors) */}
          <div className="max-w-[700px] mx-auto mt-6 glass-panel rounded-2xl p-4 sm:p-5 text-center">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06] text-xs">
              <span className="font-medium text-[#c5d3e8] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#71b9ff] shadow-[0_0_8px_#71b9ff]"></span>
                Orb Colour System
              </span>
              <span className="text-[#7d8fa6] font-mono text-[11px]">
                Uniform Size · Digit Codes 0–9
              </span>
            </div>

            {/* 10 Glowing Glass Orbs */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-3 py-1">
              {DIGIT_RULES.map((rule) => (
                <button
                  key={rule.digit}
                  type="button"
                  onClick={() => {
                    setInputValue((prev) => (prev.length < 6 ? prev + rule.digit : prev));
                  }}
                  className="flex flex-col items-center gap-2 p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.08] border border-white/[0.04] hover:border-white/20 transition group cursor-pointer"
                  title={`Click to add digit ${rule.digit} (${rule.name})`}
                >
                  <span
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full glass-orb transition duration-200 group-hover:scale-110"
                    style={{
                      backgroundColor: rule.color,
                      color: rule.color,
                    }}
                  />
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-xs font-bold text-white group-hover:text-[#71b9ff]">
                      {rule.digit}
                    </span>
                    <span className="text-[9px] text-[#718299] truncate max-w-[50px] hidden sm:inline">
                      {rule.name.split(' ')[0]}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-[12px] text-[#7d8fa6] mt-3 italic font-sans">
              Every sequence is a continuous trail of these glassy orbs glowing in the 3D swirl.
            </p>
          </div>
        </section>

        {/* 3D Glass Spiral Viewport Section */}
        <section
          className="scale-visual-container"
          aria-label="3D Fibonacci spiral showing illuminated glass orbs"
        >
          <FibonacciCanvas
            matchResult={matchResult}
            activeQuery={previewQuery}
          />
        </section>

        {/* Results Glass Console */}
        {matchResult && (
          <section
            ref={resultRef}
            className="max-w-[780px] mx-auto mb-8 glass-panel rounded-2xl p-5 sm:p-7 animate-rise"
            aria-live="polite"
          >
            <div className="flex justify-between items-center gap-3 pb-4 mb-5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#71b9ff] shadow-[0_0_12px_#71b9ff]" />
                <span className="text-xs font-mono font-semibold uppercase tracking-[0.14em] text-[#c0d4ec]">
                  Sequence Illuminated in 3D
                </span>
              </div>
            </div>

            {/* Sequence Orbs Visual Trail */}
            <div className="mb-6 p-4 rounded-xl bg-[#090f1a]/80 border border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#7d8fa6] mb-1">
                  Active Sequence Trail
                </div>
                <div className="text-xl font-bold font-mono tracking-wider text-white">
                  "{matchResult.query}"
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/40 border border-white/[0.08]">
                {matchResult.trailDigits.map((d, idx) => {
                  const rule = DIGIT_RULES[d];
                  return (
                    <div key={idx} className="flex flex-col items-center gap-1">
                      <span
                        className="w-7 h-7 rounded-full glass-orb transition duration-200"
                        style={{
                          backgroundColor: rule.color,
                          color: rule.color,
                        }}
                      />
                      <span className="font-mono text-xs font-bold text-white">{d}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4-Column Glass Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#7d8fa6]">
                  Fibonacci Term
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-[#71b9ff] mt-1">
                  F({matchResult.n.toLocaleString('en-US')})
                </div>
                <div className="text-[11px] text-[#6e7e94] mt-1">
                  The {matchResult.n === 0 ? '1st' : `${(matchResult.n + 1).toLocaleString('en-US')}th`} term
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#7d8fa6]">
                  Position in F({matchResult.n})
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
                  #{matchResult.pos.toLocaleString('en-US')}
                </div>
                <div className="text-[11px] text-[#6e7e94] mt-1">
                  1-based digit index
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#7d8fa6]">
                  Stream Position
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-[#f0c978] mt-1">
                  #{matchResult.streamPos.toLocaleString('en-US')}
                </div>
                <div className="text-[11px] text-[#6e7e94] mt-1">
                  in 0112358... sequence
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#7d8fa6]">
                  Term Length
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-[#a4b5cb] mt-1">
                  {matchResult.termLength.toLocaleString('en-US')}
                </div>
                <div className="text-[11px] text-[#6e7e94] mt-1">
                  Total decimal digits
                </div>
              </div>
            </div>

            {/* Complete Mathematical Term Ribbon (Targeted Element) */}
            <div className="p-4 sm:p-5 bg-[#080d17] border border-white/[0.08] rounded-xl mb-4 shadow-inner">
              <div className="flex flex-wrap justify-between items-center gap-2 text-[10px] uppercase font-mono tracking-wider text-[#7d8fa6] mb-3 pb-2 border-b border-white/[0.06]">
                <span className="flex items-center gap-1.5 text-[#9bd3ff] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#71b9ff] shadow-[0_0_8px_#71b9ff]" />
                  Complete Term F({matchResult.n.toLocaleString('en-US')})
                </span>
                <span className="text-[#a4b5cb]">
                  {matchResult.termLength.toLocaleString('en-US')} Digits (Full Term) · Found at digit #{matchResult.pos.toLocaleString('en-US')}
                </span>
              </div>

              <div className="font-mono text-xs sm:text-[13px] leading-relaxed break-all text-[#99a9bf] select-text tracking-wide whitespace-normal">
                <span>{matchResult.before}</span>
                <mark className="bg-[#1b3a5c] text-[#9bd3ff] border border-[#71b9ff]/70 rounded-md px-1.5 py-0.5 mx-0.5 font-bold shadow-[0_0_12px_rgba(113,185,255,0.4)]">
                  {matchResult.match}
                </mark>
                <span>{matchResult.after}</span>
              </div>
            </div>

            {/* Actions Row */}
            <div className="flex flex-wrap justify-between items-center gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={isGeneratingShare}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#f0c978]/25 via-[#71b9ff]/25 to-[#2c83d6]/25 hover:from-[#f0c978]/35 hover:via-[#71b9ff]/35 hover:to-[#2c83d6]/35 border border-[#f0c978]/50 hover:border-[#f0c978]/80 text-[#f0c978] hover:text-white text-xs font-mono transition cursor-pointer flex items-center gap-1.5 shadow-[0_0_18px_rgba(240,201,120,0.2)] active:scale-95 disabled:opacity-50"
                >
                  {isGeneratingShare ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Generating Card...</span>
                    </>
                  ) : shareCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#f0c978]" />
                      <span className="text-[#f0c978]">Link & Card Ready ✓</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-[#f0c978]" />
                      <span>Share Result & Card ↗</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-white/20 text-[#8e9cb0] hover:text-white text-xs font-mono transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                  title="Clear search and return to landing page (/)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Search</span>
                </button>
              </div>

              <span className="text-[11px] text-[#657386] font-mono">
                Digits counted starting from index 1.
              </span>
            </div>
          </section>
        )}

        {/* Collapsible Architecture Guide */}
        {aboutOpen && (
          <section className="max-w-[780px] mx-auto mt-6 glass-panel rounded-2xl p-6 text-[#9eb0c6] text-[13px] leading-relaxed animate-rise">
            <h2 className="text-sm text-white font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#71b9ff]" />
              The Architecture of the 3D Glass Orbs Swirl
            </h2>
            <p className="my-2">
              The Fibonacci sequence is defined by <code className="text-[#71b9ff] font-mono">F(0) = 0, F(1) = 1, F(n) = F(n−1) + F(n−2)</code>. As numbers grow, their consecutive ratio converges to the Golden Ratio <code className="text-[#f0c978] font-mono">Φ ≈ 1.6180339887...</code>.
            </p>
            <p className="my-2">
              In this 3D visualization, each node represents an individual digit mapped onto a logarithmic Golden Spiral. Every digit (0 through 9) is represented by a uniform glass orb with a distinctive refractive color.
            </p>
            <p className="my-2">
              When you enter a sequence, the engine scans the sequence in real time and highlights the exact trail of glass orbs in 3D with glowing illumination and dynamic camera fly-through.
            </p>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="flex justify-between items-center gap-3 mt-12 pt-4 border-t border-white/[0.06] text-[#5d6c80] text-[11px] tracking-wider font-mono uppercase">
        <span>F(n) = F(n−1) + F(n−2)</span>
        <button
          type="button"
          onClick={() => {
            setAboutOpen(!aboutOpen);
          }}
          className="border-0 bg-transparent text-[#8298b4] hover:text-[#71b9ff] cursor-pointer font-inherit tracking-inherit uppercase transition"
        >
          {aboutOpen ? 'Close Guide ↑' : 'What is this?'}
        </button>
      </footer>

      {/* Share Modal Dialog */}
      {matchResult && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          matchResult={matchResult}
          shareCard={shareCard}
          searchUrl={getShareUrl(matchResult.query)}
        />
      )}
    </div>
  );
}
