/**
 * Fibonacci Search & 3D Golden Ratio Tornado Geometry Engine
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

/**
 * Reference-based Sapphire, Cobalt, Electric Azure & Ice-Blue palette
 * for the luminous 3D glass orbs.
 */
export const DIGIT_RULES: DigitRule[] = [
  { digit: 0, color: '#7cc2ff', hex: 0x7cc2ff, name: 'Ice Azure' },
  { digit: 1, color: '#3b82f6', hex: 0x3b82f6, name: 'Royal Cobalt' },
  { digit: 2, color: '#5daeff', hex: 0x5daeff, name: 'Electric Cerulean' },
  { digit: 3, color: '#93ceff', hex: 0x93ceff, name: 'Frost Sky' },
  { digit: 4, color: '#2b6cb0', hex: 0x2b6cb0, name: 'Deep Sapphire' },
  { digit: 5, color: '#4da3ff', hex: 0x4da3ff, name: 'Luminous Azure' },
  { digit: 6, color: '#6cb6ff', hex: 0x6cb6ff, name: 'Celestial Blue' },
  { digit: 7, color: '#3898ff', hex: 0x3898ff, name: 'Horizon Blue' },
  { digit: 8, color: '#a8d5ff', hex: 0xa8d5ff, name: 'Glacial Ice' },
  { digit: 9, color: '#428ce2', hex: 0x428ce2, name: 'Stellar Blue' },
];

/**
 * Golden Ratio constants:
 * PHI = (1 + sqrt(5)) / 2 ≈ 1.618033988749895
 * INV_PHI = PHI - 1 = 1 / PHI ≈ 0.618033988749895
 * INV_PHI_SQ = 1 / (PHI * PHI) = 2 - PHI ≈ 0.381966011250105 (INV_PHI + INV_PHI_SQ === 1)
 * GOLDEN_ANGLE = 2 * PI / (PHI * PHI) ≈ 2.399963229728653 rad (137.507764°)
 */
export const PHI = (1 + Math.sqrt(5)) / 2;
export const INV_PHI = 1 / PHI;
export const INV_PHI_SQ = 1 / (PHI * PHI);
export const GOLDEN_ANGLE = (2 * Math.PI) / (PHI * PHI);

/**
 * Maximum number of 3D digit orbs rendered in the Golden Ratio Tornado visualization.
 * This 100-digit limit applies strictly to the 3D visualization, never to the search algorithm.
 */
export const MAX_SPIRAL_ORBS = 100;

/**
 * Number of smooth curve points used to render the continuous Golden Ratio Tornado thread.
 */
export const SPIRAL_CURVE_SEGMENTS = 960;

/**
 * Pre-generate the continuous digit stream of Fibonacci numbers for the idle 3D spiral:
 * 0 1 1 2 3 5 8 13 21 34 55 89 144 ...
 */
let cachedInitialStream = '';
export function getFibonacciDigitStream(minDigits: number = 500): string {
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

export interface SpiralGeometryData {
  positions: Float32Array;
  thetas: Float32Array;
  radii: Float32Array;
  count: number;
  curvePositions: Float32Array;
  curvePointCount: number;
}

/**
 * Evaluates the Golden-Ratio Tornado radius r(t) for normalized parameter t in [0, 1].
 *
 * Mathematical model:
 * - Bottom vortex tip radius: r_min = INV_PHI ≈ 0.618
 * - Upper funnel crown radius: r_max = PHI^4 ≈ 6.854
 * - Smooth golden progression combining normalized logarithmic growth (PHI^(2t) - 1) / (PHI^2 - 1)
 *   and golden-conjugate flare t^(1 / PHI) weighted by INV_PHI + INV_PHI_SQ = 1:
 *   r(t) = r_min + (r_max - r_min) * (INV_PHI * ((PHI^(2t) - 1) / (PHI^2 - 1)) + INV_PHI_SQ * t^INV_PHI)
 */
function evaluateTornadoRadius(t: number, rMin: number, rMax: number): number {
  const clampedT = Math.max(0, Math.min(1, t));
  const phi2 = PHI * PHI;
  const logPart = (Math.pow(PHI, 2 * clampedT) - 1) / (phi2 - 1);
  const powPart = Math.pow(clampedT, INV_PHI);
  const goldenBlend = INV_PHI * logPart + INV_PHI_SQ * powPart;
  return rMin + (rMax - rMin) * goldenBlend;
}

/**
 * Generates 3D coordinates, angles, radii, and a smooth high-resolution curve for the
 * upward-rising Golden Ratio Tornado spiral supporting up to 100 digit orbs.
 *
 * Parametric equations:
 *   x(t) = r(t) * cos(theta(t))
 *   y(t) = h(t)
 *   z(t) = r(t) * sin(theta(t))
 *
 * Uses golden-ratio proportions (r_min = 1/PHI, r_max = PHI^4, H = PHI * r_max * sqrt(PHI),
 * turns = PHI^4 ≈ 6.854 revolutions) and arc-length sampling so orbs are distributed smoothly
 * along the ascending vortex without overlapping.
 */
export function generateSpiralData(
  count: number = MAX_SPIRAL_ORBS,
  focusStartIdx: number = -1,
  focusLength: number = 0
): SpiralGeometryData {
  const safeCount = Math.max(1, Math.min(MAX_SPIRAL_ORBS, count));
  const positions = new Float32Array(safeCount * 3);
  const thetas = new Float32Array(safeCount);
  const radii = new Float32Array(safeCount);

  // Proportion scaling so shorter terms (e.g., < 100 digits) still form a balanced upward tornado
  const countFactor =
    safeCount >= MAX_SPIRAL_ORBS
      ? 1.0
      : Math.max(0.42, Math.pow(safeCount / MAX_SPIRAL_ORBS, INV_PHI_SQ));

  const rMin = INV_PHI * (0.75 + 0.25 * countFactor); // ≈ 0.618 at 100 orbs
  const rMax = Math.pow(PHI, 4) * countFactor; // ≈ 6.854 at 100 orbs
  const totalHeight = rMax * PHI * Math.sqrt(PHI); // ≈ 14.106 at 100 orbs (H / rMax = PHI^(3/2))

  // Number of full 360° revolutions governed by PHI^4 ≈ 6.854 turns at 100 orbs
  const totalTurns = Math.max(
    1.5,
    Math.pow(PHI, 4) * Math.pow(safeCount / MAX_SPIRAL_ORBS, INV_PHI)
  );

  // High-resolution curve evaluation for exact arc-length integration and smooth spiral thread rendering
  const sampleSteps = SPIRAL_CURVE_SEGMENTS;
  const sampleT = new Float32Array(sampleSteps + 1);
  const sampleTheta = new Float32Array(sampleSteps + 1);
  const sampleR = new Float32Array(sampleSteps + 1);
  const sampleY = new Float32Array(sampleSteps + 1);
  const arcLengths = new Float32Array(sampleSteps + 1);
  const curvePositions = new Float32Array((sampleSteps + 1) * 3);

  let accumTheta = 0;
  for (let k = 0; k <= sampleSteps; k++) {
    const t = k / sampleSteps;
    sampleT[k] = t;
    const r = evaluateTornadoRadius(t, rMin, rMax);
    // Smooth upward height h(t) with golden pitch balance
    const hNorm = INV_PHI * t + INV_PHI_SQ * Math.pow(t, Math.pow(PHI, 0.22));
    const y = (hNorm - 0.5) * totalHeight;

    sampleR[k] = r;
    sampleY[k] = y;
    sampleTheta[k] = accumTheta;

    if (k < sampleSteps) {
      const dt = 1 / sampleSteps;
      // Modulate angular velocity gently by radius so bottom coils and top coils have harmonious orb spacing
      const angularRate = Math.pow(rMin / Math.max(rMin, r), INV_PHI_SQ * 0.45);
      accumTheta += dt * angularRate;
    }
  }

  const targetMaxTheta = 2 * Math.PI * totalTurns;
  const thetaScale = accumTheta > 0 ? targetMaxTheta / accumTheta : 1;

  let prevX = 0;
  let prevY = 0;
  let prevZ = 0;
  let totalArcLength = 0;

  for (let k = 0; k <= sampleSteps; k++) {
    const th = sampleTheta[k] * thetaScale;
    sampleTheta[k] = th;
    const r = sampleR[k];
    const y = sampleY[k];

    // Parametric tornado equations: x(t) = r(t)*cos(theta(t)), y(t) = h(t), z(t) = r(t)*sin(theta(t))
    const x = r * Math.cos(th);
    const z = r * Math.sin(th);

    curvePositions[k * 3] = x;
    curvePositions[k * 3 + 1] = y;
    curvePositions[k * 3 + 2] = z;

    if (k > 0) {
      const dx = x - prevX;
      const dy = y - prevY;
      const dz = z - prevZ;
      totalArcLength += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    arcLengths[k] = totalArcLength;
    prevX = x;
    prevY = y;
    prevZ = z;
  }

  if (safeCount === 1) {
    const midK = Math.floor(sampleSteps * 0.5);
    positions[0] = curvePositions[midK * 3];
    positions[1] = curvePositions[midK * 3 + 1];
    positions[2] = curvePositions[midK * 3 + 2];
    thetas[0] = sampleTheta[midK];
    radii[0] = sampleR[midK];
    return {
      positions,
      thetas,
      radii,
      count: 1,
      curvePositions,
      curvePointCount: sampleSteps + 1,
    };
  }

  // Arc-length weight distribution with subtle breathing room around the highlighted sequence
  const hasFocus = focusStartIdx >= 0 && focusLength > 0;
  const focusMargin = 4;
  const cumulativeWeights = new Float32Array(safeCount);
  let totalWeight = 0;

  for (let i = 0; i < safeCount; i++) {
    cumulativeWeights[i] = totalWeight;
    if (i < safeCount - 1) {
      let w = 1.0;
      if (hasFocus) {
        const matchEnd = focusStartIdx + focusLength - 1;
        if (i >= focusStartIdx - 1 && i <= matchEnd) {
          w = 1.24;
        } else if (i >= focusStartIdx - focusMargin && i < focusStartIdx - 1) {
          const u = (i - (focusStartIdx - focusMargin)) / focusMargin;
          w = 1.0 + 0.24 * (0.5 - 0.5 * Math.cos(Math.PI * u));
        } else if (i > matchEnd && i <= matchEnd + focusMargin) {
          const u = 1 - (i - matchEnd) / focusMargin;
          w = 1.0 + 0.24 * (0.5 - 0.5 * Math.cos(Math.PI * u));
        }
      }
      totalWeight += w;
    }
  }

  // Sample orb positions along the 3D tornado curve by cumulative arc length
  let searchIdx = 0;
  for (let i = 0; i < safeCount; i++) {
    const targetS =
      totalWeight > 0 ? (cumulativeWeights[i] / totalWeight) * totalArcLength : 0;

    while (searchIdx < sampleSteps - 1 && arcLengths[searchIdx + 1] < targetS) {
      searchIdx++;
    }

    const s0 = arcLengths[searchIdx];
    const s1 = arcLengths[searchIdx + 1];
    const segLen = s1 - s0;
    const frac = segLen > 1e-6 ? Math.max(0, Math.min(1, (targetS - s0) / segLen)) : 0;

    const th = sampleTheta[searchIdx] * (1 - frac) + sampleTheta[searchIdx + 1] * frac;
    const r = sampleR[searchIdx] * (1 - frac) + sampleR[searchIdx + 1] * frac;
    const y = sampleY[searchIdx] * (1 - frac) + sampleY[searchIdx + 1] * frac;

    positions[i * 3] = r * Math.cos(th);
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = r * Math.sin(th);

    thetas[i] = th;
    radii[i] = r;
  }

  return {
    positions,
    thetas,
    radii,
    count: safeCount,
    curvePositions,
    curvePointCount: sampleSteps + 1,
  };
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
 * Selects at most 100 consecutive digits for the 3D Golden Ratio Tornado visualization.
 *
 * Rules:
 * - Maximum capacity is 100 digit orbs (MAX_SPIRAL_ORBS = 100).
 * - Each orb represents one exact digit.
 * - When a search result is active, displays at most 100 consecutive digits from the
 *   actual matching Fibonacci term (matchResult.term), positioning the matched pattern
 *   near the center of the 100-digit window whenever possible.
 * - Never fabricates, duplicates, pads, or reorders digits.
 */
export function buildSpiralSequenceAllocation(
  matchResult: FibonacciMatchResult | null,
  maxOrbs: number = MAX_SPIRAL_ORBS
): SpiralSequenceAllocation {
  const safeMaxOrbs = Math.max(1, Math.min(MAX_SPIRAL_ORBS, maxOrbs));

  if (!matchResult || !matchResult.query) {
    const stream = getFibonacciDigitStream(safeMaxOrbs).slice(0, safeMaxOrbs);
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

  // If the matching Fibonacci term has > 100 digits, select a continuous 100-digit window
  // from the term with the matched sequence centered whenever possible.
  if (term.length > safeMaxOrbs) {
    const halfWindow = Math.floor((safeMaxOrbs - matchLen) / 2);
    const windowStart = Math.max(
      0,
      Math.min(term.length - safeMaxOrbs, matchPos0 - halfWindow)
    );
    const sliced = term.slice(windowStart, windowStart + safeMaxOrbs);
    return {
      digits: sliced,
      matchStartIdx: matchPos0 - windowStart,
      matchLength: matchLen,
      termStartIdx: 0,
      termEndIdx: sliced.length,
      windowOffsetInTerm: windowStart,
    };
  }

  // If the matching Fibonacci term has <= 100 digits, display the exact consecutive digits
  // of that Fibonacci term without fabricating or duplicating any digits.
  return {
    digits: term,
    matchStartIdx: matchPos0,
    matchLength: matchLen,
    termStartIdx: 0,
    termEndIdx: term.length,
    windowOffsetInTerm: 0,
  };
}
