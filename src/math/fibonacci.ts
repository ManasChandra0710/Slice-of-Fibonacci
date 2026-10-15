/**
 * Fibonacci Search & 3D Spatial Geometry Engine
 * All orbs share a uniform sleek size, with distinct colors for digits 0-9.
 * Arc-length parameterized spacing ensures generous breathing room between every orb.
 */

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

export interface FibonacciMatchResult {
  query: string;
  n: number;
  pos: number; // 1-based position inside F(n)
  term: string; // Decimal string of F(n)
  termLength: number;
  before: string;
  match: string;
  after: string;
  trailStartIndex: number; // Index of the first node in the 3D spiral trail
  trailDigits: number[]; // Array of single digits
}

export const PHI = 1.618033988749895;

/**
 * Pre-generate the continuous digit stream of Fibonacci numbers
 */
let cachedStream = '';
export function getFibonacciDigitStream(minDigits: number = 2000): string {
  if (cachedStream.length >= minDigits) return cachedStream;

  let a = 0n;
  let b = 1n;
  let s = a.toString() + b.toString();

  while (s.length < minDigits) {
    const next = a + b;
    s += next.toString();
    a = b;
    b = next;
  }

  cachedStream = s;
  return cachedStream;
}

/**
 * Searches sequential Fibonacci terms starting from F(0) for the first term
 * containing the query string, running asynchronously in non-blocking batches.
 */
export function searchFibonacciTerm(
  query: string,
  onProgress?: (checkedCount: number) => void
): Promise<FibonacciMatchResult> {
  return new Promise((resolve, reject) => {
    const clean = query.trim();
    if (!clean) {
      reject(new Error('Please enter a number to search.'));
      return;
    }

    const stream = getFibonacciDigitStream(2000);
    let streamPos = stream.indexOf(clean);
    if (streamPos === -1) {
      streamPos = Math.abs(hashString(clean)) % 650;
    }

    let a = 0n;
    let b = 1n;
    let n = 0;
    const maxTerms = 8000;
    const batchSize = 120;

    function processBatch() {
      const stop = Math.min(n + batchSize, maxTerms);
      while (n < stop) {
        const str = a.toString();
        const pos = str.indexOf(clean);
        if (pos !== -1) {
          const matchStart = pos;
          const matchEnd = pos + clean.length;

          const contextRadius = 40;
          const dispStart = Math.max(0, matchStart - contextRadius);
          const dispEnd = Math.min(str.length, matchEnd + contextRadius);

          const before = str.slice(dispStart, matchStart);
          const match = str.slice(matchStart, matchEnd);
          const after = str.slice(matchEnd, dispEnd);

          const digits = clean.split('').map((c) => parseInt(c, 10));

          resolve({
            query: clean,
            n,
            pos: pos + 1, // 1-based index
            term: str,
            termLength: str.length,
            before: (dispStart > 0 ? '…' : '') + before,
            match,
            after: after + (dispEnd < str.length ? '…' : ''),
            trailStartIndex: streamPos,
            trailDigits: digits,
          });
          return;
        }

        const next = a + b;
        a = b;
        b = next;
        n++;
      }

      if (n >= maxTerms) {
        reject(
          new Error(
            `No match was found in the first ${maxTerms.toLocaleString()} Fibonacci terms. Try another number.`
          )
        );
        return;
      }

      if (onProgress) {
        onProgress(n);
      }

      setTimeout(processBatch, 0);
    }

    processBatch();
  });
}

function hashString(val: string): number {
  let h = 0;
  for (let i = 0; i < val.length; i++) {
    h = (h * 31 + val.charCodeAt(i)) % 9973;
  }
  return h;
}

/**
 * Generates 3D coordinates for the Golden Logarithmic Spiral with uniform, generous spacing.
 * Uses arc-length step parameterization so orbs are never condensed or overlapping.
 */
export function generateSpiralPositions(count: number = 750): Float32Array {
  const positions = new Float32Array(count * 3);
  let theta = 2.0; // Clean starting offset away from pole
  const targetDist = 1.35; // Generous breathing space between adjacent orbs

  for (let i = 0; i < count; i++) {
    const progress = i / count;
    // Logarithmic radius with smooth expansion
    const r = 2.4 * Math.exp(0.046 * theta);
    const y = (progress - 0.5) * 19;

    positions[i * 3] = Math.cos(theta) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(theta) * r;

    // Arc length step calculation: ds = sqrt(r^2 + (dr/dtheta)^2 + (dy/dtheta)^2) * dtheta
    const dr = 0.046 * r;
    const dy = 19 / count;
    const speed = Math.sqrt(r * r + dr * dr + dy * dy) || 1;
    const dTheta = targetDist / speed;

    theta += dTheta;
  }

  return positions;
}

export interface SequencePatternFact {
  id: string;
  category: 'search' | 'math' | 'history';
  title: string;
  tag: string;
  formula?: string;
  summary: string;
  detail: string;
  interactiveQuery?: string;
}

/**
 * Prime test for indices
 */
export function isPrimeIndex(n: number): boolean {
  if (n <= 1) return false;
  if (n <= 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

/**
 * Zeckendorf's theorem: Every positive integer can be uniquely represented
 * as the sum of one or more non-consecutive Fibonacci numbers.
 */
export function getZeckendorfDecomposition(val: number): number[] {
  if (val <= 0 || val > 500000) return [];
  const fibs: number[] = [1, 2];
  while (true) {
    const next = fibs[fibs.length - 1] + fibs[fibs.length - 2];
    if (next > val) break;
    fibs.push(next);
  }

  const result: number[] = [];
  let remaining = val;
  for (let i = fibs.length - 1; i >= 0; i--) {
    if (fibs[i] <= remaining) {
      result.push(fibs[i]);
      remaining -= fibs[i];
    }
  }
  return result;
}

/**
 * Returns divisibility rules and properties of F(n) based on index n
 */
export function getDivisibilityRules(n: number): string[] {
  const rules: string[] = [];
  if (n === 0) return ['F(0) = 0 is the starting base element.'];

  if (n % 3 === 0) {
    rules.push(`Since index ${n} is divisible by 3, F(${n}) is guaranteed to be an even number (divisible by 2).`);
  }
  if (n % 4 === 0) {
    rules.push(`Since index ${n} is a multiple of 4, F(${n}) is strictly divisible by 3.`);
  }
  if (n % 5 === 0) {
    rules.push(`Since index ${n} is a multiple of 5, F(${n}) ends with digit 5 or 0 (divisible by 5).`);
  }
  if (n % 6 === 0) {
    rules.push(`Since index ${n} is a multiple of 6, F(${n}) is divisible by 8.`);
  }

  if (isPrimeIndex(n)) {
    rules.push(`Index ${n} is a prime number. Under the Strong Divisibility Property, F(${n}) cannot share non-trivial Fibonacci factors with smaller terms.`);
  }

  return rules;
}

/**
 * Curated historical milestones of the Fibonacci sequence
 */
export const HISTORICAL_FACTS: SequencePatternFact[] = [
  {
    id: 'pingala',
    category: 'history',
    title: "Pingala's Chandaḥśāstra & Sanskrit Prosody",
    tag: 'c. 200 BCE · Ancient India',
    formula: 'M(n) = M(n-1) + M(n-2)',
    summary: 'The earliest known documentation of the sequence to enumerate poetic meters.',
    detail: 'Ancient Indian mathematician and grammarian Acharya Pingala studied short (laghu, 1 beat) and long (guru, 2 beats) poetic syllables. When determining how many distinct rhythmic patterns of duration n beats can be formed, the answer is precisely the Fibonacci sequence.',
    interactiveQuery: '13',
  },
  {
    id: 'virahanka-hemachandra',
    category: 'history',
    title: 'Virahānka & Hemachandra Formulation',
    tag: 'c. 700 & 1150 CE · Mathematical Poetry',
    formula: 'S_n = S_{n-1} + S_{n-2}',
    summary: 'Explicit recursive formula documented half a millennium before European texts.',
    detail: 'Virahānka (c. 700 CE) explicitly stated the algorithm for expanding meter counts. Later in 1150 CE, Jain polymath Acharya Hemachandra codified the recurrence rule in his treatises, demonstrating that the sequence had been rigorously developed in India centuries before the 13th century.',
    interactiveQuery: '55',
  },
  {
    id: 'liber-abaci',
    category: 'history',
    title: "Fibonacci's Liber Abaci & The Rabbit Riddle",
    tag: '1202 CE · Pisa, Italy',
    formula: '1, 1, 2, 3, 5, 8, 13, 21, 34, 55...',
    summary: 'Introduced Hindu-Arabic numerals (0–9) and the sequence to medieval Europe.',
    detail: "Leonardo of Pisa (later known as Fibonacci) published Liber Abaci (The Book of Calculation) to teach merchants decimal arithmetic. In Chapter 12, he posed a theoretical problem: 'How many pairs of rabbits can be produced from a single pair in a year?' yielding the famous sequence.",
    interactiveQuery: '1202',
  },
  {
    id: 'kepler-golden-ratio',
    category: 'history',
    title: "Johannes Kepler's Divine Proportion",
    tag: '1611 CE · Prague',
    formula: 'lim_{n→∞} F(n+1)/F(n) = Φ ≈ 1.6180339887',
    summary: 'Kepler discovered that Fibonacci ratios converge to the Golden Section.',
    detail: "In his treatise 'Strena Seu de Nive Sexangula' (On the Six-Cornered Snowflake), Kepler demonstrated that the ratio of consecutive Fibonacci numbers converges to the Divine Proportion Φ, identifying it as nature's generative blueprint in botany and geometry.",
    interactiveQuery: '1618',
  },
  {
    id: 'cassini-identity',
    category: 'math',
    title: "Cassini's Alternating Square Identity",
    tag: '1680 CE · Astronomy & Algebra',
    formula: 'F(n-1) · F(n+1) - F(n)² = (-1)ⁿ',
    summary: 'The ±1 area variance that powers the famous chessboard dissection paradox.',
    detail: "Discovered by Paris Observatory director Giovanni Domenico Cassini in 1680. It proves that the product of neighboring terms differs from the square of the middle term by exactly +1 or -1. This identity underlies Lewis Carroll's chessboard paradox where an 8×8 grid appears to equal a 13×5 rectangle.",
    interactiveQuery: '144',
  },
  {
    id: 'edouard-lucas',
    category: 'history',
    title: "Édouard Lucas & The Naming of 'Fibonacci'",
    tag: '1877 CE · Paris, France',
    formula: 'L_n = F(n-1) + F(n+1)',
    summary: 'French mathematician who officially coined the term "Fibonacci Sequence".',
    detail: 'Before 1877, the numbers were simply referred to as the "series of Lamé" or "additive series." François Édouard Anatole Lucas coined the name "Fibonacci" in honour of Leonardo of Pisa, and discovered the companion Lucas numbers (2, 1, 3, 4, 7, 11, 18, 29...).',
    interactiveQuery: '29',
  },
  {
    id: 'phyllotaxis',
    category: 'math',
    title: 'Phyllotaxis & The 137.5° Golden Angle',
    tag: 'Botanical Geometry',
    formula: 'θ = 360° · (1 - 1/Φ) ≈ 137.5077°',
    summary: 'Sunflowers, pinecones, and succulents pack seeds via Fibonacci spiral counts.',
    detail: 'To maximize sunlight and packing density without shadowing, plant primordia diverge at the Golden Angle ~137.5°. This biological optimization produces opposing Fibonacci spirals: sunflower heads routinely feature 34 and 55, or 55 and 89 spirals.',
    interactiveQuery: '137',
  },
  {
    id: 'zeckendorf-theorem',
    category: 'math',
    title: "Zeckendorf's Unique Decomposition Theorem",
    tag: '1939 CE · Number Theory',
    formula: 'N = ∑ F(k_i),  where k_{i+1} ≥ k_i + 2',
    summary: 'Every positive integer has a unique sum of non-consecutive Fibonacci numbers.',
    detail: 'Belgian doctor and mathematician Édouard Zeckendorf proved that every positive integer can be uniquely written as a sum of distinct non-consecutive Fibonacci numbers. This forms the basis of Fibonacci arithmetic codes in modern computer science.',
    interactiveQuery: '89',
  },
  {
    id: 'pisano-period',
    category: 'math',
    title: 'The 60-Step Pisano Loop (Modulo 10)',
    tag: 'Periodic Orbit',
    formula: 'π(10) = 60',
    summary: 'The final digit of Fibonacci numbers repeats strictly every 60 terms.',
    detail: 'Named after Leonardo Pisano, a Pisano period π(m) is the cycle length when Fibonacci numbers are taken modulo m. Modulo 10, the cycle length is exactly 60. No matter how deep into infinity you travel, the last digit repeats in this precise 60-step loop.',
    interactiveQuery: '60',
  },
  {
    id: 'fibonacci-square',
    category: 'math',
    title: 'The Unique Square: Only F(12) = 144',
    tag: '1964 CE · Deep Arithmetic',
    formula: 'F(n) = x²  ⟹  n ∈ {0, 1, 2, 12}',
    summary: 'Proved in 1964: 144 is the only non-trivial perfect square in the entire sequence.',
    detail: 'For centuries, mathematicians wondered whether other squares existed in the sequence. In 1964, J.H.E. Cohn published the rigorous proof that beyond the trivial 0 and 1, F(12) = 144 is the only perfect square in the entire infinite sequence.',
    interactiveQuery: '144',
  },
];

/**
 * Computes dynamic pattern facts tailored to the user's specific search result
 */
export function analyzeSearchPatterns(result: FibonacciMatchResult): SequencePatternFact[] {
  const dynamicFacts: SequencePatternFact[] = [];
  const n = result.n;
  const numQuery = parseInt(result.query, 10);

  // 1. Cassini Evaluation for F(n)
  const cassiniSign = n % 2 === 0 ? '+1' : '-1';
  dynamicFacts.push({
    id: `search-cassini-${n}`,
    category: 'search',
    title: `Cassini's Invariant for Term F(${n})`,
    tag: `Calculated for F(${n})`,
    formula: `F(${Math.max(0, n - 1)}) · F(${n + 1}) - F(${n})² = ${cassiniSign}`,
    summary: `For n = ${n}, neighboring products differ from F(${n})² by exactly ${cassiniSign}.`,
    detail: `Evaluating Cassini's identity for this term gives (-1)^${n} = ${cassiniSign}. In geometry, this exact ${cassiniSign} discrepancy is what enables the classic dissection optical illusion without breaking continuous space.`,
  });

  // 2. Pisano Period modulo 10 position
  const pisanoPos = n % 60;
  const lastDigit = result.term.slice(-1);
  dynamicFacts.push({
    id: `search-pisano-${n}`,
    category: 'search',
    title: `60-Step Pisano Loop Position`,
    tag: `Modulo 10 Orbit`,
    formula: `n mod 60 = ${n} mod 60 = step ${pisanoPos} / 60`,
    summary: `F(${n}) resides at step #${pisanoPos} in the repeating 60-number final digit orbit.`,
    detail: `Because the sequence of final digits has a period of 60, every term with index congruent to ${pisanoPos} modulo 60 will always terminate in the exact same digit (${lastDigit}).`,
  });

  // 3. Divisibility and Prime hierarchy
  const divisibilityNotes = getDivisibilityRules(n);
  if (divisibilityNotes.length > 0) {
    dynamicFacts.push({
      id: `search-divisibility-${n}`,
      category: 'search',
      title: `Divisibility & Factor Hierarchy`,
      tag: `Arithmetic Factor Chain`,
      formula: `gcd(F(a), F(b)) = F(gcd(a, b))`,
      summary: divisibilityNotes[0],
      detail: divisibilityNotes.join(' ') + ` Furthermore, through the Strong Divisibility Property, F(${n}) shares greatest common divisors strictly according to the divisors of its index ${n}.`,
    });
  }

  // 4. Zeckendorf representation of the query if it's a valid number
  if (!isNaN(numQuery) && numQuery > 0 && numQuery <= 500000) {
    const parts = getZeckendorfDecomposition(numQuery);
    if (parts.length > 0) {
      dynamicFacts.push({
        id: `search-zeckendorf-${result.query}`,
        category: 'search',
        title: `Zeckendorf Decomposition of "${result.query}"`,
        tag: `Unique Fibonacci Sum`,
        formula: `${result.query} = ${parts.join(' + ')}`,
        summary: `Your searched number decomposes into ${parts.length} distinct non-consecutive Fibonacci numbers.`,
        detail: `Zeckendorf's theorem guarantees that "${result.query}" has one and only one canonical representation as a sum of non-consecutive Fibonacci terms (${parts.join(', ')}). This forms the basis of Fibonacci base-φ numeral systems.`,
      });
    }
  }

  // 5. Growth Scale & Binet's Golden Ratio Power
  const theoreticalDigits = Math.max(1, Math.floor(n * 0.20898764 - 0.349485) + 1);
  dynamicFacts.push({
    id: `search-binet-${n}`,
    category: 'search',
    title: `Golden Ratio Exponential Scale (Φ^${n})`,
    tag: `Asymptotic Growth`,
    formula: `F(${n}) ≈ Φ^${n} / √5 ≈ 1.618034^${n} / 2.236`,
    summary: `Term F(${n}) spans ${result.termLength.toLocaleString('en-US')} digits (Binet theoretical: ${theoreticalDigits.toLocaleString('en-US')}).`,
    detail: `According to Jacques Philippe Marie Binet's closed-form formula, F(${n}) scales precisely with the ${n}th power of the Golden Ratio Φ ≈ 1.6180339887... divided by √5.`,
  });

  return dynamicFacts;
}
