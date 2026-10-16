import { FibonacciMatchResult } from '../math/fibonacci';

export const ORIGINAL_HOMEPAGE_URL = 'https://slice-of-fibonacci.vercel.app/';
export const SHARE_CAPTION = 'Find where your number hides in the Fibonacci Sequence:';

export interface GeneratedShareCard {
  canvas: HTMLCanvasElement;
  blob: Blob;
  dataUrl: string;
  file: File;
}

export function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function hexToRgba(hex: string, alpha: number = 1): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Generates a high-resolution 1080x1350 share card featuring:
 * 1. Organic Golden-Ratio Nautilus Shell cross-section with 35 chambers & Vogel Sunflower Phyllotaxis core
 * 2. The searched number and its complete telemetry (Term, Position in Term, Stream Position)
 * 3. The continuous Fibonacci stream ribbon with highlighted query
 * 4. The exact original website URL and caption:
 *    "Find where your number hides in the Fibonacci Sequence:"
 *    https://slice-of-fibonacci.vercel.app/
 */
export async function generateShareCard(
  result: FibonacciMatchResult
): Promise<GeneratedShareCard> {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable');
  }

  // --- 1. Background Cosmic Dark Theme ---
  const bgGrad = ctx.createRadialGradient(
    width / 2,
    300,
    50,
    width / 2,
    height / 2,
    height * 0.75
  );
  bgGrad.addColorStop(0, '#0c1527');
  bgGrad.addColorStop(0.45, '#070c17');
  bgGrad.addColorStop(1, '#03050a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Soft atmospheric glows
  const topGlow = ctx.createRadialGradient(width / 2, 280, 20, width / 2, 280, 300);
  topGlow.addColorStop(0, 'rgba(113, 185, 255, 0.16)');
  topGlow.addColorStop(0.5, 'rgba(240, 201, 120, 0.08)');
  topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, width, 600);

  // Delicate decorative borders
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  ctx.strokeStyle = 'rgba(240, 201, 120, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(44, 44, width - 88, height - 88);

  // --- 2. Top Visual: Organic Golden-Ratio Nautilus Shell & Phyllotaxis Harmony ---
  // A museum-grade organic representation connecting Fibonacci mathematics to nature:
  // - Cross-section of a Nautilus pompilius shell with 35 logarithmic camerae (chambers)
  // - Curved convex septa walls, continuous siphuncular buoyancy tube, and nacreous pearl beads
  // - Bioluminescent oceanic sapphire, electric cyan, and golden amber nacre gradients
  // - Organic growth striations and an embryonic Vogel sunflower phyllotaxis floret core
  const discCenterX = width / 2;
  const discCenterY = 275;
  const discRadius = 195;

  // Layer A: Deep celestial nebula backdrop
  const nebulaGlow = ctx.createRadialGradient(
    discCenterX,
    discCenterY,
    0,
    discCenterX,
    discCenterY,
    discRadius + 28
  );
  nebulaGlow.addColorStop(0, 'rgba(113, 185, 255, 0.18)');
  nebulaGlow.addColorStop(0.35, 'rgba(14, 25, 48, 0.95)');
  nebulaGlow.addColorStop(0.7, 'rgba(8, 14, 26, 0.7)');
  nebulaGlow.addColorStop(1, 'rgba(3, 5, 10, 0)');
  ctx.fillStyle = nebulaGlow;
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, discRadius + 28, 0, Math.PI * 2);
  ctx.fill();

  // Subtle outer golden celestial boundary rings (Golden ratio divisions: 1.0, 0.618)
  ctx.save();
  ctx.strokeStyle = 'rgba(240, 201, 120, 0.16)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, discRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(113, 185, 255, 0.2)';
  ctx.setLineDash([2, 5]);
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, discRadius * 0.6180339887, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Celestial stardust field (Vogel golden-angle distribution)
  ctx.save();
  const goldenAngleRad = 137.50776405 * (Math.PI / 180);
  for (let s = 0; s < 90; s++) {
    const starAngle = s * goldenAngleRad;
    const starDist = Math.sqrt(s / 90) * (discRadius - 6);
    const sx = discCenterX + Math.cos(starAngle) * starDist;
    const sy = discCenterY + Math.sin(starAngle) * starDist;
    ctx.fillStyle = s % 4 === 0 ? '#f0c978' : '#71b9ff';
    ctx.globalAlpha = 0.12 + (s % 5) * 0.08;
    ctx.beginPath();
    ctx.arc(sx, sy, (s % 7 === 0) ? 1.5 : 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Layer B: Nautilus Logarithmic Geometry Setup
  // Shell expansion constant b ~ 0.175 produces a classic golden logarithmic whorl
  const b = 0.175;
  const rot = 45 * (Math.PI / 180); // 45-degree rotation balances width and height into a circular frame
  const thetaEnd = 5.6 * Math.PI;

  const getRout = (t: number) => Math.exp(b * t);
  const getRin = (t: number) => {
    if (t >= 2 * Math.PI) return Math.exp(b * (t - 2 * Math.PI));
    return Math.exp(b * t) * Math.max(0.12, (t / (2 * Math.PI)) * Math.exp(-2 * Math.PI * b));
  };

  // Precompute bounds to center the nautilus shell inside the visual disc
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let t = 0; t <= thetaEnd; t += 0.02) {
    const r = getRout(t);
    const x = r * Math.cos(t + rot);
    const y = r * Math.sin(t + rot);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const w = maxX - minX;
  const h = maxY - minY;
  const targetSize = 345;
  const scale = targetSize / Math.max(w, h);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const originX = discCenterX - midX * scale;
  const originY = discCenterY - midY * scale;

  const toCanvas = (r: number, t: number): [number, number] => [
    originX + scale * r * Math.cos(t + rot),
    originY + scale * r * Math.sin(t + rot),
  ];

  // Layer C: Partition the whorl into 35 organic camerae (chambers)
  interface ChamberDef {
    t0: number;
    t1: number;
    progress: number;
  }
  const chambers: ChamberDef[] = [];
  let curTheta = 1.6 * Math.PI;
  while (curTheta < thetaEnd) {
    const progress = (curTheta - 1.6 * Math.PI) / (thetaEnd - 1.6 * Math.PI);
    const step = 0.28 + progress * 0.18; // Exponential chamber growth
    const nextTheta = Math.min(thetaEnd, curTheta + step);
    chambers.push({ t0: curTheta, t1: nextTheta, progress });
    curTheta = nextTheta;
  }

  // Draw each chamber cavity with glowing nacre gradients
  chambers.forEach((ch) => {
    const { t0, t1, progress } = ch;
    ctx.save();
    ctx.beginPath();

    // 1. Outer curved wall from t0 to t1
    const stepsOuter = 7;
    for (let i = 0; i <= stepsOuter; i++) {
      const t = t0 + (t1 - t0) * (i / stepsOuter);
      const [px, py] = toCanvas(getRout(t), t);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    // 2. Distal septum curving convexly toward the aperture
    const [inX1, inY1] = toCanvas(getRin(t1), t1);
    const rMid1 = 0.52 * getRin(t1) + 0.48 * getRout(t1);
    const [ctrlX1, ctrlY1] = toCanvas(rMid1, t1 + 0.15);
    ctx.quadraticCurveTo(ctrlX1, ctrlY1, inX1, inY1);

    // 3. Inner curved wall from t1 back to t0
    const stepsInner = 7;
    for (let i = stepsInner; i >= 0; i--) {
      const t = t0 + (t1 - t0) * (i / stepsInner);
      const [px, py] = toCanvas(getRin(t), t);
      ctx.lineTo(px, py);
    }

    // 4. Proximal septum from t0 inner to t0 outer
    const [outX0, outY0] = toCanvas(getRout(t0), t0);
    const rMid0 = 0.52 * getRin(t0) + 0.48 * getRout(t0);
    const [ctrlX0, ctrlY0] = toCanvas(rMid0, t0 + 0.15);
    ctx.quadraticCurveTo(ctrlX0, ctrlY0, outX0, outY0);
    ctx.closePath();

    // Chamber gradient coloring:
    // Outer mature chambers: deep cosmic sapphire with electric cyan bioluminescence
    // Mid chambers: oceanic indigo with cerulean pearl
    // Inner early chambers: warm golden amber nacre
    const tMid = (t0 + t1) / 2;
    const [gradP0X, gradP0Y] = toCanvas(getRin(tMid), tMid);
    const [gradP1X, gradP1Y] = toCanvas(getRout(tMid), tMid);
    const chGrad = ctx.createLinearGradient(gradP0X, gradP0Y, gradP1X, gradP1Y);

    if (progress > 0.65) {
      // Living & mature chambers
      chGrad.addColorStop(0, 'rgba(8, 16, 36, 0.96)');
      chGrad.addColorStop(0.45, 'rgba(18, 48, 100, 0.82)');
      chGrad.addColorStop(0.85, 'rgba(38, 100, 180, 0.42)');
      chGrad.addColorStop(1, 'rgba(113, 185, 255, 0.25)');
    } else if (progress > 0.28) {
      // Middle chambers
      chGrad.addColorStop(0, 'rgba(6, 12, 28, 0.96)');
      chGrad.addColorStop(0.5, 'rgba(14, 34, 76, 0.85)');
      chGrad.addColorStop(0.88, 'rgba(28, 70, 140, 0.35)');
      chGrad.addColorStop(1, 'rgba(90, 160, 240, 0.22)');
    } else {
      // Early embryonic chambers with golden nacre warmth
      chGrad.addColorStop(0, 'rgba(10, 16, 32, 0.95)');
      chGrad.addColorStop(0.45, 'rgba(80, 55, 20, 0.65)');
      chGrad.addColorStop(0.85, 'rgba(240, 201, 120, 0.35)');
      chGrad.addColorStop(1, 'rgba(255, 225, 150, 0.28)');
    }

    ctx.fillStyle = chGrad;
    ctx.fill();

    // Subtle nacreous organic growth lines inside chamber
    if (progress > 0.2) {
      ctx.strokeStyle = progress > 0.6 ? 'rgba(113, 185, 255, 0.08)' : 'rgba(240, 201, 120, 0.07)';
      ctx.lineWidth = 0.8;
      for (let s = 1; s <= 2; s++) {
        const tSub = t0 + (t1 - t0) * (s / 3);
        const [subInX, subInY] = toCanvas(getRin(tSub), tSub);
        const [subOutX, subOutY] = toCanvas(getRout(tSub), tSub);
        const rSubMid = 0.52 * getRin(tSub) + 0.48 * getRout(tSub);
        const [subCtrlX, subCtrlY] = toCanvas(rSubMid, tSub + 0.15);
        ctx.beginPath();
        ctx.moveTo(subOutX, subOutY);
        ctx.quadraticCurveTo(subCtrlX, subCtrlY, subInX, subInY);
        ctx.stroke();
      }
    }
    ctx.restore();
  });

  // Layer D: Glowing Septa Partition Walls (Chamber Ribs)
  chambers.forEach((ch) => {
    const { t1, progress } = ch;
    const [outX, outY] = toCanvas(getRout(t1), t1);
    const [inX, inY] = toCanvas(getRin(t1), t1);
    const rMid = 0.52 * getRin(t1) + 0.48 * getRout(t1);
    const [ctrlX, ctrlY] = toCanvas(rMid, t1 + 0.15);

    ctx.save();
    // Ambient soft blue septal glow
    ctx.strokeStyle = 'rgba(113, 185, 255, 0.38)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(outX, outY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, inX, inY);
    ctx.stroke();

    // Crisp mother-of-pearl spine
    ctx.strokeStyle = progress < 0.25 ? 'rgba(240, 201, 120, 0.88)' : 'rgba(220, 238, 255, 0.82)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.restore();
  });

  // Layer E: Continuous Siphuncle Buoyancy Canal & Pearl Nodes
  // A golden thread puncturing each septum, characteristic of living Cephalopoda
  ctx.save();
  ctx.strokeStyle = 'rgba(240, 201, 120, 0.72)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  let firstSiph = true;
  for (let t = 1.5 * Math.PI; t <= thetaEnd - 0.15; t += 0.05) {
    const rIn = getRin(t);
    const rOut = getRout(t);
    const rSiph = rIn + 0.28 * (rOut - rIn);
    const [sx, sy] = toCanvas(rSiph, t);
    if (firstSiph) {
      ctx.moveTo(sx, sy);
      firstSiph = false;
    } else {
      ctx.lineTo(sx, sy);
    }
  }
  ctx.stroke();

  // Siphuncular luminous pearl beads at each septum intersection
  chambers.forEach((ch) => {
    const { t1, progress } = ch;
    const rIn = getRin(t1);
    const rOut = getRout(t1);
    const rSiph = rIn + 0.28 * (rOut - rIn);
    const [bx, by] = toCanvas(rSiph, t1);

    const beadR = 1.6 + progress * 1.5;
    const beadGrad = ctx.createRadialGradient(bx - 0.5, by - 0.5, 0.2, bx, by, beadR);
    beadGrad.addColorStop(0, '#ffffff');
    beadGrad.addColorStop(0.4, '#f0c978');
    beadGrad.addColorStop(1, 'rgba(113, 185, 255, 0.6)');
    ctx.fillStyle = beadGrad;
    ctx.beginPath();
    ctx.arc(bx, by, beadR, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // Layer F: Solid Shell Outer Mantle & Aperture Lip
  ctx.save();
  // Ambient outer aura
  ctx.strokeStyle = 'rgba(113, 185, 255, 0.32)';
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  for (let t = 0.4 * Math.PI; t <= thetaEnd; t += 0.04) {
    const [px, py] = toCanvas(getRout(t), t);
    if (t === 0.4 * Math.PI) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Golden nacre core mantle line
  ctx.strokeStyle = 'rgba(240, 201, 120, 0.9)';
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Crisp pearlescent highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // Aperture living lip (grand opening)
  const [apOutX, apOutY] = toCanvas(getRout(thetaEnd), thetaEnd);
  const [apInX, apInY] = toCanvas(getRin(thetaEnd), thetaEnd);
  const apMidR = 0.5 * (getRin(thetaEnd) + getRout(thetaEnd));
  const [apCtrlX, apCtrlY] = toCanvas(apMidR, thetaEnd + 0.12);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(apOutX, apOutY);
  ctx.quadraticCurveTo(apCtrlX, apCtrlY, apInX, apInY);
  ctx.stroke();
  ctx.restore();

  // Layer G: Embryonic Protoconch — Vogel Sunflower Seed Phyllotaxis Core
  // Unites botanical and marine Fibonacci expressions in nature
  const floretCount = 82;
  const maxFloretRadius = 26;
  const cFloret = maxFloretRadius / Math.sqrt(floretCount);

  for (let n = 1; n <= floretCount; n++) {
    const floretAngle = n * goldenAngleRad;
    const floretDist = cFloret * Math.sqrt(n);
    const [fx, fy] = [
      originX + floretDist * Math.cos(floretAngle),
      originY + floretDist * Math.sin(floretAngle),
    ];

    const norm = n / floretCount;
    const fRadius = 1.1 + norm * 2.1;

    let fColor = '#f0c978';
    let fCore = '#ffffff';
    if (norm > 0.6) {
      fColor = '#71b9ff';
      fCore = '#cbe4ff';
    } else if (norm > 0.3) {
      fColor = '#ffd98c';
      fCore = '#ffffff';
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(fx, fy, fRadius, 0, Math.PI * 2);

    const fGrad = ctx.createRadialGradient(
      fx - fRadius * 0.3,
      fy - fRadius * 0.3,
      fRadius * 0.1,
      fx,
      fy,
      fRadius
    );
    fGrad.addColorStop(0, fCore);
    fGrad.addColorStop(0.5, fColor);
    fGrad.addColorStop(1, hexToRgba(fColor, 0.7));
    ctx.fillStyle = fGrad;
    ctx.fill();
    ctx.restore();
  }

  // Luminous central embryonic singularity
  const embryoGlow = ctx.createRadialGradient(originX, originY, 0, originX, originY, 20);
  embryoGlow.addColorStop(0, '#ffffff');
  embryoGlow.addColorStop(0.35, 'rgba(240, 201, 120, 0.9)');
  embryoGlow.addColorStop(0.7, 'rgba(113, 185, 255, 0.35)');
  embryoGlow.addColorStop(1, 'rgba(7, 12, 24, 0)');
  ctx.fillStyle = embryoGlow;
  ctx.beginPath();
  ctx.arc(originX, originY, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(originX, originY, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // --- 3. Branding Header ---
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#f0c978';
  ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.shadowColor = 'rgba(240, 201, 120, 0.4)';
  ctx.shadowBlur = 12;
  const brandTitle = 'S L I C E   O F   F I B O N A C C I';
  ctx.fillText(brandTitle, width / 2, 530);
  ctx.shadowBlur = 0;

  // --- 4. Prominent Searched Number ---
  const queryStr = result.query;
  const maxQueryWidth = width - 140;
  let queryFontSize = 88;
  let displayQuery = queryStr.length <= 6 ? queryStr.split('').join('  ') : queryStr;

  ctx.font = `bold ${queryFontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  let measured = ctx.measureText(displayQuery).width;

  if (measured > maxQueryWidth && queryStr.length <= 6) {
    displayQuery = queryStr;
    measured = ctx.measureText(displayQuery).width;
  }

  while (measured > maxQueryWidth && queryFontSize > 28) {
    queryFontSize -= 4;
    ctx.font = `bold ${queryFontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    measured = ctx.measureText(displayQuery).width;
  }

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(113, 185, 255, 0.6)';
  ctx.shadowBlur = 24;
  ctx.fillText(displayQuery, width / 2, 625);
  ctx.shadowBlur = 0;

  // --- 5. Main Ordinal Subtitle ---
  const ordinalStr = `${result.streamPos.toLocaleString('en-US')}${getOrdinalSuffix(result.streamPos)}`;
  ctx.fillStyle = '#c0d4ec';
  ctx.font = '400 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    `the ${ordinalStr} digit of the continuous Fibonacci stream`,
    width / 2,
    705
  );

  // --- 6. 3 Distinct Metric Cards ---
  const cardY = 765;
  const cardHeight = 125;
  const cardWidth = 280;
  const spacing = 20;
  const totalCardsWidth = cardWidth * 3 + spacing * 2;
  const startX = (width - totalCardsWidth) / 2;

  const cardData = [
    {
      title: 'FIBONACCI TERM',
      value: `F(${result.n.toLocaleString('en-US')})`,
      color: '#71b9ff',
      sub: `The ${(result.n === 0 ? 1 : result.n + 1).toLocaleString('en-US')}${getOrdinalSuffix(result.n + 1)} term`,
    },
    {
      title: `POSITION IN F(${result.n.toLocaleString('en-US')})`,
      value: `#${result.pos.toLocaleString('en-US')}`,
      color: '#ffffff',
      sub: '1-based digit index',
    },
    {
      title: 'STREAM POSITION',
      value: `#${result.streamPos.toLocaleString('en-US')}`,
      color: '#f0c978',
      sub: 'in 0112358... sequence',
    },
  ];

  cardData.forEach((cd, idx) => {
    const x = startX + idx * (cardWidth + spacing);

    ctx.fillStyle = 'rgba(13, 20, 36, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.roundRect(x, cardY, cardWidth, cardHeight, 16);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(x + 20, cardY);
    ctx.lineTo(x + cardWidth - 20, cardY);
    ctx.stroke();

    ctx.fillStyle = '#7d8fa6';
    ctx.font = '600 13px ui-monospace, SFMono-Regular, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(cd.title, x + cardWidth / 2, cardY + 28);

    ctx.fillStyle = cd.color;
    let valFontSize = 30;
    ctx.font = `bold ${valFontSize}px ui-monospace, SFMono-Regular, monospace`;
    while (ctx.measureText(cd.value).width > cardWidth - 28 && valFontSize > 15) {
      valFontSize -= 2;
      ctx.font = `bold ${valFontSize}px ui-monospace, SFMono-Regular, monospace`;
    }
    ctx.fillText(cd.value, x + cardWidth / 2, cardY + 68);

    ctx.fillStyle = '#65768e';
    ctx.font = '400 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(cd.sub, x + cardWidth / 2, cardY + 102);
  });

  // --- 7. Continuous Fibonacci Stream Visual Ribbon ---
  const ribbonY = 930;
  const ribbonHeight = 150;
  const ribbonWidth = totalCardsWidth;
  const ribbonX = startX;

  ctx.fillStyle = 'rgba(8, 13, 24, 0.85)';
  ctx.strokeStyle = 'rgba(113, 185, 255, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(ribbonX, ribbonY, ribbonWidth, ribbonHeight, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#8ea1b8';
  ctx.font = '600 14px ui-monospace, SFMono-Regular, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    'CONTINUOUS FIBONACCI STREAM (0112358...)',
    width / 2,
    ribbonY + 32
  );

  const snippetBefore = result.streamSnippetBefore || '… 89';
  const snippetAfter = result.streamSnippetAfter || '233 …';

  let streamFontSize = 28;
  ctx.font = `500 ${streamFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  let beforeWidth = ctx.measureText(snippetBefore).width;
  let matchWidth = ctx.measureText(result.match).width;
  let afterWidth = ctx.measureText(snippetAfter).width;

  let pillPaddingX = 24;
  let pillWidth = matchWidth + pillPaddingX * 2;
  const pillHeight = 52;
  let streamGap = 20;
  let streamTotalWidth = beforeWidth + streamGap + pillWidth + streamGap + afterWidth;

  while (streamTotalWidth > ribbonWidth - 36 && streamFontSize > 15) {
    streamFontSize -= 2;
    pillPaddingX = Math.max(10, pillPaddingX - 2);
    streamGap = Math.max(10, streamGap - 2);
    ctx.font = `500 ${streamFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    beforeWidth = ctx.measureText(snippetBefore).width;
    matchWidth = ctx.measureText(result.match).width;
    afterWidth = ctx.measureText(snippetAfter).width;
    pillWidth = matchWidth + pillPaddingX * 2;
    streamTotalWidth = beforeWidth + streamGap + pillWidth + streamGap + afterWidth;
  }

  const streamStartX = (width - streamTotalWidth) / 2;
  const centerY = ribbonY + 95;

  ctx.fillStyle = '#7a8c9e';
  ctx.font = `500 ${streamFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(snippetBefore, streamStartX, centerY);

  const pillX = streamStartX + beforeWidth + streamGap;
  const pillY = centerY - pillHeight / 2;

  ctx.save();
  const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillWidth, pillY + pillHeight);
  pillGrad.addColorStop(0, '#f0c978');
  pillGrad.addColorStop(1, '#e5b85c');
  ctx.fillStyle = pillGrad;
  ctx.shadowColor = 'rgba(240, 201, 120, 0.7)';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 12);
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#080d18';
  ctx.font = `bold ${Math.max(16, streamFontSize + 2)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = 'center';
  ctx.shadowBlur = 0;
  ctx.fillText(result.match, pillX + pillWidth / 2, centerY);
  ctx.restore();

  ctx.fillStyle = '#7a8c9e';
  ctx.font = `500 ${streamFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(snippetAfter, pillX + pillWidth + streamGap, centerY);

  // --- 8. Footer & Original Website Link ---
  // Exact required caption: "Find where your number hides in the Fibonacci Series:"
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9eb2c9';
  ctx.font = '500 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(SHARE_CAPTION, width / 2, 1165);

  // Exact required original homepage URL: "https://slice-of-fibonacci.vercel.app/"
  ctx.fillStyle = '#f0c978';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.shadowColor = 'rgba(240, 201, 120, 0.45)';
  ctx.shadowBlur = 12;
  ctx.fillText(ORIGINAL_HOMEPAGE_URL, width / 2, 1210);
  ctx.shadowBlur = 0;

  // Mini Golden Spiral Emblem Icon at the very bottom
  const iconY = 1265;
  ctx.strokeStyle = 'rgba(240, 201, 120, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(width / 2, iconY, 12, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#71b9ff';
  ctx.beginPath();
  ctx.arc(width / 2, iconY, 4, 0, Math.PI * 2);
  ctx.fill();

  // --- 9. Export to Blob and File ---
  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });

  const file = new File([blob], `slice-of-fibonacci-${result.query}.png`, {
    type: 'image/png',
    lastModified: Date.now(),
  });

  return {
    canvas,
    blob,
    dataUrl,
    file,
  };
}
