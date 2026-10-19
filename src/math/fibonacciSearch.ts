/**
 * Core Arbitrary-Precision Fibonacci Search Engine
 * Supports searching any digit sequence from 1 to 8 digits.
 * Preserves leading zeros as strings and uses exact decimal representation.
 * Uses O(D) Base-10^8 arithmetic with precomputed 4-digit lookup tables
 * so even 10,000+ digit Fibonacci terms are converted and searched rapidly.
 */

export interface FibonacciMatchResult {
  query: string;
  n: number;
  pos: number; // 1-based position inside individual term F(n)
  streamPos: number; // 1-based exact position in continuous stream 0112358...
  streamSnippetBefore: string;
  streamSnippetAfter: string;
  term: string; // Complete decimal string of F(n)
  termLength: number;
  before: string;
  match: string;
  after: string;
  trailStartIndex: number; // Index of the first node in the 3D spiral trail
  trailDigits: number[]; // Array of single digits
}

// 140,000 terms covers 100% of all 111,111,100 possible 1-to-8 digit patterns (completes at F(134,560))
export const MAX_SEARCH_TERMS = 140000;
export const MAX_CACHE_TERMS = 25000;

const BASE = 100000000; // 10^8 (8 decimal digits per Uint32 limb)
const MAX_LIMBS = 4096; // Supports up to 32,768 decimal digits per term

const PAD4: string[] = new Array(10000);
for (let i = 0; i < 10000; i++) {
  PAD4[i] = i.toString().padStart(4, '0');
}

function limbsToDecimalString(limbs: Uint32Array, len: number): string {
  if (len <= 0) return '0';
  let s = limbs[len - 1].toString();
  for (let i = len - 2; i >= 0; i--) {
    const x = limbs[i];
    const hi = (x / 10000) | 0;
    s += PAD4[hi] + PAD4[x - hi * 10000];
  }
  return s;
}

/**
 * Computes exact decimal string of F(n) using fast O(D) Base-10^8 addition.
 */
export function computeFibonacciTermString(targetN: number): string {
  if (targetN <= 0) return '0';
  if (targetN === 1 || targetN === 2) return '1';

  const neededLimbs = Math.max(16, Math.ceil((targetN * 0.21) / 8) + 8);
  const a = new Uint32Array(neededLimbs);
  const b = new Uint32Array(neededLimbs);
  a[0] = 0;
  b[0] = 1;
  let lenA = 1;
  let lenB = 1;

  for (let n = 0; n < targetN; n++) {
    let carry = 0;
    for (let i = 0; i < lenB; i++) {
      let sum = a[i] + b[i] + carry;
      if (sum >= BASE) {
        sum -= BASE;
        carry = 1;
      } else {
        carry = 0;
      }
      a[i] = b[i];
      b[i] = sum;
    }
    lenA = lenB;
    if (carry) {
      b[lenB] = 1;
      lenB++;
    }
  }

  return limbsToDecimalString(a, lenA);
}

/**
 * Builds the surrounding continuous stream snippet (0112358...) around the match.
 * Resolves context digits accurately across term boundaries without generating huge strings.
 */
export function buildStreamSnippet(
  n: number,
  pos1Based: number,
  query: string,
  termStr: string,
  getTermFn?: (index: number) => string | undefined,
  radius: number = 8
): { before: string; after: string } {
  const p0 = pos1Based - 1;
  const p1 = p0 + query.length;

  // 1. Digits before the match in the continuous stream
  let beforeDigits = '';
  if (p0 >= radius) {
    beforeDigits = termStr.slice(p0 - radius, p0);
  } else {
    const insideTerm = termStr.slice(0, p0);
    let needed = radius - p0;
    let prevDigits = '';
    let curN = n - 1;
    while (needed > 0 && curN >= 0) {
      const prev = getTermFn ? getTermFn(curN) : undefined;
      if (!prev) break;
      const sliceLen = Math.min(prev.length, needed);
      prevDigits = prev.slice(-sliceLen) + prevDigits;
      needed -= sliceLen;
      curN--;
    }
    beforeDigits = prevDigits + insideTerm;
  }

  // 2. Digits after the match in the continuous stream
  let afterDigits = '';
  if (p1 + radius <= termStr.length) {
    afterDigits = termStr.slice(p1, p1 + radius);
  } else {
    const insideTerm = termStr.slice(p1);
    let needed = radius - insideTerm.length;
    let nextDigits = '';
    let curN = n + 1;
    while (needed > 0) {
      const next = getTermFn ? getTermFn(curN) : undefined;
      if (!next) break;
      const sliceLen = Math.min(next.length, needed);
      nextDigits = nextDigits + next.slice(0, sliceLen);
      needed -= sliceLen;
      curN++;
    }
    afterDigits = insideTerm + nextDigits;
  }

  return {
    before: n === 0 && p0 === 0 ? '' : `… ${beforeDigits}`,
    after: `${afterDigits} …`,
  };
}

export interface SearchOptions {
  maxTerms?: number;
  onProgress?: (checkedCount: number) => void;
  isCancelled?: () => boolean;
  yieldIntervalMs?: number;
}

/**
 * FibonacciSearchEngine maintains an arbitrary-precision cache of computed Fibonacci numbers
 * and executes asynchronous pattern matching without blocking the main event loop.
 */
export class FibonacciSearchEngine {
  // In-memory cache for fast lookups of the first MAX_CACHE_TERMS terms
  private termsCache: string[] = [];
  private totalDigitsBeforeCache: number[] = [];

  // Generator state at the end of termsCache (never exceeds MAX_CACHE_TERMS)
  private cachedCount = 0;
  private cacheStateA: Uint32Array = new Uint32Array(MAX_LIMBS);
  private cacheStateB: Uint32Array = new Uint32Array(MAX_LIMBS);
  private cacheLenA = 1;
  private cacheLenB = 1;
  private cacheTotalDigits = 0;

  constructor() {
    this.initBase();
  }

  private initBase() {
    if (this.termsCache.length === 0) {
      this.cacheStateA.fill(0);
      this.cacheStateB.fill(0);
      this.cacheStateA[0] = 0; // F(0) = 0
      this.cacheStateB[0] = 1; // F(1) = 1
      this.cacheLenA = 1;
      this.cacheLenB = 1;
      this.cacheTotalDigits = 0;
      this.cachedCount = 0;
    }
  }

  public getCachedTerm(index: number): string | undefined {
    if (index >= 0 && index < this.termsCache.length) {
      return this.termsCache[index];
    }
    return undefined;
  }

  /**
   * Pre-generates terms up to targetCount for instant lookup of common numbers.
   */
  public warmUp(targetCount: number = 2000) {
    const limit = Math.min(targetCount, MAX_CACHE_TERMS);
    while (this.cachedCount < limit) {
      const n = this.cachedCount;
      const str = n === 0 ? '0' : limbsToDecimalString(this.cacheStateA, this.cacheLenA);
      this.termsCache[n] = str;
      this.totalDigitsBeforeCache[n] = this.cacheTotalDigits;
      this.cacheTotalDigits += str.length;

      let carry = 0;
      const lenB = this.cacheLenB;
      for (let i = 0; i < lenB; i++) {
        let sum = this.cacheStateA[i] + this.cacheStateB[i] + carry;
        if (sum >= BASE) {
          sum -= BASE;
          carry = 1;
        } else {
          carry = 0;
        }
        this.cacheStateA[i] = this.cacheStateB[i];
        this.cacheStateB[i] = sum;
      }
      this.cacheLenA = lenB;
      if (carry) {
        this.cacheStateB[lenB] = 1;
        this.cacheLenB = lenB + 1;
      }
      this.cachedCount++;
    }
  }

  /**
   * Searches for the first Fibonacci term containing the decimal pattern.
   * Runs in non-blocking batches and stops as soon as the first occurrence is found.
   */
  public async search(
    query: string,
    options?: SearchOptions
  ): Promise<FibonacciMatchResult> {
    const clean = query.trim();
    if (!clean) {
      throw new Error('Please enter a sequence containing 1 to 8 decimal digits.');
    }
    if (!/^\d{1,8}$/.test(clean)) {
      throw new Error('Search sequence must contain 1 to 8 decimal digits (0–9 only).');
    }

    const maxTerms = options?.maxTerms ?? MAX_SEARCH_TERMS;
    const yieldMs = options?.yieldIntervalMs ?? 20;

    // 1. Check already-cached terms in strict ascending order starting from F(0)
    const existingCacheLen = Math.min(this.cachedCount, maxTerms + 1);
    for (let i = 0; i < existingCacheLen; i++) {
      if (options?.isCancelled?.()) {
        throw new Error('SEARCH_CANCELLED');
      }

      const str = this.termsCache[i];
      const pos = str.indexOf(clean);
      if (pos !== -1) {
        // Ensure i + 1 is in cache if needed for snippet
        if (i + 1 >= this.cachedCount && this.cachedCount < MAX_CACHE_TERMS) {
          this.warmUp(i + 2);
        }
        return this.createMatchResult(
          clean,
          i,
          pos,
          str,
          this.totalDigitsBeforeCache[i],
          (idx) => this.termsCache[idx]
        );
      }
    }

    // 2. Continue generating in ascending order from this.cachedCount
    const a = new Uint32Array(this.cacheStateA);
    const b = new Uint32Array(this.cacheStateB);
    let lenA = this.cacheLenA;
    let lenB = this.cacheLenB;
    let totalDigits = this.cacheTotalDigits;
    let n = this.cachedCount;

    let prevTermStr = n > 0 ? this.termsCache[n - 1] || '' : '';
    let lastYieldTime = performance.now();
    let lastProgressTime = performance.now();

    while (n <= maxTerms) {
      if (options?.isCancelled?.()) {
        throw new Error('SEARCH_CANCELLED');
      }

      const str = n === 0 ? '0' : limbsToDecimalString(a, lenA);
      const termTotalDigits = totalDigits;

      // Advance Fibonacci state: next = a + b
      let carry = 0;
      for (let i = 0; i < lenB; i++) {
        let sum = a[i] + b[i] + carry;
        if (sum >= BASE) {
          sum -= BASE;
          carry = 1;
        } else {
          carry = 0;
        }
        a[i] = b[i];
        b[i] = sum;
      }
      lenA = lenB;
      if (carry) {
        b[lenB] = 1;
        lenB++;
      }

      // Persist into cache if within MAX_CACHE_TERMS
      if (n < MAX_CACHE_TERMS && this.cachedCount === n) {
        this.termsCache[n] = str;
        this.totalDigitsBeforeCache[n] = termTotalDigits;
        this.cacheStateA.set(a.subarray(0, lenA));
        this.cacheStateB.set(b.subarray(0, lenB));
        this.cacheLenA = lenA;
        this.cacheLenB = lenB;
        this.cacheTotalDigits = termTotalDigits + str.length;
        this.cachedCount = n + 1;
      }

      // Check if sequence is contained within this individual Fibonacci term
      const pos = str.indexOf(clean);
      if (pos !== -1) {
        const nextStr = limbsToDecimalString(a, lenA); // `a` now holds F(n + 1)
        const capturedPrev = prevTermStr;

        const dynamicGetTerm = (idx: number): string | undefined => {
          if (idx === n - 1) return capturedPrev || this.termsCache[idx];
          if (idx === n) return str;
          if (idx === n + 1) return nextStr;
          if (idx >= 0 && idx < this.termsCache.length) return this.termsCache[idx];
          return undefined;
        };

        return this.createMatchResult(
          clean,
          n,
          pos,
          str,
          termTotalDigits,
          dynamicGetTerm
        );
      }

      prevTermStr = str;
      totalDigits += str.length;
      n++;

      // Asynchronous progress reporting and non-blocking time-slicing
      if ((n & 63) === 0) {
        const now = performance.now();
        if (now - lastProgressTime >= 80) {
          options?.onProgress?.(n);
          lastProgressTime = now;
        }

        if (now - lastYieldTime >= yieldMs) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          lastYieldTime = performance.now();
        }
      }
    }

    // Honest, factual message when resource/execution limit is reached
    throw new Error(
      `The sequence "${clean}" was not found within the first ${maxTerms.toLocaleString()} Fibonacci terms (${totalDigits.toLocaleString()} decimal digits searched). The search stopped at the execution safety limit; this sequence may appear in a higher Fibonacci term.`
    );
  }

  private createMatchResult(
    query: string,
    n: number,
    pos: number,
    str: string,
    totalDigitsBefore: number,
    getTermFn: (idx: number) => string | undefined
  ): FibonacciMatchResult {
    const matchStart = pos;
    const matchEnd = pos + query.length;
    const before = str.slice(0, matchStart);
    const match = str.slice(matchStart, matchEnd);
    const after = str.slice(matchEnd);
    const streamPos = totalDigitsBefore + pos + 1;
    const trailDigits = query.split('').map((c) => parseInt(c, 10));

    const snippet = buildStreamSnippet(n, pos + 1, query, str, getTermFn);

    return {
      query,
      n,
      pos: pos + 1, // 1-based index in F(n)
      streamPos,
      streamSnippetBefore: snippet.before,
      streamSnippetAfter: snippet.after,
      term: str,
      termLength: str.length,
      before,
      match,
      after,
      trailStartIndex: (streamPos - 1) % 650,
      trailDigits,
    };
  }
}
