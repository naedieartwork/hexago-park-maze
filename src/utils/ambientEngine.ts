// Sistem SFX Loop Rendah untuk Suara Ambient Hutan (Kicau Burung Tipis & Gemerisik Daun)
// Menggunakan sintesis Web Audio API lembut bervolume rendah agar imersif tanpa mengganggu BGM, SFX, maupun Narator.

export type ForestAmbientMood = 'day' | 'night';

const AMBIENT_STORAGE_KEY = 'forest_maze_ambient_enabled_v1';

// Volume rendah agar menjadi latar suasana alami tanpa menabrak BGM (0.35), SFX, atau Narator
const AMBIENT_MASTER_TARGET_GAIN = 0.16;

class ForestAmbientEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private leafSource: AudioBufferSourceNode | null = null;
  private leafLfo: OscillatorNode | null = null;
  private leafLfoGain: GainNode | null = null;
  private leafFilter: BiquadFilterNode | null = null;
  private leafLoopGain: GainNode | null = null;
  private leafBuffer: AudioBuffer | null = null;

  private enabled: boolean = true;
  private masterMuted: boolean = false;
  private isTabHidden: boolean = false;
  private mood: ForestAmbientMood = 'day';
  private isRunning: boolean = false;
  private chirpTimerId: number | null = null;
  private pauseTimerId: number | null = null;

  constructor() {
    this.enabled = this.loadSavedEnabled();

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.isTabHidden = document.visibilityState === 'hidden';
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private loadSavedEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    try {
      const raw = window.localStorage.getItem(AMBIENT_STORAGE_KEY);
      if (raw === 'false') return false;
      if (raw === 'true') return true;
    } catch {
      // Abaikan jika localStorage tidak tersedia
    }
    return true;
  }

  private handleVisibilityChange = (): void => {
    if (typeof document === 'undefined') return;
    this.isTabHidden = document.visibilityState === 'hidden';
    this.syncPlaybackState();
  };

  public isEnabled(): boolean {
    return this.enabled;
  }

  private shouldPlay(): boolean {
    return this.enabled && !this.masterMuted && !this.isTabHidden;
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(AMBIENT_STORAGE_KEY, next ? 'true' : 'false');
      } catch {
        // Abaikan jika localStorage tidak tersedia
      }
    }
    this.syncPlaybackState();
  }

  public setMasterMuted(muted: boolean): void {
    this.masterMuted = muted;
    this.syncPlaybackState();
  }

  public setMood(nextMood: ForestAmbientMood): void {
    if (this.mood === nextMood) return;
    this.mood = nextMood;
    if (this.ctx && this.leafFilter && this.isRunning) {
      try {
        const now = this.ctx.currentTime;
        this.leafFilter.frequency.setTargetAtTime(
          nextMood === 'night' ? 560 : 780,
          now,
          0.35
        );
      } catch {
        // Abaikan
      }
    }
  }

  public unlock(): void {
    if (!this.shouldPlay()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (!this.isRunning) {
      this.startLoop();
    }
  }

  private syncPlaybackState(): void {
    if (this.shouldPlay()) {
      const ctx = this.ensureContext();
      if (ctx) {
        this.startLoop();
      }
    } else {
      this.fadeOutAndStop();
    }
  }

  private getAudioContextCtor(): typeof AudioContext | null {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    return w.AudioContext ?? w.webkitAudioContext ?? null;
  }

  private ensureContext(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AudioCtx = this.getAudioContextCtor();
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }

      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {
          // Abaikan sebelum interaksi pertama pengguna
        });
      }

      return this.ctx;
    } catch {
      return null;
    }
  }

  private getSeamlessLeafBuffer(ctx: AudioContext): AudioBuffer | null {
    try {
      if (this.leafBuffer && this.leafBuffer.sampleRate === ctx.sampleRate) {
        return this.leafBuffer;
      }

      // Buffer 4 detik pink-brown noise dengan crossfade mulus di ujung loop agar tidak ada bunyi klik
      const durationSec = 4;
      const length = Math.floor(ctx.sampleRate * durationSec);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        b0 = 0.996 * b0 + white * 0.029;
        b1 = 0.98 * b1 + white * 0.05;
        b2 = 0.91 * b2 + white * 0.08;
        data[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2) * 0.65));
      }

      // Crossfade 0.25 detik di ujung agar loop sempurna tanpa jeda
      const fadeSamples = Math.floor(ctx.sampleRate * 0.25);
      for (let i = 0; i < fadeSamples; i += 1) {
        const ratio = i / fadeSamples;
        const tailIdx = length - fadeSamples + i;
        data[i] = data[i] * ratio + data[tailIdx] * (1 - ratio);
      }

      this.leafBuffer = buffer;
      return buffer;
    } catch {
      return null;
    }
  }

  private startLoop(): void {
    const ctx = this.ctx;
    const masterGain = this.masterGain;
    if (!ctx || !masterGain) return;

    if (this.pauseTimerId !== null) {
      window.clearTimeout(this.pauseTimerId);
      this.pauseTimerId = null;
    }

    try {
      const now = ctx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setTargetAtTime(AMBIENT_MASTER_TARGET_GAIN, now, 0.45);
    } catch {
      // Abaikan
    }

    if (this.isRunning) return;
    this.isRunning = true;

    // 1. Lapisan Gemerisik Daun & Angin Hutan Loop Halus
    const buffer = this.getSeamlessLeafBuffer(ctx);
    if (buffer) {
      try {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;

        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(240, ctx.currentTime);

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(
          this.mood === 'night' ? 560 : 780,
          ctx.currentTime
        );
        bp.Q.setValueAtTime(0.75, ctx.currentTime);

        const loopGain = ctx.createGain();
        loopGain.gain.setValueAtTime(0.24, ctx.currentTime);

        // LFO lambat mengayunkan hembusan angin di antara dedaunan (0.14 Hz)
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.14, ctx.currentTime);

        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(0.09, ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(loopGain.gain);

        src.connect(hp);
        hp.connect(bp);
        bp.connect(loopGain);
        loopGain.connect(masterGain);

        src.start(ctx.currentTime);
        lfo.start(ctx.currentTime);

        this.leafSource = src;
        this.leafFilter = bp;
        this.leafLoopGain = loopGain;
        this.leafLfo = lfo;
        this.leafLfoGain = lfoGain;
      } catch {
        // Abaikan jika gagal memulai source
      }
    }

    // 2. Jadwalkan kicau burung tipis / suasana malam berkala
    this.scheduleNextNatureAccent(900);
  }

  private scheduleNextNatureAccent(initialDelayMs?: number): void {
    if (typeof window === 'undefined') return;
    if (this.chirpTimerId !== null) {
      window.clearTimeout(this.chirpTimerId);
      this.chirpTimerId = null;
    }
    if (!this.isRunning || !this.shouldPlay()) return;

    const delayMs =
      initialDelayMs ??
      (this.mood === 'night'
        ? 3400 + Math.random() * 3400
        : 2800 + Math.random() * 3600);

    this.chirpTimerId = window.setTimeout(() => {
      this.chirpTimerId = null;
      if (!this.isRunning || !this.shouldPlay()) return;
      if (this.ctx && this.ctx.state === 'running') {
        if (this.mood === 'night') {
          this.triggerSoftNightAmbience();
        } else {
          this.triggerSoftBirdChirp();
        }
      }
      this.scheduleNextNatureAccent();
    }, delayMs);
  }

  private triggerSoftBirdChirp(): void {
    const ctx = this.ctx;
    const dest = this.masterGain;
    if (!ctx || !dest) return;

    try {
      const now = ctx.currentTime + 0.02;
      // Pilih pola kicau tipis (1–3 nada ringan) secara acak agar terasa alami
      const chirpCount = Math.random() < 0.45 ? 1 : Math.random() < 0.7 ? 2 : 3;
      const baseFreq = 1680 + Math.random() * 620;

      for (let i = 0; i < chirpCount; i += 1) {
        const start = now + i * (0.11 + Math.random() * 0.04);
        const dur = 0.065 + Math.random() * 0.035;

        const osc = ctx.createOscillator();
        const bp = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sine';
        const peakFreq = baseFreq * (1.22 + Math.random() * 0.16);
        const endFreq = baseFreq * (0.94 + Math.random() * 0.12);

        osc.frequency.setValueAtTime(baseFreq, start);
        osc.frequency.exponentialRampToValueAtTime(peakFreq, start + dur * 0.42);
        osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);

        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(peakFreq, start);
        bp.Q.setValueAtTime(1.4, start);

        const peakGain = 0.055 + Math.random() * 0.03;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(peakGain, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

        osc.connect(bp);
        bp.connect(gain);
        gain.connect(dest);

        osc.start(start);
        osc.stop(start + dur + 0.02);
        osc.onended = () => {
          try {
            osc.disconnect();
            bp.disconnect();
            gain.disconnect();
          } catch {
            // Abaikan
          }
        };
      }
    } catch {
      // Abaikan
    }
  }

  private triggerSoftNightAmbience(): void {
    const ctx = this.ctx;
    const dest = this.masterGain;
    if (!ctx || !dest) return;

    try {
      const now = ctx.currentTime + 0.02;
      // Suara jangkrik malam lembut tipis dengan 3 pulsa halus
      const baseFreq = 3550 + Math.random() * 450;
      for (let i = 0; i < 3; i += 1) {
        const start = now + i * 0.055;
        const dur = 0.034;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.028, start + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(start);
        osc.stop(start + dur + 0.015);
        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {
            // Abaikan
          }
        };
      }
    } catch {
      // Abaikan
    }
  }

  private fadeOutAndStop(): void {
    if (this.chirpTimerId !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.chirpTimerId);
      this.chirpTimerId = null;
    }

    if (!this.ctx || !this.masterGain) {
      this.teardownLoopNodes();
      return;
    }

    try {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(0, now, 0.09);
    } catch {
      // Abaikan
    }

    if (this.pauseTimerId !== null) {
      window.clearTimeout(this.pauseTimerId);
    }
    this.pauseTimerId = window.setTimeout(() => {
      this.pauseTimerId = null;
      if (!this.shouldPlay()) {
        this.teardownLoopNodes();
      }
    }, 340);
  }

  private teardownLoopNodes(): void {
    this.isRunning = false;

    if (this.leafSource) {
      try {
        this.leafSource.stop();
        this.leafSource.disconnect();
      } catch {
        // Abaikan
      }
      this.leafSource = null;
    }

    if (this.leafLfo) {
      try {
        this.leafLfo.stop();
        this.leafLfo.disconnect();
      } catch {
        // Abaikan
      }
      this.leafLfo = null;
    }

    [this.leafLfoGain, this.leafFilter, this.leafLoopGain].forEach((node) => {
      if (node) {
        try {
          node.disconnect();
        } catch {
          // Abaikan
        }
      }
    });
    this.leafLfoGain = null;
    this.leafFilter = null;
    this.leafLoopGain = null;
  }
}

export const ambientEngine = new ForestAmbientEngine();
