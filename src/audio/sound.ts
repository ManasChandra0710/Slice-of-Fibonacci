/**
 * Interstellar Soundtrack Audio Engine
 *
 * Implements a calm, immersive, cinematic background music experience:
 * - Single HTMLAudioElement instance (strictly guarantees zero multiple audio overlap)
 * - Page Visibility API integration: automatically pauses when tab is hidden or minimized;
 *   resumes playback from the exact paused timestamp upon return.
 * - Manual pause precedence: manual user pause takes absolute priority over visibility and interactions.
 * - Smooth volume transitions: gentle 1200ms fade-in and 600ms fade-out to prevent clicks and abrupt jumps.
 * - Autoplay handling: attempts automatic playback on load; if browser policy blocks it,
 *   activates a clean, one-time listener that unlocks playback on the user's first interaction.
 * - Complete removal of sound effects for an undisturbed, pure cinematic experience.
 */

export interface MusicState {
  isPlaying: boolean;
  isPaused: boolean;
  isMuted: boolean;
}

export type MusicStateListener = (state: MusicState) => void;

class InterstellarAudioEngine {
  private static instance: InterstellarAudioEngine;
  private audio: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;
  private userPaused: boolean = false;
  private pausedByVisibility: boolean = false;
  private targetVolume: number = 0.35; // Comfortable, calm ambient background volume
  private fadeInterval: number | null = null;
  private unlockListenerAttached: boolean = false;
  private hasInitialized: boolean = false;
  private listeners: Set<MusicStateListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  public static getInstance(): InterstellarAudioEngine {
    if (!InterstellarAudioEngine.instance) {
      InterstellarAudioEngine.instance = new InterstellarAudioEngine();
    }
    return InterstellarAudioEngine.instance;
  }

  private init(): void {
    if (this.hasInitialized || typeof window === 'undefined') return;
    this.hasInitialized = true;

    this.createAudioElement();
    this.setupVisibilityListener();

    // Attempt automatic playback upon entering the website
    this.playWithFade().catch(() => {
      // Autoplay blocked until first interaction
      this.setupUnlockOnFirstInteraction();
    });
  }

  private createAudioElement(): void {
    if (this.audio || typeof window === 'undefined') return;

    try {
      this.audio = new Audio('/audio/interstellar.mp3');
      this.audio.loop = true;
      this.audio.preload = 'auto';
      this.audio.volume = this.targetVolume;

      this.audio.addEventListener('play', () => {
        this.isPlaying = true;
        this.notify();
      });

      this.audio.addEventListener('pause', () => {
        this.isPlaying = false;
        this.notify();
      });

      this.audio.addEventListener('error', (e) => {
        // Handle audio error gracefully without breaking application
        console.warn('Interstellar audio playback notice:', e);
        this.isPlaying = false;
        this.notify();
      });
    } catch (err) {
      console.warn('HTMLAudioElement not supported in this environment', err);
    }
  }

  /**
   * Listen to Page Visibility API:
   * Pause immediately when tab/window is hidden, resume from exact position when returning.
   */
  private setupVisibilityListener(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // When user switches to another tab or minimizes browser:
        // Pause playback if it was actively playing, and remember it was paused by visibility
        if (this.isPlaying && !this.userPaused) {
          this.pausedByVisibility = true;
          this.pauseWithFade(false); // Visibility pause (not manual)
        }
      } else {
        // When user returns to the tab:
        // Only resume if it was paused because of visibility AND user hasn't manually paused
        if (this.pausedByVisibility && !this.userPaused) {
          this.pausedByVisibility = false;
          this.playWithFade().catch(() => {});
        }
      }
    });
  }

  /**
   * Automatic playback unlock listener on user entrance:
   * Keeps listening across interaction & entrance events until playback successfully starts, then cleanly detaches.
   */
  private setupUnlockOnFirstInteraction(): void {
    if (this.unlockListenerAttached || typeof window === 'undefined') return;
    this.unlockListenerAttached = true;

    const events = [
      'pointerdown',
      'touchstart',
      'mousedown',
      'keydown',
      'click',
      'pointermove',
      'mousemove',
      'wheel',
      'scroll',
      'focus',
    ];

    const unlockHandler = () => {
      if (this.userPaused || document.hidden) return;

      this.playWithFade()
        .then(() => {
          if (this.isPlaying) {
            events.forEach((ev) => window.removeEventListener(ev, unlockHandler));
            this.unlockListenerAttached = false;
          }
        })
        .catch(() => {
          // Still waiting for user activation gesture if pointermove was not enough
        });
    };

    events.forEach((ev) => {
      window.addEventListener(ev, unlockHandler, { passive: true });
    });
  }

  private cancelFade(): void {
    if (this.fadeInterval !== null) {
      window.clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }

  /**
   * Smoothly transitions audio volume to prevent sudden changes, pops, or glitches
   */
  private fadeVolume(
    from: number,
    to: number,
    durationMs: number,
    onComplete?: () => void
  ): void {
    if (!this.audio) return;
    this.cancelFade();

    const steps = 24;
    const intervalMs = Math.max(16, durationMs / steps);
    const stepDelta = (to - from) / steps;
    let currentStep = 0;

    this.audio.volume = Math.max(0, Math.min(1, from));

    this.fadeInterval = window.setInterval(() => {
      if (!this.audio) {
        this.cancelFade();
        return;
      }

      currentStep++;
      const nextVol = Math.max(0, Math.min(1, from + stepDelta * currentStep));
      this.audio.volume = nextVol;

      if (currentStep >= steps) {
        this.audio.volume = Math.max(0, Math.min(1, to));
        this.cancelFade();
        if (onComplete) onComplete();
      }
    }, intervalMs);
  }

  /**
   * Starts background playback with a gentle fade-in
   */
  public async playWithFade(): Promise<void> {
    if (this.userPaused) return;
    this.createAudioElement();
    if (!this.audio) return;

    try {
      this.cancelFade();

      if (this.audio.paused) {
        this.audio.volume = 0.05;
        const playPromise = this.audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
      }

      this.isPlaying = true;
      this.notify();

      // Gentle fade-in over 1000ms up to target volume
      this.fadeVolume(this.audio.volume, this.targetVolume, 1000);
    } catch (err) {
      // Browser autoplay policy prevented playback; will unlock on first user interaction
      this.isPlaying = false;
      this.notify();
      this.setupUnlockOnFirstInteraction();
      throw err;
    }
  }

  /**
   * Pauses background playback with a gentle 600ms fade-out
   */
  public pauseWithFade(isManual: boolean = false): void {
    if (isManual) {
      this.userPaused = true;
      this.pausedByVisibility = false;
    }

    if (!this.audio || this.audio.paused) {
      this.isPlaying = false;
      this.notify();
      return;
    }

    const currentVol = this.audio.volume;

    // Gentle fade-out over 600ms, then pause without resetting playback position
    this.fadeVolume(currentVol, 0.01, 600, () => {
      if (this.audio) {
        this.audio.pause();
        this.audio.volume = this.targetVolume; // Restored for next play
      }
      this.isPlaying = false;
      this.notify();
    });
  }

  /**
   * Manual play/pause toggle from UI controls
   */
  public togglePlayPause(): boolean {
    if (this.isPlaying) {
      this.pauseWithFade(true); // Manual pause
      return false;
    } else {
      this.userPaused = false;
      this.pausedByVisibility = false;
      this.playWithFade().catch(() => {});
      return true;
    }
  }

  public subscribe(listener: MusicStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch {
        // Safe listener execution
      }
    });
  }

  public getState(): MusicState {
    return {
      isPlaying: this.isPlaying,
      isPaused: !this.isPlaying || this.userPaused,
      isMuted: !this.isPlaying || this.userPaused,
    };
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getUserPaused(): boolean {
    return this.userPaused;
  }

  // --- Compatibility helpers for existing codebase with zero sound effects ---
  public playInterstellar(): Promise<void> {
    return this.playWithFade();
  }

  public pauseInterstellar(): void {
    this.pauseWithFade(true);
  }

  public toggleMute(): boolean {
    const playing = this.togglePlayPause();
    return !playing;
  }

  public getMuted(): boolean {
    return !this.isPlaying || this.userPaused;
  }

  // No-op dummy methods ensuring no crashes if any legacy call persists
  public playClick(): void {}
  public playFlySwoosh(): void {}
  public playTargetLock(): void {}
}

export const soundEngine = InterstellarAudioEngine.getInstance();
