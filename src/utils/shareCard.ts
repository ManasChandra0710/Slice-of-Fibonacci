import { FibonacciMatchResult } from '../math/fibonacci';

export const ORIGINAL_HOMEPAGE_URL = 'https://slice-of-fibonacci.vercel.app/';
export const SHARE_CAPTION =
  'Every number has a story. Find where yours begins in the Fibonacci sequence.';

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
 * Generates a high-resolution 1080x1350 Share Result Card:
 * - Primary layout, Golden-Angle Phyllotaxis Orb Disc, typography, and footer from Reference Image 1
 * - 4-Card Result Metrics row (FIBONACCI TERM, POSITION IN TERM, STREAM POSITION, TERM LENGTH) from Reference Image 2
 * - Continuous Fibonacci Stream with electric-blue highlighted match matching the website's highlight style
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

  // --- 1. Background Cosmic Dark Theme (Reference Image 1) ---
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

  // --- 2. Top Visual: Golden-Angle Vogel Phyllotaxis Orb Disc (Reference Image 1) ---
  const discCenterX = width / 2;
  const discCenterY = 275;
  const discRadius = 195;

  const nebulaGlow = ctx.createRadialGradient(
    discCenterX,
    discCenterY,
    0,
    discCenterX,
    discCenterY,
    discRadius + 28
  );
  nebulaGlow.addColorStop(0, 'rgba(113, 185, 255, 0.24)');
  nebulaGlow.addColorStop(0.28, 'rgba(20, 38, 72, 0.92)');
  nebulaGlow.addColorStop(0.68, 'rgba(8, 14, 26, 0.78)');
  nebulaGlow.addColorStop(1, 'rgba(3, 5, 10, 0)');
  ctx.fillStyle = nebulaGlow;
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, discRadius + 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.strokeStyle = 'rgba(240, 201, 120, 0.16)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, discRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(113, 185, 255, 0.18)';
  ctx.setLineDash([2, 5]);
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, discRadius * 0.6180339887, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(240, 201, 120, 0.22)';
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, 54, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  const centerAura = ctx.createRadialGradient(
    discCenterX,
    discCenterY,
    4,
    discCenterX,
    discCenterY,
    78
  );
  centerAura.addColorStop(0, 'rgba(255, 245, 210, 0.48)');
  centerAura.addColorStop(0.32, 'rgba(240, 201, 120, 0.22)');
  centerAura.addColorStop(0.65, 'rgba(113, 185, 255, 0.16)');
  centerAura.addColorStop(1, 'rgba(8, 14, 26, 0)');
  ctx.fillStyle = centerAura;
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, 78, 0, Math.PI * 2);
  ctx.fill();

  // 520 Golden-Angle Phyllotaxis 3D Shaded Orbs (137.507764° divergence)
  const goldenAngleRad = 137.50776405 * (Math.PI / 180);
  const totalOrbs = 520;
  const minOrbDist = 25;
  const maxOrbDist = discRadius - 7;

  for (let i = 1; i <= totalOrbs; i++) {
    const norm = i / totalOrbs;
    const angle = i * goldenAngleRad;
    const dist = minOrbDist + Math.sqrt(norm) * (maxOrbDist - minOrbDist);
    const ox = discCenterX + Math.cos(angle) * dist;
    const oy = discCenterY + Math.sin(angle) * dist;

    const orbR = 1.9 + Math.pow(norm, 0.46) * 3.15;
    const isGold =
      (norm < 0.13 && i % 3 === 0) ||
      i % 8 === 0 ||
      (i % 13 === 0 && norm > 0.25);

    ctx.save();
    ctx.beginPath();
    ctx.arc(ox, oy, orbR, 0, Math.PI * 2);

    const orbGrad = ctx.createRadialGradient(
      ox - orbR * 0.32,
      oy - orbR * 0.32,
      orbR * 0.08,
      ox,
      oy,
      orbR
    );

    if (isGold) {
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.45, '#f0c978');
      orbGrad.addColorStop(1, hexToRgba('#c58f32', 0.88));
    } else {
      orbGrad.addColorStop(0, '#d8ecff');
      orbGrad.addColorStop(0.48, '#5caeff');
      orbGrad.addColorStop(1, hexToRgba('#1b58a8', 0.9));
    }

    ctx.fillStyle = orbGrad;
    ctx.fill();
    ctx.restore();
  }

  // Luminous Central Singularity Orb & Halo Ring
  ctx.save();
  ctx.strokeStyle = 'rgba(240, 201, 120, 0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, 19, 0, Math.PI * 2);
  ctx.stroke();

  const coreOuterGlow = ctx.createRadialGradient(
    discCenterX,
    discCenterY,
    0,
    discCenterX,
    discCenterY,
    24
  );
  coreOuterGlow.addColorStop(0, '#ffffff');
  coreOuterGlow.addColorStop(0.38, 'rgba(240, 201, 120, 0.92)');
  coreOuterGlow.addColorStop(0.72, 'rgba(113, 185, 255, 0.45)');
  coreOuterGlow.addColorStop(1, 'rgba(7, 12, 24, 0)');
  ctx.fillStyle = coreOuterGlow;
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, 24, 0, Math.PI * 2);
  ctx.fill();

  const coreSphereGrad = ctx.createRadialGradient(
    discCenterX - 3,
    discCenterY - 3,
    1,
    discCenterX,
    discCenterY,
    12.5
  );
  coreSphereGrad.addColorStop(0, '#ffffff');
  coreSphereGrad.addColorStop(0.55, '#fff0c2');
  coreSphereGrad.addColorStop(0.85, '#f0c978');
  coreSphereGrad.addColorStop(1, '#71b9ff');
  ctx.fillStyle = coreSphereGrad;
  ctx.shadowColor = 'rgba(240, 201, 120, 0.9)';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, 12.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- 3. Branding Header ---
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#f0c978';
  ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.shadowColor = 'rgba(240, 201, 120, 0.4)';
  ctx.shadowBlur = 12;
  ctx.fillText('S L I C E   O F   F I B O N A C C I', width / 2, 530);
  ctx.shadowBlur = 0;

  // --- 4. Prominent Searched Number (Preserving Leading Zeros) ---
  const queryStr = result.query;
  const maxQueryWidth = width - 140;
  let queryFontSize = 88;

  ctx.font = `bold ${queryFontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  let measured = ctx.measureText(queryStr).width;

  while (measured > maxQueryWidth && queryFontSize > 28) {
    queryFontSize -= 4;
    ctx.font = `bold ${queryFontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    measured = ctx.measureText(queryStr).width;
  }

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(113, 185, 255, 0.6)';
  ctx.shadowBlur = 24;
  ctx.fillText(queryStr, width / 2, 625);
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

  // --- 6. 4 Metric Cards Row (Replaced with Content & Visual Presentation from Reference Image 2) ---
  const cardY = 762;
  const cardHeight = 132;
  const totalRowWidth = 900;
  const startX = (width - totalRowWidth) / 2;
  const spacing = 16;

  // Proportional card widths matching Reference Image 2 (expanded Stream Position width)
  const cardSpecs = [
    {
      width: 204,
      title: 'FIBONACCI TERM',
      value: `F(${result.n.toLocaleString('en-US')})`,
      sub: 'Index starts at F₀ = 0',
    },
    {
      width: 204,
      title: 'POSITION IN TERM',
      value: result.pos.toLocaleString('en-US'),
      sub: '1-based digit index',
    },
    {
      width: 256,
      title: 'STREAM POSITION',
      value: result.streamPos.toLocaleString('en-US'),
      sub: 'in 0112358... sequence',
    },
    {
      width: 188,
      title: 'TERM LENGTH',
      value: result.termLength.toLocaleString('en-US'),
      sub: 'Total decimal digits',
    },
  ];

  let currentCardX = startX;
  cardSpecs.forEach((cd) => {
    const x = currentCardX;
    const w = cd.width;
    currentCardX += w + spacing;

    ctx.save();
    ctx.fillStyle = 'rgba(13, 20, 34, 0.82)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.roundRect(x, cardY, w, cardHeight, 16);
    ctx.fill();
    ctx.stroke();

    // Top inner rim highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(x + 18, cardY);
    ctx.lineTo(x + w - 18, cardY);
    ctx.stroke();
    ctx.restore();

    const padX = 20;
    ctx.textAlign = 'left';

    // Uppercase mono title (#7d8fa6)
    ctx.fillStyle = '#7d8fa6';
    ctx.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(cd.title, x + padX, cardY + 30);

    // Unified electric-blue value (#71b9ff) matching Reference Image 2
    ctx.fillStyle = '#71b9ff';
    let valFontSize = 31;
    ctx.font = `bold ${valFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    while (ctx.measureText(cd.value).width > w - padX * 2 && valFontSize > 16) {
      valFontSize -= 1.5;
      ctx.font = `bold ${valFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    }
    ctx.fillText(cd.value, x + padX, cardY + 72);

    // Sub-caption (#6e7e94)
    ctx.fillStyle = '#6e7e94';
    ctx.font = '400 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(cd.sub, x + padX, cardY + 106);
  });

  // --- 7. Continuous Fibonacci Stream Visual Ribbon (Highlighted in Website Electric Blue) ---
  const ribbonY = 930;
  const ribbonHeight = 150;
  const ribbonWidth = totalRowWidth;
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

  while (streamTotalWidth > ribbonWidth - 44 && streamFontSize > 15) {
    streamFontSize -= 2;
    pillPaddingX = Math.max(12, pillPaddingX - 2);
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

  // Surrounding digits (left)
  ctx.fillStyle = '#7a8c9e';
  ctx.font = `500 ${streamFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(snippetBefore, streamStartX, centerY);

  const pillX = streamStartX + beforeWidth + streamGap;
  const pillY = centerY - pillHeight / 2;

  // Electric-Blue Highlight Pill matching the website's highlight color & glow
  ctx.save();
  const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillWidth, pillY + pillHeight);
  pillGrad.addColorStop(0, '#1b3d69');
  pillGrad.addColorStop(1, '#122b4d');
  ctx.fillStyle = pillGrad;
  ctx.shadowColor = 'rgba(113, 185, 255, 0.65)';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 12);
  ctx.fill();

  ctx.strokeStyle = '#71b9ff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#9bd3ff';
  ctx.font = `bold ${Math.max(16, streamFontSize + 2)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(113, 185, 255, 0.5)';
  ctx.shadowBlur = 8;
  ctx.fillText(result.match, pillX + pillWidth / 2, centerY);
  ctx.restore();

  // Surrounding digits (right)
  ctx.fillStyle = '#7a8c9e';
  ctx.font = `500 ${streamFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(snippetAfter, pillX + pillWidth + streamGap, centerY);

  // --- 8. Footer & Website Link (Reference Image 1) ---
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9eb2c9';
  ctx.font = '500 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(SHARE_CAPTION, width / 2, 1165);

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
