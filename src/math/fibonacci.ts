/**
 * Fibonacci Search & 3D Spatial Geometry Engine
 * Supports searching for any digit sequence from 1 to 8 digits long,
 * preserving leading zeros and searching ascending Fibonacci terms starting from F(0) = 0 and F(1) = 1.
 */

import {
  FibonacciMatchResult,
  FibonacciSearchEngine,
  buildStreamSnippet,
  MAX_SEARCH_TERMS,
} from './fibonacciSearch';

export type { FibonacciMatchResult };
export { FibonacciSearchEngine, MAX_SEARCH_TERMS, buildStreamSnippet };

export interface DigitRule {
  digit: number;
  color: string;
  hex: number;
  name: string;
}

export const DIGIT_RULES: DigitRule[] = [
  { digit: 0, color: '#e4b5cb', hex: 0xe4b5cb, name: 'Blush Pink' },
  { digit: 1, color: '#7d7575', hex: 0x7d7575, name: 'Muted Grey' },
  { digit: 2, color: '#ab9273', hex: 0xab9273, name: 'Warm Tan' },
  { digit: 3, color: '#a9c394', hex: 0xa9c394, name: 'Sage Green' },
  { digit: 4, color: '#e3286d', hex: 0xe3286d, name: 'Magenta' },
  { digit: 5, color: '#1a4480', hex: 0x1a4480, name: 'Dark Navy' },
  { digit: 6, color: '#f1b83e', hex: 0xf1b83e, name: 'Golden Amber' },
  { digit: 7, color: '#8d65a5', hex: 0x8d65a5, name: 'Purple' },
  { digit: 8, color: '#eb4f27', hex: 0xeb4f27, name: 'Red-Orange' },
  { digit: 9, color: '#6dc3b6', hex: 0x6dc3b6, name: 'Seafoam Teal' },
];

export const PHI = 1.618033988749895;

/**
 * Pre-generate the continuous digit stream of Fibonacci numbers for 3D orbs background:
 * 0 1 1 2 3 5 8 13 21 34 55 89 144 ...
 */
let cachedInitialStream = '';
export function getFibonacciDigitStream(minDigits: number = 2000): string {
  if (cachedInitialStream.length >= minDigits) return cachedInitialStream;

  let a = 0n;
  let b = 1n;
  let s = a.toString() + b.toString();

  while (s.length < minDigits) {
    const next = a + b;
    s += next.toString();
    a = b;
    b = next;
  }

  cachedInitialStream = s;
  return cachedInitialStream;
}

// Global search engine worker and fallback state
let workerInstance: Worker | null = null;
let fallbackEngine: FibonacciSearchEngine | null = null;
let currentSearchId = 0;
let workerFailed = false;
let activeRejectFn: ((err: Error) => void) | null = null;
let activeCleanupFn: (() => void) | null = null;

function getWorker(): Worker | null {
  if (workerFailed) return null;
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;

  if (!workerInstance) {
    try {
      workerInstance = new Worker(new URL('./search.worker.ts', import.meta.url), {
        type: 'module',
      });
    } catch {
      workerFailed = true;
      return null;
    }
  }
  return workerInstance;
}

export function cancelCurrentSearch() {
  currentSearchId++;
  if (activeCleanupFn) {
    activeCleanupFn();
    activeCleanupFn = null;
  }
  if (activeRejectFn) {
    const reject = activeRejectFn;
    activeRejectFn = null;
    reject(new Error('SEARCH_CANCELLED'));
  }
  const worker = getWorker();
  if (worker) {
    worker.postMessage({ type: 'reset' });
  }
}

/**
 * Searches sequential Fibonacci terms in ascending order starting with F(0) = 0 and F(1) = 1
 * for the first Fibonacci term containing the entered 1–8 digit decimal sequence.
 *
 * Runs asynchronously via dedicated Web Worker (with non-blocking main-thread fallback)
 * so large computations never freeze the browser or 3D animations.
 */
export function searchFibonacciTerm(
  query: string,
  onProgress?: (checkedCount: number) => void
): Promise<FibonacciMatchResult> {
  const clean = query.trim();
  if (!clean) {
    return Promise.reject(new Error('Please enter a sequence containing 1 to 8 decimal digits.'));
  }
  if (!/^\d{1,8}$/.test(clean)) {
    return Promise.reject(new Error('Sequence must contain only decimal digits (1–8 digits long).'));
  }

  if (activeCleanupFn) {
    activeCleanupFn();
    activeCleanupFn = null;
  }
  if (activeRejectFn) {
    const rejectPrev = activeRejectFn;
    activeRejectFn = null;
    rejectPrev(new Error('SEARCH_CANCELLED'));
  }

  const searchId = ++currentSearchId;
  const worker = getWorker();

  if (worker) {
    return new Promise((resolve, reject) => {
      activeRejectFn = reject;

      const handleMessage = (e: MessageEvent) => {
        const { type, id, result, message, checkedCount } = e.data;
        if (id !== searchId) return;

        if (type === 'progress') {
          onProgress?.(checkedCount);
        } else if (type === 'result') {
          cleanup();
          resolve(result);
        } else if (type === 'cancelled') {
          cleanup();
          reject(new Error('SEARCH_CANCELLED'));
        } else if (type === 'error') {
          cleanup();
          reject(new Error(message));
        }
      };

      const handleError = () => {
        cleanup();
        workerFailed = true;
        if (!fallbackEngine) fallbackEngine = new FibonacciSearchEngine();
        fallbackEngine
          .search(clean, {
            maxTerms: MAX_SEARCH_TERMS,
            onProgress,
            isCancelled: () => currentSearchId !== searchId,
          })
          .then(resolve)
          .catch(reject);
      };

      const cleanup = () => {
        if (activeCleanupFn === cleanup) activeCleanupFn = null;
        if (activeRejectFn === reject) activeRejectFn = null;
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
      };

      activeCleanupFn = cleanup;
      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
      worker.postMessage({ type: 'search', id: searchId, query: clean, maxTerms: MAX_SEARCH_TERMS });
    });
  }

  if (!fallbackEngine) {
    fallbackEngine = new FibonacciSearchEngine();
  }

  return fallbackEngine.search(clean, {
    maxTerms: MAX_SEARCH_TERMS,
    onProgress,
    isCancelled: () => currentSearchId !== searchId,
  });
}

export const MAX_SPIRAL_ORBS = 10000;

export interface SpiralGeometryData {
  positions: Float32Array;
  thetas: Float32Array;
  radii: Float32Array;
  count: number;
}

/**
 * Generates 3D coordinates, angles, and radii for the Golden Logarithmic Spiral supporting up to 10,000 orbs.
 * Preserves the exact original spiral structure, proportions, and spacing while scaling smoothly up to 10,000 digits.
 */
export function generateSpiralData(
  count: number = 1000,
  focusStartIdx: number = -1,
  focusLength: number = 0
): SpiralGeometryData {
  const safeCount = Math.max(1, Math.min(MAX_SPIRAL_ORBS, count));
  const positions = new Float32Array(safeCount * 3);
  const thetas = new Float32Array(safeCount);
  const radii = new Float32Array(safeCount);

  const scaleFactor = safeCount > 1000 ? Math.pow(safeCount / 1000, 0.36) : 1.0;
  const maxRadiusSpread = 23.0 * scaleFactor;
  const verticalSpan = 22.0 * scaleFactor;
  const dy = verticalSpan / Math.max(1, safeCount);

  const baseDist =
    safeCount <= 1000
      ? 1.42
      : Math.max(0.88, 1.42 / Math.pow(safeCount / 1000, 0.16));

  let theta = 0.0;
  const focusMargin = 10;
  const hasFocus = focusStartIdx >= 0 && focusLength > 0;

  for (let i = 0; i < safeCount; i++) {
    const progress = i / Math.max(1, safeCount - 1);
    const r = 2.4 + maxRadiusSpread * Math.pow(progress, 0.68);
    const y = (progress - 0.5) * verticalSpan;

    positions[i * 3] = Math.sin(theta) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.cos(theta) * r;

    thetas[i] = theta;
    radii[i] = r;

    // Generous spacing around the highlighted sequence inside the spiral so orbs and planetary rings never collide
    const inFocusZone =
      hasFocus &&
      i >= focusStartIdx - focusMargin &&
      i <= focusStartIdx + focusLength + focusMargin;
    const stepDist = inFocusZone ? Math.max(1.62, baseDist) : baseDist;

    const speed = Math.sqrt(r * r + dy * dy) || 1;
    theta += stepDist / speed;
  }

  return { positions, thetas, radii, count: safeCount };
}

export interface SpiralSequenceAllocation {
  digits: string;
  matchStartIdx: number;
  matchLength: number;
  termStartIdx: number;
  termEndIdx: number;
  windowOffsetInTerm: number;
}

/**
 * Builds the exact digit sequence (up to 10,000 digits) to display on the 3D Glass Orb Swirl
 * for a given search result, integrating the matched sequence naturally inside the spiral.
 */
export function buildSpiralSequenceAllocation(
  matchResult: FibonacciMatchResult | null,
  maxOrbs: number = MAX_SPIRAL_ORBS
): SpiralSequenceAllocation {
  const defaultStreamCount = 1000;
  if (!matchResult || !matchResult.query) {
    const stream = getFibonacciDigitStream(defaultStreamCount).slice(0, defaultStreamCount);
    return {
      digits: stream,
      matchStartIdx: -1,
      matchLength: 0,
      termStartIdx: 0,
      termEndIdx: stream.length,
      windowOffsetInTerm: 0,
    };
  }

  const term = matchResult.term;
  const matchPos0 = Math.max(0, matchResult.pos - 1);
  const matchLen = matchResult.query.length;

  // Case 1: The found Fibonacci term has >= 1,000 digits and <= maxOrbs (up to 10,000 digits)
  if (term.length >= 1000 && term.length <= maxOrbs) {
    return {
      digits: term,
      matchStartIdx: matchPos0,
      matchLength: matchLen,
      termStartIdx: 0,
      termEndIdx: term.length,
      windowOffsetInTerm: 0,
    };
  }

  // Case 2: The found Fibonacci term exceeds maxOrbs (> 10,000 digits)
  // Center a full 10,000-digit window around the matched sequence
  if (term.length > maxOrbs) {
    const halfWindow = Math.floor((maxOrbs - matchLen) / 2);
    const windowStart = Math.max(0, Math.min(term.length - maxOrbs, matchPos0 - halfWindow));
    const sliced = term.slice(windowStart, windowStart + maxOrbs);
    return {
      digits: sliced,
      matchStartIdx: matchPos0 - windowStart,
      matchLength: matchLen,
      termStartIdx: 0,
      termEndIdx: sliced.length,
      windowOffsetInTerm: windowStart,
    };
  }

  // Case 3: Terms with < 1,000 digits:
  // Embed the exact term inside the continuous Fibonacci stream positioned inside the spiral's mid-band
  // so the matched orbs sit naturally inside the spiral structure with spiral arms both inward and outward.
  const targetOrbs = 1000;
  const preferredMidIdx = 420;
  const streamMatch0 = Math.max(0, matchResult.streamPos - 1);
  const streamTermStart0 = Math.max(0, streamMatch0 - matchPos0);
  const neededStreamLen = Math.max(targetOrbs + 200, streamTermStart0 + term.length + targetOrbs);
  const fullStream = getFibonacciDigitStream(Math.min(60000, neededStreamLen));

  if (streamTermStart0 + term.length <= fullStream.length) {
    const windowStart = Math.max(
      0,
      Math.min(fullStream.length - targetOrbs, streamMatch0 - preferredMidIdx)
    );
    const digits = fullStream.slice(windowStart, windowStart + targetOrbs);
    let finalDigits = digits;
    let finalMatchStart = streamMatch0 - windowStart;

    // If the match happens very early in the stream (e.g., F(0)..F(15) where streamMatch0 < 120),
    // prepend the repeating initial Fibonacci stream prefix or shift into the middle of the spiral
    // so the matched orbs always appear inside the well-formed middle coils of the spiral rather than the outer/inner rim.
    if (finalMatchStart < 140) {
      const padCount = 260 - finalMatchStart;
      const prefixPad = fullStream.slice(0, padCount);
      finalDigits = (prefixPad + digits).slice(0, targetOrbs);
      finalMatchStart += padCount;
    }

    const termStartInWindow = Math.max(0, finalMatchStart - matchPos0);
    return {
      digits: finalDigits,
      matchStartIdx: finalMatchStart,
      matchLength: matchLen,
      termStartIdx: termStartInWindow,
      termEndIdx: Math.min(finalDigits.length, termStartInWindow + term.length),
      windowOffsetInTerm: 0,
    };
  }

  return {
    digits: term,
    matchStartIdx: matchPos0,
    matchLength: matchLen,
    termStartIdx: 0,
    termEndIdx: term.length,
    windowOffsetInTerm: 0,
  };
}
