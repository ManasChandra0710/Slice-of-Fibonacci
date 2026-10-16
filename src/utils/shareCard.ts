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
 * 1. The authentic top view of the website's 3D Fibonacci spiral (using generateSpiralPositions)
 * 2. The searched number and its complete telemetry (Term, Position in Term, Stream Position)
 * 3. The continuous Fibonacci stream ribbon with highlighted query
 * 4. The exact original website URL and caption:
 *    "Find where your number hides in the Fibonacci Series:"
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

  // --- 2. Top Visual: Golden Ratio Phyllotaxis Flower & Cosmic Vortex ---
  // Inspired by sunflower florets, phyllotaxis seed spirals, golden ratio branching,
  // and cosmic logarithmic vortexes connecting pure mathematics to the universe.
  const discCenterX = width / 2;
  const discCenterY = 275;
  const discRadius = 195;

  // Layer A: Deep celestial nebula core & ambient glow
  const nebulaGlow = ctx.createRadialGradient(
    discCenterX,
    discCenterY,
    0,
    discCenterX,
    discCenterY,
    discRadius + 28
  );
  nebulaGlow.addColorStop(0, 'rgba(113, 185, 255, 0.22)');
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

  // Celestial stardust field (Vogel spiral distribution)
  ctx.save();
  const goldenAngleRad = 137.50776405 * (Math.PI / 180);
  for (let s = 0; s < 110; s++) {
    const starAngle = s * goldenAngleRad;
    const starDist = Math.sqrt(s / 110) * (discRadius - 6);
    const sx = discCenterX + Math.cos(starAngle) * starDist;
    const sy = discCenterY + Math.sin(starAngle) * starDist;
    ctx.fillStyle = s % 4 === 0 ? '#f0c978' : '#71b9ff';
    ctx.globalAlpha = 0.12 + (s % 5) * 0.08;
    ctx.beginPath();
    ctx.arc(sx, sy, (s % 7 === 0) ? 1.6 : 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Layer B: Continuous Logarithmic Golden Spiral Arms (Cosmic Galaxy Vortices)
  // 4 graceful logarithmic spiral arms radiating outward in golden proportions
  ctx.save();
  const goldenPhi = 1.6180339887;
  const b = Math.log(goldenPhi) / (Math.PI / 2); // Logarithmic spiral growth rate

  for (let arm = 0; arm < 4; arm++) {
    const armOffset = arm * (Math.PI / 2);
    ctx.beginPath();
    let first = true;
    for (let t = 0; t <= 3.8; t += 0.04) {
      const r = 5 * Math.exp(b * t);
      if (r > discRadius - 8) break;
      const theta = t * 2.4 + armOffset;
      const px = discCenterX + Math.cos(theta) * r;
      const py = discCenterY + Math.sin(theta) * r;
      if (first) {
        ctx.moveTo(px, py);
        first = false;
      } else {
        ctx.lineTo(px, py);
      }
    }
    // Ambient soft arm glow
    ctx.strokeStyle = arm % 2 === 0 ? 'rgba(113, 185, 255, 0.28)' : 'rgba(240, 201, 120, 0.24)';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Crisp inner spine
    ctx.strokeStyle = arm % 2 === 0 ? 'rgba(192, 222, 255, 0.45)' : 'rgba(255, 235, 175, 0.45)';
    ctx.lineWidth = 1.0;
    ctx.stroke();
  }
  ctx.restore();

  // Layer C: Master Vogel Phyllotaxis Sunflower Seed Florets
  // Perfectly models nature's golden floret packing: r = c * sqrt(n), theta = n * 137.50776°
  const floretCount = 580;
  const cSpread = (discRadius - 16) / Math.sqrt(floretCount);

  for (let n = 1; n <= floretCount; n++) {
    const theta = n * goldenAngleRad;
    const r = cSpread * Math.sqrt(n);
    const fx = discCenterX + Math.cos(theta) * r;
    const fy = discCenterY + Math.sin(theta) * r;

    // Relative progression from center floret (0) to outer edge (1)
    const norm = n / floretCount;

    // Organic floret radius: small in center, gracefully blooming outwards
    const floretRadius = 1.3 + Math.sqrt(norm) * 3.0;

    // Color gradient across the golden bloom:
    // Core: brilliant gold (#ffffff -> #f0c978)
    // Mid: deep sapphire azure to cyan (#71b9ff -> #38bdf8)
    // Rim: iridescent indigo crystal with golden dust
    let floretColor: string;
    let floretCore: string;

    if (norm < 0.22) {
      // Golden sunseed heart
      floretColor = '#f0c978';
      floretCore = '#ffffff';
    } else if (norm < 0.6) {
      // Transition to celestial electric blue
      floretColor = '#71b9ff';
      floretCore = '#cbe4ff';
    } else if (norm < 0.85) {
      // Deep cosmic sapphire
      floretColor = '#4a90e2';
      floretCore = '#92c2fe';
    } else {
      // Golden corona rim florets
      floretColor = n % 2 === 0 ? '#e2b356' : '#71b9ff';
      floretCore = '#ffffff';
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(fx, fy, floretRadius, 0, Math.PI * 2);

    const fGrad = ctx.createRadialGradient(
      fx - floretRadius * 0.3,
      fy - floretRadius * 0.3,
      floretRadius * 0.1,
      fx,
      fy,
      floretRadius
    );
    fGrad.addColorStop(0, floretCore);
    fGrad.addColorStop(0.5, floretColor);
    fGrad.addColorStop(1, hexToRgba(floretColor, 0.7));
    ctx.fillStyle = fGrad;
    ctx.fill();
    ctx.restore();
  }

  // Layer D: Luminous central singularity & Golden Ratio Emblem (Phi Φ)
  const coreGlow = ctx.createRadialGradient(discCenterX, discCenterY, 0, discCenterX, discCenterY, 24);
  coreGlow.addColorStop(0, '#ffffff');
  coreGlow.addColorStop(0.3, 'rgba(240, 201, 120, 0.95)');
  coreGlow.addColorStop(0.65, 'rgba(113, 185, 255, 0.45)');
  coreGlow.addColorStop(1, 'rgba(7, 12, 24, 0)');
  ctx.fillStyle = coreGlow;
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, 24, 0, Math.PI * 2);
  ctx.fill();

  // Delicate center Golden Seed node
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, 3.8, 0, Math.PI * 2);
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
