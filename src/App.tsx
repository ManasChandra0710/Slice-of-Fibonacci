import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FibonacciCanvas } from './components/FibonacciCanvas';
import {
  searchFibonacciTerm,
  cancelCurrentSearch,
  FibonacciMatchResult,
  DIGIT_RULES,
} from './math/fibonacci';
import { soundEngine } from './audio/sound';
import { ShareModal } from './components/ShareModal';
import {
  generateShareCard,
  GeneratedShareCard,
  ORIGINAL_HOMEPAGE_URL,
  SHARE_CAPTION,
} from './utils/shareCard';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Search,
  Music,
  Share2,
  Check,
  X,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';

/**
 * Extracts searched number from current URL path (/13, /144, /07102007).
 * Gracefully ignores non-digit paths (e.g. /about, /) and cleans up malformed input.
 */
function extractNumberFromPathname(pathname: string): string {
  if (!pathname) return '';
  const cleanPath = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '');
  const segments = cleanPath.split('/').filter(Boolean);
  if (segments.length === 0) return '';
  const lastSegment = segments[segments.length - 1];
  if (/^\d{1,8}$/.test(lastSegment)) {
    return lastSegment;
  }
  return '';
}

function getInitialSearchNumber(): string {
  if (typeof window === 'undefined') return '';
  const pathNum = extractNumberFromPathname(window.location.pathname);
  if (pathNum) return pathNum;

  const params = new URLSearchParams(window.location.search);
  const q = params.get('q') || params.get('number');
  if (q && /^\d{1,8}$/.test(q)) {
    return q;
  }
  return '';
}

/**
 * Splits a potentially multi-thousand-digit string into fixed-size chunks
 * so the browser can lay out and wrap very long Fibonacci terms smoothly.
 */
function splitIntoReadableChunks(str: string, chunkSize: number = 400): string[] {
  if (!str) return [];
  if (str.length <= chunkSize) return [str];
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += chunkSize) {
    chunks.push(str.slice(i, i + chunkSize));
  }
  return chunks;
}

export default function App() {
  const [inputValue, setInputValue] = useState('');
  const [previewQuery, setPreviewQuery] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState<number | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<FibonacciMatchResult | null>(null);
  const [isWhatsThisOpen, setIsWhatsThisOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(soundEngine.getIsPlaying());
  const [shareCopied, setShareCopied] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareCard, setShareCard] = useState<GeneratedShareCard | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);

  const searchBarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const swirlSectionRef = useRef<HTMLElement>(null);
  const resultRef = useRef<HTMLElement>(null);

  // Track active search request ID to prevent stale/duplicate results
  const activeSearchReqRef = useRef(0);
  const pendingScrollToSwirlRef = useRef(false);

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

  // Close "What's This?" on Escape key
  useEffect(() => {
    if (!isWhatsThisOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsWhatsThisOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isWhatsThisOpen]);

  // Smooth scroll to the 3D Glass Orb Swirl once the search result and 3D visualization are ready
  const handleSequenceReady = useCallback(() => {
    if (!pendingScrollToSwirlRef.current) return;
    pendingScrollToSwirlRef.current = false;

    requestAnimationFrame(() => {
      if (swirlSectionRef.current) {
        swirlSectionRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    });
  }, []);

  // Clear search, reset visualization & status state, and smoothly scroll back to input bar
  const handleClear = (scrollToInput: boolean = true) => {
    activeSearchReqRef.current++;
    pendingScrollToSwirlRef.current = false;
    cancelCurrentSearch();
    setIsSearching(false);
    setInputValue('');
    setPreviewQuery('');
    setMatchResult(null);
    setSearchError(null);
    setSearchProgress(null);
    setShareCard(null);
    setIsShareModalOpen(false);

    if (typeof document !== 'undefined') {
      document.title = 'Slice of Fibonacci';
    }
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }

    if (scrollToInput) {
      if (searchBarRef.current) {
        searchBarRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true });
      }, 320);
    }
  };

  // Search logic with History API integration: updates browser URL to /{number}
  const handleSearch = async (val: string, pushToHistory: boolean = true) => {
    const clean = val.replace(/[^0-9]/g, '').slice(0, 8);
    if (!clean) {
      handleClear(false);
      return;
    }

    const reqId = ++activeSearchReqRef.current;
    pendingScrollToSwirlRef.current = false;

    setInputValue(clean);
    setIsSearching(true);
    setSearchError(null);
    setSearchProgress(0);
    setPreviewQuery(clean);

    if (pushToHistory && typeof window !== 'undefined') {
      const targetPath = `/${clean}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ number: clean }, '', targetPath);
      }
    }

    if (typeof document !== 'undefined') {
      document.title = `${clean} in Fibonacci - Slice of Fibonacci`;
    }

    try {
      const res = await searchFibonacciTerm(clean, (checkedCount) => {
        if (activeSearchReqRef.current === reqId) {
          setSearchProgress(checkedCount);
        }
      });

      if (activeSearchReqRef.current !== reqId) return;

      pendingScrollToSwirlRef.current = true;
      setMatchResult(res);
      setSearchError(null);
      setSearchProgress(null);
      setIsSearching(false);
    } catch (err: unknown) {
      if (activeSearchReqRef.current !== reqId) return;

      const message = err instanceof Error ? err.message : 'Search could not be completed.';
      if (message !== 'SEARCH_CANCELLED') {
        setSearchError(message);
        setMatchResult(null);
        setSearchProgress(null);
      }
      setIsSearching(false);
    }
  };

  // Load searched number directly from URL path (/13, /144, /07102007) on page load or refresh
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initialNum = getInitialSearchNumber();
    if (initialNum) {
      setInputValue(initialNum);
      handleSearch(initialNum, false);

      if (window.location.search && window.history.replaceState) {
        window.history.replaceState({ number: initialNum }, '', `/${initialNum}`);
      }
    } else if (window.location.pathname !== '/' && window.location.pathname !== '') {
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
        activeSearchReqRef.current++;
        pendingScrollToSwirlRef.current = false;
        cancelCurrentSearch();
        setIsSearching(false);
        setInputValue('');
        setPreviewQuery('');
        setMatchResult(null);
        setSearchError(null);
        setSearchProgress(null);
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

  // Enforce 1–8 decimal digits while preserving leading zeros during typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
    setInputValue(clean);
    setPreviewQuery(clean);
  };

  // Enforce 1–8 decimal digits while preserving leading zeros during pasting
  const handleInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedDigits = (e.clipboardData?.getData('text') || '').replace(/[^0-9]/g, '');
    if (!pastedDigits) return;
    const input = e.currentTarget;
    const selStart = input.selectionStart ?? inputValue.length;
    const selEnd = input.selectionEnd ?? inputValue.length;
    const nextVal = (
      inputValue.slice(0, selStart) +
      pastedDigits +
      inputValue.slice(selEnd)
    )
      .replace(/[^0-9]/g, '')
      .slice(0, 8);
    setInputValue(nextVal);
    setPreviewQuery(nextVal);
  };

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

  const beforeChunks = useMemo(
    () => (matchResult ? splitIntoReadableChunks(matchResult.before, 400) : []),
    [matchResult]
  );

  const afterChunks = useMemo(
    () => (matchResult ? splitIntoReadableChunks(matchResult.after, 400) : []),
    [matchResult]
  );

  const showResultSection = isSearching || Boolean(matchResult) || Boolean(searchError);
  const isSearchBarActive = isInputFocused || inputValue.length > 0;
  const showClearHelper = Boolean(inputValue) || Boolean(matchResult) || Boolean(searchError);

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-8 pt-6 sm:pt-8 pb-16 text-[#f2f4f8] min-h-screen flex flex-col justify-between">
      {/* Floating Glass Navigation Header */}
      <header className="glass-panel rounded-2xl px-5 py-3.5 flex justify-between items-center text-xs tracking-wide">
        <button
          type="button"
          onClick={() => handleClear(true)}
          className="flex items-center gap-3 font-semibold text-sm sm:text-base tracking-tight cursor-pointer text-left focus:outline-none group"
          title="Return to Slice of Fibonacci Homepage (/)"
        >
          <span className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-[#040812] border border-[#71b9ff]/45 shadow-[0_0_18px_rgba(113,185,255,0.3)] group-hover:border-[#71b9ff]/85 group-hover:shadow-[0_0_24px_rgba(113,185,255,0.5)] transition-all duration-300 overflow-hidden shrink-0">
            <img
              src="/logo.png"
              alt="Slice of Fibonacci Logo"
              className="w-full h-full object-cover"
            />
          </span>
          <span className="text-white font-medium tracking-tight text-[15px] sm:text-[16px] group-hover:text-[#9ecbff] transition">
            Slice of Fibonacci
          </span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Instant-Response Interstellar Music Control */}
          <div className="flex items-center gap-2 p-1.5 pl-2.5 pr-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-[#71b9ff]/40 transition duration-300 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.35)]">
            <button
              type="button"
              onClick={handleToggleSound}
              className="flex items-center gap-2 text-left cursor-pointer group"
              title={isPlaying ? 'Pause Interstellar Soundtrack' : 'Play Interstellar Soundtrack'}
            >
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
                <span
                  className={`text-[9px] font-mono tracking-wider uppercase ${
                    isPlaying ? 'text-[#71b9ff]' : 'text-[#8e96a5]'
                  }`}
                >
                  {isPlaying ? 'Now Playing' : 'Paused'}
                </span>
                <span className="text-[11px] font-medium text-white/90 group-hover:text-white transition">
                  Interstellar
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleToggleSound}
              title={isPlaying ? 'Pause Interstellar Music' : 'Play Interstellar Music'}
              aria-label={isPlaying ? 'Pause Interstellar Music' : 'Play Interstellar Music'}
              className="p-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#8e96a5] hover:text-[#71b9ff] transition cursor-pointer"
            >
              {isPlaying ? (
                <Volume2 className="w-3.5 h-3.5 text-[#71b9ff]" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-[#606977]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Futuristic Glass Hero Console */}
        <section className="max-w-[760px] mx-auto mt-10 sm:mt-14 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#71b9ff]/10 border border-[#71b9ff]/30 text-[#71b9ff] text-[10px] sm:text-[11px] font-mono tracking-[0.16em] uppercase mb-5 shadow-[0_0_20px_rgba(113,185,255,0.15)]">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>A LITTLE CURIOSITY. AN INFINITE SEQUENCE.</span>
          </div>

          <h1 className="font-semibold text-[34px] sm:text-[52px] md:text-[62px] tracking-[-0.05em] leading-[1.08] mx-auto mb-5 text-[#f2f4f8]">
            Your number is hiding inside{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#71b9ff] via-[#9ecbff] to-[#f0c978]">
              Fibonacci.
            </span>
          </h1>

          <p className="max-w-[560px] mx-auto text-[#a2aab8] text-sm sm:text-[16px] leading-relaxed">
            Every number has a story.
            <br />
            Find where yours begins in the Fibonacci sequence.
          </p>

          {/* Constant-Width Search Bar (1 to 8 digits, leading zeros preserved) */}
          <div ref={searchBarRef} className="w-full max-w-[640px] mx-auto mt-8">
            <form
              onSubmit={handleSubmit}
              className={`rounded-2xl bg-[#060a14]/95 p-2 sm:p-2.5 flex items-center gap-3 w-full transition-all duration-300 border ${
                isSearchBarActive
                  ? 'border-[#68b3ff]/85 shadow-[0_0_32px_rgba(104,179,255,0.22),inset_0_0_14px_rgba(104,179,255,0.07)]'
                  : 'border-[#1b2a42] shadow-[0_14px_38px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-[#2c4366]'
              }`}
            >
              <div className="pl-2.5 sm:pl-3.5 flex items-center justify-center shrink-0 pointer-events-none">
                <Search
                  className={`w-5 h-5 transition-colors duration-200 ${
                    isSearchBarActive ? 'text-[#7dbfff]' : 'text-[#6c7f99]'
                  }`}
                />
              </div>

              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={8}
                value={inputValue}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                onChange={handleInputChange}
                onPaste={handleInputPaste}
                aria-label="Enter a number (1 to 8 digits)"
                placeholder="Enter a number"
                className="flex-1 min-w-0 bg-transparent text-white border-0 outline-none py-2.5 text-lg sm:text-[21px] tracking-[0.14em] font-mono font-bold placeholder:text-[#6e7f96] placeholder:tracking-normal placeholder:font-sans placeholder:font-normal placeholder:text-base sm:placeholder:text-[18px]"
                required
              />

              <button
                type="submit"
                className="w-[154px] sm:w-[172px] shrink-0 py-3 sm:py-3.5 px-4 rounded-xl bg-[#70b6ff] hover:bg-[#84c2ff] active:bg-[#5ea8f5] text-[#040812] font-semibold text-xs sm:text-[14px] tracking-tight cursor-pointer whitespace-nowrap shadow-[0_0_22px_rgba(112,182,255,0.35)] transition duration-200 flex items-center justify-center gap-1.5"
              >
                <span>{isSearching ? 'Scanning…' : 'Find my number'}</span>
                {!isSearching && (
                  <span aria-hidden="true" className="text-[13px] leading-none font-bold">
                    ↗
                  </span>
                )}
              </button>
            </form>

            {/* Helper & Clear Row Below Search Bar */}
            <div className="flex items-center justify-between px-1.5 mt-2.5 min-h-[20px] text-xs">
              <span className="text-[#6e7f96] tracking-wide">
                1–8 digits. Even the zeros count.
              </span>

              <button
                type="button"
                onClick={() => handleClear(false)}
                tabIndex={showClearHelper ? 0 : -1}
                className={`inline-flex items-center gap-1.5 text-[#c8d4e6] hover:text-white font-medium transition cursor-pointer ${
                  showClearHelper ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                aria-label="Clear search"
              >
                <span>Clear search</span>
                <X className="w-3.5 h-3.5 text-[#8fa2bd]" />
              </button>
            </div>
          </div>
        </section>

        {/* 3D Glass Spiral Viewport Section */}
        <section
          ref={swirlSectionRef}
          className="scale-visual-container"
          aria-label="3D Fibonacci spiral showing illuminated glass orbs"
        >
          <FibonacciCanvas
            matchResult={matchResult}
            activeQuery={previewQuery}
            onSequenceReady={handleSequenceReady}
          />
        </section>

        {/* Results Glass Console ("Your digits, discovered.") */}
        {showResultSection && (
          <section
            ref={resultRef}
            className="max-w-[960px] mx-auto mb-10 glass-panel rounded-2xl p-5 sm:p-7 animate-rise relative overflow-hidden"
            aria-live="polite"
          >
            {/* Non-Blocking Top Progress Indicator Bar */}
            {isSearching && (
              <div className="mb-5 rounded-xl bg-[#071122]/90 border border-[#71b9ff]/30 overflow-hidden shadow-[0_0_20px_rgba(113,185,255,0.12)]">
                <div className="h-1 w-full bg-[#0b182e] overflow-hidden relative">
                  <div className="h-full w-full bg-gradient-to-r from-transparent via-[#71b9ff] to-[#f0c978] animate-pulse" />
                </div>
                <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2 text-[#9ecbff]">
                    <span className="w-3.5 h-3.5 border-2 border-[#71b9ff]/30 border-t-[#71b9ff] rounded-full animate-spin shrink-0" />
                    <span>
                      Searching ascending Fibonacci terms for{' '}
                      <strong className="text-white">"{previewQuery}"</strong>…
                    </span>
                  </div>
                  <span className="text-[#f0c978] text-[11px]">
                    {searchProgress !== null && searchProgress > 0
                      ? `Scanned F(0) – F(${searchProgress.toLocaleString('en-US')})`
                      : 'Scanning initial terms…'}
                  </span>
                </div>
              </div>
            )}

            {/* Header Row */}
            <div className="flex justify-between items-center gap-3 pb-4 mb-5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#71b9ff] shadow-[0_0_12px_#71b9ff]" />
                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-white">
                  Your digits,{' '}
                  <em className="italic font-serif font-normal text-[#71b9ff]">discovered.</em>
                </h2>
              </div>
            </div>

            {/* Honest Error / Limit Message Display */}
            {searchError && !isSearching && (
              <div className="p-4 sm:p-5 rounded-xl bg-[#180d14]/90 border border-[#eb4f27]/40 text-[#f2dce0] mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#eb4f27] shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm leading-relaxed font-mono">
                    {searchError}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleClear(true)}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-mono text-white shrink-0 flex items-center gap-1.5 cursor-pointer transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Search</span>
                </button>
              </div>
            )}

            {matchResult && (
              <>
                {/* Sequence Orbs Visual Trail */}
                <div className="mb-6 p-4 rounded-xl bg-[#060b16]/85 border border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#7d8fa6] mb-1">
                      YOUR NUMBER
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-mono tracking-wider text-[#71b9ff]">
                      {matchResult.query}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 p-2.5 rounded-xl bg-black/45 border border-white/[0.08]">
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

                {/* 4-Column Glass Stat Cards (All dynamic values unified in #71b9ff) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.15fr_1.15fr_1.55fr_1.05fr] gap-3.5 mb-5">
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] min-w-0 overflow-hidden">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#7d8fa6]">
                      FIBONACCI TERM
                    </div>
                    <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono text-[#71b9ff] mt-1 whitespace-nowrap">
                      F({matchResult.n.toLocaleString('en-US')})
                    </div>
                    <div className="text-[11px] text-[#6e7e94] mt-1">
                      Index starts at F₀ = 0
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] min-w-0 overflow-hidden">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#7d8fa6]">
                      POSITION IN TERM
                    </div>
                    <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono text-[#71b9ff] mt-1 whitespace-nowrap">
                      {matchResult.pos.toLocaleString('en-US')}
                    </div>
                    <div className="text-[11px] text-[#6e7e94] mt-1">
                      1-based digit index
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] min-w-0 overflow-hidden">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#7d8fa6]">
                      STREAM POSITION
                    </div>
                    <div className="text-lg sm:text-xl md:text-[22px] font-bold font-mono text-[#71b9ff] mt-1 whitespace-nowrap tracking-tight">
                      {matchResult.streamPos.toLocaleString('en-US')}
                    </div>
                    <div className="text-[11px] text-[#6e7e94] mt-1">
                      in 0112358... sequence
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] min-w-0 overflow-hidden">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#7d8fa6]">
                      TERM LENGTH
                    </div>
                    <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono text-[#71b9ff] mt-1 whitespace-nowrap">
                      {matchResult.termLength.toLocaleString('en-US')}
                    </div>
                    <div className="text-[11px] text-[#6e7e94] mt-1">
                      Total decimal digits
                    </div>
                  </div>
                </div>

                {/* Complete Mathematical Term Ribbon — Readable Typography, Natural Wrapping, Full Term Displayed */}
                <div className="p-5 sm:p-6 bg-[#050913] border border-[#71b9ff]/18 rounded-xl mb-5 shadow-inner max-w-full overflow-hidden">
                  <div className="flex flex-wrap justify-between items-center gap-2 text-[11px] uppercase font-mono tracking-wider text-[#7d8fa6] mb-3.5 pb-2.5 border-b border-white/[0.07]">
                    <span className="flex items-center gap-1.5 text-[#9bd3ff] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#71b9ff] shadow-[0_0_8px_#71b9ff]" />
                      Complete Term F({matchResult.n.toLocaleString('en-US')})
                    </span>
                    <span className="text-[#a4b5cb]">
                      {matchResult.termLength.toLocaleString('en-US')} Digits
                    </span>
                  </div>

                  <div className="font-mono tabular-nums text-sm sm:text-[15px] leading-[1.88] tracking-[0.055em] break-all text-[#b0c0d6] select-text whitespace-normal max-w-full">
                    {beforeChunks.map((chunk, i) => (
                      <span key={`b-${i}`}>{chunk}</span>
                    ))}
                    <mark className="bg-[#16355b] text-white border border-[#71b9ff] rounded-md px-2 py-0.5 mx-1 font-bold shadow-[0_0_16px_rgba(113,185,255,0.5)]">
                      {matchResult.match}
                    </mark>
                    {afterChunks.map((chunk, i) => (
                      <span key={`a-${i}`}>{chunk}</span>
                    ))}
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex flex-wrap justify-between items-center gap-3 pt-1">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleShare}
                      disabled={isGeneratingShare}
                      className="px-4 py-2.5 rounded-xl bg-[#71b9ff]/15 hover:bg-[#71b9ff]/25 border border-[#71b9ff]/45 hover:border-[#71b9ff]/80 text-[#71b9ff] hover:text-white text-xs font-mono font-semibold transition cursor-pointer flex items-center gap-2 shadow-[0_0_18px_rgba(113,185,255,0.18)] active:scale-95 disabled:opacity-50"
                    >
                      {isGeneratingShare ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Generating Card...</span>
                        </>
                      ) : shareCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#71b9ff]" />
                          <span>Link & Card Ready ✓</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-[#71b9ff]" />
                          <span>Share Result Card ↗</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleClear(true)}
                      className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-white/20 text-[#8e9cb0] hover:text-white text-xs font-mono transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                      title="Clear search and scroll back to input bar"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Clear Search</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </main>

      {/* Bottom Footer Control */}
      <footer className="flex justify-between items-center gap-3 mt-12 pt-4 border-t border-white/[0.06] text-[#5d6c80] text-[11px] tracking-wider font-mono uppercase">
        <span>F(n) = F(n−1) + F(n−2)</span>
        <button
          type="button"
          onClick={() => setIsWhatsThisOpen((prev) => !prev)}
          aria-expanded={isWhatsThisOpen}
          aria-controls="whats-this-modal"
          className="border-0 bg-transparent text-[#8298b4] hover:text-[#71b9ff] cursor-pointer font-inherit tracking-inherit uppercase transition"
        >
          {isWhatsThisOpen ? 'Close What’s this? ×' : 'What’s this?'}
        </button>
      </footer>

      {/* Expandable Modal / Drawer for "What's This?" (Hidden by Default, Smoothly Revealed on Click) */}
      {isWhatsThisOpen && (
        <div
          id="whats-this-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="whats-this-heading"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-rise"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsWhatsThisOpen(false);
          }}
        >
          <div className="relative w-full max-w-[960px] max-h-[90vh] overflow-y-auto glass-panel-glow rounded-2xl sm:rounded-3xl p-6 sm:p-10 border border-[#71b9ff]/25 shadow-[0_28px_75px_rgba(0,0,0,0.92)]">
            {/* Close Button */}
            <div className="flex items-center justify-between pb-5 mb-7 border-b border-white/[0.08]">
              <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.28em] text-[#5caeff]">
                BEAUTY IN THE PATTERN
              </div>
              <button
                type="button"
                onClick={() => setIsWhatsThisOpen(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 text-xs font-mono text-[#b8c7dc] hover:text-white transition cursor-pointer"
                aria-label="Close What's This panel"
              >
                <span>Close</span>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Editorial Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.18fr] gap-10 lg:gap-14 items-start">
              {/* Left Column */}
              <div>
                <h2
                  id="whats-this-heading"
                  className="text-[30px] sm:text-[42px] font-semibold tracking-[-0.035em] leading-[1.12] text-white"
                >
                  Simple beginnings.
                  <br />
                  <span className="text-[#4da3ff]">Endless possibility.</span>
                </h2>

                <p className="text-[#7889a1] text-sm sm:text-[15px] leading-[1.75] mt-5 max-w-[380px]">
                  Start with zero and one. Add the last two numbers. Repeat. A universe of patterns emerges.
                </p>

                <div className="mt-7 font-serif italic text-2xl sm:text-[30px] text-[#5caeff] tracking-wide select-none">
                  F<sub className="text-sm not-italic font-mono">n</sub> = F
                  <sub className="text-sm not-italic font-mono">n−1</sub> + F
                  <sub className="text-sm not-italic font-mono">n−2</sub>
                </div>
              </div>

              {/* Right Column: 01, 02, 03 Breakdown */}
              <div className="flex flex-col">
                <div className="pb-6 border-b border-[#142238] flex items-start gap-6 sm:gap-8">
                  <span className="text-xs font-mono text-[#5caeff] pt-1 shrink-0">01</span>
                  <div>
                    <h3 className="text-base sm:text-[18px] font-medium text-white mb-2">
                      A number that means something.
                    </h3>
                    <p className="text-xs sm:text-[13.5px] text-[#7889a1] leading-relaxed">
                      A date, a lucky number, or a string of zeros. Enter any 1–8 digits; leading zeros stay exactly as they are.
                    </p>
                  </div>
                </div>

                <div className="py-6 border-b border-[#142238] flex items-start gap-6 sm:gap-8">
                  <span className="text-xs font-mono text-[#5caeff] pt-1 shrink-0">02</span>
                  <div>
                    <h3 className="text-base sm:text-[18px] font-medium text-white mb-2">
                      Find its very first appearance.
                    </h3>
                    <p className="text-xs sm:text-[13.5px] text-[#7889a1] leading-relaxed">
                      We check each Fibonacci term in order, starting at F₀ = 0. Your digits must appear together inside one term.
                    </p>
                  </div>
                </div>

                <div className="pt-6 pb-6 border-b border-[#142238] flex items-start gap-6 sm:gap-8">
                  <span className="text-xs font-mono text-[#5caeff] pt-1 shrink-0">03</span>
                  <div>
                    <h3 className="text-base sm:text-[18px] font-medium text-white mb-2">
                      See your place in the sequence.
                    </h3>
                    <p className="text-xs sm:text-[13.5px] text-[#7889a1] leading-relaxed">
                      Discover the term, the position inside it, and its place in the stream formed by joining every term. Digit positions start at 1.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* "What am I looking at?" Explanation Card */}
            <div className="mt-10 p-6 sm:p-7 rounded-2xl bg-[#050a14]/90 border border-[#192841] text-[#b4c3d8]">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-3.5">
                What am I looking at?
              </h3>
              <div className="space-y-3 text-xs sm:text-[14.5px] leading-relaxed text-[#9fb0c7]">
                <p>
                  The Fibonacci sequence starts{' '}
                  <code className="text-[#71b9ff] font-mono">0, 1, 1, 2, 3, 5, 8, 13…</code>. Each new term is the sum of the previous two.
                </p>
                <p>
                  This page checks each term in order and stops at the first term containing your digits consecutively. It then finds the first position of that exact string inside the term. For example, a position of 4 means the match begins at the fourth digit.
                </p>
                <p>
                  Term indices start at <code className="text-[#71b9ff] font-mono">F(0) = 0</code>; digit positions start at <code className="text-[#71b9ff] font-mono">1</code>. Leading zeroes in your search are preserved.
                </p>
              </div>
            </div>

            {/* Creator & LinkedIn Connection Inside "What's This?" */}
            <div className="mt-8 pt-5 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-4">
              <span className="text-xs text-[#6f829a] font-mono">
                Crafted with curiosity for the infinite Fibonacci sequence.
              </span>

              <a
                href="https://www.linkedin.com/in/manaschandra0710"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Connect with Manas Chandra on LinkedIn (opens in a new tab)"
                title="Manas Chandra on LinkedIn"
                className="group inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#0b1528]/90 hover:bg-[#71b9ff]/15 border border-[#71b9ff]/30 hover:border-[#71b9ff]/70 text-[#9ecbff] hover:text-white shadow-[0_0_16px_rgba(113,185,255,0.16)] hover:shadow-[0_0_24px_rgba(113,185,255,0.4)] transition-all duration-300 hover:-translate-y-0.5"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 fill-current text-[#71b9ff] group-hover:scale-110 transition-transform duration-200"
                  aria-hidden="true"
                >
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
                <span className="text-xs font-mono tracking-wide">LinkedIn</span>
              </a>
            </div>
          </div>
        </div>
      )}

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
