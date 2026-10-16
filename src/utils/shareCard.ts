import { FibonacciMatchResult, DIGIT_RULES } from '../math/fibonacci';

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

/**
 * Generates an elegant, high-resolution 1080x1350 share card
 * matching the user's reference design and the website's dark cosmic glass theme.
 */
export async function generateShareCard(
  result: FibonacciMatchResult,
  websiteUrl: string
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
  const topGlow = ctx.createRadialGradient(width / 2, 280, 20, width / 2, 280, 280);
  topGlow.addColorStop(0, 'rgba(113, 185, 255, 0.16)');
  topGlow.addColorStop(0.5, 'rgba(240, 201, 120, 0.08)');
  topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, width, 600);

  // Delicate decorative border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  ctx.strokeStyle = 'rgba(240, 201, 120, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(44, 44, width - 88, height - 88);

  // --- 2. Top Visual Phyllotaxis Disc (Reference Image Styling) ---
  const discCenterX = width / 2;
  const discCenterY = 275;
  const discRadius = 185;
  const totalDots = 780;
  const goldenAngle = 137.507764 * (Math.PI / 180);

  // Soft background circle for disc
  const discGlow = ctx.createRadialGradient(
    discCenterX,
    discCenterY,
    10,
    discCenterX,
    discCenterY,
    discRadius + 15
  );
  discGlow.addColorStop(0, 'rgba(16, 26, 46, 0.8)');
  discGlow.addColorStop(0.85, 'rgba(10, 16, 30, 0.5)');
  discGlow.addColorStop(1, 'rgba(5, 9, 18, 0)');
  ctx.fillStyle = discGlow;
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, discRadius + 15, 0, Math.PI * 2);
  ctx.fill();

  // Draw Fibonacci spiral dot cluster
  const colors = [
    '#71b9ff', // Sapphire Blue
    '#f0c978', // Warm Amber Gold
    '#4ade80', // Emerald
    '#f87171', // Ruby Rose
    '#c084fc', // Amethyst Violet
    '#38bdf8', // Sky Cyan
    '#fbbf24', // Sun Amber
    '#a78bfa', // Lavender
    '#34d399', // Mint
    '#f472b6', // Quartz Pink
  ];

  for (let i = 0; i < totalDots; i++) {
    const theta = i * goldenAngle;
    const r = 6.4 * Math.sqrt(i);
    if (r > discRadius) continue;

    const x = discCenterX + r * Math.cos(theta);
    const y = discCenterY + r * Math.sin(theta);

    const color = colors[i % colors.length];
    const dotSize = 2.4 + (i / totalDots) * 1.8;

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55 + (Math.sin(i * 0.1) * 0.25);
    ctx.beginPath();
    ctx.arc(x, y, dotSize, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // Golden Focal Circle / Target Reticle (Direct Match to Uploaded Reference)
  const targetRadius = 36;
  ctx.save();
  ctx.strokeStyle = '#f0c978';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'rgba(240, 201, 120, 0.85)';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, targetRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle crosshair ticks
  ctx.strokeStyle = 'rgba(240, 201, 120, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(discCenterX - targetRadius - 8, discCenterY);
  ctx.lineTo(discCenterX - targetRadius + 6, discCenterY);
  ctx.moveTo(discCenterX + targetRadius - 6, discCenterY);
  ctx.lineTo(discCenterX + targetRadius + 8, discCenterY);
  ctx.moveTo(discCenterX, discCenterY - targetRadius - 8);
  ctx.lineTo(discCenterX, discCenterY - targetRadius + 6);
  ctx.moveTo(discCenterX, discCenterY + targetRadius - 6);
  ctx.lineTo(discCenterX, discCenterY + targetRadius + 8);
  ctx.stroke();

  // Center focal orbs
  const focalGrad = ctx.createRadialGradient(
    discCenterX - 2,
    discCenterY - 2,
    1,
    discCenterX,
    discCenterY,
    14
  );
  focalGrad.addColorStop(0, '#ffffff');
  focalGrad.addColorStop(0.3, '#71b9ff');
  focalGrad.addColorStop(1, '#1b3a5c');
  ctx.fillStyle = focalGrad;
  ctx.beginPath();
  ctx.arc(discCenterX, discCenterY, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- 3. Branding Header ---
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#f0c978';
  ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.shadowColor = 'rgba(240, 201, 120, 0.4)';
  ctx.shadowBlur = 12;
  // Letter spacing simulated
  const brandTitle = 'S L I C E   O F   F I B O N A C C I';
  ctx.fillText(brandTitle, width / 2, 530);
  ctx.shadowBlur = 0;

  // --- 4. Prominent Searched Number ---
  const queryStr = result.query;
  const spacedNumber = queryStr.split('').join('  ');

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 88px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.shadowColor = 'rgba(113, 185, 255, 0.6)';
  ctx.shadowBlur = 24;
  ctx.fillText(spacedNumber, width / 2, 625);
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
      title: `POSITION IN F(${result.n})`,
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

    // Card background
    ctx.fillStyle = 'rgba(13, 20, 36, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.roundRect(x, cardY, cardWidth, cardHeight, 16);
    ctx.fill();
    ctx.stroke();

    // Top subtle highlight line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(x + 20, cardY);
    ctx.lineTo(x + cardWidth - 20, cardY);
    ctx.stroke();

    // Card Title
    ctx.fillStyle = '#7d8fa6';
    ctx.font = '600 13px ui-monospace, SFMono-Regular, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(cd.title, x + cardWidth / 2, cardY + 28);

    // Card Value
    ctx.fillStyle = cd.color;
    ctx.font = 'bold 30px ui-monospace, SFMono-Regular, monospace';
    ctx.fillText(cd.value, x + cardWidth / 2, cardY + 68);

    // Card Subtext
    ctx.fillStyle = '#65768e';
    ctx.font = '400 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(cd.sub, x + cardWidth / 2, cardY + 102);
  });

  // --- 7. Continuous Fibonacci Stream Visual Ribbon (Matching Reference Layout) ---
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

  // Ribbon Header
  ctx.fillStyle = '#8ea1b8';
  ctx.font = '600 14px ui-monospace, SFMono-Regular, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    'CONTINUOUS FIBONACCI STREAM (0112358...)',
    width / 2,
    ribbonY + 32
  );

  // Stream Text & Highlight Pill
  const snippetBefore = result.streamSnippetBefore || '… 89';
  const snippetAfter = result.streamSnippetAfter || '233 …';

  ctx.font = '500 28px ui-monospace, SFMono-Regular, Menlo, monospace';
  const beforeWidth = ctx.measureText(snippetBefore).width;
  const matchWidth = ctx.measureText(result.match).width;
  const afterWidth = ctx.measureText(snippetAfter).width;

  const pillPaddingX = 24;
  const pillWidth = matchWidth + pillPaddingX * 2;
  const pillHeight = 52;
  const streamTotalWidth = beforeWidth + 24 + pillWidth + 24 + afterWidth;
  const streamStartX = (width - streamTotalWidth) / 2;

  const centerY = ribbonY + 95;

  // Preceding digits
  ctx.fillStyle = '#7a8c9e';
  ctx.textAlign = 'left';
  ctx.fillText(snippetBefore, streamStartX, centerY);

  // Highlighted pill for the match
  const pillX = streamStartX + beforeWidth + 24;
  const pillY = centerY - pillHeight / 2;

  ctx.save();
  // Pill glowing golden/azure background
  const pillGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillWidth, pillY + pillHeight);
  pillGrad.addColorStop(0, '#f0c978');
  pillGrad.addColorStop(1, '#e5b85c');
  ctx.fillStyle = pillGrad;
  ctx.shadowColor = 'rgba(240, 201, 120, 0.7)';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 12);
  ctx.fill();

  // Pill border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Pill Text
  ctx.fillStyle = '#080d18';
  ctx.font = 'bold 30px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 0;
  ctx.fillText(result.match, pillX + pillWidth / 2, centerY);
  ctx.restore();

  // Succeeding digits
  ctx.fillStyle = '#7a8c9e';
  ctx.font = '500 28px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(snippetAfter, pillX + pillWidth + 24, centerY);

  // --- 8. Footer & Website Link ---
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8395aa';
  ctx.font = '400 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Find your number in the 3D Fibonacci sequence', width / 2, 1165);

  // Actual Website Link (Clean & Prominent)
  ctx.fillStyle = '#f0c978';
  ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.shadowColor = 'rgba(240, 201, 120, 0.4)';
  ctx.shadowBlur = 10;
  ctx.fillText(websiteUrl, width / 2, 1210);
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
