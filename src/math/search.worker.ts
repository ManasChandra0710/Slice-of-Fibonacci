/**
 * Web Worker for Fibonacci Sequence Pattern Search
 * Keeps main thread and 3D WebGL render loop fluid during heavy arbitrary-precision computations.
 */

import { FibonacciSearchEngine } from './fibonacciSearch';

const engine = new FibonacciSearchEngine();
let activeSearchId = 0;

self.onmessage = async (e: MessageEvent) => {
  const { type, id, query, maxTerms } = e.data;

  if (type === 'cancel') {
    if (activeSearchId === id) {
      activeSearchId = 0;
    }
    return;
  }

  if (type === 'reset') {
    activeSearchId = 0;
    return;
  }

  if (type === 'search') {
    activeSearchId = id;

    try {
      const result = await engine.search(query, {
        maxTerms: maxTerms ?? 80000,
        onProgress: (checkedCount) => {
          if (activeSearchId === id) {
            self.postMessage({ type: 'progress', id, checkedCount });
          }
        },
        isCancelled: () => activeSearchId !== id,
        yieldIntervalMs: 32,
      });

      if (activeSearchId === id) {
        self.postMessage({ type: 'result', id, result });
      }
    } catch (err: unknown) {
      if (activeSearchId === id) {
        const message = err instanceof Error ? err.message : 'Unknown search error';
        if (message !== 'SEARCH_CANCELLED') {
          self.postMessage({ type: 'error', id, message });
        }
      }
    }
  }
};
