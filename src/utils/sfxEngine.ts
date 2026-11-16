// Sistem Efek Suara Interaktif (SFX) Ramah Anak berbasis Web Audio API
// Sintesis polifonik lembut (sine, triangle, filter low-pass, dan amplop ADSR halus)
// Tanpa BGM dan tanpa narasi suara.

import type { ObstacleKind } from '../components/MissionIcons';

const SFX_STORAGE_KEY = 'forest_maze_sfx_enabled_v1';

// Tangga nada mayor pentatonik ceria (Hz) untuk item koleksi bertahap naik
const COLLECT_SCALE_HZ = [
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.0, // A5
  1046.5, // C6
  1174.66, // D6
  1318.51, // E6
] as const;

class ForestSfxEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabled: boolean = true;
  private lastCustomSfxAt: number = 0;

  constructor() {
    this.enabled = this.loadSavedEnabled();
  }

  private loadSavedEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    try {
      const raw = window.localStorage.getItem(SFX_STORAGE_KEY);
      if (raw === 'false') return false;
      if (raw === 'true') return true;
    } catch {
      // Abaikan jika localStorage tidak tersedia
    }
    return true;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(SFX_STORAGE_KEY, next ? 'true' : 'false');
      } catch {
        // Abaikan jika localStorage tidak tersedia
      }
    }
    if (this.masterGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(next ? 0.82 : 0, now, 0.015);
      } catch {
        // Abaikan error konteks audio
      }
    }
  }

  public markCustomSfx(): void {
    this.lastCustomSfxAt =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  public wasCustomSfxJustTriggered(windowMs = 90): boolean {
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    return now - this.lastCustomSfxAt <= windowMs;
  }

  private getAudioContextCtor(): typeof AudioContext | null {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    return w.AudioContext ?? w.webkitAudioContext ?? null;
  }

  private ensureContext(forcePlay = false): AudioContext | null {
    if (!this.enabled && !forcePlay) return null;

    try {
      if (!this.ctx) {
        const AudioCtx = this.getAudioContextCtor();
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();

        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(18, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.004, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(
          this.enabled || forcePlay ? 0.82 : 0,
          this.ctx.currentTime
        );

        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
      }

      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {
          // Abaikan jika browser belum mengizinkan resume sebelum gesture
        });
      }

      if (forcePlay && this.masterGain) {
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.setValueAtTime(0.82, this.ctx.currentTime);
      }

      return this.ctx;
    } catch {
      return null;
    }
  }

  private getOutputNode(): AudioNode | null {
    return this.compressor ?? this.masterGain ?? null;
  }

  public unlock(): void {
    try {
      const AudioCtx = this.getAudioContextCtor();
      if (!AudioCtx) return;

      if (!this.ctx) {
        this.ctx = new AudioCtx();
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(18, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.004, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(
          this.enabled ? 0.82 : 0,
          this.ctx.currentTime
        );
        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
      }

      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {
          // Abaikan
        });
      }
    } catch {
      // Zero console errors
    }
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer | null {
    try {
      if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
        return this.noiseBuffer;
      }
      const length = Math.floor(ctx.sampleRate * 1.4);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      // Pink-ish warm noise menggunakan filter rata-rata sederhana agar lembut
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        data[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + white * 0.1848) * 0.16));
      }
      this.noiseBuffer = buffer;
      return buffer;
    } catch {
      return null;
    }
  }

  private playTone({
    ctx,
    type = 'sine',
    startFreq,
    endFreq,
    startTime,
    attack = 0.008,
    decay = 0.12,
    peakGain = 0.2,
    filterFreq = 2600,
    filterQ = 0.8,
  }: {
    ctx: AudioContext;
    type?: 'sine' | 'triangle';
    startFreq: number;
    endFreq?: number;
    startTime: number;
    attack?: number;
    decay?: number;
    peakGain?: number;
    filterFreq?: number;
    filterQ?: number;
  }): void {
    const dest = this.getOutputNode();
    if (!dest) return;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, startFreq), startTime);
    if (endFreq !== undefined && endFreq !== startFreq) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(40, endFreq),
        startTime + attack + decay
      );
    }

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, startTime);
    filter.Q.setValueAtTime(filterQ, startTime);

    const safePeak = Math.max(0.001, peakGain);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(safePeak, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + attack + decay);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    const stopAt = startTime + attack + decay + 0.03;
    osc.start(startTime);
    osc.stop(stopAt);
    osc.onended = () => {
      try {
        osc.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {
        // Abaikan
      }
    };
  }

  private playNoiseBurst({
    ctx,
    startTime,
    duration,
    filterType = 'bandpass',
    startFreq,
    endFreq,
    filterQ = 1.2,
    peakGain = 0.16,
    attack = 0.006,
    offset = 0,
  }: {
    ctx: AudioContext;
    startTime: number;
    duration: number;
    filterType?: BiquadFilterType;
    startFreq: number;
    endFreq?: number;
    filterQ?: number;
    peakGain?: number;
    attack?: number;
    offset?: number;
  }): void {
    const dest = this.getOutputNode();
    const noiseBuf = this.getNoiseBuffer(ctx);
    if (!dest || !noiseBuf) return;

    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.setValueAtTime(filterQ, startTime);
    filter.frequency.setValueAtTime(Math.max(40, startFreq), startTime);
    if (endFreq !== undefined && endFreq !== startFreq) {
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(40, endFreq),
        startTime + duration
      );
    }

    const gain = ctx.createGain();
    const safePeak = Math.max(0.001, peakGain);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(safePeak, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    const safeOffset = Math.max(0, Math.min(0.8, offset));
    src.start(startTime, safeOffset, duration + 0.03);
    src.onended = () => {
      try {
        src.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch {
        // Abaikan
      }
    };
  }

  // 1. Klik Tombol: Pop gelembung lembut dan renyah
  public playButtonPop(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Gelembung utama naik singkat + pantulan sine lembut
      this.playTone({
        ctx,
        type: 'sine',
        startFreq: 390,
        endFreq: 740,
        startTime: now,
        attack: 0.005,
        decay: 0.055,
        peakGain: 0.16,
        filterFreq: 2400,
      });
      this.playTone({
        ctx,
        type: 'triangle',
        startFreq: 580,
        endFreq: 460,
        startTime: now + 0.012,
        attack: 0.004,
        decay: 0.05,
        peakGain: 0.07,
        filterFreq: 1900,
      });
    } catch {
      // Abaikan
    }
  }

  // 2. Buka & Tutup Modal: Whoosh halus bernada naik / turun
  public playModalOpen(): void {
    this.markCustomSfx();
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const dest = this.getOutputNode();
      const noiseBuf = this.getNoiseBuffer(ctx);
      if (dest && noiseBuf) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.setValueAtTime(1.2, now);
        filter.frequency.setValueAtTime(280, now);
        filter.frequency.exponentialRampToValueAtTime(1900, now + 0.16);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.11, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        src.start(now);
        src.stop(now + 0.22);
      }

      // Lapisan tonal naik yang hangat
      this.playTone({
        ctx,
        type: 'sine',
        startFreq: 392,
        endFreq: 587.33,
        startTime: now,
        attack: 0.02,
        decay: 0.17,
        peakGain: 0.1,
        filterFreq: 2000,
      });
      this.playTone({
        ctx,
        type: 'triangle',
        startFreq: 523.25,
        endFreq: 783.99,
        startTime: now + 0.03,
        attack: 0.02,
        decay: 0.16,
        peakGain: 0.06,
        filterFreq: 2200,
      });
    } catch {
      // Abaikan
    }
  }

  public playModalClose(): void {
    this.markCustomSfx();
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const dest = this.getOutputNode();
      const noiseBuf = this.getNoiseBuffer(ctx);
      if (dest && noiseBuf) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.setValueAtTime(1.1, now);
        filter.frequency.setValueAtTime(1600, now);
        filter.frequency.exponentialRampToValueAtTime(240, now + 0.17);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.095, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        src.start(now);
        src.stop(now + 0.21);
      }

      // Lapisan tonal turun yang lembut
      this.playTone({
        ctx,
        type: 'sine',
        startFreq: 587.33,
        endFreq: 349.23,
        startTime: now,
        attack: 0.015,
        decay: 0.15,
        peakGain: 0.09,
        filterFreq: 1800,
      });
    } catch {
      // Abaikan
    }
  }

  // 3. Toggle Pengaturan: Switch lembut dua nada (naik saat aktif, turun saat non-aktif)
  public playSwitch(isOn: boolean, forcePlay = false): void {
    this.markCustomSfx();
    const ctx = this.ensureContext(forcePlay);
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = isOn ? [523.25, 783.99] : [698.46, 466.16];
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.055;
        this.playTone({
          ctx,
          type: 'sine',
          startFreq: freq,
          startTime: t,
          attack: 0.006,
          decay: 0.11,
          peakGain: isOn ? 0.16 : 0.13,
          filterFreq: 2400,
        });
        this.playTone({
          ctx,
          type: 'triangle',
          startFreq: freq * 1.5,
          startTime: t,
          attack: 0.005,
          decay: 0.075,
          peakGain: 0.045,
          filterFreq: 2200,
        });
      });

      if (!isOn && forcePlay && this.masterGain) {
        // Pastikan masterGain kembali hening setelah nada switch-off selesai
        this.masterGain.gain.setValueAtTime(0.82, now);
        this.masterGain.gain.setTargetAtTime(0, now + 0.19, 0.015);
      }
    } catch {
      // Abaikan
    }
  }

  // 4. Langkah Karakter: Ketukan langkah kartun lembut (soft marimba tap) ±5% pitch acak
  public playStep(): void {
    this.markCustomSfx();
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const pitchFactor = 0.95 + Math.random() * 0.1; // ±5% variasi alami
      const baseFreq = 310 * pitchFactor;

      this.playTone({
        ctx,
        type: 'sine',
        startFreq: baseFreq * 1.12,
        endFreq: baseFreq * 0.92,
        startTime: now,
        attack: 0.005,
        decay: 0.078,
        peakGain: 0.17,
        filterFreq: 1350,
      });
      this.playTone({
        ctx,
        type: 'triangle',
        startFreq: baseFreq * 2,
        endFreq: baseFreq * 1.85,
        startTime: now,
        attack: 0.004,
        decay: 0.045,
        peakGain: 0.055,
        filterFreq: 1600,
      });
    } catch {
      // Abaikan
    }
  }

  // 5. Menabrak Rintangan: Pantulan bantal/karet lembut (soft rubbery boing)
  public playBump(): void {
    this.markCustomSfx();
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const dest = this.getOutputNode();
      if (!dest) return;

      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(132, now + 0.055);
      osc.frequency.exponentialRampToValueAtTime(195, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(145, now + 0.21);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(880, now);
      filter.Q.setValueAtTime(1.4, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.23);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.25);

      // Lapisan sine lembut untuk tubuh bantal empuk
      this.playTone({
        ctx,
        type: 'sine',
        startFreq: 165,
        endFreq: 118,
        startTime: now,
        attack: 0.008,
        decay: 0.18,
        peakGain: 0.14,
        filterFreq: 700,
      });
    } catch {
      // Abaikan
    }
  }

  // 5b. Menabrak Rintangan Spesifik: Efek suara unik sesuai jenis rintangan
  public playObstacleBump(obstacleKind?: ObstacleKind): void {
    if (!obstacleKind) {
      this.playBump();
      return;
    }

    this.markCustomSfx();
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      switch (obstacleKind) {
        case 'bush': {
          // Semak hijau: suara 'kresek-kresek' dedaunan
          [0, 0.048, 0.1].forEach((delay, idx) => {
            this.playNoiseBurst({
              ctx,
              startTime: now + delay,
              duration: idx === 1 ? 0.075 : 0.065,
              filterType: 'bandpass',
              startFreq: idx === 1 ? 2300 : 1650,
              endFreq: idx === 2 ? 1200 : 2500,
              filterQ: 1.35,
              peakGain: idx === 0 ? 0.22 : 0.17,
              attack: 0.005,
              offset: idx * 0.14,
            });
          });
          this.playTone({
            ctx,
            type: 'sine',
            startFreq: 195,
            endFreq: 120,
            startTime: now,
            attack: 0.006,
            decay: 0.11,
            peakGain: 0.12,
            filterFreq: 750,
          });
          break;
        }

        case 'fence': {
          // Pagar kebun: suara ketukan papan kayu 'klotak-tok'
          this.playTone({
            ctx,
            type: 'triangle',
            startFreq: 410,
            endFreq: 255,
            startTime: now,
            attack: 0.003,
            decay: 0.08,
            peakGain: 0.22,
            filterFreq: 1900,
          });
          this.playTone({
            ctx,
            type: 'triangle',
            startFreq: 540,
            endFreq: 350,
            startTime: now + 0.065,
            attack: 0.003,
            decay: 0.07,
            peakGain: 0.15,
            filterFreq: 2100,
          });
          this.playNoiseBurst({
            ctx,
            startTime: now,
            duration: 0.045,
            filterType: 'bandpass',
            startFreq: 980,
            endFreq: 680,
            filterQ: 1.8,
            peakGain: 0.14,
            attack: 0.002,
          });
          break;
        }

        case 'puddle': {
          // Genangan air: suara cipratan air 'cebur' + gelembung
          this.playNoiseBurst({
            ctx,
            startTime: now,
            duration: 0.19,
            filterType: 'bandpass',
            startFreq: 420,
            endFreq: 1850,
            filterQ: 1.15,
            peakGain: 0.23,
            attack: 0.008,
          });
          this.playTone({
            ctx,
            type: 'sine',
            startFreq: 330,
            endFreq: 740,
            startTime: now + 0.018,
            attack: 0.006,
            decay: 0.11,
            peakGain: 0.16,
            filterFreq: 2400,
          });
          this.playTone({
            ctx,
            type: 'sine',
            startFreq: 510,
            endFreq: 960,
            startTime: now + 0.075,
            attack: 0.005,
            decay: 0.09,
            peakGain: 0.11,
            filterFreq: 2600,
          });
          break;
        }

        case 'fallenlog': {
          // Batang kayu tumbang: suara berat 'bruuk'
          this.playTone({
            ctx,
            type: 'sine',
            startFreq: 142,
            endFreq: 52,
            startTime: now,
            attack: 0.005,
            decay: 0.23,
            peakGain: 0.28,
            filterFreq: 520,
          });
          this.playTone({
            ctx,
            type: 'triangle',
            startFreq: 225,
            endFreq: 112,
            startTime: now,
            attack: 0.004,
            decay: 0.16,
            peakGain: 0.18,
            filterFreq: 860,
          });
          this.playNoiseBurst({
            ctx,
            startTime: now,
            duration: 0.13,
            filterType: 'lowpass',
            startFreq: 420,
            endFreq: 140,
            filterQ: 1.0,
            peakGain: 0.22,
            attack: 0.004,
          });
          break;
        }

        case 'rock': {
          // Batu besar: suara benturan keras padat 'duk-tok'
          this.playTone({
            ctx,
            type: 'sine',
            startFreq: 178,
            endFreq: 82,
            startTime: now,
            attack: 0.003,
            decay: 0.12,
            peakGain: 0.25,
            filterFreq: 680,
          });
          this.playTone({
            ctx,
            type: 'triangle',
            startFreq: 640,
            endFreq: 380,
            startTime: now,
            attack: 0.002,
            decay: 0.055,
            peakGain: 0.15,
            filterFreq: 2000,
          });
          this.playNoiseBurst({
            ctx,
            startTime: now,
            duration: 0.045,
            filterType: 'bandpass',
            startFreq: 1200,
            endFreq: 750,
            filterQ: 2.0,
            peakGain: 0.16,
            attack: 0.002,
          });
          break;
        }

        case 'twigs': {
          // Tumpukan ranting: suara derak ranting patah 'krek-krek-krek'
          [0, 0.036, 0.072, 0.112].forEach((delay, idx) => {
            this.playNoiseBurst({
              ctx,
              startTime: now + delay,
              duration: 0.038,
              filterType: 'bandpass',
              startFreq: 2200 + idx * 240,
              endFreq: 1500,
              filterQ: 2.1,
              peakGain: 0.21 - idx * 0.02,
              attack: 0.002,
              offset: 0.08 * idx,
            });
            this.playTone({
              ctx,
              type: 'triangle',
              startFreq: 860 + idx * 110,
              endFreq: 420,
              startTime: now + delay,
              attack: 0.002,
              decay: 0.03,
              peakGain: 0.11,
              filterFreq: 2800,
            });
          });
          break;
        }

        case 'cactus': {
          // Kaktus sabana: suara sentuhan tajam lucu 'ctek-boing!'
          this.playTone({
            ctx,
            type: 'triangle',
            startFreq: 820,
            endFreq: 340,
            startTime: now,
            attack: 0.002,
            decay: 0.048,
            peakGain: 0.19,
            filterFreq: 3200,
          });
          this.playTone({
            ctx,
            type: 'sine',
            startFreq: 320,
            endFreq: 640,
            startTime: now + 0.035,
            attack: 0.005,
            decay: 0.11,
            peakGain: 0.17,
            filterFreq: 2400,
          });
          this.playNoiseBurst({
            ctx,
            startTime: now,
            duration: 0.032,
            filterType: 'highpass',
            startFreq: 2400,
            peakGain: 0.12,
            attack: 0.002,
          });
          break;
        }

        case 'bamboo': {
          // Rumpun bambu: suara ketukan bambu berongga 'klonk-klong'
          this.playTone({
            ctx,
            type: 'sine',
            startFreq: 495,
            endFreq: 465,
            startTime: now,
            attack: 0.003,
            decay: 0.14,
            peakGain: 0.21,
            filterFreq: 2200,
          });
          this.playTone({
            ctx,
            type: 'triangle',
            startFreq: 990,
            endFreq: 920,
            startTime: now,
            attack: 0.003,
            decay: 0.09,
            peakGain: 0.1,
            filterFreq: 2800,
          });
          this.playTone({
            ctx,
            type: 'sine',
            startFreq: 590,
            endFreq: 555,
            startTime: now + 0.068,
            attack: 0.003,
            decay: 0.12,
            peakGain: 0.14,
            filterFreq: 2200,
          });
          break;
        }

        case 'stump': {
          // Tunggul pohon: suara kayu berakar padat 'tung-duk'
          this.playTone({
            ctx,
            type: 'sine',
            startFreq: 164,
            endFreq: 86,
            startTime: now,
            attack: 0.004,
            decay: 0.16,
            peakGain: 0.25,
            filterFreq: 640,
          });
          this.playTone({
            ctx,
            type: 'triangle',
            startFreq: 320,
            endFreq: 205,
            startTime: now,
            attack: 0.003,
            decay: 0.1,
            peakGain: 0.15,
            filterFreq: 1200,
          });
          this.playNoiseBurst({
            ctx,
            startTime: now,
            duration: 0.07,
            filterType: 'lowpass',
            startFreq: 520,
            endFreq: 190,
            peakGain: 0.15,
            attack: 0.003,
          });
          break;
        }

        case 'stream': {
          // Sungai kecil: suara kecipak aliran air 'byuur'
          this.playNoiseBurst({
            ctx,
            startTime: now,
            duration: 0.25,
            filterType: 'bandpass',
            startFreq: 340,
            endFreq: 1550,
            filterQ: 0.95,
            peakGain: 0.24,
            attack: 0.01,
            offset: 0.1,
          });
          [
            { delay: 0.01, start: 400, end: 780 },
            { delay: 0.055, start: 540, end: 960 },
            { delay: 0.105, start: 670, end: 1120 },
          ].forEach((b) => {
            this.playTone({
              ctx,
              type: 'sine',
              startFreq: b.start,
              endFreq: b.end,
              startTime: now + b.delay,
              attack: 0.005,
              decay: 0.095,
              peakGain: 0.12,
              filterFreq: 2800,
            });
          });
          break;
        }

        default: {
          this.playBump();
          break;
        }
      }
    } catch {
      // Abaikan
    }
  }

  // 6. Mengambil Item Target & Kunang-Kunang: Denting lonceng kristal dengan nada naik bertahap
  public playCollectItem(collectIndex = 0): void {
    this.markCustomSfx();
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const safeIdx = Math.max(
        0,
        Math.min(COLLECT_SCALE_HZ.length - 1, Math.floor(collectIndex))
      );
      const root = COLLECT_SCALE_HZ[safeIdx];

      // Nada dasar kristal + harmoni fifth & octave sparkle
      this.playTone({
        ctx,
        type: 'sine',
        startFreq: root,
        startTime: now,
        attack: 0.006,
        decay: 0.28,
        peakGain: 0.18,
        filterFreq: 3800,
      });
      this.playTone({
        ctx,
        type: 'triangle',
        startFreq: root * 1.5,
        startTime: now + 0.042,
        attack: 0.006,
        decay: 0.24,
        peakGain: 0.09,
        filterFreq: 3600,
      });
      this.playTone({
        ctx,
        type: 'sine',
        startFreq: root * 2,
        startTime: now + 0.085,
        attack: 0.006,
        decay: 0.3,
        peakGain: 0.11,
        filterFreq: 4200,
      });
    } catch {
      // Abaikan
    }
  }

  // 7. Pintu Tujuan Terbuka: Arpeggio harmonis singkat yang cerah
  public playGateUnlock(delaySeconds = 0.16): void {
    this.markCustomSfx();
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const base = ctx.currentTime + Math.max(0, delaySeconds);
      const chord = [523.25, 659.25, 783.99, 987.77, 1046.5];
      chord.forEach((freq, idx) => {
        const t = base + idx * 0.055;
        this.playTone({
          ctx,
          type: 'sine',
          startFreq: freq,
          startTime: t,
          attack: 0.008,
          decay: idx === chord.length - 1 ? 0.45 : 0.28,
          peakGain: 0.14,
          filterFreq: 3600,
        });
        this.playTone({
          ctx,
          type: 'triangle',
          startFreq: freq * 0.5,
          startTime: t,
          attack: 0.01,
          decay: 0.24,
          peakGain: 0.05,
          filterFreq: 1800,
        });
      });
    } catch {
      // Abaikan
    }
  }

  // 8. Tombol Bantu (Hint): Magic shimmer lembut
  public playHint(): void {
    this.markCustomSfx();
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const shimmerNotes = [783.99, 987.77, 1174.66, 1567.98];
      shimmerNotes.forEach((freq, idx) => {
        const t = now + idx * 0.048;
        this.playTone({
          ctx,
          type: 'sine',
          startFreq: freq,
          endFreq: freq * 1.015,
          startTime: t,
          attack: 0.014,
          decay: 0.34,
          peakGain: 0.11,
          filterFreq: 4200,
        });
      });
      this.playTone({
        ctx,
        type: 'triangle',
        startFreq: 523.25,
        startTime: now,
        attack: 0.02,
        decay: 0.38,
        peakGain: 0.065,
        filterFreq: 1900,
      });
    } catch {
      // Abaikan
    }
  }

  // 9. Tombol Cuaca: Efek angin/desiran lembut + kilau daun/kunang-kunang
  public playWeather(): void {
    this.markCustomSfx();
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const dest = this.getOutputNode();
      const noiseBuf = this.getNoiseBuffer(ctx);
      if (dest && noiseBuf) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(1.5, now);
        filter.frequency.setValueAtTime(260, now);
        filter.frequency.exponentialRampToValueAtTime(760, now + 0.22);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.56);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        src.start(now);
        src.stop(now + 0.6);
      }

      // Desiran nada alam sangat halus
      this.playTone({
        ctx,
        type: 'sine',
        startFreq: 659.25,
        endFreq: 587.33,
        startTime: now + 0.08,
        attack: 0.04,
        decay: 0.36,
        peakGain: 0.045,
        filterFreq: 2000,
      });
    } catch {
      // Abaikan
    }
  }

  // 10. Tombol Potret: Efek suara kamera (shutter) klasik
  public playShutter(): void {
    this.markCustomSfx();
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const dest = this.getOutputNode();
      const noiseBuf = this.getNoiseBuffer(ctx);

      // Mekanik klik pertama & kedua ala rana kamera klasik
      const clickOffsets = [0, 0.058];
      clickOffsets.forEach((offset, idx) => {
        const t = now + offset;
        if (dest && noiseBuf) {
          const src = ctx.createBufferSource();
          src.buffer = noiseBuf;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(idx === 0 ? 2200 : 3000, t);
          bp.Q.setValueAtTime(1.4, t);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.001, t);
          gain.gain.linearRampToValueAtTime(idx === 0 ? 0.26 : 0.22, t + 0.003);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.032);

          src.connect(bp);
          bp.connect(gain);
          gain.connect(dest);
          src.start(t);
          src.stop(t + 0.04);
        }

        // Bodi mekanik lembut
        this.playTone({
          ctx,
          type: 'triangle',
          startFreq: idx === 0 ? 210 : 260,
          endFreq: 95,
          startTime: t,
          attack: 0.002,
          decay: 0.025,
          peakGain: 0.14,
          filterFreq: 1400,
        });
      });
    } catch {
      // Abaikan
    }
  }

  // 11. 5 Detik Terakhir: Ketukan woodblock lembut setiap detik (5..1)
  public playCountdownTick(secondsLeft = 5): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Sedikit menanjak hangat di detik 3..1 tanpa menegangkan
      const stepBoost = Math.max(0, Math.min(4, 5 - secondsLeft)) * 28;
      const freq = 720 + stepBoost;

      this.playTone({
        ctx,
        type: 'sine',
        startFreq: freq,
        endFreq: freq * 0.92,
        startTime: now,
        attack: 0.004,
        decay: 0.068,
        peakGain: 0.16,
        filterFreq: 2100,
      });
      this.playTone({
        ctx,
        type: 'triangle',
        startFreq: freq * 1.48,
        startTime: now,
        attack: 0.003,
        decay: 0.035,
        peakGain: 0.045,
        filterFreq: 2400,
      });
    } catch {
      // Abaikan
    }
  }

  // 12. Menang / Selesai Level: Letusan konfeti + tepuk tangan meriah + melodi selebrasi singkat
  public playVictory(delaySeconds = 0): void {
    this.markCustomSfx();
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const base = ctx.currentTime + Math.max(0, delaySeconds);
      const dest = this.getOutputNode();
      const noiseBuf = this.getNoiseBuffer(ctx);

      // A. Letusan Konfeti (confetti pop)
      this.playTone({
        ctx,
        type: 'sine',
        startFreq: 190,
        endFreq: 68,
        startTime: base,
        attack: 0.003,
        decay: 0.085,
        peakGain: 0.24,
        filterFreq: 950,
      });

      if (dest && noiseBuf) {
        // Percikan konfeti renyah
        const popNoise = ctx.createBufferSource();
        popNoise.buffer = noiseBuf;
        const popFilter = ctx.createBiquadFilter();
        popFilter.type = 'highpass';
        popFilter.frequency.setValueAtTime(1400, base);
        const popGain = ctx.createGain();
        popGain.gain.setValueAtTime(0.001, base);
        popGain.gain.linearRampToValueAtTime(0.22, base + 0.004);
        popGain.gain.exponentialRampToValueAtTime(0.0001, base + 0.09);
        popNoise.connect(popFilter);
        popFilter.connect(popGain);
        popGain.connect(dest);
        popNoise.start(base);
        popNoise.stop(base + 0.11);

        // B. Tepuk Tangan Meriah (filtered noise bursts alami)
        const clapCount = 12;
        for (let i = 0; i < clapCount; i += 1) {
          const clapTime = base + 0.08 + i * 0.075 + (Math.random() - 0.5) * 0.02;
          const clapSrc = ctx.createBufferSource();
          clapSrc.buffer = noiseBuf;

          const clapFilter = ctx.createBiquadFilter();
          clapFilter.type = 'bandpass';
          clapFilter.frequency.setValueAtTime(1150 + Math.random() * 750, clapTime);
          clapFilter.Q.setValueAtTime(1.1, clapTime);

          const clapGain = ctx.createGain();
          const amp = 0.11 * (1 - i / (clapCount + 3));
          clapGain.gain.setValueAtTime(0.0001, clapTime);
          clapGain.gain.linearRampToValueAtTime(amp, clapTime + 0.006);
          clapGain.gain.exponentialRampToValueAtTime(0.0001, clapTime + 0.068);

          clapSrc.connect(clapFilter);
          clapFilter.connect(clapGain);
          clapGain.connect(dest);
          clapSrc.start(clapTime, Math.random() * 0.35, 0.085);
        }
      }

      // C. Melodi Selebrasi Singkat (C5 - E5 - G5 - C6 ceria)
      const jingle: Array<{ freq: number; offset: number; decay: number }> = [
        { freq: 523.25, offset: 0.06, decay: 0.16 },
        { freq: 659.25, offset: 0.16, decay: 0.16 },
        { freq: 783.99, offset: 0.26, decay: 0.18 },
        { freq: 1046.5, offset: 0.38, decay: 0.52 },
      ];
      jingle.forEach((note) => {
        const t = base + note.offset;
        this.playTone({
          ctx,
          type: 'sine',
          startFreq: note.freq,
          startTime: t,
          attack: 0.008,
          decay: note.decay,
          peakGain: 0.16,
          filterFreq: 3800,
        });
        this.playTone({
          ctx,
          type: 'triangle',
          startFreq: note.freq * 0.5,
          startTime: t,
          attack: 0.01,
          decay: note.decay * 0.9,
          peakGain: 0.07,
          filterFreq: 1900,
        });
      });
    } catch {
      // Abaikan
    }
  }

  // 13. Waktu Habis: Nada turun lembut yang tetap ramah dan lucu (playful slide down)
  public playTimeout(): void {
    this.markCustomSfx();
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const slideNotes: Array<{
        start: number;
        end?: number;
        offset: number;
        decay: number;
      }> = [
        { start: 440.0, offset: 0, decay: 0.15 }, // A4
        { start: 392.0, offset: 0.13, decay: 0.15 }, // G4
        { start: 349.23, offset: 0.26, decay: 0.16 }, // F4
        { start: 329.63, end: 246.94, offset: 0.39, decay: 0.36 }, // E4 -> B3 lembut
      ];

      slideNotes.forEach((note) => {
        const t = now + note.offset;
        this.playTone({
          ctx,
          type: 'triangle',
          startFreq: note.start,
          endFreq: note.end,
          startTime: t,
          attack: 0.012,
          decay: note.decay,
          peakGain: 0.15,
          filterFreq: 1350,
        });
        this.playTone({
          ctx,
          type: 'sine',
          startFreq: note.start,
          endFreq: note.end,
          startTime: t,
          attack: 0.012,
          decay: note.decay,
          peakGain: 0.11,
          filterFreq: 1600,
        });
      });
    } catch {
      // Abaikan
    }
  }
}

export const sfxEngine = new ForestSfxEngine();
