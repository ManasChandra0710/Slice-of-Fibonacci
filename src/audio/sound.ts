/**
 * Interstellar Soundtrack Audio Engine
 *
 * Implements an immersive, instant-response background music experience:
 * 1. Page Refresh / Initial Load:
 *    - Always restarts from 00:00 (beginning).
 *    - Attempts autoplay automatically on page entrance.
 *    - If blocked by browser autoplay policy, waits for the user's first genuine interaction
 *      (click, pointerdown, touchstart, keydown) and starts playback from 00:00.
 *
 * 2. Instant Pause & Play:
 *    - Clicking Pause stops audible playback immediately on the same tick with zero fade-out delay.
 *    - Cancels any active fade intervals or pending play promises so rapid clicks never cause ghost playback.
 *
 * 3. Tab Switching (Page Visibility API):
 *    - Pauses immediately when the tab is hidden and resumes from the paused timestamp on return,
 *      unless the user manually paused playback.
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
  private playbackActionId: number = 0;
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

    try {
      window.sessionStorage?.removeItem('interstellar_audio_pos');
      window.sessionStorage?.removeItem('fibonacci_audio_pos');
      window.localStorage?.removeItem('interstellar_audio_pos');
      window.localStorage?.removeItem('fibonacci_audio_pos');
    } catch {}

    this.createAudioElement();
    this.setupVisibilityListener();

    this.playFromStart().catch(() => {
      this.setupUnlockOnFirstInteraction();
    });
  }

  private createAudioElement(): void {
    if (this.audio || typeof window === 'undefined') return;

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

      try {
        this.audio.currentTime = 0;
      } catch {}

      win.__INTERSTELLAR_AUDIO__ = this.audio;

      this.audio.addEventListener('loadedmetadata', () => {
        if (this.needsRestartFromStart && this.audio) {
          try {
            this.audio.currentTime = 0;
          } catch {}
        }
      });

      this.audio.addEventListener('play', () => {
        if (this.userPaused && this.audio) {
          this.audio.pause();
          this.isPlaying = false;
          this.notify();
          return;
        }
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

      this.audio.addEventListener('error', () => {
        this.isPlaying = false;
        this.notify();
      });
    } catch (err) {
      console.warn('HTMLAudioElement initialization error:', err);
    }
  }

  private setupVisibilityListener(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.isPlaying && !this.userPaused) {
          this.pausedByVisibility = true;
          this.pauseImmediately(false);
        }
      } else {
        if (this.pausedByVisibility && !this.userPaused) {
          this.pausedByVisibility = false;
          this.resumePlayback().catch(() => {});
        }
      }
    });
  }

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
        .catch(() => {});
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

  private fadeVolume(from: number, to: number, durationMs: number): void {
    if (!this.audio) return;
    this.cancelFade();

    const steps = 12;
    const intervalMs = Math.max(16, Math.floor(durationMs / steps));
    const stepDelta = (to - from) / steps;
    let currentStep = 0;

    this.audio.volume = Math.max(0, Math.min(1, from));

    this.fadeInterval = window.setInterval(() => {
      if (!this.audio || this.userPaused || this.audio.paused) {
        this.cancelFade();
        return;
      }

      currentStep++;
      const nextVol = Math.max(0, Math.min(1, from + stepDelta * currentStep));
      this.audio.volume = nextVol;

      if (currentStep >= steps) {
        this.audio.volume = Math.max(0, Math.min(1, to));
        this.cancelFade();
      }
    }, intervalMs);
  }

  public async playFromStart(): Promise<void> {
    this.createAudioElement();
    if (!this.audio || this.userPaused) return;

    const actionId = ++this.playbackActionId;

    try {
      this.cancelFade();
      try {
        this.audio.currentTime = 0;
      } catch {}

      this.audio.volume = 0.12;
      await this.audio.play();

      // If user clicked Pause while play() promise was resolving, stop immediately
      if (actionId !== this.playbackActionId || this.userPaused) {
        this.audio.pause();
        this.isPlaying = false;
        this.notify();
        return;
      }

      this.needsRestartFromStart = false;
      this.isPlaying = true;
      this.notify();

      this.fadeVolume(this.audio.volume, this.targetVolume, 450);
    } catch (err) {
      if (actionId === this.playbackActionId) {
        this.isPlaying = false;
        this.notify();
      }
      throw err;
    }
  }

  public async resumePlayback(): Promise<void> {
    this.createAudioElement();
    if (!this.audio || this.userPaused) return;

    if (this.needsRestartFromStart) {
      return this.playFromStart();
    }

    const actionId = ++this.playbackActionId;

    try {
      this.cancelFade();
      this.audio.volume = this.targetVolume;
      await this.audio.play();

      if (actionId !== this.playbackActionId || this.userPaused) {
        this.audio.pause();
        this.isPlaying = false;
        this.notify();
        return;
      }

      this.isPlaying = true;
      this.notify();
    } catch (err) {
      if (actionId === this.playbackActionId) {
        this.isPlaying = false;
        this.notify();
      }
      throw err;
    }
  }

  /**
   * Stops playback immediately with zero fade-out delay.
   */
  public pauseImmediately(isManual: boolean = false): void {
    this.playbackActionId++;
    this.cancelFade();

    if (isManual) {
      this.userPaused = true;
      this.pausedByVisibility = false;
      this.removeUnlockListeners();
    }

    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.volume = this.targetVolume;
      } catch {}
    }

    this.isPlaying = false;
    this.notify();
  }

  public togglePlayPause(): boolean {
    const isActivelyPlaying =
      (this.isPlaying || (this.audio !== null && !this.audio.paused)) && !this.userPaused;

    if (isActivelyPlaying) {
      this.pauseImmediately(true);
      return false;
    } else {
      this.userPaused = false;
      this.pausedByVisibility = false;
      this.notify();
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
    return this.isPlaying && !this.userPaused;
  }

  public playInterstellar(resetToStart: boolean = false): Promise<void> {
    if (resetToStart || this.needsRestartFromStart) {
      return this.playFromStart();
    }
    return this.resumePlayback();
  }
}

export const soundEngine = InterstellarAudioEngine.getInstance();
