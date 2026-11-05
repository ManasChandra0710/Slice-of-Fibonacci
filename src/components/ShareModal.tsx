import React, { useState, useEffect } from 'react';
import { FibonacciMatchResult } from '../math/fibonacci';
import {
  GeneratedShareCard,
  ORIGINAL_HOMEPAGE_URL,
  SHARE_CAPTION,
} from '../utils/shareCard';
import { Download, Link2, Copy, Share2, Check, X, ExternalLink } from 'lucide-react';

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
    } catch {}
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(ORIGINAL_HOMEPAGE_URL);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  const handleCopyShareCaption = async () => {
    try {
      const fullText = `${SHARE_CAPTION}\n${ORIGINAL_HOMEPAGE_URL}`;
      await navigator.clipboard.writeText(fullText);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2500);
    } catch {}
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-rise"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-[#060b16] border border-[#71b9ff]/25 rounded-2xl sm:rounded-3xl shadow-[0_25px_65px_rgba(0,0,0,0.9),0_0_35px_rgba(113,185,255,0.18)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#040811]">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Slice of Fibonacci Logo"
              className="w-8 h-8 rounded-lg border border-[#71b9ff]/40 object-cover shadow-[0_0_12px_rgba(113,185,255,0.3)]"
            />
            <div>
              <h2
                id="share-modal-title"
                className="text-sm sm:text-base font-semibold text-white tracking-wide"
              >
                Share Result Card
              </h2>
              <p className="text-[11px] font-mono text-[#7d8fa6]">
                Your digits, discovered. • 1080 × 1350 PNG
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
            {/* Share Card Image Preview */}
            <div className="sm:col-span-6 flex flex-col items-center">
              <div className="relative rounded-2xl overflow-hidden border border-[#71b9ff]/30 shadow-[0_0_28px_rgba(113,185,255,0.18)] max-w-[280px] sm:max-w-full bg-[#020409] group">
                {shareCard ? (
                  <img
                    src={shareCard.dataUrl}
                    alt={`Slice of Fibonacci Share Card for ${matchResult.query}`}
                    className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                  />
                ) : (
                  <div className="w-[260px] h-[325px] flex items-center justify-center text-xs font-mono text-[#7d8fa6]">
                    Rendering Share Card...
                  </div>
                )}
              </div>

              <div className="mt-3.5 w-full p-3.5 rounded-xl bg-[#040812] border border-[#71b9ff]/20 text-center space-y-1.5">
                <div className="text-[11.5px] text-[#b4c4d9] leading-relaxed">
                  {SHARE_CAPTION}
                </div>
                <div>
                  <a
                    href={ORIGINAL_HOMEPAGE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#71b9ff] hover:text-white font-mono text-xs sm:text-[13px] font-bold hover:underline transition"
                  >
                    <span>{ORIGINAL_HOMEPAGE_URL}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>
            </div>

            {/* Telemetry Summary & Action Buttons */}
            <div className="sm:col-span-6 space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2.5 font-mono text-xs">
                <div className="flex justify-between items-center text-[#7d8fa6] text-[11px] uppercase tracking-wider pb-2 border-b border-white/[0.06]">
                  <span>YOUR NUMBER</span>
                  <span className="font-bold text-sm text-[#71b9ff]">
                    {matchResult.query}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#99a9bf]">
                  <span>FIBONACCI TERM</span>
                  <span className="text-[#71b9ff] font-bold">
                    F({matchResult.n.toLocaleString('en-US')})
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#99a9bf]">
                  <span>POSITION IN TERM</span>
                  <span className="text-[#71b9ff] font-bold">
                    {matchResult.pos.toLocaleString('en-US')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#99a9bf]">
                  <span>STREAM POSITION</span>
                  <span className="text-[#71b9ff] font-bold">
                    {matchResult.streamPos.toLocaleString('en-US')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#99a9bf]">
                  <span>TERM LENGTH</span>
                  <span className="text-[#71b9ff] font-bold">
                    {matchResult.termLength.toLocaleString('en-US')}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!shareCard}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#70b6ff] hover:bg-[#84c2ff] active:scale-[0.98] text-[#040812] font-semibold text-xs font-mono transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(112,182,255,0.35)] cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Share Image (PNG)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyImage}
                  disabled={!shareCard}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#71b9ff]/15 hover:bg-[#71b9ff]/25 active:scale-[0.98] border border-[#71b9ff]/40 text-[#71b9ff] hover:text-white font-mono text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {copiedImage ? (
                    <>
                      <Check className="w-4 h-4 text-[#71b9ff]" />
                      <span className="text-[#71b9ff] font-semibold">
                        Image Copied to Clipboard ✓
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#71b9ff]" />
                      <span>Copy Image to Clipboard</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopySearchUrl}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-[0.98] border border-white/10 hover:border-[#71b9ff]/45 text-[#c5d3e8] hover:text-white font-mono text-xs transition flex items-center justify-center gap-2 cursor-pointer"
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

                <button
                  type="button"
                  onClick={handleCopyShareCaption}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] border border-white/10 text-[#9eb0c6] hover:text-white font-mono text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedCaption ? (
                    <>
                      <Check className="w-4 h-4 text-[#71b9ff]" />
                      <span className="text-[#71b9ff] font-semibold">
                        Caption & Link Copied ✓
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#71b9ff]" />
                      <span>Copy Caption & Website Link</span>
                    </>
                  )}
                </button>

                {supportsNativeShare && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    disabled={isSharingNative || !shareCard}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] active:scale-[0.98] border border-white/10 text-[#c5d3e8] font-mono text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Share2 className="w-4 h-4 text-[#71b9ff]" />
                    <span>{isSharingNative ? 'Opening Share...' : 'Share via System Apps ↗'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#040812] border border-white/[0.06] rounded-xl flex items-center justify-between gap-3 text-xs font-mono">
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
