import { FibonacciMatchResult, DIGIT_RULES } from '../math/fibonacci';

export const ORIGINAL_HOMEPAGE_URL = 'https://slice-of-fibonacci.vercel.app/';
export const SHARE_CAPTION =
  'Every number has a story. Find where yours begins in the Fibonacci sequence:';

export interface GeneratedShareCard {
  canvas: HTMLCanvasElement;
  blob: Blob;
  dataUrl: string;
  file: File;
}

let cachedLogoImage: HTMLImageElement | null = null;

function loadOfficialLogo(): Promise<HTMLImageElement | null> {
  if (cachedLogoImage && cachedLogoImage.complete && cachedLogoImage.naturalWidth > 0) {
    return Promise.resolve(cachedLogoImage);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      cachedLogoImage = img;
      resolve(img);
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = '/logo.png';
  });
}

function fitTextFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  initialSize: number,
  minSize: number,
  fontWeight: string = 'bold',
  fontFamily: string = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
): number {
  let size = initialSize;
  ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 2;
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
  }
  return size;
}

/**
 * Generates a high-resolution 1080x1350 Share Result Card designed as a direct,
 * faithful extension of the website's "Your digits, discovered." result section.
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

  const logoImg = await loadOfficialLogo();

  // --- 1. Deep Obsidian & Midnight-Blue Atmospheric Background ---
  ctx.fillStyle = '#020409';
  ctx.fillRect(0, 0, width, height);

  const topAmbient = ctx.createRadialGradient(width * 0.5, 260, 20, width * 0.5, 260, 560);
  topAmbient.addColorStop(0, 'rgba(32, 88, 168, 0.24)');
  topAmbient.addColorStop(0.55, 'rgba(12, 28, 58, 0.12)');
  topAmbient.addColorStop(1, 'rgba(2, 4, 9, 0)');
  ctx.fillStyle = topAmbient;
  ctx.fillRect(0, 0, width, height);

  const bottomAmbient = ctx.createRadialGradient(width * 0.5, 1050, 40, width * 0.5, 1050, 520);
  bottomAmbient.addColorStop(0, 'rgba(45, 118, 210, 0.14)');
  bottomAmbient.addColorStop(1, 'rgba(2, 4, 9, 0)');
  ctx.fillStyle = bottomAmbient;
  ctx.fillRect(0, 0, width, height);

  // --- 2. Outer Glass Console Container ---
  const panelX = 48;
  const panelY = 48;
  const panelW = width - 96;
  const panelH = height - 96;

  ctx.save();
  const panelGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
  panelGrad.addColorStop(0, 'rgba(9, 15, 28, 0.92)');
  panelGrad.addColorStop(1, 'rgba(5, 9, 18, 0.96)');
  ctx.fillStyle = panelGrad;
  ctx.strokeStyle = 'rgba(113, 185, 255, 0.24)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 32);
  ctx.fill();
  ctx.stroke();

  // Subtle top specular highlight along container
  const topHighlight = ctx.createLinearGradient(panelX + 60, panelY, panelX + panelW - 60, panelY);
  topHighlight.addColorStop(0, 'rgba(113, 185, 255, 0)');
  topHighlight.addColorStop(0.5, 'rgba(113, 185, 255, 0.55)');
  topHighlight.addColorStop(1, 'rgba(113, 185, 255, 0)');
  ctx.strokeStyle = topHighlight;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(panelX + 60, panelY);
  ctx.lineTo(panelX + panelW - 60, panelY);
  ctx.stroke();
  ctx.restore();

  const innerX = panelX + 48;
  const innerW = panelW - 96;

  // --- 3. Brand Header Row (Uploaded Website Logo + Section Heading) ---
  const headerY = panelY + 46;
  const logoBoxSize = 68;

  ctx.save();
  ctx.fillStyle = '#070d19';
  ctx.strokeStyle = 'rgba(113, 185, 255, 0.45)';
  ctx.lineWidth = 1.8;
  ctx.shadowColor = 'rgba(113, 185, 255, 0.32)';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.roundRect(innerX, headerY, logoBoxSize, logoBoxSize, 16);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (logoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(innerX + 2, headerY + 2, logoBoxSize - 4, logoBoxSize - 4, 14);
    ctx.clip();
    ctx.drawImage(logoImg, innerX + 2, headerY + 2, logoBoxSize - 4, logoBoxSize - 4);
    ctx.restore();
  }
  ctx.restore();

  // Brand name & kicker next to logo
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('Slice of Fibonacci', innerX + logoBoxSize + 20, headerY + 31);

  ctx.fillStyle = '#71b9ff';
  ctx.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(
    'A LITTLE CURIOSITY. AN INFINITE SEQUENCE.',
    innerX + logoBoxSize + 20,
    headerY + 54
  );

  // Right side of Header: "Your digits, discovered."
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 22px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const discoveredText = 'discovered.';
  ctx.font = 'italic 24px Georgia, "Times New Roman", serif';
  const discWidth = ctx.measureText(discoveredText).width;

  ctx.fillStyle = '#71b9ff';
  ctx.fillText(discoveredText, innerX + innerW, headerY + 42);

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 22px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('Your digits, ', innerX + innerW - discWidth - 4, headerY + 42);

  // Glowing blue status dot before "Your digits,"
  const yourDigitsWidth = ctx.measureText('Your digits, ').width;
  const dotX = innerX + innerW - discWidth - yourDigitsWidth - 20;
  ctx.save();
  ctx.fillStyle = '#71b9ff';
  ctx.shadowColor = '#71b9ff';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(dotX, headerY + 34, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Header divider line
  const dividerY = headerY + logoBoxSize + 28;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(innerX, dividerY);
  ctx.lineTo(innerX + innerW, dividerY);
  ctx.stroke();

  // --- 4. Primary Focus Hero Card: YOUR NUMBER & Glass Orb Sequence Trail ---
  const heroY = dividerY + 32;
  const heroH = 260;

  ctx.save();
  ctx.fillStyle = 'rgba(7, 13, 24, 0.92)';
  ctx.strokeStyle = 'rgba(113, 185, 255, 0.28)';
  ctx.lineWidth = 1.8;
  ctx.shadowColor = 'rgba(113, 185, 255, 0.14)';
  ctx.shadowBlur = 26;
  ctx.beginPath();
  ctx.roundRect(innerX, heroY, innerW, heroH, 24);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // "YOUR NUMBER" label
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7d8fa6';
  ctx.font = '600 15px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText('YOUR NUMBER', width / 2, heroY + 42);

  // Searched Number Value (Primary Visual Focus, preserving leading zeros)
  const queryDisplay =
    result.query.length <= 6 ? result.query.split('').join(' ') : result.query;
  const queryFontSize = fitTextFontSize(
    ctx,
    queryDisplay,
    innerW - 80,
    92,
    46,
    'bold'
  );
  ctx.save();
  ctx.fillStyle = '#71b9ff';
  ctx.shadowColor = 'rgba(113, 185, 255, 0.55)';
  ctx.shadowBlur = 24;
  ctx.font = `bold ${queryFontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  ctx.fillText(queryDisplay, width / 2, heroY + 132);
  ctx.restore();

  // Colored Glass Orbs Trail inside Hero Card
  const trailDigits = result.trailDigits;
  const orbRadius = 18;
  const orbSpacing = 62;
  const totalTrailW = (trailDigits.length - 1) * orbSpacing;
  const startOrbX = width / 2 - totalTrailW / 2;
  const orbCenterY = heroY + 196;

  trailDigits.forEach((d, idx) => {
    const ox = startOrbX + idx * orbSpacing;
    const rule = DIGIT_RULES[d] || DIGIT_RULES[0];

    ctx.save();
    ctx.shadowColor = rule.color;
    ctx.shadowBlur = 14;
    const orbGrad = ctx.createRadialGradient(
      ox - orbRadius * 0.32,
      orbCenterY - orbRadius * 0.32,
      orbRadius * 0.1,
      ox,
      orbCenterY,
      orbRadius
    );
    orbGrad.addColorStop(0, '#ffffff');
    orbGrad.addColorStop(0.38, rule.color);
    orbGrad.addColorStop(1, '#08101e');

    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(ox, orbCenterY, orbRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(d), ox, orbCenterY + 38);
  });

  // --- 5. 2x2 Grid of Result Metric Cards (Matching Result Section) ---
  const gridY = heroY + heroH + 28;
  const colGap = 24;
  const rowGap = 22;
  const cardW = (innerW - colGap) / 2;
  const cardH = 152;

  const metrics = [
    {
      label: 'FIBONACCI TERM',
      value: `F(${result.n.toLocaleString('en-US')})`,
      sub: 'Index starts at F₀ = 0',
    },
    {
      label: 'POSITION IN TERM',
      value: result.pos.toLocaleString('en-US'),
      sub: '1-based digit index',
    },
    {
      label: 'STREAM POSITION',
      value: result.streamPos.toLocaleString('en-US'),
      sub: 'in 0112358... sequence',
    },
    {
      label: 'TERM LENGTH',
      value: result.termLength.toLocaleString('en-US'),
      sub: 'Total decimal digits',
    },
  ];

  metrics.forEach((m, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const cx = innerX + col * (cardW + colGap);
    const cy = gridY + row * (cardH + rowGap);

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.strokeStyle = 'rgba(113, 185, 255, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx, cy, cardW, cardH, 20);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#7d8fa6';
    ctx.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(m.label, cx + 28, cy + 38);

    const valSize = fitTextFontSize(ctx, m.value, cardW - 56, 42, 22, 'bold');
    ctx.fillStyle = '#71b9ff';
    ctx.font = `bold ${valSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    ctx.fillText(m.value, cx + 28, cy + 92);

    ctx.fillStyle = '#6e7e94';
    ctx.font = '400 15px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(m.sub, cx + 28, cy + 126);
  });

  // --- 6. Complete Term Highlighted Excerpt Panel ---
  const termBoxY = gridY + cardH * 2 + rowGap + 28;
  const termBoxH = 210;

  ctx.save();
  ctx.fillStyle = '#060a14';
  ctx.strokeStyle = 'rgba(113, 185, 255, 0.18)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(innerX, termBoxY, innerW, termBoxH, 20);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Term box header row
  const termHeaderY = termBoxY + 38;
  ctx.save();
  ctx.fillStyle = '#71b9ff';
  ctx.shadowColor = '#71b9ff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(innerX + 28, termHeaderY - 5, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#9bd3ff';
  ctx.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(
    `COMPLETE TERM F(${result.n.toLocaleString('en-US')})`,
    innerX + 42,
    termHeaderY
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = '#a4b5cb';
  ctx.font = '600 14px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(
    `${result.termLength.toLocaleString('en-US')} DIGITS`,
    innerX + innerW - 24,
    termHeaderY
  );

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(innerX + 24, termHeaderY + 18);
  ctx.lineTo(innerX + innerW - 24, termHeaderY + 18);
  ctx.stroke();

  // Build readable centered context around the matched digits inside F(n)
  const maxContextChars = 16;
  const rawBefore = result.before || '';
  const rawAfter = result.after || '';
  const beforeSlice =
    rawBefore.length > maxContextChars
      ? '…' + rawBefore.slice(-maxContextChars)
      : rawBefore;
  const afterSlice =
    rawAfter.length > maxContextChars
      ? rawAfter.slice(0, maxContextChars) + '…'
      : rawAfter;

  let seqFontSize = 30;
  ctx.font = `500 ${seqFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  let bWidth = ctx.measureText(beforeSlice).width;
  ctx.font = `bold ${seqFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  let mWidth = ctx.measureText(result.match).width;
  ctx.font = `500 ${seqFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  let aWidth = ctx.measureText(afterSlice).width;

  const badgePadX = 18;
  const badgeGap = 10;
  let totalSeqW =
    (beforeSlice ? bWidth + badgeGap : 0) +
    (mWidth + badgePadX * 2) +
    (afterSlice ? badgeGap + aWidth : 0);

  while (totalSeqW > innerW - 64 && seqFontSize > 16) {
    seqFontSize -= 2;
    ctx.font = `500 ${seqFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    bWidth = ctx.measureText(beforeSlice).width;
    ctx.font = `bold ${seqFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    mWidth = ctx.measureText(result.match).width;
    ctx.font = `500 ${seqFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    aWidth = ctx.measureText(afterSlice).width;
    totalSeqW =
      (beforeSlice ? bWidth + badgeGap : 0) +
      (mWidth + badgePadX * 2) +
      (afterSlice ? badgeGap + aWidth : 0);
  }

  const seqCenterY = termBoxY + 132;
  let cursorX = width / 2 - totalSeqW / 2;

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  if (beforeSlice) {
    ctx.fillStyle = '#8b9db5';
    ctx.font = `500 ${seqFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillText(beforeSlice, cursorX, seqCenterY);
    cursorX += bWidth + badgeGap;
  }

  // Highlighted Match Pill (Exact Result Section <mark> styling)
  const pillW = mWidth + badgePadX * 2;
  const pillH = seqFontSize + 24;
  const pillY = seqCenterY - pillH / 2;

  ctx.save();
  ctx.fillStyle = '#16355b';
  ctx.strokeStyle = '#71b9ff';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(113, 185, 255, 0.5)';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.roundRect(cursorX, pillY, pillW, pillH, 10);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${seqFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(result.match, cursorX + pillW / 2, seqCenterY + 1);
  cursorX += pillW + badgeGap;

  if (afterSlice) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8b9db5';
    ctx.font = `500 ${seqFontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.fillText(afterSlice, cursorX, seqCenterY);
  }

  // --- 7. Bottom Footer Bar ---
  const footerY = termBoxY + termBoxH + 46;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8ea1b8';
  ctx.font = '400 17px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText(
    'Every number has a story. Find where yours begins in the Fibonacci sequence.',
    innerX,
    footerY
  );

  ctx.fillStyle = '#71b9ff';
  ctx.font = 'bold 20px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(ORIGINAL_HOMEPAGE_URL, innerX, footerY + 34);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#5c708a';
  ctx.font = '600 15px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText('F(n) = F(n−1) + F(n−2)', innerX + innerW, footerY + 34);

  // --- 8. Export to Blob and File ---
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
