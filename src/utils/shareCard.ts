import { FibonacciMatchResult, GOLDEN_ANGLE, INV_PHI } from '../math/fibonacci';

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
 * Generates a high-resolution 1080x1350 Share Result Card styled with the
 * extracted reference color palette (deep obsidian #010308, sapphire #0d2244,
 * electric azure #4da3ff, luminous sky #6cb6ff, and ice-blue #b8dcff).
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

  // --- 1. Background Deep Obsidian-Azure Atmosphere ---
  const bgGrad = ctx.createRadialGradient(
    width / 2,
    300,
    50,
    width / 2,
    height / 2,
    height * 0.75
  );
  bgGrad.addColorStop(0, '#081226');
  bgGrad.addColorStop(0.45, '#040914');
  bgGrad.addColorStop(1, '#010308');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Soft atmospheric azure glow
  const topGlow = ctx.createRadialGradient(width / 2, 280, 20, width / 2, 280, 310);
  topGlow.addColorStop(0, 'rgba(77, 163, 255, 0.20)');
  topGlow.addColorStop(0.5, 'rgba(108, 182, 255, 0.08)');
  topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, width, 600);

  // Delicate double frame borders
  ctx.strokeStyle = 'rgba(184, 220, 255, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  ctx.strokeStyle = 'rgba(77, 163, 255, 0.24)';
  ctx.lineWidth = 1;
  ctx.strokeRect(44, 44, width - 88, height - 88);

  // --- 2. Top Visual: Golden-Angle Phyllotaxis Orb Disc ---
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
  nebulaGlow.addColorStop(0, 'rgba(77, 163, 255, 0.26)');
  nebulaGlow.addColorStop(0.28, 'rgba(15, 34, 68, 0.92)');
  nebulaGlow.addColorStop(0.68, 'rgba(5, 11, 24, 0.80)');
  nebulaGlow.addColorStop(1, 'rgba(1, 3, 8, 0)');
  ctx.fillStyle = nebulaGlow;
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, discRadius + 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.strokeStyle = 'rgba(108, 182, 255, 0.18)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, discRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(77, 163, 255, 0.20)';
  ctx.setLineDash([2, 5]);
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, discRadius * INV_PHI, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(184, 220, 255, 0.24)';
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
  centerAura.addColorStop(0, 'rgba(216, 236, 255, 0.46)');
  centerAura.addColorStop(0.35, 'rgba(108, 182, 255, 0.24)');
  centerAura.addColorStop(0.68, 'rgba(77, 163, 255, 0.14)');
  centerAura.addColorStop(1, 'rgba(5, 11, 24, 0)');
  ctx.fillStyle = centerAura;
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, 78, 0, Math.PI * 2);
  ctx.fill();

  // 520 Golden-Angle Phyllotaxis 3D Shaded Orbs (137.507764° divergence)
  const totalOrbs = 520;
  const minOrbDist = 25;
  const maxOrbDist = discRadius - 7;

  for (let i = 1; i <= totalOrbs; i++) {
    const norm = i / totalOrbs;
    const angle = i * GOLDEN_ANGLE;
    const dist = minOrbDist + Math.sqrt(norm) * (maxOrbDist - minOrbDist);
    const ox = discCenterX + Math.cos(angle) * dist;
    const oy = discCenterY + Math.sin(angle) * dist;

    const orbR = 1.9 + Math.pow(norm, 0.46) * 3.15;
    const isBrightIce =
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

    if (isBrightIce) {
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.45, '#b8dcff');
      orbGrad.addColorStop(1, hexToRgba('#4da3ff', 0.90));
    } else {
      orbGrad.addColorStop(0, '#d8ecff');
      orbGrad.addColorStop(0.48, '#4da3ff');
      orbGrad.addColorStop(1, hexToRgba('#16488a', 0.92));
    }

    ctx.fillStyle = orbGrad;
    ctx.fill();
    ctx.restore();
  }

  // Luminous Central Singularity Orb & Halo Ring
  ctx.save();
  ctx.strokeStyle = 'rgba(184, 220, 255, 0.45)';
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
  coreOuterGlow.addColorStop(0.38, 'rgba(184, 220, 255, 0.92)');
  coreOuterGlow.addColorStop(0.72, 'rgba(77, 163, 255, 0.48)');
  coreOuterGlow.addColorStop(1, 'rgba(5, 11, 24, 0)');
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
  coreSphereGrad.addColorStop(0.55, '#e2f1ff');
  coreSphereGrad.addColorStop(0.85, '#6cb6ff');
  coreSphereGrad.addColorStop(1, '#3b82f6');
  ctx.fillStyle = coreSphereGrad;
  ctx.shadowColor = 'rgba(108, 182, 255, 0.9)';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, 12.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- 3. Branding Header ---
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#6cb6ff';
  ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.shadowColor = 'rgba(77, 163, 255, 0.45)';
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

  ctx.fillStyle = '#f4f7fb';
  ctx.shadowColor = 'rgba(77, 163, 255, 0.65)';
  ctx.shadowBlur = 24;
  ctx.fillText(queryStr, width / 2, 625);
  ctx.shadowBlur = 0;

  // --- 5. Main Ordinal Subtitle ---
  const ordinalStr = `${result.streamPos.toLocaleString('en-US')}${getOrdinalSuffix(result.streamPos)}`;
  ctx.fillStyle = '#8594a8';
  ctx.font = '400 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    `the ${ordinalStr} digit of the continuous Fibonacci stream`,
    width / 2,
    705
  );

  // --- 6. 4 Metric Cards Row ---
  const cardY = 762;
  const cardHeight = 132;
  const totalRowWidth = 900;
  const startX = (width - totalRowWidth) / 2;
  const spacing = 16;

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
    ctx.fillStyle = 'rgba(7, 13, 25, 0.88)';
    ctx.strokeStyle = 'rgba(77, 163, 255, 0.16)';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.roundRect(x, cardY, w, cardHeight, 16);
    ctx.fill();
    ctx.stroke();

    // Top inner rim highlight
    ctx.strokeStyle = 'rgba(184, 220, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(x + 18, cardY);
    ctx.lineTo(x + w - 18, cardY);
    ctx.stroke();
    ctx.restore();

    const padX = 20;
    ctx.textAlign = 'left';

    ctx.fillStyle = '#5c6c82';
    ctx.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(cd.title, x + padX, cardY + 30);

    ctx.fillStyle = '#6cb6ff';
    let valFontSize = 31;
    ctx.font = `bold ${valFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    while (ctx.measureText(cd.value).width > w - padX * 2 && valFontSize > 16) {
      valFontSize -= 1.5;
      ctx.font = `bold ${valFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    }
    ctx.fillText(cd.value, x + padX, cardY + 72);

    ctx.fillStyle = '#68788e';
    ctx.font = '400 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(cd.sub, x + padX, cardY + 106);
  });

  // --- 7. Continuous Fibonacci Stream Visual Ribbon ---
  const ribbonY = 930;
  const ribbonHeight = 150;
  const ribbonWidth = totalRowWidth;
  const ribbonX = startX;

  ctx.fillStyle = 'rgba(6, 12, 24, 0.90)';
  ctx.strokeStyle = 'rgba(77, 163, 255, 0.24)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(ribbonX, ribbonY, ribbonWidth, ribbonHeight, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#8594a8';
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
  ctx.fillStyle = '#68788e';
  ctx.font = `500 ${streamFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(snippetBefore, streamStartX, centerY);

  const pillX = streamStartX + beforeWidth + streamGap;
  const pillY = centerY - pillHeight / 2;

  // Electric-Azure Highlight Pill
  ctx.save();
  const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillWidth, pillY + pillHeight);
  pillGrad.addColorStop(0, '#163868');
  pillGrad.addColorStop(1, '#0e2547');
  ctx.fillStyle = pillGrad;
  ctx.shadowColor = 'rgba(77, 163, 255, 0.65)';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 12);
  ctx.fill();

  ctx.strokeStyle = '#4da3ff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#b8dcff';
  ctx.font = `bold ${Math.max(16, streamFontSize + 2)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(77, 163, 255, 0.55)';
  ctx.shadowBlur = 8;
  ctx.fillText(result.match, pillX + pillWidth / 2, centerY);
  ctx.restore();

  // Surrounding digits (right)
  ctx.fillStyle = '#68788e';
  ctx.font = `500 ${streamFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(snippetAfter, pillX + pillWidth + streamGap, centerY);

  // --- 8. Footer & Website Link ---
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8594a8';
  ctx.font = '500 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(SHARE_CAPTION, width / 2, 1165);

  ctx.fillStyle = '#6cb6ff';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.shadowColor = 'rgba(77, 163, 255, 0.45)';
  ctx.shadowBlur = 12;
  ctx.fillText(ORIGINAL_HOMEPAGE_URL, width / 2, 1210);
  ctx.shadowBlur = 0;

  // Refined Glassmorphic Brand Mark Emblem at the bottom of the Share Card
  const iconY = 1265;
  const logoRadius = 18;
  let drewLogoImage = false;
  try {
    const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = '/logo.png';
    });
    ctx.save();
    ctx.shadowColor = 'rgba(77, 163, 255, 0.48)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(width / 2, iconY, logoRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(
      logoImg,
      width / 2 - logoRadius,
      iconY - logoRadius,
      logoRadius * 2,
      logoRadius * 2
    );
    ctx.restore();

    ctx.strokeStyle = 'rgba(184, 220, 255, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(width / 2, iconY, logoRadius, 0, Math.PI * 2);
    ctx.stroke();
    drewLogoImage = true;
  } catch {
    drewLogoImage = false;
  }

  if (!drewLogoImage) {
    ctx.strokeStyle = 'rgba(108, 182, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(width / 2, iconY, 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#4da3ff';
    ctx.beginPath();
    ctx.arc(width / 2, iconY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

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
