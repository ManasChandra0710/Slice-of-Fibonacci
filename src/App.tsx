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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const PREVIEW_CONTEXT_DIGITS = 20;

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
  const [isFullTermExpanded, setIsFullTermExpanded] = useState(false);
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
  const focusTimeoutRef = useRef<number | null>(null);

  // Track active search request ID to prevent stale/duplicate results
  const activeSearchReqRef = useRef(0);
  const pendingScrollToSwirlRef = useRef(false);

  // Attempt to start background music automatically on load (Playing by default)
  useEffect(() => {
    soundEngine.playInterstellar(false).catch(() => {});
    return () => {
      if (focusTimeoutRef.current !== null) {
        window.clearTimeout(focusTimeoutRef.current);
      }
    };
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
    if (focusTimeoutRef.current !== null) {
      window.clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
    cancelCurrentSearch();
    setIsSearching(false);
    setInputValue('');
    setPreviewQuery('');
    setMatchResult(null);
    setIsFullTermExpanded(false);
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
      focusTimeoutRef.current = window.setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true });
        focusTimeoutRef.current = null;
      }, 300);
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
    if (focusTimeoutRef.current !== null) {
      window.clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }

    setInputValue(clean);
    setIsSearching(true);
    setIsFullTermExpanded(false);
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
      setIsFullTermExpanded(false);
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
        setIsFullTermExpanded(false);
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

  // Compact sequence preview data + lazy-chunked full term data
  const sequencePreviewData = useMemo(() => {
    if (!matchResult) return null;
    const hasOmittedBefore = matchResult.before.length > PREVIEW_CONTEXT_DIGITS;
    const hasOmittedAfter = matchResult.after.length > PREVIEW_CONTEXT_DIGITS;
    const previewBefore = hasOmittedBefore
      ? matchResult.before.slice(-PREVIEW_CONTEXT_DIGITS)
      : matchResult.before;
    const previewAfter = hasOmittedAfter
      ? matchResult.after.slice(0, PREVIEW_CONTEXT_DIGITS)
      : matchResult.after;

    return {
      hasOmittedBefore,
      hasOmittedAfter,
      previewBefore,
      previewAfter,
    };
  }, [matchResult]);

  const beforeChunks = useMemo(
    () =>
      matchResult && isFullTermExpanded
        ? splitIntoReadableChunks(matchResult.before, 400)
        : [],
    [matchResult, isFullTermExpanded]
  );

  const afterChunks = useMemo(
    () =>
      matchResult && isFullTermExpanded
        ? splitIntoReadableChunks(matchResult.after, 400)
        : [],
    [matchResult, isFullTermExpanded]
  );

  const showResultSection = isSearching || Boolean(matchResult) || Boolean(searchError);
  const isSearchBarActive = isInputFocused || inputValue.length > 0;
  const showClearHelper = Boolean(inputValue) || Boolean(matchResult) || Boolean(searchError);

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-8 pt-6 sm:pt-8 pb-16 text-[var(--text-primary)] min-h-screen flex flex-col justify-between">
      {/* Floating Glass Navigation Header */}
      <header className="glass-panel rounded-2xl px-5 py-3.5 flex justify-between items-center text-xs tracking-wide">
        <button
          type="button"
          onClick={() => handleClear(true)}
          className="flex items-center gap-3 font-semibold text-sm sm:text-base tracking-tight cursor-pointer text-left focus:outline-none group"
          title="Return to Slice of Fibonacci Homepage (/)"
        >
          <span className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-[#030711] border border-[#4da3ff]/40 shadow-[0_0_18px_rgba(77,163,255,0.28)] group-hover:border-[#6cb6ff]/85 group-hover:shadow-[0_0_24px_rgba(77,163,255,0.48)] transition-all duration-300 overflow-hidden shrink-0">
            <img
              src="/logo.png"
              alt="Slice of Fibonacci Logo"
              className="w-full h-full object-cover"
            />
          </span>
          <span className="text-[#f4f7fb] font-medium tracking-tight text-[15px] sm:text-[16px] group-hover:text-[#b8dcff] transition">
            Slice of Fibonacci
          </span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Instant-Response Interstellar Music Control */}
          <div
            data-music-toggle="true"
            className="flex items-center gap-2 p-1.5 pl-2.5 pr-2 rounded-xl bg-[#070d19]/90 hover:bg-[#0b1528] border border-[#4da3ff]/18 hover:border-[#4da3ff]/45 transition duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.45)]"
          >
            <button
              type="button"
              onClick={handleToggleSound}
              className="flex items-center gap-2 text-left cursor-pointer group"
              title={isPlaying ? 'Pause Interstellar Soundtrack' : 'Play Interstellar Soundtrack'}
            >
              <div className="w-4 h-4 flex items-end justify-center gap-[2.5px] shrink-0">
                {isPlaying ? (
                  <>
                    <span className="w-[2.5px] bg-[#4da3ff] rounded-full animate-eq-1 shadow-[0_0_6px_rgba(77,163,255,0.85)]" />
                    <span className="w-[2.5px] bg-[#6cb6ff] rounded-full animate-eq-2 shadow-[0_0_6px_rgba(108,182,255,0.85)]" />
                    <span className="w-[2.5px] bg-[#b8dcff] rounded-full animate-eq-3 shadow-[0_0_6px_rgba(184,220,255,0.85)]" />
                  </>
                ) : (
                  <Music className="w-3.5 h-3.5 text-[#5c6c82] group-hover:text-[#8594a8] transition" />
                )}
              </div>

              <div className="flex flex-col leading-none pr-1 select-none">
                <span
                  className={`text-[9px] font-mono tracking-wider uppercase ${
                    isPlaying ? 'text-[#6cb6ff]' : 'text-[#5c6c82]'
                  }`}
                >
                  {isPlaying ? 'Now Playing' : 'Paused'}
                </span>
                <span className="text-[11px] font-medium text-[#f4f7fb]/90 group-hover:text-[#f4f7fb] transition">
                  Interstellar
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleToggleSound}
              title={isPlaying ? 'Pause Interstellar Music' : 'Play Interstellar Music'}
              aria-label={isPlaying ? 'Pause Interstellar Music' : 'Play Interstellar Music'}
              className="p-1 rounded-lg bg-[#0d192e] hover:bg-[#152847] text-[#8594a8] hover:text-[#6cb6ff] transition cursor-pointer"
            >
              {isPlaying ? (
                <Volume2 className="w-3.5 h-3.5 text-[#6cb6ff]" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-[#5c6c82]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Futuristic Glass Hero Console */}
        <section className="max-w-[760px] mx-auto mt-10 sm:mt-14 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#4da3ff]/10 border border-[#4da3ff]/28 text-[#6cb6ff] text-[10px] sm:text-[11px] font-mono tracking-[0.16em] uppercase mb-5 shadow-[0_0_20px_rgba(77,163,255,0.14)]">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>A LITTLE CURIOSITY. AN INFINITE SEQUENCE.</span>
          </div>

          <h1 className="font-semibold text-[34px] sm:text-[52px] md:text-[62px] tracking-[-0.05em] leading-[1.08] mx-auto mb-5 text-[#f4f7fb]">
            Your number is hiding inside{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4da3ff] via-[#6cb6ff] to-[#b8dcff]">
              Fibonacci.
            </span>
          </h1>

          <p className="max-w-[560px] mx-auto text-[#8594a8] text-sm sm:text-[16px] leading-relaxed">
            Every number has a story.
            <br />
            Find where yours begins in the Fibonacci sequence.
          </p>

          {/* Constant-Width Search Bar (1 to 8 digits, leading zeros preserved) */}
          <div ref={searchBarRef} className="w-full max-w-[640px] mx-auto mt-8">
            <form
              onSubmit={handleSubmit}
              className={`rounded-2xl bg-[#060c18]/95 p-2 sm:p-2.5 flex items-center gap-3 w-full transition-all duration-300 border ${
                isSearchBarActive
                  ? 'border-[#4da3ff]/85 shadow-[0_0_32px_rgba(77,163,255,0.22),inset_0_0_14px_rgba(77,163,255,0.07)]'
                  : 'border-[#14233a] shadow-[0_14px_38px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(184,220,255,0.05)] hover:border-[#243d63]'
              }`}
            >
              <div className="pl-2.5 sm:pl-3.5 flex items-center justify-center shrink-0 pointer-events-none">
                <Search
                  className={`w-5 h-5 transition-colors duration-200 ${
                    isSearchBarActive ? 'text-[#6cb6ff]' : 'text-[#5c6c82]'
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
                className="flex-1 min-w-0 bg-transparent text-[#f4f7fb] border-0 outline-none py-2.5 text-lg sm:text-[21px] tracking-[0.14em] font-mono font-bold placeholder:text-[#5c6c82] placeholder:tracking-normal placeholder:font-sans placeholder:font-normal placeholder:text-base sm:placeholder:text-[18px]"
                required
              />

              <button
                type="submit"
                className="w-[154px] sm:w-[172px] shrink-0 py-3 sm:py-3.5 px-4 rounded-xl bg-[#6cb6ff] hover:bg-[#84c4ff] active:bg-[#52a3f7] text-[#02060f] font-semibold text-xs sm:text-[14px] tracking-tight cursor-pointer whitespace-nowrap shadow-[0_0_22px_rgba(108,182,255,0.34)] transition duration-200 flex items-center justify-center gap-1.5"
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
              <span className="text-[#5c6c82] tracking-wide">
                1–8 digits. Even the zeros count.
              </span>

              <button
                type="button"
                onClick={() => handleClear(false)}
                tabIndex={showClearHelper ? 0 : -1}
                className={`inline-flex items-center gap-1.5 text-[#8594a8] hover:text-[#f4f7fb] font-medium transition cursor-pointer ${
                  showClearHelper ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                aria-label="Clear search"
              >
                <span>Clear search</span>
                <X className="w-3.5 h-3.5 text-[#6cb6ff]" />
              </button>
            </div>
          </div>
        </section>

        {/* 3D Glass Spiral Viewport Section */}
        <section
          ref={swirlSectionRef}
          className="scale-visual-container"
          aria-label="3D Fibonacci Golden Ratio Tornado showing illuminated glass orbs"
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
              <div className="mb-5 rounded-xl bg-[#050b17]/95 border border-[#4da3ff]/30 overflow-hidden shadow-[0_0_20px_rgba(77,163,255,0.12)]">
                <div className="h-1 w-full bg-[#091428] overflow-hidden relative">
                  <div className="h-full w-full bg-gradient-to-r from-transparent via-[#4da3ff] to-[#b8dcff] animate-pulse" />
                </div>
                <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2 text-[#b8dcff]">
                    <span className="w-3.5 h-3.5 border-2 border-[#4da3ff]/30 border-t-[#6cb6ff] rounded-full animate-spin shrink-0" />
                    <span>
                      Searching ascending Fibonacci terms for{' '}
                      <strong className="text-[#f4f7fb]">"{previewQuery}"</strong>…
                    </span>
                  </div>
                  <span className="text-[#6cb6ff] text-[11px]">
                    {searchProgress !== null && searchProgress > 0
                      ? `Scanned F(0) – F(${searchProgress.toLocaleString('en-US')})`
                      : 'Scanning initial terms…'}
                  </span>
                </div>
              </div>
            )}

            {/* Header Row */}
            <div className="flex justify-between items-center gap-3 pb-4 mb-5 border-b border-[#4da3ff]/14">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4da3ff] shadow-[0_0_12px_#4da3ff]" />
                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#f4f7fb]">
                  Your digits,{' '}
                  <span className="text-[#4da3ff]">discovered.</span>
                </h2>
              </div>
            </div>

            {/* Honest Error / Limit Message Display */}
            {searchError && !isSearching && (
              <div className="p-4 sm:p-5 rounded-xl bg-[#0b1324]/95 border border-[#4da3ff]/35 text-[#d8e6f8] mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#6cb6ff] shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm leading-relaxed font-mono">
                    {searchError}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleClear(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#4da3ff]/12 hover:bg-[#4da3ff]/22 border border-[#4da3ff]/30 text-xs font-mono text-[#f4f7fb] shrink-0 flex items-center gap-1.5 cursor-pointer transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Search</span>
                </button>
              </div>
            )}

            {matchResult && (
              <>
                {/* Sequence Orbs Visual Trail */}
                <div className="mb-6 p-4 rounded-xl bg-[#040914]/90 border border-[#4da3ff]/14 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#5c6c82] mb-1">
                      YOUR NUMBER
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-mono tracking-wider text-[#b8dcff]">
                      {matchResult.query}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 p-2.5 rounded-xl bg-[#02050c]/80 border border-[#4da3ff]/14">
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
                          <span className="font-mono text-xs font-bold text-[#f4f7fb]">{d}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4-Column Glass Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.15fr_1.15fr_1.55fr_1.05fr] gap-3.5 mb-5">
                  <div className="p-4 rounded-xl bg-[#050b16]/85 border border-[#4da3ff]/14 min-w-0 overflow-hidden">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#5c6c82]">
                      FIBONACCI TERM
                    </div>
                    <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono text-[#b8dcff] mt-1 whitespace-nowrap">
                      F({matchResult.n.toLocaleString('en-US')})
                    </div>
                    <div className="text-[11px] text-[#68788e] mt-1">
                      Index starts at F₀ = 0
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#050b16]/85 border border-[#4da3ff]/14 min-w-0 overflow-hidden">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#5c6c82]">
                      POSITION IN TERM
                    </div>
                    <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono text-[#b8dcff] mt-1 whitespace-nowrap">
                      {matchResult.pos.toLocaleString('en-US')}
                    </div>
                    <div className="text-[11px] text-[#68788e] mt-1">
                      1-based digit index
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#050b16]/85 border border-[#4da3ff]/14 min-w-0 overflow-hidden">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#5c6c82]">
                      STREAM POSITION
                    </div>
                    <div className="text-lg sm:text-xl md:text-[22px] font-bold font-mono text-[#b8dcff] mt-1 whitespace-nowrap tracking-tight">
                      {matchResult.streamPos.toLocaleString('en-US')}
                    </div>
                    <div className="text-[11px] text-[#68788e] mt-1">
                      in 0112358... sequence
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#050b16]/85 border border-[#4da3ff]/14 min-w-0 overflow-hidden">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#5c6c82]">
                      TERM LENGTH
                    </div>
                    <div className="text-lg sm:text-xl md:text-2xl font-bold font-mono text-[#b8dcff] mt-1 whitespace-nowrap">
                      {matchResult.termLength.toLocaleString('en-US')}
                    </div>
                    <div className="text-[11px] text-[#68788e] mt-1">
                      Total decimal digits
                    </div>
                  </div>
                </div>

                {/* Smart Sequence Preview & Expandable Complete Term Display */}
                <div className="p-5 sm:p-6 bg-[#030710] border border-[#4da3ff]/20 rounded-xl mb-5 shadow-inner max-w-full overflow-hidden transition-all duration-300">
                  <div className="flex flex-wrap justify-between items-center gap-2 text-[11px] uppercase font-mono tracking-wider text-[#5c6c82] mb-3.5 pb-2.5 border-b border-[#4da3ff]/12">
                    <span className="flex items-center gap-1.5 text-[#6cb6ff] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4da3ff] shadow-[0_0_8px_#4da3ff]" />
                      {isFullTermExpanded
                        ? `Complete Term F(${matchResult.n.toLocaleString('en-US')})`
                        : `Sequence Preview in F(${matchResult.n.toLocaleString('en-US')})`}
                    </span>
                    <span className="text-[#8594a8]">
                      {matchResult.termLength.toLocaleString('en-US')}{' '}
                      {matchResult.termLength === 1 ? 'Digit' : 'Digits'}
                    </span>
                  </div>

                  {!isFullTermExpanded && sequencePreviewData ? (
                    <div className="font-mono tabular-nums text-sm sm:text-[16px] leading-[1.9] tracking-[0.06em] break-all text-[#8594a8] select-text whitespace-normal max-w-full py-1">
                      {sequencePreviewData.hasOmittedBefore && (
                        <span className="text-[#5c6c82] select-none mr-1.5">… </span>
                      )}
                      {sequencePreviewData.previewBefore && (
                        <span>{sequencePreviewData.previewBefore} </span>
                      )}
                      <mark className="bg-[#12315c] text-[#f4f7fb] border border-[#4da3ff] rounded-md px-2.5 py-0.5 mx-1 font-bold shadow-[0_0_16px_rgba(77,163,255,0.5)]">
                        {matchResult.match}
                      </mark>
                      {sequencePreviewData.previewAfter && (
                        <span> {sequencePreviewData.previewAfter}</span>
                      )}
                      {sequencePreviewData.hasOmittedAfter && (
                        <span className="text-[#5c6c82] select-none ml-1.5"> …</span>
                      )}
                    </div>
                  ) : (
                    <div className="font-mono tabular-nums text-sm sm:text-[15px] leading-[1.88] tracking-[0.055em] break-all text-[#8594a8] select-text whitespace-normal max-w-full animate-rise">
                      {beforeChunks.map((chunk, i) => (
                        <span key={`b-${i}`}>{chunk}</span>
                      ))}
                      <mark className="bg-[#12315c] text-[#f4f7fb] border border-[#4da3ff] rounded-md px-2 py-0.5 mx-1 font-bold shadow-[0_0_16px_rgba(77,163,255,0.5)]">
                        {matchResult.match}
                      </mark>
                      {afterChunks.map((chunk, i) => (
                        <span key={`a-${i}`}>{chunk}</span>
                      ))}
                    </div>
                  )}

                  {/* "View Complete Term" / "Show Less" Control */}
                  <div className="mt-4 pt-3 border-t border-[#4da3ff]/12 flex items-center justify-between flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setIsFullTermExpanded((prev) => !prev)}
                      aria-expanded={isFullTermExpanded}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#4da3ff]/12 hover:bg-[#4da3ff]/22 border border-[#4da3ff]/38 hover:border-[#6cb6ff]/80 text-[#6cb6ff] hover:text-[#f4f7fb] text-xs font-mono font-medium transition-all duration-200 cursor-pointer shadow-[0_0_14px_rgba(77,163,255,0.15)] hover:shadow-[0_0_20px_rgba(77,163,255,0.32)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4da3ff]"
                    >
                      {isFullTermExpanded ? (
                        <>
                          <span>Show Less</span>
                          <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <span>View Complete Term</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>

                    {!isFullTermExpanded &&
                      sequencePreviewData &&
                      (sequencePreviewData.hasOmittedBefore ||
                        sequencePreviewData.hasOmittedAfter) && (
                        <span className="text-[11px] font-mono text-[#5c6c82]">
                          Showing surrounding context ·{' '}
                          {matchResult.termLength.toLocaleString('en-US')} total digits in F(
                          {matchResult.n.toLocaleString('en-US')})
                        </span>
                      )}
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex flex-wrap justify-between items-center gap-3 pt-1">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleShare}
                      disabled={isGeneratingShare}
                      className="px-4 py-2.5 rounded-xl bg-[#4da3ff]/15 hover:bg-[#4da3ff]/25 border border-[#4da3ff]/45 hover:border-[#6cb6ff]/85 text-[#6cb6ff] hover:text-[#f4f7fb] text-xs font-mono font-semibold transition cursor-pointer flex items-center gap-2 shadow-[0_0_18px_rgba(77,163,255,0.18)] active:scale-95 disabled:opacity-50"
                    >
                      {isGeneratingShare ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Generating Card...</span>
                        </>
                      ) : shareCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#6cb6ff]" />
                          <span>Link & Card Ready ✓</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-[#6cb6ff]" />
                          <span>Share Result Card ↗</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleClear(true)}
                      className="px-3.5 py-2.5 rounded-xl bg-[#070d19] hover:bg-[#0c162b] border border-[#4da3ff]/18 hover:border-[#4da3ff]/40 text-[#8594a8] hover:text-[#f4f7fb] text-xs font-mono transition cursor-pointer flex items-center gap-1.5 active:scale-95"
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

      {/* Minimal Text-Only Bottom Header (Footer) Control */}
      <footer className="flex flex-wrap justify-between items-center gap-4 mt-12 pt-5 border-t border-[#4da3ff]/15 text-xs tracking-[0.14em] font-mono uppercase">
        <span className="text-[#8594a8] font-medium drop-shadow-[0_0_8px_rgba(77,163,255,0.2)]">
          F(n) = F(n−1) + F(n−2)
        </span>

        <button
          type="button"
          onClick={() => setIsWhatsThisOpen((prev) => !prev)}
          aria-expanded={isWhatsThisOpen}
          aria-controls="whats-this-modal"
          className="p-0 border-0 bg-transparent text-[#6cb6ff] hover:text-[#f4f7fb] cursor-pointer font-mono font-medium text-xs tracking-[0.14em] uppercase transition-all duration-200 underline-offset-4 hover:underline hover:drop-shadow-[0_0_10px_rgba(108,182,255,0.55)] focus-visible:outline-none focus-visible:text-[#f4f7fb] focus-visible:underline"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#010308]/85 backdrop-blur-md animate-rise"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsWhatsThisOpen(false);
          }}
        >
          <div className="relative w-full max-w-[960px] max-h-[90vh] overflow-y-auto glass-panel-glow rounded-2xl sm:rounded-3xl p-6 sm:p-10 border border-[#4da3ff]/25 shadow-[0_28px_75px_rgba(0,0,0,0.94)]">
            {/* Close Button */}
            <div className="flex items-center justify-between pb-5 mb-7 border-b border-[#4da3ff]/14">
              <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.28em] text-[#5ba8ff]">
                BEAUTY IN THE PATTERN
              </div>
              <button
                type="button"
                onClick={() => setIsWhatsThisOpen(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#070d19] hover:bg-[#0d182e] border border-[#4da3ff]/20 text-xs font-mono text-[#b8dcff] hover:text-[#f4f7fb] transition cursor-pointer"
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
                  className="text-[30px] sm:text-[42px] font-semibold tracking-[-0.035em] leading-[1.12] text-[#f4f7fb]"
                >
                  Simple beginnings.
                  <br />
                  <span className="text-[#4da3ff]">Endless possibility.</span>
                </h2>

                <p className="text-[#8594a8] text-sm sm:text-[15px] leading-[1.75] mt-5 max-w-[380px]">
                  Start with zero and one. Add the last two numbers. Repeat. A universe of patterns emerges.
                </p>

                <div className="mt-7 font-serif italic text-2xl sm:text-[30px] text-[#5ba8ff] tracking-wide select-none">
                  F<sub className="text-sm not-italic font-mono">n</sub> = F
                  <sub className="text-sm not-italic font-mono">n−1</sub> + F
                  <sub className="text-sm not-italic font-mono">n−2</sub>
                </div>
              </div>

              {/* Right Column: 01, 02, 03 Breakdown */}
              <div className="flex flex-col">
                <div className="pb-6 border-b border-[#122038] flex items-start gap-6 sm:gap-8">
                  <span className="text-xs font-mono text-[#5ba8ff] pt-1 shrink-0">01</span>
                  <div>
                    <h3 className="text-base sm:text-[18px] font-medium text-[#f4f7fb] mb-2">
                      A number that means something.
                    </h3>
                    <p className="text-xs sm:text-[13.5px] text-[#8594a8] leading-relaxed">
                      A date, a lucky number, or a string of zeros. Enter any 1–8 digits; leading zeros stay exactly as they are.
                    </p>
                  </div>
                </div>

                <div className="py-6 border-b border-[#122038] flex items-start gap-6 sm:gap-8">
                  <span className="text-xs font-mono text-[#5ba8ff] pt-1 shrink-0">02</span>
                  <div>
                    <h3 className="text-base sm:text-[18px] font-medium text-[#f4f7fb] mb-2">
                      Find its very first appearance.
                    </h3>
                    <p className="text-xs sm:text-[13.5px] text-[#8594a8] leading-relaxed">
                      We check each Fibonacci term in order, starting at F₀ = 0. Your digits must appear together inside one term.
                    </p>
                  </div>
                </div>

                <div className="pt-6 pb-6 border-b border-[#122038] flex items-start gap-6 sm:gap-8">
                  <span className="text-xs font-mono text-[#5ba8ff] pt-1 shrink-0">03</span>
                  <div>
                    <h3 className="text-base sm:text-[18px] font-medium text-[#f4f7fb] mb-2">
                      See your place in the sequence.
                    </h3>
                    <p className="text-xs sm:text-[13.5px] text-[#8594a8] leading-relaxed">
                      Discover the term, the position inside it, and its place in the stream formed by joining every term. Digit positions start at 1.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* "What am I looking at?" Explanation Card */}
            <div className="mt-10 p-6 sm:p-7 rounded-2xl bg-[#040914]/95 border border-[#142540] text-[#b8dcff]">
              <h3 className="text-lg sm:text-xl font-bold text-[#f4f7fb] mb-3.5">
                What am I looking at?
              </h3>
              <div className="space-y-3 text-xs sm:text-[14.5px] leading-relaxed text-[#8594a8]">
                <p>
                  The Fibonacci sequence starts{' '}
                  <code className="text-[#6cb6ff] font-mono">0, 1, 1, 2, 3, 5, 8, 13…</code>. Each new term is the sum of the previous two.
                </p>
                <p>
                  This page checks each term in order and stops at the first term containing your digits consecutively. It then finds the first position of that exact string inside the term. For example, a position of 4 means the match begins at the fourth digit.
                </p>
                <p>
                  Term indices start at <code className="text-[#6cb6ff] font-mono">F(0) = 0</code>; digit positions start at <code className="text-[#6cb6ff] font-mono">1</code>. Leading zeroes in your search are preserved.
                </p>
              </div>
            </div>

            {/* Creator & LinkedIn Connection Inside "What's This?" */}
            <div className="mt-8 pt-5 border-t border-[#4da3ff]/12 flex items-center justify-between flex-wrap gap-4">
              <span className="text-xs text-[#5c6c82] font-mono">
                Crafted with curiosity for the infinite Fibonacci sequence.
              </span>

              <a
                href="https://www.linkedin.com/in/manaschandra0710"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Connect with Manas Chandra on LinkedIn (opens in a new tab)"
                title="Manas Chandra on LinkedIn"
                className="group inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#070f20]/95 hover:bg-[#4da3ff]/15 border border-[#4da3ff]/30 hover:border-[#6cb6ff]/75 text-[#b8dcff] hover:text-[#f4f7fb] shadow-[0_0_16px_rgba(77,163,255,0.16)] hover:shadow-[0_0_24px_rgba(77,163,255,0.4)] transition-all duration-300 hover:-translate-y-0.5"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 fill-current text-[#4da3ff] group-hover:scale-110 transition-transform duration-200"
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
