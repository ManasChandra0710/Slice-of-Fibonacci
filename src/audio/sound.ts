/**
 * Interstellar Soundtrack & Spatial Audio Engine
 * Features:
 * - Hans Zimmer's iconic "Interstellar Main Theme / First Step"
 * - Smooth volume crossfading & state management
 * - Web Audio procedural Interstellar church organ backup synthesizer
 * - High-tech UI interaction and sequence fly swoosh sound effects
 */

type SoundStateListener = (state: { isPlaying: boolean; isMuted: boolean }) => void;

class SoundEngine {
  private audioEl: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isPlaying: boolean = false;
  private volume: number = 0.45;
  private listeners: Set<SoundStateListener> = new Set();
  private isProceduralActive: boolean = false;
  private proceduralInterval: number | null = null;
  private pausedByVisibilityChange: boolean = false;
  private unlockListenersAttached: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Setup audio element for Interstellar theme
      this.initAudioElement();

      // Attempt immediate autoplay when user enters the website
      this.playInterstellar().catch(() => {});

      // Setup capturing gesture listeners so ANY interaction on the page immediately starts audio
      this.setupUserUnlockListeners();

      // Tab visibility listener:
      // When user goes to another tab, pause the background music.
      // When user returns to this tab, resume the music smoothly.
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (this.isPlaying && !this.isMuted) {
            this.pausedByVisibilityChange = true;
            this.pauseForVisibility();
          }
        } else {
          if (this.pausedByVisibilityChange && !this.isMuted) {
            this.pausedByVisibilityChange = false;
            this.playInterstellar().catch(() => {});
          }
        }
      });
    }
  }

  private setupUserUnlockListeners() {
    if (this.unlockListenersAttached || typeof window === 'undefined') return;
    this.unlockListenersAttached = true;

    const onUserGesture = () => {
      if (this.isMuted) return;

      this.initAudioElement();
      if (this.audioEl) {
        this.audioEl.muted = false;
        this.audioEl.volume = this.volume;
        this.audioEl
          .play()
          .then(() => {
            this.isPlaying = true;
            this.notify();
            cleanup();
          })
          .catch(() => {
            // Keep listening if browser didn't accept this specific event
          });
      }
    };

    const cleanup = () => {
      gestureEvents.forEach((ev) => window.removeEventListener(ev, onUserGesture, true));
      document.removeEventListener('pointerdown', onUserGesture, true);
      this.unlockListenersAttached = false;
    };

    const gestureEvents = ['pointerdown', 'mousedown', 'touchstart', 'touchend', 'keydown', 'click'];
    gestureEvents.forEach((ev) => {
      window.addEventListener(ev, onUserGesture, { capture: true, passive: true });
    });
    document.addEventListener('pointerdown', onUserGesture, { capture: true, passive: true });
  }

  private initAudioElement() {
    if (typeof window === 'undefined' || this.audioEl) return;
    try {
      const existing = document.getElementById('bgm-audio') as HTMLAudioElement | null;
      this.audioEl = existing || new Audio('/audio/interstellar.mp3');
      this.audioEl.loop = true;
      this.audioEl.preload = 'auto';
      this.audioEl.volume = this.volume;

      this.audioEl.addEventListener('play', () => {
        this.isPlaying = true;
        this.notify();
      });

      this.audioEl.addEventListener('pause', () => {
        this.isPlaying = false;
        this.notify();
      });

      this.audioEl.addEventListener('error', () => {
        // Fallback to procedural Interstellar organ if network / format issue
        console.warn('Interstellar audio stream fallback to procedural organ');
        if (!this.isMuted) {
          this.startProceduralInterstellar();
        }
      });
    } catch {
      // Audio element not supported
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public subscribe(listener: SoundStateListener): () => void {
    this.listeners.add(listener);
    listener({ isPlaying: this.isPlaying, isMuted: this.isMuted });
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = { isPlaying: this.isPlaying, isMuted: this.isMuted };
    this.listeners.forEach((l) => {
      try {
        l(state);
      } catch {
        // Listener error ignored
      }
    });
  }

  public async playInterstellar(): Promise<void> {
    if (this.isMuted) return;
    this.initAudioElement();

    if (this.audioEl) {
      try {
        this.audioEl.muted = false;
        this.audioEl.volume = this.volume;
        await this.audioEl.play();
        this.isPlaying = true;
        this.notify();
        return;
      } catch {
        // Browser autoplay blocked until direct interaction
        this.isPlaying = false;
        this.notify();
        this.setupUserUnlockListeners();
      }
    }
  }

  private pauseForVisibility(): void {
    if (this.audioEl && !this.audioEl.paused) {
      this.audioEl.pause();
    }
    this.stopProceduralInterstellar();
    this.isPlaying = false;
    this.notify();
  }

  public pauseInterstellar(): void {
    this.pausedByVisibilityChange = false;
    if (this.audioEl && !this.audioEl.paused) {
      // Smooth fade-out before pause
      const initialVol = this.audioEl.volume;
      const fadeStep = initialVol / 8;
      const fade = setInterval(() => {
        if (!this.audioEl) {
          clearInterval(fade);
          return;
        }
        if (this.audioEl.volume > fadeStep) {
          this.audioEl.volume = Math.max(0, Math.min(1, this.audioEl.volume - fadeStep));
        } else {
          clearInterval(fade);
          this.audioEl.pause();
          this.audioEl.volume = this.volume;
          this.isPlaying = false;
          this.notify();
        }
      }, 35);
    } else {
      this.isPlaying = false;
      this.notify();
    }
    this.stopProceduralInterstellar();
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.pausedByVisibilityChange = false;
    if (muted) {
      if (this.audioEl) {
        this.audioEl.pause();
      }
      this.stopProceduralInterstellar();
      this.isPlaying = false;
    } else {
      if (this.audioEl) {
        this.audioEl.muted = false;
      }
      this.playInterstellar().catch(() => {});
    }
    this.notify();
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying && !this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public startAmbient(): void {
    this.playInterstellar().catch(() => {});
  }

  /**
   * Procedural Interstellar Organ & Clock Ticking Synthesizer (Fallback & Cosmic Drone)
   * Plays Hans Zimmer's iconic "First Step" progression: Am - Em - F - C - G
   * with authentic organ harmonics and ticking pendulum
   */
  private startProceduralInterstellar(): void {
    if (this.isMuted || this.isProceduralActive) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      this.isProceduralActive = true;
      this.isPlaying = true;
      this.notify();

      const chords = [
        // Am (A2, E3, A3, C4, E4)
        { bass: 110.0, notes: [220.0, 261.63, 329.63, 440.0, 523.25] },
        // Em (E2, B2, E3, G3, B3)
        { bass: 82.41, notes: [164.81, 196.0, 246.94, 329.63, 392.0] },
        // F (F2, C3, F3, A3, C4)
        { bass: 87.31, notes: [174.61, 220.0, 261.63, 349.23, 440.0] },
        // C (C2, G2, C3, E3, G3)
        { bass: 65.41, notes: [130.81, 196.0, 261.63, 329.63, 392.0] },
      ];

      let chordIndex = 0;
      const playStep = () => {
        if (!this.isProceduralActive || !this.ctx || this.isMuted) return;
        const currentChord = chords[chordIndex % chords.length];
        chordIndex++;

        const now = this.ctx.currentTime;
        const duration = 4.2;

        // Church pipe organ harmonics
        currentChord.notes.forEach((freq, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = i % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, now);

          // Subtle organ vibrato
          osc.detune.setValueAtTime((Math.random() - 0.5) * 6, now);

          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(0.022 / (i + 1), now + 1.2);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + duration + 0.1);
        });

        // Zimmer Ticking Clock motif (each 1.05s)
        for (let t = 0; t < 4; t++) {
          const tickTime = now + t * 1.05;
          const tickOsc = this.ctx.createOscillator();
          const tickGain = this.ctx.createGain();

          tickOsc.type = 'sawtooth';
          tickOsc.frequency.setValueAtTime(1400, tickTime);
          tickOsc.frequency.exponentialRampToValueAtTime(280, tickTime + 0.025);

          tickGain.gain.setValueAtTime(0.012, tickTime);
          tickGain.gain.exponentialRampToValueAtTime(0.0001, tickTime + 0.025);

          tickOsc.connect(tickGain);
          tickGain.connect(this.ctx.destination);

          tickOsc.start(tickTime);
          tickOsc.stop(tickTime + 0.03);
        }
      };

      playStep();
      this.proceduralInterval = window.setInterval(playStep, 4200);
    } catch {
      // Audio error handled
    }
  }

  private stopProceduralInterstellar(): void {
    this.isProceduralActive = false;
    if (this.proceduralInterval !== null) {
      clearInterval(this.proceduralInterval);
      this.proceduralInterval = null;
    }
  }

  /**
   * Sound effect when flying to a sequence
   */
  public playFlySwoosh(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(610, now + 0.8);
      osc.frequency.exponentialRampToValueAtTime(144, now + 1.4);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(2500, now + 0.7);
      filter.frequency.exponentialRampToValueAtTime(300, now + 1.4);
      filter.Q.setValueAtTime(4, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.45);
    } catch {
      // Ignore audio failure
    }
  }

  /**
   * Crystalline target lock chime
   */
  public playTargetLock(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [610, 987, 1597];

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        const startTime = now + idx * 0.06;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.06 / (idx + 1), startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.8);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.85);
      });
    } catch {
      // Audio handled safely
    }
  }

  /**
   * Subtle tick on UI interactions / typing
   */
  public playClick(): void {
    if (!this.isMuted && !this.isPlaying && this.audioEl) {
      this.playInterstellar().catch(() => {});
    }
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(2400, now + 0.03);

      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.035);
    } catch {
      // Audio handled safely
    }
  }
}

export const soundEngine = new SoundEngine();
