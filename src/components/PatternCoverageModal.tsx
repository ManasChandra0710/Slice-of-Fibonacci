import React, { useState } from 'react';
import {
  FIBONACCI_COVERAGE_SUMMARY,
  PatternCoverageRow,
  DIGIT_RULES,
  getFastFibonacciTermString,
} from '../math/fibonacci';
import { X, CheckCircle2, Sparkles, Hash, ArrowRight, ShieldCheck, Copy, Check } from 'lucide-react';

interface PatternCoverageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPattern?: (pattern: string) => void;
}

export const PatternCoverageModal: React.FC<PatternCoverageModalProps> = ({
  isOpen,
  onClose,
  onSelectPattern,
}) => {
  const [selectedRow, setSelectedRow] = useState<PatternCoverageRow | null>(
    FIBONACCI_COVERAGE_SUMMARY.rows[7]
  );
  const [termPreview, setTermPreview] = useState<{ n: number; text: string; pattern: string; pos: number } | null>(null);
  const [copiedPattern, setCopiedPattern] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInspectTerm = (row: PatternCoverageRow) => {
    setSelectedRow(row);
    // Generate term context (trimmed if huge)
    try {
      const fullTerm = getFastFibonacciTermString(row.finalTermIndex);
      setTermPreview({
        n: row.finalTermIndex,
        text: fullTerm,
        pattern: row.finalPattern,
        pos: row.firstOccurrencePos,
      });
    } catch {
      // Fallback
    }
  };

  const handleCopy = (text: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedPattern(id);
      setTimeout(() => setCopiedPattern(null), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="coverage-modal-title"
    >
      <div
        className="relative w-full max-w-4xl glass-panel-glow bg-[#080d18]/95 border border-[#71b9ff]/30 rounded-2xl p-5 sm:p-7 shadow-[0_16px_50px_rgba(0,0,0,0.85)] max-h-[92vh] overflow-y-auto my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#71b9ff]/20 to-[#f0c978]/20 border border-[#71b9ff]/40 shadow-[0_0_15px_rgba(113,185,255,0.3)]">
              <ShieldCheck className="w-5 h-5 text-[#71b9ff]" />
            </span>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#f0c978]/10 border border-[#f0c978]/30 text-[#f0c978] text-[10px] font-mono uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3" />
                100% Complete Coverage Verified
              </div>
              <h2 id="coverage-modal-title" className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Digit-Pattern Coverage in Fibonacci (Lengths 1 to 8)
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] text-[#8e9cb0] hover:text-white transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Result Hero Card */}
        <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0c182b] via-[#091220] to-[#1c180f] border border-[#f0c978]/40 shadow-[0_0_30px_rgba(240,201,120,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-white/[0.08]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#f0c978] font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#f0c978] shadow-[0_0_8px_#f0c978]" />
              Primary Calculation Result
            </span>
            <span className="text-[11px] font-mono text-[#9bb2cf]">
              Rigorously Verified Across All 111,111,100 Substrings
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="text-[10px] font-mono uppercase text-[#7d8fa6]">
                Smallest Completing Term Index
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#71b9ff] mt-1">
                F(134,560)
              </div>
              <div className="text-[11px] text-[#8ea3bf] mt-0.5">
                Every pattern of lengths 1–8 has appeared by this term
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="text-[10px] font-mono uppercase text-[#7d8fa6]">
                Final Completing Pattern
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#f0c978] tracking-wider">
                  86662745
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('86662745', 'primary')}
                  className="p-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-[#8e9cb0] hover:text-[#f0c978] transition"
                  title="Copy pattern"
                >
                  {copiedPattern === 'primary' ? <Check className="w-3.5 h-3.5 text-[#f0c978]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="text-[11px] text-[#8ea3bf] mt-0.5">
                At 1-based position #8,167 within F(134,560)
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="text-[10px] font-mono uppercase text-[#7d8fa6]">
                Digits in Term F(134,560)
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white mt-1">
                28,122
              </div>
              <div className="text-[11px] text-[#8ea3bf] mt-0.5">
                Decimal digits (Binet scale Φ^134560 / √5)
              </div>
            </div>
          </div>

          {onSelectPattern && (
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-xs text-[#a3b8d4]">
                Want to view this landmark 8-digit sequence in the 3D space?
              </span>
              <button
                type="button"
                onClick={() => {
                  onSelectPattern('86662745');
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#71b9ff] to-[#2c83d6] hover:from-[#8ec8ff] hover:to-[#3891e8] text-[#060b14] font-semibold text-xs font-mono transition cursor-pointer flex items-center gap-1 shadow-[0_0_15px_rgba(113,185,255,0.4)]"
              >
                <span>Inspect in 3D Space</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Coverage Breakdown Table */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#c0d4ec] flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-[#71b9ff]" />
              Breakdown by Pattern Length (k = 1 through 8)
            </h3>
            <span className="text-[11px] font-mono text-[#7d8fa6]">
              111,111,100 Total Patterns (100% Discovered)
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#070c16]/90">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="bg-white/[0.04] border-b border-white/[0.08] text-[#7d8fa6] uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Length (k)</th>
                  <th className="py-2.5 px-3">Possible Patterns</th>
                  <th className="py-2.5 px-3">Discovered</th>
                  <th className="py-2.5 px-3">Coverage %</th>
                  <th className="py-2.5 px-3 text-[#71b9ff]">Final Term F(n)</th>
                  <th className="py-2.5 px-3">Term Digits</th>
                  <th className="py-2.5 px-3 text-[#f0c978]">Completing Pattern</th>
                  <th className="py-2.5 px-3">Start Pos</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-[#c5d3e8]">
                {FIBONACCI_COVERAGE_SUMMARY.rows.map((row) => {
                  const isSelected = selectedRow?.k === row.k;
                  return (
                    <tr
                      key={row.k}
                      className={`hover:bg-white/[0.03] transition ${
                        isSelected ? 'bg-[#71b9ff]/[0.08]' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-[#71b9ff]/20 text-[#71b9ff] flex items-center justify-center text-[10px]">
                          {row.k}
                        </span>
                        <span>{row.k} {row.k === 1 ? 'digit' : 'digits'}</span>
                      </td>
                      <td className="py-2.5 px-3 text-[#a0b3cc]">
                        {row.possiblePatterns.toLocaleString('en-US')}
                      </td>
                      <td className="py-2.5 px-3 text-[#9ecbff]">
                        {row.discoveredPatterns.toLocaleString('en-US')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[#4ade80] font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          100%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#71b9ff]">
                        F({row.finalTermIndex.toLocaleString('en-US')})
                      </td>
                      <td className="py-2.5 px-3 text-[#8ea3bf]">
                        {row.digitsInFinalTerm.toLocaleString('en-US')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-black/40 border border-[#f0c978]/40 text-[#f0c978] font-bold tracking-wider">
                          {row.finalPattern}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#9eb2cc]">
                        #{row.firstOccurrencePos.toLocaleString('en-US')}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleInspectTerm(row)}
                            className="px-2 py-1 rounded bg-white/[0.05] hover:bg-white/[0.12] text-[#9bb4d6] hover:text-white text-[11px] transition cursor-pointer"
                            title={`Inspect F(${row.finalTermIndex})`}
                          >
                            Inspect
                          </button>
                          {onSelectPattern && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectPattern(row.finalPattern);
                                onClose();
                              }}
                              className="px-2 py-1 rounded bg-[#71b9ff]/20 hover:bg-[#71b9ff]/30 text-[#71b9ff] text-[11px] font-semibold transition cursor-pointer"
                              title={`Search "${row.finalPattern}" in 3D`}
                            >
                              Search
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Term Inspector Preview */}
        {termPreview && (
          <div className="mt-5 p-4 rounded-xl bg-[#060a12] border border-white/[0.08]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-white/[0.06] text-xs font-mono">
              <span className="text-[#71b9ff] font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#71b9ff]" />
                Occurrence Context in F({termPreview.n.toLocaleString('en-US')}) ({termPreview.text.length.toLocaleString('en-US')} Total Digits)
              </span>
              <button
                type="button"
                onClick={() => handleCopy(termPreview.pattern, 'inspect')}
                className="flex items-center gap-1 text-[11px] text-[#8fa4c0] hover:text-white transition"
              >
                {copiedPattern === 'inspect' ? <Check className="w-3 h-3 text-[#4ade80]" /> : <Copy className="w-3 h-3" />}
                <span>Pattern "{termPreview.pattern}"</span>
              </button>
            </div>

            <div className="font-mono text-xs text-[#899db8] leading-relaxed break-all bg-black/50 p-3 rounded-lg max-h-24 overflow-y-auto">
              {termPreview.text.length > 500 ? (
                <>
                  <span>… {termPreview.text.slice(Math.max(0, termPreview.pos - 40), termPreview.pos - 1)}</span>
                  <mark className="bg-[#1b3a5c] text-[#9bd3ff] border border-[#71b9ff]/80 rounded px-1.5 py-0.5 mx-0.5 font-bold shadow-[0_0_10px_rgba(113,185,255,0.4)]">
                    {termPreview.pattern}
                  </mark>
                  <span>{termPreview.text.slice(termPreview.pos - 1 + termPreview.pattern.length, termPreview.pos + 45)} …</span>
                </>
              ) : (
                <>
                  <span>{termPreview.text.slice(0, termPreview.pos - 1)}</span>
                  <mark className="bg-[#1b3a5c] text-[#9bd3ff] border border-[#71b9ff]/80 rounded px-1.5 py-0.5 mx-0.5 font-bold shadow-[0_0_10px_rgba(113,185,255,0.4)]">
                    {termPreview.pattern}
                  </mark>
                  <span>{termPreview.text.slice(termPreview.pos - 1 + termPreview.pattern.length)}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Mathematical Rules & Methodology */}
        <div className="mt-5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-[#8ba0bc] leading-relaxed">
          <h4 className="font-semibold text-white text-[13px] mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#f0c978]" />
            Methodology & Mathematical Verification
          </h4>
          <ul className="list-disc list-inside space-y-1.5 pl-1">
            <li>
              <strong className="text-[#c5d3e8]">Boundary Invariance:</strong> Every match is required to appear as a contiguous substring strictly within an individual Fibonacci term. Matches crossing between two consecutive terms are excluded.
            </li>
            <li>
              <strong className="text-[#c5d3e8]">Significant Leading Zeros:</strong> For each length <em>k</em>, all 10<sup><em>k</em></sup> sequences are tracked distinctly (e.g. <code className="text-[#f0c978]">00001234</code> is distinct from <code className="text-[#f0c978]">1234</code>).
            </li>
            <li>
              <strong className="text-[#c5d3e8]">Coupon Collector Dynamic:</strong> Because the decimal digits of Fibonacci terms exhibit pseudo-random uniform distribution, discovering all 100,000,000 eight-digit permutations behaves as a Coupon Collector process on <em>M = 10<sup>8</sup></em> items, requiring ~1.9 × 10<sup>9</sup> rolling substring evaluations. The sequence reaches complete coverage at <strong>n = 134,560</strong>.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
