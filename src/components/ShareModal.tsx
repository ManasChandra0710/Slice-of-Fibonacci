import React, { useState, useEffect } from 'react';
import { FibonacciMatchResult } from '../math/fibonacci';
import {
  GeneratedShareCard,
  ORIGINAL_HOMEPAGE_URL,
  SHARE_CAPTION,
} from '../utils/shareCard';
import { Download, Link2, Copy, Share2, Check, X, Sparkles, ExternalLink } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchResult: FibonacciMatchResult;
  shareCard: GeneratedShareCard | null;
  searchUrl?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  matchResult,
  shareCard,
  searchUrl,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSearchUrl, setCopiedSearchUrl] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [isSharingNative, setIsSharingNative] = useState(false);

  const directUrl = searchUrl || `${ORIGINAL_HOMEPAGE_URL}${matchResult.query}`;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!shareCard) return;
    const a = document.createElement('a');
    a.href = shareCard.dataUrl;
    a.download = `slice-of-fibonacci-${matchResult.query}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopySearchUrl = async () => {
    try {
      await navigator.clipboard.writeText(directUrl);
      setCopiedSearchUrl(true);
      setTimeout(() => setCopiedSearchUrl(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(ORIGINAL_HOMEPAGE_URL);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyShareCaption = async () => {
    try {
      const fullText = `${SHARE_CAPTION}\n${ORIGINAL_HOMEPAGE_URL}`;
      await navigator.clipboard.writeText(fullText);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopyImage = async () => {
    if (!shareCard) return;
    try {
      if (typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': shareCard.blob }),
        ]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  const handleNativeShare = async () => {
    if (!shareCard || typeof navigator === 'undefined' || !navigator.share) return;
    setIsSharingNative(true);

    // Pass caption in text and homepage URL in url field so native share sheets
    // and apps (Chrome, iOS, Android) do not duplicate the link
    const shareData: ShareData = {
      title: 'Slice of Fibonacci',
      text: SHARE_CAPTION,
      url: ORIGINAL_HOMEPAGE_URL,
    };

    try {
      if (
        navigator.canShare &&
        shareCard.file &&
        navigator.canShare({ ...shareData, files: [shareCard.file] })
      ) {
        await navigator.share({ ...shareData, files: [shareCard.file] });
      } else {
        await navigator.share(shareData);
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        handleCopyShareCaption();
      }
    } finally {
      setIsSharingNative(false);
    }
  };

  const supportsNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-[#090f1d] border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_25px_65px_rgba(0,0,0,0.85),0_0_35px_rgba(113,185,255,0.18)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#070b16]">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[#71b9ff]/15 border border-[#71b9ff]/30 text-[#71b9ff]">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h2
                id="share-modal-title"
                className="text-sm sm:text-base font-semibold text-white tracking-wide"
              >
                Share Fibonacci Result
              </h2>
              <p className="text-[11px] font-mono text-[#7d8fa6]">
                Golden-Angle Phyllotaxis Spiral • verified homepage link
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8292a8] hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
            aria-label="Close share dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Scrollable with Preview & Actions */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Main Content Grid: Card Preview on Left, Quick Telemetry & Actions on Right */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
            {/* Share Card Image Preview */}
            <div className="sm:col-span-6 flex flex-col items-center">
              <div className="relative rounded-2xl overflow-hidden border border-[#f0c978]/30 shadow-[0_0_25px_rgba(240,201,120,0.2)] max-w-[280px] sm:max-w-full bg-[#050810] group">
                {shareCard ? (
                  <img
                    src={shareCard.dataUrl}
                    alt={`Slice of Fibonacci Share Card for ${matchResult.query}`}
                    className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="w-[260px] h-[325px] flex items-center justify-center text-xs font-mono text-[#7d8fa6]">
                    Rendering Share Card...
                  </div>
                )}
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-white/10 text-[10px] font-mono text-[#f0c978]">
                  1080 × 1350 PNG
                </div>
              </div>

              {/* Exact required text and link format beneath the image */}
              <div className="mt-3.5 w-full p-3.5 rounded-xl bg-[#060a14] border border-[#f0c978]/30 text-center space-y-1.5 shadow-inner">
                <div className="text-[12px] text-[#c5d4e8] font-medium tracking-wide">
                  {SHARE_CAPTION}
                </div>
                <div>
                  <a
                    href={ORIGINAL_HOMEPAGE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#f0c978] hover:text-white font-mono text-xs sm:text-[13px] font-bold hover:underline transition"
                  >
                    <span>{ORIGINAL_HOMEPAGE_URL}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>
            </div>

            {/* Telemetry Summary & Action Buttons */}
            <div className="sm:col-span-6 space-y-4">
              {/* Highlighted Results Breakdown */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2 font-mono text-xs">
                <div className="flex justify-between items-center text-[#7d8fa6] text-[11px] uppercase tracking-wider pb-1.5 border-b border-white/[0.06]">
                  <span>Searched Number</span>
                  <span className="text-white font-bold text-sm text-[#f0c978]">
                    "{matchResult.query}"
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#99a9bf]">
                  <span>Fibonacci Term</span>
                  <span className="text-[#71b9ff] font-bold">
                    F({matchResult.n.toLocaleString('en-US')})
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#99a9bf]">
                  <span>Position within F({matchResult.n})</span>
                  <span className="text-white font-semibold">
                    #{matchResult.pos.toLocaleString('en-US')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#99a9bf]">
                  <span>Continuous Stream</span>
                  <span className="text-[#f0c978] font-semibold">
                    #{matchResult.streamPos.toLocaleString('en-US')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#99a9bf] pt-1 border-t border-white/[0.04]">
                  <span>Shareable URL</span>
                  <span className="text-[#71b9ff] font-bold">
                    /{matchResult.query}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                {/* Download Card (Primary) */}
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!shareCard}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#f0c978] via-[#e5b85c] to-[#d69f3d] hover:brightness-110 active:scale-[0.98] text-[#070b14] font-semibold text-xs font-mono transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(240,201,120,0.3)] cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Share Image (PNG)</span>
                </button>

                {/* Copy Direct Search URL (/{number}) */}
                <button
                  type="button"
                  onClick={handleCopySearchUrl}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#71b9ff]/20 to-[#9ecbff]/20 hover:from-[#71b9ff]/30 hover:to-[#9ecbff]/30 active:scale-[0.98] border border-[#71b9ff]/45 text-[#71b9ff] hover:text-white font-mono text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(113,185,255,0.12)]"
                >
                  {copiedSearchUrl ? (
                    <>
                      <Check className="w-4 h-4 text-[#71b9ff]" />
                      <span className="text-[#71b9ff] font-semibold">
                        Direct URL Copied (/{matchResult.query}) ✓
                      </span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 text-[#71b9ff]" />
                      <span>Copy Direct Search URL (/{matchResult.query})</span>
                    </>
                  )}
                </button>

                {/* Copy Website Link */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-[0.98] border border-white/10 hover:border-[#71b9ff]/50 text-[#c5d3e8] hover:text-white font-mono text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-[#71b9ff]" />
                      <span className="text-[#71b9ff] font-semibold">
                        Website Link Copied ✓
                      </span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 text-[#71b9ff]" />
                      <span>Copy Website Link</span>
                    </>
                  )}
                </button>

                {/* Copy Complete Share Caption & Link */}
                <button
                  type="button"
                  onClick={handleCopyShareCaption}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-[0.98] border border-white/10 hover:border-[#f0c978]/50 text-[#f0c978] font-mono text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  {copiedCaption ? (
                    <>
                      <Check className="w-4 h-4 text-[#f0c978]" />
                      <span className="text-[#f0c978] font-semibold">
                        Caption & Link Copied ✓
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#f0c978]" />
                      <span>Copy Caption & Original Link</span>
                    </>
                  )}
                </button>

                {/* Copy Image to Clipboard */}
                <button
                  type="button"
                  onClick={handleCopyImage}
                  disabled={!shareCard}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] border border-white/10 text-[#9eb0c6] hover:text-white font-mono text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {copiedImage ? (
                    <>
                      <Check className="w-4 h-4 text-[#34d399]" />
                      <span className="text-[#34d399] font-semibold">
                        Image Copied to Clipboard ✓
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#9eb0c6]" />
                      <span>Copy Image to Clipboard</span>
                    </>
                  )}
                </button>

                {/* Native OS Share (if supported) */}
                {supportsNativeShare && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    disabled={isSharingNative || !shareCard}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#71b9ff]/15 hover:bg-[#71b9ff]/25 active:scale-[0.98] border border-[#71b9ff]/40 text-[#71b9ff] font-mono text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(113,185,255,0.15)] disabled:opacity-50"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{isSharingNative ? 'Opening Share...' : 'Share via System Apps ↗'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Direct Homepage Link Pill */}
          <div className="p-3 bg-[#060a14] border border-white/[0.06] rounded-xl flex items-center justify-between gap-3 text-xs font-mono">
            <span className="text-[#8898ac] text-[11px] truncate select-all">
              {ORIGINAL_HOMEPAGE_URL}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="text-[#71b9ff] hover:text-white shrink-0 text-[11px] font-semibold transition cursor-pointer"
            >
              {copiedLink ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
