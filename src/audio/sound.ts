/**
 * Interstellar Soundtrack Audio Engine
 *
 * Implements an immersive, cinematic background music experience:
 * 1. Page Refresh / Initial Load:
 *    - Always restarts from 00:00 (beginning).
 *    - Attempts autoplay automatically on page entrance.
 *    - If blocked by browser autoplay policy, waits for the user's first genuine interaction
 *      (click, pointerdown, touchstart, keydown) and immediately starts playback from 00:00.
 *    - Strictly purges any persistent playback timestamps from localStorage/sessionStorage.
 *
 * 2. Tab Switching (Page Visibility API):
 *    - When the user switches tabs or minimizes the window: pauses playback and preserves current position.
 *    - When the user returns to the tab: resumes playback from the exact paused timestamp.
 *    - If user manually paused with the top-right button, respects their manual choice and keeps it paused.
 *
 * 3. In-App Navigation & Number Search:
 *    - History API transitions (/13, /144, /) and search actions do NOT restart the music.
 *
 * 4. Audio Quality & Safety:
 *    - Single HTMLAudioElement instance; prevents ghost or overlapping audio.
 *    - Gentle volume fades to avoid audible clicks or pops.
 *    - Zero sound effects to keep the experience calm and focused.
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
  private needsRestartFromStart: boolean = true;
  private targetVolume: number = 0.35;
  private fadeInterval: number | null = null;
  private unlockListenerAttached: boolean = false;
  private unlockHandler: ((e: Event) => void) | null = null;
  private activePlayPromise: Promise<void> | null = null;
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

    // Purge any stored audio positions to ensure page refresh strictly restarts from 00:00
    try {
      window.sessionStorage?.removeItem('interstellar_audio_pos');
      window.sessionStorage?.removeItem('fibonacci_audio_pos');
      window.localStorage?.removeItem('interstellar_audio_pos');
      window.localStorage?.removeItem('fibonacci_audio_pos');
    } catch {}

    this.createAudioElement();
    this.setupVisibilityListener();

    // On initial website load or page refresh: attempt to play from the beginning (00:00)
    this.playFromStart().catch(() => {
      // Browser autoplay policy blocked unmuted playback -> listen for first user interaction
      this.setupUnlockOnFirstInteraction();
    });
  }

  private createAudioElement(): void {
    if (this.audio || typeof window === 'undefined') return;

    // Clean up any stale audio on window to avoid duplicate instances
    const win = window as unknown as { __INTERSTELLAR_AUDIO__?: HTMLAudioElement };
    if (win.__INTERSTELLAR_AUDIO__) {
      try {
        win.__INTERSTELLAR_AUDIO__.pause();
        win.__INTERSTELLAR_AUDIO__.src = '';
      } catch {}
      win.__INTERSTELLAR_AUDIO__ = undefined;
    }

    try {
      this.audio = new Audio('/audio/interstellar.mp3');
      this.audio.loop = true;
      this.audio.preload = 'auto';
      this.audio.volume = this.targetVolume;

      // Force beginning position
      try {
        this.audio.currentTime = 0;
      } catch {}

      win.__INTERSTELLAR_AUDIO__ = this.audio;

      // Ensure that when metadata is loaded on fresh page load, currentTime is at 00:00
      this.audio.addEventListener('loadedmetadata', () => {
        if (this.needsRestartFromStart && this.audio) {
          try {
            this.audio.currentTime = 0;
          } catch {}
        }
      });

      this.audio.addEventListener('play', () => {
        this.isPlaying = true;
        this.notify();
      });

      this.audio.addEventListener('pause', () => {
        this.isPlaying = false;
        this.notify();
      });

      this.audio.addEventListener('ended', () => {
        this.isPlaying = false;
        this.notify();
      });

      this.audio.addEventListener('error', (e) => {
        console.warn('Interstellar audio notice:', e);
        this.isPlaying = false;
        this.notify();
      });
    } catch (err) {
      console.warn('HTMLAudioElement initialization error:', err);
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
        // Tab hidden or minimized: pause if actively playing without resetting playback position
        if (this.isPlaying && !this.userPaused) {
          this.pausedByVisibility = true;
          this.pauseWithFade(false); // Visibility pause, not manual
        }
      } else {
        // Tab visible: resume from the exact position where it was paused
        if (this.pausedByVisibility && !this.userPaused) {
          this.pausedByVisibility = false;
          this.resumePlayback().catch(() => {});
        }
      }
    });
  }

  /**
   * Automatic playback unlock listener:
   * Attached ONLY to genuine user activation events (click, pointerdown, touchstart, keydown).
   * Once user interacts, starts playback from 00:00 and detaches all listeners.
   */
  private setupUnlockOnFirstInteraction(): void {
    if (this.unlockListenerAttached || typeof window === 'undefined') return;
    this.unlockListenerAttached = true;

    const activationEvents = ['click', 'pointerdown', 'touchstart', 'keydown'];

    this.unlockHandler = () => {
      if (this.userPaused || (typeof document !== 'undefined' && document.hidden)) {
        return;
      }

      this.playFromStart()
        .then(() => {
          this.removeUnlockListeners();
        })
        .catch(() => {
          // If still blocked, listener remains until an activating gesture resolves
        });
    };

    activationEvents.forEach((ev) => {
      window.addEventListener(ev, this.unlockHandler!, { passive: true, capture: true });
    });
  }

  private removeUnlockListeners(): void {
    if (!this.unlockListenerAttached || !this.unlockHandler || typeof window === 'undefined') {
      return;
    }
    const activationEvents = ['click', 'pointerdown', 'touchstart', 'keydown'];
    activationEvents.forEach((ev) => {
      window.removeEventListener(ev, this.unlockHandler!, { capture: true });
    });
    this.unlockListenerAttached = false;
    this.unlockHandler = null;
  }

  private cancelFade(): void {
    if (this.fadeInterval !== null) {
      window.clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }

  private fadeVolume(
    from: number,
    to: number,
    durationMs: number,
    onComplete?: () => void
  ): void {
    if (!this.audio) return;
    this.cancelFade();

    const steps = 20;
    const intervalMs = Math.max(16, Math.floor(durationMs / steps));
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
   * Resets audio to beginning (00:00) and starts playback with smooth fade-in
   */
  public async playFromStart(): Promise<void> {
    this.createAudioElement();
    if (!this.audio) return;

    if (this.userPaused) return;

    try {
      this.cancelFade();
      try {
        this.audio.currentTime = 0;
      } catch {}

      this.audio.volume = 0.05;

      const p = this.audio.play();
      this.activePlayPromise = p;
      await p;
      this.activePlayPromise = null;

      this.needsRestartFromStart = false;
      this.isPlaying = true;
      this.notify();

      // Smooth volume fade-in to target volume
      this.fadeVolume(this.audio.volume, this.targetVolume, 1000);
    } catch (err) {
      this.activePlayPromise = null;
      this.isPlaying = false;
      this.notify();
      throw err;
    }
  }

  /**
   * Resumes playback from current position (used when returning to tab or manual unpause)
   */
  public async resumePlayback(): Promise<void> {
    this.createAudioElement();
    if (!this.audio) return;

    if (this.userPaused) return;

    // If never started before, start from 00:00
    if (this.needsRestartFromStart) {
      return this.playFromStart();
    }

    try {
      this.cancelFade();
      this.audio.volume = 0.05;

      const p = this.audio.play();
      this.activePlayPromise = p;
      await p;
      this.activePlayPromise = null;

      this.isPlaying = true;
      this.notify();

      this.fadeVolume(this.audio.volume, this.targetVolume, 800);
    } catch (err) {
      this.activePlayPromise = null;
      this.isPlaying = false;
      this.notify();
      throw err;
    }
  }

  /**
   * General playWithFade helper
   * @param resetToStart If true, restarts playback at 00:00
   */
  public async playWithFade(resetToStart: boolean = false): Promise<void> {
    if (resetToStart || this.needsRestartFromStart) {
      return this.playFromStart();
    }
    return this.resumePlayback();
  }

  /**
   * Pauses background playback with a gentle 600ms fade-out
   * @param isManual True if paused directly by user action (top-right control)
   */
  public pauseWithFade(isManual: boolean = false): void {
    if (isManual) {
      this.userPaused = true;
      this.pausedByVisibility = false;
      this.notify(); // Immediate UI update for instant feedback
    }

    if (!this.audio || this.audio.paused) {
      this.isPlaying = false;
      this.notify();
      return;
    }

    const currentVol = this.audio.volume;

    this.fadeVolume(currentVol, 0.01, 500, () => {
      if (this.audio) {
        this.audio.pause();
        this.audio.volume = this.targetVolume;
      }
      this.isPlaying = false;
      this.notify();
    });
  }

  /**
   * Manual play/pause toggle triggered from top-right music controls
   */
  public togglePlayPause(): boolean {
    const isActivelyPlaying = this.isPlaying && !this.userPaused;
    if (isActivelyPlaying) {
      this.pauseWithFade(true); // Manual user pause
      return false;
    } else {
      this.userPaused = false;
      this.pausedByVisibility = false;
      this.resumePlayback().catch(() => {});
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
      } catch {}
    });
  }

  public getState(): MusicState {
    const active = this.isPlaying && !this.userPaused;
    return {
      isPlaying: active,
      isPaused: !active,
      isMuted: !active,
    };
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getUserPaused(): boolean {
    return this.userPaused;
  }

  // --- Compatibility methods ---
  public playInterstellar(resetToStart: boolean = false): Promise<void> {
    return this.playWithFade(resetToStart);
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

  // Silent no-op methods ensuring zero sound effect clutter
  public playClick(): void {}
  public playFlySwoosh(): void {}
  public playTargetLock(): void {}
}

export const soundEngine = InterstellarAudioEngine.getInstance();
