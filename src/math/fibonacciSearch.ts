/**
 * Core Arbitrary-Precision Fibonacci Search Engine
 * Supports searching any digit sequence from 1 to 8 digits.
 * Preserves leading zeros as strings and uses exact decimal representation.
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

export const MAX_SEARCH_TERMS = 80000;
export const MAX_CACHE_TERMS = 25000;

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
  // In-memory cache for fast lookups
  private termsCache: string[] = [];
  private totalDigitsBeforeCache: number[] = [];

  // Checkpoints for resuming higher term computations (every 1000 terms past MAX_CACHE_TERMS)
  private checkpoints: Array<{ n: number; a: bigint; b: bigint; totalDigitsBefore: number }> = [];

  // Current generator state
  private highestN = -1;
  private highestA = 0n;
  private highestB = 1n;
  private highestTotalDigits = 0;

  constructor() {
    this.initBase();
  }

  private initBase() {
    if (this.termsCache.length === 0) {
      // F(0) = 0
      this.termsCache.push('0');
      this.totalDigitsBeforeCache.push(0);
      this.highestN = 0;
      this.highestA = 1n; // F(1)
      this.highestB = 1n; // F(2)
      this.highestTotalDigits = 1;
    }
  }

  public getCachedTerm(index: number): string | undefined {
    if (index >= 0 && index < this.termsCache.length) {
      return this.termsCache[index];
    }
    return undefined;
  }

  /**
   * Pre-generates terms up to count for instant lookup of common numbers.
   */
  public warmUp(targetCount: number = 2000) {
    let n = this.highestN + 1;
    let a = this.highestA;
    let b = this.highestB;
    let totalDigits = this.highestTotalDigits;

    while (n < targetCount && n < MAX_CACHE_TERMS) {
      const str = a.toString();
      this.termsCache[n] = str;
      this.totalDigitsBeforeCache[n] = totalDigits;
      totalDigits += str.length;

      const next = a + b;
      a = b;
      b = next;
      n++;
    }

    this.highestN = n - 1;
    this.highestA = a;
    this.highestB = b;
    this.highestTotalDigits = totalDigits;
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
    const yieldMs = options?.yieldIntervalMs ?? 16;

    // Helper for context snippets
    const getTermForSnippet = (idx: number): string | undefined => {
      if (idx >= 0 && idx < this.termsCache.length) {
        return this.termsCache[idx];
      }
      return undefined;
    };

    // 1. Check existing cached terms first (ascending order starting from F(0))
    for (let i = 0; i < this.termsCache.length && i <= maxTerms; i++) {
      if (options?.isCancelled?.()) {
        throw new Error('SEARCH_CANCELLED');
      }

      const str = this.termsCache[i];
      const pos = str.indexOf(clean);
      if (pos !== -1) {
        return this.createMatchResult(
          clean,
          i,
          pos,
          str,
          this.totalDigitsBeforeCache[i],
          getTermForSnippet
        );
      }
    }

    // 2. Resume generation from highest reached term
    let a = this.highestA;
    let b = this.highestB;
    let totalDigits = this.highestTotalDigits;
    let n = this.highestN + 1;

    let lastYieldTime = performance.now();
    let lastProgressTime = performance.now();

    while (n <= maxTerms) {
      if (options?.isCancelled?.()) {
        throw new Error('SEARCH_CANCELLED');
      }

      const str = a.toString();
      const termTotalDigits = totalDigits;

      // Cache term if within memory limit
      if (n < MAX_CACHE_TERMS) {
        this.termsCache[n] = str;
        this.totalDigitsBeforeCache[n] = termTotalDigits;
      } else if (n % 1000 === 0) {
        this.checkpoints.push({ n, a, b, totalDigitsBefore: termTotalDigits });
      }

      this.highestN = n;
      this.highestA = b;
      this.highestB = a + b;
      this.highestTotalDigits = termTotalDigits + str.length;

      // Check if sequence is contained within this term
      const pos = str.indexOf(clean);
      if (pos !== -1) {
        // Immediate stop on first occurrence
        const nextStr = b.toString();
        const prevStr = n > 0 ? (n - 1 < this.termsCache.length ? this.termsCache[n - 1] : (b - a).toString()) : undefined;

        const dynamicGetTerm = (idx: number): string | undefined => {
          if (idx === n - 1) return prevStr;
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

      totalDigits += str.length;
      const next = a + b;
      a = b;
      b = next;
      n++;

      // Asynchronous progress and time-slicing
      const now = performance.now();
      if (now - lastProgressTime >= 100) {
        options?.onProgress?.(n);
        lastProgressTime = now;
      }

      if (now - lastYieldTime >= yieldMs) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        lastYieldTime = performance.now();
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
