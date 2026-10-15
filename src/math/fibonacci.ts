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
