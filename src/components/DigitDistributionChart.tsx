import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { FibonacciMatchResult, DIGIT_RULES, DigitRule } from '../math/fibonacci';
import { soundEngine } from '../audio/sound';
import { BarChart3, PieChart, Sparkles, Copy, Check, Info, ArrowUpRight, Hash, Layers } from 'lucide-react';

interface DigitDistributionChartProps {
  matchResult: FibonacciMatchResult | null;
  onSearchTerm?: (query: string) => void;
}

export interface DigitStat {
  digit: number;
  count: number;
  percentage: number;
  expectedPct: number;
  difference: number;
  rule: DigitRule;
}

// Sample fallback segment if user hasn't searched yet (F(25) = 75025 context stream)
const SAMPLE_SEGMENT = '112358132134558914423337761098715972584418167651094617711286574636875025121393196418';

export const DigitDistributionChart: React.FC<DigitDistributionChartProps> = ({
  matchResult,
  onSearchTerm,
}) => {
  const [scope, setScope] = useState<'segment' | 'full' | 'query'>('segment');
  const [chartType, setChartType] = useState<'bar' | 'donut'>('bar');
  const [metric, setMetric] = useState<'count' | 'pct'>('count');
  const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
  const [hoveredDigit, setHoveredDigit] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Extract raw digit string based on current scope
  const targetDigitString = useMemo(() => {
    if (!matchResult) return SAMPLE_SEGMENT;

    if (scope === 'query') {
      return matchResult.query.replace(/[^\d]/g, '');
    }

    if (scope === 'full') {
      return matchResult.term;
    }

    // Default 'segment': Clean window around match (before + match + after)
    const combined = `${matchResult.before}${matchResult.match}${matchResult.after}`;
    const cleanDigits = combined.replace(/[^\d]/g, '');
    return cleanDigits.length > 0 ? cleanDigits : matchResult.term;
  }, [matchResult, scope]);

  // Compute distribution statistics for digits 0-9
  const { stats, totalDigits, maxCount, maxPct, entropy, uniformityScore, modeDigit, minDigit } =
    useMemo(() => {
      const counts = new Array(10).fill(0);
      let total = 0;

      for (let i = 0; i < targetDigitString.length; i++) {
        const d = parseInt(targetDigitString[i], 10);
        if (!isNaN(d) && d >= 0 && d <= 9) {
          counts[d]++;
          total++;
        }
      }

      const expectedPct = 10.0; // 10% under uniform distribution
      const safeTotal = total > 0 ? total : 1;

      const statsArray: DigitStat[] = counts.map((count, digit) => {
        const percentage = (count / safeTotal) * 100;
        return {
          digit,
          count,
          percentage,
          expectedPct,
          difference: percentage - expectedPct,
          rule: DIGIT_RULES[digit],
        };
      });

      let highestCount = -1;
      let highestDigit = 0;
      let lowestCount = Infinity;
      let lowestDigit = 0;
      let ent = 0;

      statsArray.forEach((item) => {
        if (item.count > highestCount) {
          highestCount = item.count;
          highestDigit = item.digit;
        }
        if (item.count < lowestCount) {
          lowestCount = item.count;
          lowestDigit = item.digit;
        }
        if (item.count > 0) {
          const p = item.count / safeTotal;
          ent -= p * Math.log2(p);
        }
      });

      // Max Shannon entropy for 10 states is log2(10) ≈ 3.321928
      const maxEntropy = Math.log2(10);
      const uniformity = Math.min(100, Math.max(0, (ent / maxEntropy) * 100));

      return {
        stats: statsArray,
        totalDigits: total,
        maxCount: Math.max(...counts, 1),
        maxPct: Math.max(...statsArray.map((s) => s.percentage), 10),
        entropy: ent,
        uniformityScore: uniformity,
        modeDigit: statsArray[highestDigit],
        minDigit: statsArray[lowestDigit],
      };
    }, [targetDigitString]);

  // Copy distribution summary to clipboard
  const handleCopyDistribution = () => {
    const payload = {
      source: matchResult ? `F(${matchResult.n}) [scope: ${scope}]` : 'Sample Fibonacci Stream',
      totalDigits,
      entropy: entropy.toFixed(3),
      distribution: stats.map((s) => ({
        digit: s.digit,
        count: s.count,
        percentage: `${s.percentage.toFixed(2)}%`,
        color: s.rule.name,
      })),
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
      setCopied(true);
      soundEngine.playClick();
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // D3 Chart Rendering
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous drawing

    const width = 680;
    const height = 270;
    const margin = { top: 32, right: 30, bottom: 42, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Define SVG Gradients & Glow Filters in <defs>
    const defs = svg.append('defs');

    // Glow filter
    const filter = defs.append('filter').attr('id', 'd3-bar-glow').attr('x', '-30%').attr('y', '-30%').attr('width', '160%').attr('height', '160%');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'blur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Create vertical gradients for each digit color
    stats.forEach((item) => {
      const grad = defs
        .append('linearGradient')
        .attr('id', `grad-digit-${item.digit}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

      grad.append('stop').attr('offset', '0%').attr('stop-color', item.rule.color).attr('stop-opacity', 0.95);
      grad.append('stop').attr('offset', '100%').attr('stop-color', item.rule.color).attr('stop-opacity', 0.35);
    });

    // Main Chart Group
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    if (chartType === 'bar') {
      // ----------------------------------------------------
      // BAR CHART / FREQUENCY HISTOGRAM
      // ----------------------------------------------------
      const xScale = d3
        .scaleBand<string>()
        .domain(stats.map((s) => s.digit.toString()))
        .range([0, innerWidth])
        .padding(0.24);

      const yMax = metric === 'count' ? Math.max(maxCount * 1.25, 4) : Math.max(maxPct * 1.25, 20);
      const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]).nice();

      // Horizontal grid lines
      const yAxis = d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth);

      const gridG = g.append('g').attr('class', 'grid').call(yAxis);
      gridG.select('.domain').remove();
      gridG.selectAll('.tick line').attr('stroke', 'rgba(255, 255, 255, 0.07)').attr('stroke-dasharray', '2,3');
      gridG
        .selectAll('.tick text')
        .attr('fill', '#6a7b94')
        .attr('font-size', '10px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('dx', '-6px');

      // Reference Expected Uniform Line (10% or total/10)
      const expectedYValue = metric === 'count' ? totalDigits / 10 : 10;
      const expectedY = yScale(expectedYValue);

      if (expectedY >= 0 && expectedY <= innerHeight) {
        const refLineG = g.append('g').attr('class', 'expected-baseline');
        refLineG
          .append('line')
          .attr('x1', 0)
          .attr('x2', innerWidth)
          .attr('y1', expectedY)
          .attr('y2', expectedY)
          .attr('stroke', '#f0c978')
          .attr('stroke-opacity', 0.55)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,4');

        refLineG
          .append('text')
          .attr('x', innerWidth - 4)
          .attr('y', expectedY - 5)
          .attr('text-anchor', 'end')
          .attr('fill', '#f0c978')
          .attr('font-size', '9px')
          .attr('font-family', 'ui-monospace, monospace')
          .attr('font-weight', '600')
          .attr('letter-spacing', '0.05em')
          .text(`UNIFORM BASELINE (${metric === 'count' ? (totalDigits / 10).toFixed(1) : '10.0%'})`);
      }

      // X Axis line & labels
      const xAxisG = g.append('g').attr('transform', `translate(0, ${innerHeight})`);
      xAxisG
        .append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', 'rgba(255, 255, 255, 0.15)');

      // Bar Elements
      const barGroups = g
        .selectAll('.bar-group')
        .data(stats)
        .enter()
        .append('g')
        .attr('class', 'bar-group')
        .style('cursor', 'pointer')
        .on('mouseenter', function (_event, d) {
          setHoveredDigit(d.digit);
          soundEngine.playClick();
        })
        .on('mouseleave', function () {
          setHoveredDigit(null);
        })
        .on('click', function (_event, d) {
          setSelectedDigit((prev) => (prev === d.digit ? null : d.digit));
          soundEngine.playClick();
        });

      // Animated Bars
      barGroups
        .append('rect')
        .attr('class', 'digit-bar')
        .attr('x', (d) => xScale(d.digit.toString()) || 0)
        .attr('width', xScale.bandwidth())
        .attr('y', innerHeight)
        .attr('height', 0)
        .attr('rx', 4)
        .attr('fill', (d) => `url(#grad-digit-${d.digit})`)
        .attr('stroke', (d) => d.rule.color)
        .attr('stroke-width', (d) => (hoveredDigit === d.digit || selectedDigit === d.digit ? 2 : 1))
        .attr('filter', (d) => (hoveredDigit === d.digit || selectedDigit === d.digit ? 'url(#d3-bar-glow)' : 'none'))
        .attr('opacity', (d) => {
          if (hoveredDigit !== null) return hoveredDigit === d.digit ? 1 : 0.35;
          if (selectedDigit !== null) return selectedDigit === d.digit ? 1 : 0.45;
          return 0.9;
        })
        .transition()
        .duration(650)
        .ease(d3.easeCubicOut)
        .attr('y', (d) => yScale(metric === 'count' ? d.count : d.percentage))
        .attr('height', (d) => innerHeight - yScale(metric === 'count' ? d.count : d.percentage));

      // Value label on top of bar
      barGroups
        .append('text')
        .attr('class', 'bar-value-label')
        .attr('x', (d) => (xScale(d.digit.toString()) || 0) + xScale.bandwidth() / 2)
        .attr('y', innerHeight)
        .attr('text-anchor', 'middle')
        .attr('fill', (d) => d.rule.color)
        .attr('font-size', '10px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('font-weight', '700')
        .attr('opacity', 0)
        .text((d) => (metric === 'count' ? d.count : `${d.percentage.toFixed(1)}%`))
        .transition()
        .duration(650)
        .ease(d3.easeCubicOut)
        .attr('y', (d) => yScale(metric === 'count' ? d.count : d.percentage) - 6)
        .attr('opacity', 1);

      // X-Axis Digit Pill Badges below
      const xLabels = xAxisG
        .selectAll('.x-label-group')
        .data(stats)
        .enter()
        .append('g')
        .attr('class', 'x-label-group')
        .attr('transform', (d) => `translate(${(xScale(d.digit.toString()) || 0) + xScale.bandwidth() / 2}, 16)`);

      // Colored Orb indicator
      xLabels
        .append('circle')
        .attr('r', 8)
        .attr('fill', (d) => d.rule.color)
        .attr('fill-opacity', (d) => (hoveredDigit === d.digit || selectedDigit === d.digit ? 1 : 0.25))
        .attr('stroke', (d) => d.rule.color)
        .attr('stroke-width', 1.2);

      // Digit number inside orb
      xLabels
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '3.5px')
        .attr('fill', (d) => (hoveredDigit === d.digit || selectedDigit === d.digit ? '#080d17' : '#ffffff'))
        .attr('font-size', '10px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('font-weight', '800')
        .text((d) => d.digit);

    } else {
      // ----------------------------------------------------
      // RADIAL DONUT / POLAR DISTRIBUTION CHART
      // ----------------------------------------------------
      const radius = Math.min(innerWidth, innerHeight) / 2 + 10;
      const centerG = g.append('g').attr('transform', `translate(${innerWidth / 2}, ${innerHeight / 2 + 5})`);

      const pie = d3
        .pie<DigitStat>()
        .value((d) => (d.count > 0 ? d.count : 0.001))
        .sort(null);

      const arc = d3
        .arc<d3.PieArcDatum<DigitStat>>()
        .innerRadius(radius * 0.55)
        .outerRadius(radius * 0.92)
        .cornerRadius(3)
        .padAngle(0.03);

      const hoverArc = d3
        .arc<d3.PieArcDatum<DigitStat>>()
        .innerRadius(radius * 0.52)
        .outerRadius(radius * 1.0)
        .cornerRadius(4)
        .padAngle(0.04);

      const arcs = centerG
        .selectAll('.donut-slice')
        .data(pie(stats))
        .enter()
        .append('g')
        .attr('class', 'donut-slice')
        .style('cursor', 'pointer')
        .on('mouseenter', function (_event, d) {
          setHoveredDigit(d.data.digit);
          soundEngine.playClick();
        })
        .on('mouseleave', function () {
          setHoveredDigit(null);
        })
        .on('click', function (_event, d) {
          setSelectedDigit((prev) => (prev === d.data.digit ? null : d.data.digit));
          soundEngine.playClick();
        });

      arcs
        .append('path')
        .attr('d', (d) => arc(d) || '')
        .attr('fill', (d) => `url(#grad-digit-${d.data.digit})`)
        .attr('stroke', (d) => d.data.rule.color)
        .attr('stroke-width', (d) => (hoveredDigit === d.data.digit || selectedDigit === d.data.digit ? 2 : 1))
        .attr('filter', (d) => (hoveredDigit === d.data.digit || selectedDigit === d.data.digit ? 'url(#d3-bar-glow)' : 'none'))
        .attr('opacity', (d) => {
          if (hoveredDigit !== null) return hoveredDigit === d.data.digit ? 1 : 0.35;
          if (selectedDigit !== null) return selectedDigit === d.data.digit ? 1 : 0.45;
          return 0.9;
        })
        .transition()
        .duration(650)
        .attr('d', (d) =>
          hoveredDigit === d.data.digit || selectedDigit === d.data.digit ? hoverArc(d) || '' : arc(d) || ''
        );

      // Center Readout Display
      const activeDigitItem =
        hoveredDigit !== null
          ? stats[hoveredDigit]
          : selectedDigit !== null
          ? stats[selectedDigit]
          : modeDigit;

      const centerTextG = centerG.append('g').attr('text-anchor', 'middle');

      centerTextG
        .append('text')
        .attr('y', -14)
        .attr('fill', '#7d8fa6')
        .attr('font-size', '9px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('letter-spacing', '0.1em')
        .text(hoveredDigit !== null ? 'INSPECTING' : selectedDigit !== null ? 'SELECTED' : 'MODE DIGIT');

      centerTextG
        .append('text')
        .attr('y', 10)
        .attr('fill', activeDigitItem.rule.color)
        .attr('font-size', '22px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('font-weight', '800')
        .text(`Digit ${activeDigitItem.digit}`);

      centerTextG
        .append('text')
        .attr('y', 26)
        .attr('fill', '#c5d3e8')
        .attr('font-size', '11px')
        .attr('font-family', 'ui-monospace, monospace')
        .text(`${activeDigitItem.count} (${activeDigitItem.percentage.toFixed(1)}%)`);
    }
  }, [stats, chartType, metric, maxCount, maxPct, totalDigits, hoveredDigit, selectedDigit, modeDigit]);

  const activeFocusStat =
    hoveredDigit !== null
      ? stats[hoveredDigit]
      : selectedDigit !== null
      ? stats[selectedDigit]
      : modeDigit;

  return (
    <section
      ref={containerRef}
      className="max-w-[780px] mx-auto mb-10 glass-panel rounded-2xl p-5 sm:p-7 animate-rise"
      aria-label="Interactive D3 Digit Distribution"
    >
      {/* Component Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#71b9ff] shadow-[0_0_12px_#71b9ff]" />
            <h2 className="text-sm sm:text-base font-semibold tracking-tight text-white flex items-center gap-2">
              <span>Digit Distribution Analysis</span>
              <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#71b9ff]/15 border border-[#71b9ff]/30 text-[#71b9ff]">
                D3 Visualization Engine
              </span>
            </h2>
          </div>
          <p className="text-[12px] text-[#8e9cb0] mt-1">
            Real-time frequency telemetry of digits 0–9 across the found Fibonacci segment.
          </p>
        </div>

        {/* Action & Scope Switchers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scope Filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/[0.06] text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setScope('segment');
              }}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                scope === 'segment'
                  ? 'bg-[#71b9ff]/20 text-[#71b9ff] border border-[#71b9ff]/40 shadow-[0_0_8px_rgba(113,185,255,0.25)]'
                  : 'text-[#7d8fa6] hover:text-white'
              }`}
              title="Stream window surrounding the match"
            >
              Segment Window
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setScope('full');
              }}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                scope === 'full'
                  ? 'bg-[#71b9ff]/20 text-[#71b9ff] border border-[#71b9ff]/40 shadow-[0_0_8px_rgba(113,185,255,0.25)]'
                  : 'text-[#7d8fa6] hover:text-white'
              }`}
              title="All decimal digits of F(n)"
            >
              Full F({matchResult?.n ?? 'n'})
            </button>
            {matchResult && matchResult.query.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setScope('query');
                }}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  scope === 'query'
                    ? 'bg-[#71b9ff]/20 text-[#71b9ff] border border-[#71b9ff]/40 shadow-[0_0_8px_rgba(113,185,255,0.25)]'
                  : 'text-[#7d8fa6] hover:text-white'
                }`}
                title="Only query digits"
              >
                Query
              </button>
            )}
          </div>

          {/* Chart Type Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/[0.06] text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setChartType('bar');
              }}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                chartType === 'bar' ? 'bg-[#f0c978]/20 text-[#f0c978]' : 'text-[#7d8fa6] hover:text-white'
              }`}
              title="Bar Histogram"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setChartType('donut');
              }}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                chartType === 'donut' ? 'bg-[#f0c978]/20 text-[#f0c978]' : 'text-[#7d8fa6] hover:text-white'
              }`}
              title="Radial Donut"
            >
              <PieChart className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Metric Toggle (Count vs %) */}
          {chartType === 'bar' && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setMetric((m) => (m === 'count' ? 'pct' : 'count'));
              }}
              className="px-2.5 py-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-[11px] font-mono text-[#c5d3e8] transition cursor-pointer"
            >
              {metric === 'count' ? 'Count (N)' : 'Percent (%)'}
            </button>
          )}

          {/* Copy Telemetry */}
          <button
            type="button"
            onClick={handleCopyDistribution}
            className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-[#c5d3e8] text-xs transition cursor-pointer"
            title="Copy Digit Breakdown JSON"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#a9c394]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Analytical Telemetry Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl flex flex-col">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#7d8fa6]">Analyzed Segment</span>
          <span className="text-sm sm:text-base font-mono font-bold text-white mt-0.5">
            {totalDigits.toLocaleString('en-US')}{' '}
            <span className="text-xs font-normal text-[#8e9cb0]">digits</span>
          </span>
        </div>

        <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl flex flex-col">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#7d8fa6]">Dominant Mode</span>
          <span className="text-sm sm:text-base font-mono font-bold mt-0.5 flex items-center gap-1.5" style={{ color: modeDigit.rule.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: modeDigit.rule.color }} />
            Digit {modeDigit.digit}{' '}
            <span className="text-xs font-normal text-[#8e9cb0]">({modeDigit.percentage.toFixed(1)}%)</span>
          </span>
        </div>

        <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl flex flex-col">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#7d8fa6]">Rarest Digit</span>
          <span className="text-sm sm:text-base font-mono font-bold mt-0.5 flex items-center gap-1.5" style={{ color: minDigit.rule.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: minDigit.rule.color }} />
            Digit {minDigit.digit}{' '}
            <span className="text-xs font-normal text-[#8e9cb0]">({minDigit.percentage.toFixed(1)}%)</span>
          </span>
        </div>

        <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl flex flex-col">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#7d8fa6]">Shannon Entropy</span>
          <span className="text-sm sm:text-base font-mono font-bold text-[#f0c978] mt-0.5">
            {entropy.toFixed(3)}{' '}
            <span className="text-xs font-normal text-[#8e9cb0]">({uniformityScore.toFixed(0)}% balance)</span>
          </span>
        </div>
      </div>

      {/* Main D3 Chart Canvas Container */}
      <div className="relative w-full overflow-hidden bg-[#05080f]/70 border border-white/[0.08] rounded-xl p-2 sm:p-4 mb-4">
        <svg
          ref={svgRef}
          viewBox="0 0 680 270"
          className="w-full h-auto max-h-[300px] select-none"
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Selected or Hovered Digit Live Telemetry Card */}
        <div className="mt-2 pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between text-xs font-mono text-[#99a9bf] px-2">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shadow-sm"
              style={{ backgroundColor: activeFocusStat.rule.color }}
            />
            <span className="font-bold text-white">Digit {activeFocusStat.digit}</span>
            <span className="text-[11px] text-[#7d8fa6]">({activeFocusStat.rule.name})</span>
            <span className="text-[#c5d3e8]">
              — {activeFocusStat.count} occurrences ({activeFocusStat.percentage.toFixed(2)}%)
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[#7d8fa6]">Deviation:</span>
            <span
              className={`font-semibold ${
                activeFocusStat.difference > 0
                  ? 'text-[#a9c394]'
                  : activeFocusStat.difference < 0
                  ? 'text-[#e4b5cb]'
                  : 'text-[#8e9cb0]'
              }`}
            >
              {activeFocusStat.difference > 0 ? '+' : ''}
              {activeFocusStat.difference.toFixed(2)}% vs uniform (10%)
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Segment Highlighting Stream */}
      <div className="p-3.5 bg-[#080d17] border border-white/[0.07] rounded-xl">
        <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-wider text-[#7d8fa6] mb-2">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-[#71b9ff]" />
            <span>Interactive Digit Stream Correlation</span>
          </span>
          <span>
            {selectedDigit !== null
              ? `Filtering Digit '${selectedDigit}' (${stats[selectedDigit].count} found)`
              : 'Hover chart or click digits below to illuminate'}
          </span>
        </div>

        {/* Interactive Segment String with Highlighting */}
        <div className="font-mono text-xs sm:text-[13px] leading-relaxed break-all select-text max-h-[96px] overflow-y-auto pr-1">
          {targetDigitString.slice(0, 360).split('').map((char, idx) => {
            const digitNum = parseInt(char, 10);
            const isMatch = !isNaN(digitNum) && (digitNum === hoveredDigit || digitNum === selectedDigit);
            const digitColor = !isNaN(digitNum) && DIGIT_RULES[digitNum] ? DIGIT_RULES[digitNum].color : '#c5d3e8';

            return (
              <span
                key={idx}
                onClick={() => {
                  if (!isNaN(digitNum)) {
                    setSelectedDigit((prev) => (prev === digitNum ? null : digitNum));
                    soundEngine.playClick();
                  }
                }}
                className={`transition-all duration-150 inline-block px-0.5 cursor-pointer rounded ${
                  isMatch
                    ? 'font-bold scale-110 shadow-[0_0_8px_rgba(255,255,255,0.3)] bg-white/15'
                    : 'text-[#8b9bb2] hover:text-white'
                }`}
                style={{
                  color: isMatch ? digitColor : undefined,
                  borderBottom: isMatch ? `2px solid ${digitColor}` : 'none',
                }}
              >
                {char}
              </span>
            );
          })}
          {targetDigitString.length > 360 && (
            <span className="text-[#657386] ml-1 font-sans text-xs">
              … +{(targetDigitString.length - 360).toLocaleString('en-US')} more digits
            </span>
          )}
        </div>

        {/* Quick Digits Pill Bar */}
        <div className="flex items-center justify-between gap-1 mt-3 pt-2.5 border-t border-white/[0.05] overflow-x-auto">
          <span className="text-[10px] font-mono text-[#657386] uppercase mr-1 shrink-0">Filter Digit:</span>
          <div className="flex items-center gap-1 shrink-0">
            {stats.map((s) => {
              const isSelected = selectedDigit === s.digit;
              const isHovered = hoveredDigit === s.digit;
              return (
                <button
                  key={s.digit}
                  type="button"
                  onClick={() => {
                    setSelectedDigit((prev) => (prev === s.digit ? null : s.digit));
                    soundEngine.playClick();
                  }}
                  onMouseEnter={() => setHoveredDigit(s.digit)}
                  onMouseLeave={() => setHoveredDigit(null)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-white/20 shadow-[0_0_8px_rgba(255,255,255,0.2)]'
                      : 'bg-white/[0.04] hover:bg-white/[0.08]'
                  }`}
                  style={{
                    color: isSelected || isHovered ? s.rule.color : '#8a99ad',
                    border: `1px solid ${isSelected ? s.rule.color : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.rule.color }} />
                  {s.digit}
                  <span className="text-[9px] font-normal opacity-70">({s.count})</span>
                </button>
              );
            })}
          </div>
          {selectedDigit !== null && (
            <button
              type="button"
              onClick={() => {
                setSelectedDigit(null);
                soundEngine.playClick();
              }}
              className="text-[10px] font-mono text-[#71b9ff] hover:underline ml-2 shrink-0"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
