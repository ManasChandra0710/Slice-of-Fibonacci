import React, { useEffect, useRef, useState } from 'react';
import { DIGIT_RULES, FibonacciMatchResult, MAX_SPIRAL_ORBS } from '../math/fibonacci';
import { ZoomIn, ZoomOut, RotateCcw, Compass, Sparkles } from 'lucide-react';

interface FibonacciResultCanvasProps {
  matchResult: FibonacciMatchResult;
}

interface ProjectedMatchNode {
  screenX: number;
  screenY: number;
  radius: number;
  digit: number;
  posInTerm: number;
  isMatched: boolean;
}

const GOLDEN_ANGLE = 2.399963229728653; // 137.507764° in radians

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 113;
  const g = parseInt(clean.substring(2, 4), 16) || 185;
  const b = parseInt(clean.substring(4, 6), 16) || 255;
  return [r, g, b];
}

const DIGIT_RGB: [number, number, number][] = DIGIT_RULES.map((r) => hexToRgb(r.color));

/**
 * FibonacciResultCanvas — Interactive 3D-Projected Harmonic Discovery Canvas
 *
 * Designed specifically for the Search Results section ("Your digits, discovered."):
 * - Maps up to 10,000 digits of the discovered Fibonacci term F(n) onto a 3D Golden-Angle
 *   harmonic field while elevating the exact matched sequence and its surrounding context
 *   digits into a crystal-clear foreground focal arc.
 * - Supports ultra-smooth 60fps damped camera transitions, interactive pan/tilt, zoom,
 *   hover digit inspection (with exact 1-based index in F(n)), and Reset View Position.
 */
export const FibonacciResultCanvas: React.FC<FibonacciResultCanvasProps> = ({
  matchResult,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hoveredNode, setHoveredNode] = useState<{
    digit: number;
    posInTerm: number;
    isMatched: boolean;
    color: string;
    name: string;
  } | null>(null);

  // Camera & interaction state stored in ref for zero-re-render 60fps animation
  const viewRef = useRef({
    targetZoom: 1.0,
    currentZoom: 0.68, // Starts slightly zoomed out for smooth fly-in on discovery
    targetPanX: 0,
    currentPanX: 0,
    targetPanY: 0,
    currentPanY: 0,
    targetYaw: 0,
    currentYaw: 0.35,
    targetTilt: 0.42,
    currentTilt: 0.65,
    discoveryIntro: 0, // 0 -> 1 smooth entrance progression
    isDragging: false,
    lastX: 0,
    lastY: 0,
    pinchDist: 0,
    mouseX: -9999,
    mouseY: -9999,
  });

  // Reset and trigger smooth fly-in whenever matchResult changes
  useEffect(() => {
    const v = viewRef.current;
    v.targetZoom = 1.0;
    v.currentZoom = 0.72;
    v.targetPanX = 0;
    v.currentPanX = 0;
    v.targetPanY = 0;
    v.currentPanY = 18;
    v.targetYaw = 0;
    v.currentYaw = -0.28;
    v.targetTilt = 0.42;
    v.currentTilt = 0.68;
    v.discoveryIntro = 0;
    setHoveredNode(null);
  }, [matchResult.query, matchResult.n, matchResult.pos]);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    viewRef.current.targetZoom = Math.min(2.6, viewRef.current.targetZoom * 1.24);
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    viewRef.current.targetZoom = Math.max(0.55, viewRef.current.targetZoom / 1.24);
  };

  const handleResetView = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = viewRef.current;
    v.targetZoom = 1.0;
    v.targetPanX = 0;
    v.targetPanY = 0;
    v.targetYaw = 0;
    v.targetTilt = 0.42;
    v.discoveryIntro = 0.25;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Build accurate sequence data up to 10,000 digits from the actual Fibonacci term F(n)
    const fullTerm = matchResult.before + matchResult.match + matchResult.after;
    const totalTermLen = fullTerm.length;
    const matchZeroIdx = matchResult.before.length;
    const matchLen = matchResult.match.length;

    // Window up to MAX_SPIRAL_ORBS (10,000) digits centered around the match for the 3D background field
    let windowStart = 0;
    let windowDigits = fullTerm;
    if (totalTermLen > MAX_SPIRAL_ORBS) {
      const half = Math.floor((MAX_SPIRAL_ORBS - matchLen) / 2);
      windowStart = Math.max(0, Math.min(totalTermLen - MAX_SPIRAL_ORBS, matchZeroIdx - half));
      windowDigits = fullTerm.slice(windowStart, windowStart + MAX_SPIRAL_ORBS);
    }
    const fieldCount = windowDigits.length;

    // For smooth 60fps rendering on very large terms (up to 10,000 digits), sample up to 900 representative
    // lattice nodes across the full window while ALWAYS including every matched digit and immediate context
    const maxLatticeNodes = Math.min(fieldCount, 850);
    const step = fieldCount > maxLatticeNodes ? fieldCount / maxLatticeNodes : 1;

    interface LatticePoint {
      termIndex0: number;
      digit: number;
      baseR: number;
      baseAngle: number;
      baseZ: number;
      isMatched: boolean;
    }

    const latticePoints: LatticePoint[] = [];
    for (let s = 0; s < maxLatticeNodes; s++) {
      const idxInWindow = Math.min(fieldCount - 1, Math.floor(s * step));
      const termIndex0 = windowStart + idxInWindow;
      const digit = windowDigits.charCodeAt(idxInWindow) - 48;
      const safeDigit = digit >= 0 && digit <= 9 ? digit : 0;
      const norm = (s + 1) / maxLatticeNodes;
      const angle = idxInWindow * GOLDEN_ANGLE;
      const radius = 28 + Math.sqrt(norm) * 235;
      const zWave = Math.sin(norm * Math.PI * 3.5 + angle * 0.25) * 22;
      const isMatched =
        termIndex0 >= matchZeroIdx && termIndex0 < matchZeroIdx + matchLen;

      latticePoints.push({
        termIndex0,
        digit: safeDigit,
        baseR: radius,
        baseAngle: angle,
        baseZ: zWave,
        isMatched,
      });
    }

    // Build foreground Focal Discovery Arc: up to 4 context digits before + all matched digits + up to 4 context digits after
    const contextBeforeCount = Math.min(4, matchResult.before.length);
    const contextAfterCount = Math.min(4, matchResult.after.length);

    interface FocalNode {
      digit: number;
      posInTerm1: number; // 1-based position in F(n)
      isMatched: boolean;
      matchOffset: number; // -4..-1 before, 0..matchLen-1 matched, etc.
      relSlot: number; // centered slot index
    }

    const focalNodes: FocalNode[] = [];
    const totalFocal = contextBeforeCount + matchLen + contextAfterCount;
    const centerSlot = (totalFocal - 1) / 2;

    for (let i = 0; i < totalFocal; i++) {
      const termIdx0 = matchZeroIdx - contextBeforeCount + i;
      const ch = fullTerm.charCodeAt(termIdx0) - 48;
      const digit = ch >= 0 && ch <= 9 ? ch : 0;
      const isMatched = i >= contextBeforeCount && i < contextBeforeCount + matchLen;
      const matchOffset = i - contextBeforeCount;

      focalNodes.push({
        digit,
        posInTerm1: termIdx0 + 1,
        isMatched,
        matchOffset,
        relSlot: i - centerSlot,
      });
    }

    let width = container.clientWidth || 800;
    let height = container.clientHeight || 300;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const updateSize = () => {
      if (!container || !canvas) return;
      width = container.clientWidth || 800;
      height = container.clientHeight || 300;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };
    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    let projectedInteractiveNodes: ProjectedMatchNode[] = [];
    let lastHoveredKey = '';

    // Pointer interaction handlers
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      viewRef.current.isDragging = true;
      viewRef.current.lastX = e.clientX;
      viewRef.current.lastY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      viewRef.current.mouseX = mx;
      viewRef.current.mouseY = my;

      if (viewRef.current.isDragging) {
        const dx = e.clientX - viewRef.current.lastX;
        const dy = e.clientY - viewRef.current.lastY;
        viewRef.current.lastX = e.clientX;
        viewRef.current.lastY = e.clientY;

        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          viewRef.current.targetYaw += dx * 0.007;
          viewRef.current.targetTilt = Math.max(
            0.12,
            Math.min(1.15, viewRef.current.targetTilt + dy * 0.006)
          );
        } else {
          viewRef.current.targetPanX = Math.max(
            -260,
            Math.min(260, viewRef.current.targetPanX + dx)
          );
          viewRef.current.targetPanY = Math.max(
            -130,
            Math.min(130, viewRef.current.targetPanY + dy)
          );
          viewRef.current.targetYaw += dx * 0.0022;
        }
        return;
      }

      // Check hover against focal nodes
      let found: ProjectedMatchNode | null = null;
      for (let i = projectedInteractiveNodes.length - 1; i >= 0; i--) {
        const node = projectedInteractiveNodes[i];
        const dist = Math.hypot(mx - node.screenX, my - node.screenY);
        if (dist <= node.radius + 8) {
          found = node;
          break;
        }
      }

      const nextKey = found ? `${found.posInTerm}:${found.digit}` : '';
      if (nextKey !== lastHoveredKey) {
        lastHoveredKey = nextKey;
        if (found) {
          const rule = DIGIT_RULES[found.digit];
          setHoveredNode({
            digit: found.digit,
            posInTerm: found.posInTerm,
            isMatched: found.isMatched,
            color: rule.color,
            name: rule.name,
          });
        } else {
          setHoveredNode(null);
        }
      }
    };

    const onPointerUp = () => {
      viewRef.current.isDragging = false;
    };

    const onPointerLeave = () => {
      viewRef.current.isDragging = false;
      viewRef.current.mouseX = -9999;
      viewRef.current.mouseY = -9999;
      if (lastHoveredKey !== '') {
        lastHoveredKey = '';
        setHoveredNode(null);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.09 : 0.92;
        viewRef.current.targetZoom = Math.max(
          0.55,
          Math.min(2.6, viewRef.current.targetZoom * factor)
        );
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    let animId: number;
    let lastTime = performance.now();

    const render = (now: number) => {
      animId = requestAnimationFrame(render);
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const t = now * 0.001;

      const v = viewRef.current;
      // Exponential smoothing for silky 60fps camera movement
      const damp = 1 - Math.exp(-8.5 * dt);
      v.currentZoom += (v.targetZoom - v.currentZoom) * damp;
      v.currentPanX += (v.targetPanX - v.currentPanX) * damp;
      v.currentPanY += (v.targetPanY - v.currentPanY) * damp;
      v.currentYaw += (v.targetYaw - v.currentYaw) * damp;
      v.currentTilt += (v.targetTilt - v.currentTilt) * damp;
      v.discoveryIntro = Math.min(1, v.discoveryIntro + dt * 1.35);

      const introEase = 1 - Math.pow(1 - v.discoveryIntro, 3);

      ctx.save();
      ctx.scale(dpr, dpr);

      const cx = width * 0.5 + v.currentPanX;
      const cy = height * 0.52 + v.currentPanY;
      const zoom = v.currentZoom;

      // 1. Deep Obsidian & Electric Blue Cosmic Canvas Background
      const bgGrad = ctx.createRadialGradient(
        cx,
        cy - 15,
        10,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.72
      );
      bgGrad.addColorStop(0, '#0c1b36');
      bgGrad.addColorStop(0.48, '#070e1d');
      bgGrad.addColorStop(1, '#04070e');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Subtle Golden-Ratio Harmonic Rings in 3D Perspective
      const cosTilt = Math.cos(v.currentTilt);
      const sinTilt = Math.sin(v.currentTilt);
      const ambientYaw = v.currentYaw + t * 0.055;

      ctx.save();
      ctx.translate(cx, cy);
      const ringRadii = [68, 110, 178, 288];
      ringRadii.forEach((r, idx) => {
        const rx = r * zoom;
        const ry = r * zoom * Math.max(0.28, cosTilt);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle =
          idx === 1
            ? 'rgba(113, 185, 255, 0.18)'
            : 'rgba(113, 185, 255, 0.07)';
        ctx.lineWidth = idx === 1 ? 1.2 : 1;
        if (idx % 2 === 0) {
          ctx.setLineDash([4, 7]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();

      // 3. Render 3D Golden-Angle Lattice Field representing F(n)'s digits
      for (let i = 0; i < latticePoints.length; i++) {
        const pt = latticePoints[i];
        const a = pt.baseAngle + ambientYaw;
        const wx = Math.cos(a) * pt.baseR;
        const wy = Math.sin(a) * pt.baseR;
        const wz = pt.baseZ;

        // 3D Tilt projection
        const py3d = wy * cosTilt - wz * sinTilt;
        const pz3d = wy * sinTilt + wz * cosTilt;
        const perspective = 520 / Math.max(180, 520 + pz3d);

        const sx = cx + wx * zoom * perspective;
        const sy = cy + py3d * zoom * perspective;

        if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) continue;

        const [r, g, b] = DIGIT_RGB[pt.digit];
        const depthAlpha = Math.max(0.12, Math.min(0.62, (perspective - 0.65) * 0.95));
        const dotR = (pt.isMatched ? 3.2 : 1.75) * zoom * perspective;

        ctx.beginPath();
        ctx.arc(sx, sy, dotR, 0, Math.PI * 2);
        ctx.fillStyle = pt.isMatched
          ? `rgba(158, 203, 255, ${Math.min(0.95, depthAlpha * 1.8)})`
          : `rgba(${r}, ${g}, ${b}, ${depthAlpha * 0.52})`;
        ctx.fill();
      }

      // 4. Harmonic Sine/Phi Resonance Wave behind the Focal Sequence
      ctx.save();
      ctx.beginPath();
      const waveSpan = Math.min(width * 0.86, 680) * zoom;
      const waveStartX = cx - waveSpan * 0.5;
      const waveSteps = 84;
      for (let s = 0; s <= waveSteps; s++) {
        const f = s / waveSteps;
        const wx = waveStartX + f * waveSpan;
        const envelope = Math.sin(f * Math.PI);
        const wy =
          cy +
          Math.sin(f * Math.PI * 4 - t * 2.2) * 14 * envelope * zoom * introEase;
        if (s === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.strokeStyle = 'rgba(113, 185, 255, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 5. Compute & Render Foreground Focal Discovery Arc (Context + Matched Sequence)
      const mobileCompact = width < 540;
      const baseSpacing = mobileCompact
        ? Math.min(44, Math.max(26, (width - 44) / Math.max(6, focalNodes.length)))
        : Math.min(58, Math.max(34, (width - 96) / Math.max(7, focalNodes.length)));
      const nodeSpacing = baseSpacing * zoom;

      const nextInteractive: ProjectedMatchNode[] = [];
      const matchedScreenPts: { x: number; y: number; color: string }[] = [];

      // First pass: calculate positions for conduit lines
      const computedFocal = focalNodes.map((fn) => {
        const arcX = cx + fn.relSlot * nodeSpacing * (0.7 + 0.3 * introEase);
        const normalizedArc = fn.relSlot / Math.max(1, focalNodes.length * 0.5);
        const arcCurveY = Math.pow(normalizedArc, 2) * 18 * zoom;
        const floatY = fn.isMatched
          ? Math.sin(t * 2.4 + fn.matchOffset * 0.55) * 3.2 * zoom
          : 0;
        const arcY = cy + arcCurveY + floatY - (fn.isMatched ? 6 * zoom : 0);

        const baseRadius = fn.isMatched
          ? mobileCompact
            ? 15.5
            : 20.5
          : mobileCompact
          ? 10.5
          : 13.0;
        const radius = baseRadius * zoom * (0.65 + 0.35 * introEase);

        if (fn.isMatched) {
          matchedScreenPts.push({
            x: arcX,
            y: arcY,
            color: DIGIT_RULES[fn.digit].color,
          });
        }

        nextInteractive.push({
          screenX: arcX,
          screenY: arcY,
          radius,
          digit: fn.digit,
          posInTerm: fn.posInTerm1,
          isMatched: fn.isMatched,
        });

        return {
          ...fn,
          x: arcX,
          y: arcY,
          radius,
        };
      });

      projectedInteractiveNodes = nextInteractive;

      // Draw subtle connector line across all focal nodes
      if (computedFocal.length > 1) {
        ctx.save();
        ctx.beginPath();
        computedFocal.forEach((n, idx) => {
          if (idx === 0) ctx.moveTo(n.x, n.y);
          else ctx.lineTo(n.x, n.y);
        });
        ctx.strokeStyle = 'rgba(113, 185, 255, 0.18)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // Draw luminous electric-blue conduit & traveling light pulse across the matched sequence
      if (matchedScreenPts.length > 1) {
        ctx.save();
        ctx.beginPath();
        matchedScreenPts.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.strokeStyle = 'rgba(113, 185, 255, 0.78)';
        ctx.lineWidth = 3 * zoom;
        ctx.shadowColor = '#71b9ff';
        ctx.shadowBlur = 14;
        ctx.stroke();

        // Traveling harmonic photon pulse along matched digits
        const segCount = matchedScreenPts.length - 1;
        const pulsePos = ((t * 1.15) % 1) * segCount;
        const segIdx = Math.min(segCount - 1, Math.floor(pulsePos));
        const segFrac = pulsePos - segIdx;
        const p0 = matchedScreenPts[segIdx];
        const p1 = matchedScreenPts[segIdx + 1];
        const px = p0.x + (p1.x - p0.x) * segFrac;
        const py = p0.y + (p1.y - p0.y) * segFrac;

        const pulseGrad = ctx.createRadialGradient(px, py, 0, px, py, 14 * zoom);
        pulseGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        pulseGrad.addColorStop(0.45, 'rgba(113, 185, 255, 0.65)');
        pulseGrad.addColorStop(1, 'rgba(113, 185, 255, 0)');
        ctx.fillStyle = pulseGrad;
        ctx.beginPath();
        ctx.arc(px, py, 14 * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 6. Render each Focal Orb (Context Digits + Highlighted Matched Digits with Saturn Rings)
      computedFocal.forEach((node) => {
        const rule = DIGIT_RULES[node.digit];
        const [r, g, b] = DIGIT_RGB[node.digit];
        const isHovered =
          lastHoveredKey === `${node.posInTerm1}:${node.digit}`;
        const orbR = node.radius * (isHovered ? 1.14 : 1.0);

        ctx.save();

        if (node.isMatched) {
          // Outer radial electric-blue & digit-tinted aura
          const haloR = orbR * 2.35;
          const haloGrad = ctx.createRadialGradient(
            node.x,
            node.y,
            orbR * 0.3,
            node.x,
            node.y,
            haloR
          );
          haloGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.45)`);
          haloGrad.addColorStop(0.5, 'rgba(113, 185, 255, 0.18)');
          haloGrad.addColorStop(1, 'rgba(113, 185, 255, 0)');
          ctx.fillStyle = haloGrad;
          ctx.beginPath();
          ctx.arc(node.x, node.y, haloR, 0, Math.PI * 2);
          ctx.fill();

          // Back half of tilted Saturn-like planetary ring
          const ringTilt = -0.32 + Math.sin(t * 0.8 + node.matchOffset * 0.5) * 0.06;
          ctx.save();
          ctx.translate(node.x, node.y);
          ctx.rotate(ringTilt);
          ctx.beginPath();
          ctx.ellipse(0, 0, orbR * 1.68, orbR * 0.52, 0, Math.PI, Math.PI * 2);
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.55)`;
          ctx.lineWidth = Math.max(1.5, 2.2 * zoom);
          ctx.stroke();
          ctx.restore();
        }

        // 3D Refractive Glass Sphere Body
        const sphereGrad = ctx.createRadialGradient(
          node.x - orbR * 0.34,
          node.y - orbR * 0.34,
          orbR * 0.08,
          node.x,
          node.y,
          orbR
        );

        if (node.isMatched) {
          sphereGrad.addColorStop(0, '#ffffff');
          sphereGrad.addColorStop(0.32, rule.color);
          sphereGrad.addColorStop(0.78, `rgba(${Math.round(r * 0.55)}, ${Math.round(g * 0.55)}, ${Math.round(b * 0.65)}, 0.96)`);
          sphereGrad.addColorStop(1, '#09152b');
        } else {
          sphereGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.55)`);
          sphereGrad.addColorStop(0.65, `rgba(${Math.round(r * 0.35)}, ${Math.round(g * 0.35)}, ${Math.round(b * 0.45)}, 0.48)`);
          sphereGrad.addColorStop(1, 'rgba(7, 13, 25, 0.75)');
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, orbR, 0, Math.PI * 2);
        ctx.fillStyle = sphereGrad;
        ctx.fill();

        // Crisp rim highlight
        ctx.lineWidth = node.isMatched ? 1.8 : 1.0;
        ctx.strokeStyle = node.isMatched
          ? isHovered
            ? '#ffffff'
            : 'rgba(220, 240, 255, 0.85)'
          : 'rgba(113, 185, 255, 0.25)';
        ctx.stroke();

        // Specular glass highlight crescent
        ctx.beginPath();
        ctx.arc(
          node.x - orbR * 0.28,
          node.y - orbR * 0.28,
          orbR * 0.26,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = node.isMatched
          ? 'rgba(255, 255, 255, 0.52)'
          : 'rgba(255, 255, 255, 0.18)';
        ctx.fill();

        // Front half of tilted Saturn-like planetary ring (passes in front of the sphere)
        if (node.isMatched) {
          const ringTilt = -0.32 + Math.sin(t * 0.8 + node.matchOffset * 0.5) * 0.06;
          ctx.save();
          ctx.translate(node.x, node.y);
          ctx.rotate(ringTilt);
          ctx.beginPath();
          ctx.ellipse(0, 0, orbR * 1.68, orbR * 0.52, 0, 0, Math.PI);
          ctx.strokeStyle = 'rgba(225, 242, 255, 0.92)';
          ctx.lineWidth = Math.max(1.8, 2.5 * zoom);
          ctx.shadowColor = rule.color;
          ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.restore();
        }

        // Digit numeral inside the orb
        const fontSize = Math.max(
          10,
          Math.round(orbR * (node.isMatched ? 0.92 : 0.84))
        );
        ctx.font = `bold ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = node.isMatched ? '#040812' : 'rgba(205, 222, 242, 0.72)';
        if (node.isMatched) {
          // Subtle white halo behind dark numeral or crisp dark pill for contrast
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(4, 8, 18, 0.95)';
          ctx.shadowBlur = 6;
        }
        ctx.fillText(String(node.digit), node.x, node.y + 0.5);
        ctx.shadowBlur = 0;

        // 1-based digit index label underneath matched orbs (first, last, or hovered, or all when spacing permits)
        const showPosLabel =
           isHovered ||
          (node.isMatched &&
            (nodeSpacing >= 44 ||
              node.matchOffset === 0 ||
              node.matchOffset === matchLen - 1));

        if (showPosLabel) {
          const labelY = node.y + orbR + 15 * zoom;
          ctx.font = `600 ${Math.max(9, Math.round(10 * Math.min(1.2, zoom)))}px ui-monospace, SFMono-Regular, monospace`;
          ctx.fillStyle = node.isMatched
            ? 'rgba(158, 203, 255, 0.92)'
            : 'rgba(125, 143, 166, 0.75)';
          ctx.fillText(`${node.posInTerm1.toLocaleString('en-US')}`, node.x, labelY);
        }

        ctx.restore();
      });

      ctx.restore();
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [matchResult]);

  return (
    <div className="mb-6 rounded-2xl bg-[#070c17] border border-[#71b9ff]/25 shadow-[0_18px_45px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden">
      {/* Top Bar: YOUR NUMBER + Orb Trail Summary */}
      <div className="px-4 sm:px-5 py-3.5 bg-[#091120]/90 border-b border-white/[0.07] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#7d8fa6]">
              YOUR NUMBER
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-[0.12em] text-[#71b9ff] mt-0.5">
              {matchResult.query}
            </div>
          </div>

          <div className="hidden sm:block h-7 w-px bg-white/[0.08]" />

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-[#8ea3be]">
            <Sparkles className="w-3.5 h-3.5 text-[#71b9ff]" />
            <span>
              Digits <strong className="text-[#71b9ff]">{matchResult.pos.toLocaleString('en-US')}</strong>
              {matchResult.query.length > 1
                ? `–${(matchResult.pos + matchResult.query.length - 1).toLocaleString('en-US')}`
                : ''}{' '}
              inside <strong className="text-[#71b9ff]">F({matchResult.n.toLocaleString('en-US')})</strong>
            </span>
          </div>
        </div>

        {/* Mini Glass Orb Sequence Strip */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-black/45 border border-white/[0.07]">
          {matchResult.trailDigits.map((d, idx) => {
            const rule = DIGIT_RULES[d];
            return (
              <div key={idx} className="flex items-center gap-1">
                <span
                  className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full glass-orb shrink-0"
                  style={{
                    backgroundColor: rule.color,
                    color: rule.color,
                  }}
                />
                <span className="font-mono text-[11px] font-bold text-white">{d}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive 3D Harmonic Result Canvas Viewport */}
      <div
        ref={containerRef}
        className="relative w-full h-[250px] sm:h-[290px] select-none cursor-grab active:cursor-grabbing overflow-hidden"
      >
        <canvas ref={canvasRef} className="block w-full h-full" />

        {/* Hover Digit Telemetry Pill */}
        {hoveredNode && (
          <div className="absolute left-3.5 top-3.5 px-3 py-1.5 rounded-xl bg-[#081121]/95 border border-[#71b9ff]/45 text-xs font-mono text-white shadow-[0_8px_24px_rgba(0,0,0,0.6)] pointer-events-none flex items-center gap-2 animate-rise z-10">
            <span
              className="w-3 h-3 rounded-full glass-orb shrink-0"
              style={{
                backgroundColor: hoveredNode.color,
                color: hoveredNode.color,
              }}
            />
            <span>
              Digit <strong className="text-[#71b9ff]">{hoveredNode.digit}</strong>
            </span>
            <span className="text-white/30">·</span>
            <span className="text-[#9eb2cc]">
              Position <strong className="text-[#71b9ff]">{hoveredNode.posInTerm.toLocaleString('en-US')}</strong>
            </span>
            <span className="text-white/30">·</span>
            <span className="text-[10px] uppercase tracking-wider text-[#71b9ff]">
              {hoveredNode.isMatched ? 'Matched Sequence' : 'Surrounding Context'}
            </span>
          </div>
        )}

        {/* Bottom-Left Subtle Legend */}
        <div className="absolute left-3.5 bottom-3 text-[10px] sm:text-[11px] font-mono text-[#7d8fa6] pointer-events-none flex items-center gap-2 z-10">
          <span className="px-2 py-0.5 rounded-md bg-[#0b1426]/90 border border-white/10 text-[#9bd3ff] flex items-center gap-1.5">
            <Compass className="w-3 h-3 text-[#71b9ff]" />
            <span>Harmonic Focus</span>
          </span>
          <span className="hidden sm:inline">
            Drag to pan · Scroll to zoom · Hover orbs to inspect digit index
          </span>
        </div>

        {/* Bottom-Right Canvas Controls */}
        <div className="absolute right-3.5 bottom-3 flex items-center gap-1.5 z-10">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In Result Canvas"
            aria-label="Zoom In Result Canvas"
            className="w-7 h-7 rounded-lg bg-[#0d1628]/90 border border-white/10 hover:border-[#71b9ff] text-[#8e96a5] hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out Result Canvas"
            aria-label="Zoom Out Result Canvas"
            className="w-7 h-7 rounded-lg bg-[#0d1628]/90 border border-white/10 hover:border-[#71b9ff] text-[#8e96a5] hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            title="Reset Result Canvas View"
            aria-label="Reset Result Canvas View"
            className="w-7 h-7 rounded-lg bg-[#0d1628]/90 border border-white/10 hover:border-[#71b9ff] text-[#8e96a5] hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
