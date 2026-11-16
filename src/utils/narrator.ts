// Sistem Pemutar Narasi Suara MP3 Statis (Voice-Over) Berbasis File Lokal di /assets/voice/
// - Menggunakan satu objek/referensi HTML5 Audio terpusat (narratorRef) agar hanya satu suara narasi yang berbunyi dalam satu waktu.
// - Setiap kali narasi baru dipanggil, narasi sebelumnya dihentikan terlebih dahulu (pause() dan currentTime = 0).
// - Otomatis berhenti saat pengguna berpindah layar atau menekan tombol kembali.
// - Auto-Ducking BGM: saat narratorRef memutar suara (onplay), volume bgm-intro.mp3 turun halus dari 0.35 ke 0.10,
//   lalu kembali ke 0.35 saat narasi selesai (onended atau onpause).
// - Mematuhi tombol mute Audio utama di header dan sakelar Suara Narator di menu Pengaturan (default aktif).

import type { MutableRefObject } from 'react';
import { bgmEngine } from './bgmEngine';

export type NarratorSpeaker = 'naedie' | 'guru';

export type VoiceTrackId =
  | 'selectMode'
  | 'setup'
  | 'prologueNaedie'
  | 'prologueGuru'
  | 'level1Intro'
  | 'koleksiLengkap'
  | 'tertabrak'
  | 'levelSelesai'
  | 'bonusProlog'
  | 'bonusSelesai'
  | 'epilogGuru'
  | 'epilogNaedie'
  | 'gameOver';

export interface VoiceTrackConfig {
  id: VoiceTrackId;
  label: string;
  src: string;
  fallbackSources: string[];
}

export interface VoicePlayOptions {
  startTime?: number;
  endTime?: number | null;
  prepareNextStartTime?: number | null;
}

const NARRATOR_STORAGE_KEY = 'forest_maze_narrator_enabled_v1';
const NARRATOR_DEFAULT_VOLUME = 1.0;

// Batas Audio Sprite untuk /assets/voice/voice-level-selesai.mp3 (durasi total ~15.07 detik):
// - Segmen 1 (Ibu Guru: "Horeee! Selamat ya..."): 0.00s s.d. 7.54s, hening 7.56s–7.76s
// - Segmen 2 (Pak Naedie: "Luar biasa, lihat..."): mulai 7.78s s.d. akhir file (ended)
const LEVEL_COMPLETE_STAGE1_END_SEC = 7.62;
const LEVEL_COMPLETE_STAGE2_START_SEC = 7.72;

const bundledSelectModeFallbackUrl = (() => {
  try {
    return new URL('../assets/voice/voice-pilih-mode.mp3', import.meta.url).href;
  } catch {
    return './assets/voice/voice-pilih-mode.mp3';
  }
})();

const bundledSetupFallbackUrl = (() => {
  try {
    return new URL('../assets/voice/voice-kenalan.mp3', import.meta.url).href;
  } catch {
    return './assets/voice/voice-kenalan.mp3';
  }
})();

const bundledPrologueNaedieFallbackUrl = (() => {
  try {
    return new URL('../assets/voice/voice-prolog-naedie.mp3', import.meta.url)
      .href;
  } catch {
    return './assets/voice/voice-prolog-naedie.mp3';
  }
})();

const bundledPrologueGuruFallbackUrl = (() => {
  try {
    return new URL('../assets/voice/voice-prolog-guru.mp3', import.meta.url)
      .href;
  } catch {
    return './assets/voice/voice-prolog-guru.mp3';
  }
})();

const bundledLevel1IntroFallbackUrl = (() => {
  try {
    return new URL('../assets/voice/voice-level-1-intro.mp3', import.meta.url)
      .href;
  } catch {
    return './assets/voice/voice-level-1-intro.mp3';
  }
})();

const BUNDLED_LEVEL_VOICE_URLS: Record<number, string> = {
  1: (() => {
    try {
      return new URL('../assets/voice/voice-level-1.mp3', import.meta.url).href;
    } catch {
      return './assets/voice/voice-level-1.mp3';
    }
  })(),
  2: (() => {
    try {
      return new URL('../assets/voice/voice-level-2.mp3', import.meta.url).href;
    } catch {
      return './assets/voice/voice-level-2.mp3';
    }
  })(),
  3: (() => {
    try {
      return new URL('../assets/voice/voice-level-3.mp3', import.meta.url).href;
    } catch {
      return './assets/voice/voice-level-3.mp3';
    }
  })(),
  4: (() => {
    try {
      return new URL('../assets/voice/voice-level-4.mp3', import.meta.url).href;
    } catch {
      return './assets/voice/voice-level-4.mp3';
    }
  })(),
  5: (() => {
    try {
      return new URL('../assets/voice/voice-level-5.mp3', import.meta.url).href;
    } catch {
      return './assets/voice/voice-level-5.mp3';
    }
  })(),
  6: (() => {
    try {
      return new URL('../assets/voice/voice-level-6.mp3', import.meta.url).href;
    } catch {
      return './assets/voice/voice-level-6.mp3';
    }
  })(),
  7: (() => {
    try {
      return new URL('../assets/voice/voice-level-7.mp3', import.meta.url).href;
    } catch {
      return './assets/voice/voice-level-7.mp3';
    }
  })(),
  8: (() => {
    try {
      return new URL('../assets/voice/voice-level-8.mp3', import.meta.url).href;
    } catch {
      return './assets/voice/voice-level-8.mp3';
    }
  })(),
  9: (() => {
    try {
      return new URL('../assets/voice/voice-level-9.mp3', import.meta.url).href;
    } catch {
      return './assets/voice/voice-level-9.mp3';
    }
  })(),
  10: (() => {
    try {
      return new URL('../assets/voice/voice-level-10.mp3', import.meta.url).href;
    } catch {
      return './assets/voice/voice-level-10.mp3';
    }
  })(),
};

const bundledKoleksiLengkapFallbackUrl = (() => {
  try {
    return new URL('../assets/voice/voice-koleksi-lengkap.mp3', import.meta.url)
      .href;
  } catch {
    return './assets/voice/voice-koleksi-lengkap.mp3';
  }
})();

const bundledTertabrakFallbackUrl = (() => {
  try {
    return new URL('../assets/voice/voice-tertabrak.mp3', import.meta.url).href;
  } catch {
    return './assets/voice/voice-tertabrak.mp3';
  }
})();

const bundledLevelSelesaiFallbackUrl = (() => {
  try {
    return new URL('../assets/voice/voice-level-selesai.mp3', import.meta.url)
      .href;
  } catch {
    return './assets/voice/voice-level-selesai.mp3';
  }
})();

const bundledBonusPrologFallbackUrl = (() => {
  try {
    return new URL('../assets/voice/voice-bonus-prolog.mp3', import.meta.url)
      .href;
  } catch {
    return './assets/voice/voice-bonus-prolog.mp3';
  }
})();

const bundledBonusSelesaiFallbackUrl = (() => {
  try {
    return new URL('../assets/voice/voice-bonus-selesai.mp3', import.meta.url)
      .href;
  } catch {
    return './assets/voice/voice-bonus-selesai.mp3';
  }
})();

const bundledEpilogGuruFallbackUrl = (() => {
  try {
    return new URL('../assets/voice/voice-epilog-guru.mp3', import.meta.url)
      .href;
  } catch {
    return './assets/voice/voice-epilog-guru.mp3';
  }
})();

const bundledEpilogNaedieFallbackUrl = (() => {
  try {
    return new URL('../assets/voice/voice-epilog-naedie.mp3', import.meta.url)
      .href;
  } catch {
    return './assets/voice/voice-epilog-naedie.mp3';
  }
})();

const bundledGameOverFallbackUrl = (() => {
  try {
    return new URL('../assets/voice/voice-gameover.mp3', import.meta.url).href;
  } catch {
    return './assets/voice/voice-gameover.mp3';
  }
})();

export const VOICE_TRACK_MAP: Record<VoiceTrackId, VoiceTrackConfig> = {
  selectMode: {
    id: 'selectMode',
    label: 'Panduan Layar Pilih Mode Permainan',
    src: './assets/voice/voice-pilih-mode.mp3',
    fallbackSources: [
      bundledSelectModeFallbackUrl,
      './assets/voice/voice_pilih_mode.mp3',
      './assets/voice-pilih-mode.mp3',
      './assets/voice_pilih_mode.mp3',
    ],
  },
  setup: {
    id: 'setup',
    label: 'Panduan Layar Kenalan Dulu (Pengisian Nama)',
    src: './assets/voice/voice-kenalan.mp3',
    fallbackSources: [
      bundledSetupFallbackUrl,
      './assets/voice/voice_kenalan.mp3',
      './assets/voice-kenalan.mp3',
      './assets/voice_kenalan.mp3',
    ],
  },
  prologueNaedie: {
    id: 'prologueNaedie',
    label: 'Narasi Prolog Pak Naedie (Zookeeper)',
    src: './assets/voice/voice-prolog-naedie.mp3',
    fallbackSources: [
      bundledPrologueNaedieFallbackUrl,
      './assets/voice/voice_prolog_naedie.mp3',
      './assets/voice-prolog-naedie.mp3',
      './assets/voice_prolog_naedie.mp3',
    ],
  },
  prologueGuru: {
    id: 'prologueGuru',
    label: 'Narasi Prolog Bunda / Ibu Guru Pendamping',
    src: './assets/voice/voice-prolog-guru.mp3',
    fallbackSources: [
      bundledPrologueGuruFallbackUrl,
      './assets/voice/voice_prolog_guru.mp3',
      './assets/voice-prolog-guru.mp3',
      './assets/voice_prolog_guru.mp3',
    ],
  },
  level1Intro: {
    id: 'level1Intro',
    label: 'Narasi Awal Papan Permainan Level 1',
    src: './assets/voice/voice-level-1.mp3',
    fallbackSources: [
      BUNDLED_LEVEL_VOICE_URLS[1],
      './assets/voice/voice-level-1-intro.mp3',
      bundledLevel1IntroFallbackUrl,
      './assets/voice/voice_level_1.mp3',
      './assets/voice/voice_level_1_intro.mp3',
      './assets/voice-level-1.mp3',
      './assets/voice-level-1-intro.mp3',
    ],
  },
  koleksiLengkap: {
    id: 'koleksiLengkap',
    label: 'Narasi Global Koleksi Lengkap & Pintu Terbuka',
    src: './assets/voice/voice-koleksi-lengkap.mp3',
    fallbackSources: [
      bundledKoleksiLengkapFallbackUrl,
      './assets/voice/voice_koleksi_lengkap.mp3',
      './assets/voice-koleksi-lengkap.mp3',
      './assets/voice_koleksi_lengkap.mp3',
    ],
  },
  tertabrak: {
    id: 'tertabrak',
    label: 'Narasi Global Karakter Menabrak Rintangan / Dinding',
    src: './assets/voice/voice-tertabrak.mp3',
    fallbackSources: [
      bundledTertabrakFallbackUrl,
      './assets/voice/voice_tertabrak.mp3',
      './assets/voice-tertabrak.mp3',
      './assets/voice_tertabrak.mp3',
    ],
  },
  levelSelesai: {
    id: 'levelSelesai',
    label: 'Narasi Penyelesaian Level (Audio Sprite Ibu Guru & Pak Naedie)',
    src: './assets/voice/voice-level-selesai.mp3',
    fallbackSources: [
      bundledLevelSelesaiFallbackUrl,
      './assets/voice/voice_level_selesai.mp3',
      './assets/voice-level-selesai.mp3',
      './assets/voice_level_selesai.mp3',
    ],
  },
  bonusProlog: {
    id: 'bonusProlog',
    label: 'Narasi Prolog Level Bonus (Pesan Pak Naedie — Lembah Kunang-Kunang Ajaib)',
    src: './assets/voice/voice-bonus-prolog.mp3',
    fallbackSources: [
      bundledBonusPrologFallbackUrl,
      './assets/voice/voice-level-bonus.mp3',
      './assets/voice/voice_bonus_prolog.mp3',
      './assets/voice-bonus-prolog.mp3',
      './assets/voice-level-bonus.mp3',
    ],
  },
  bonusSelesai: {
    id: 'bonusSelesai',
    label: 'Narasi Epilog Penyelesaian Level Bonus (Lentera Petunjuk Terisi)',
    src: './assets/voice/voice-bonus-selesai.mp3',
    fallbackSources: [
      bundledBonusSelesaiFallbackUrl,
      './assets/voice/voice_bonus_selesai.mp3',
      './assets/voice-bonus-selesai.mp3',
      './assets/voice_bonus_selesai.mp3',
    ],
  },
  epilogGuru: {
    id: 'epilogGuru',
    label: 'Narasi Penutup Tahap 1 — Piagam Penjaga Alam Cilik (Ibu Guru)',
    src: './assets/voice/voice-epilog-guru.mp3',
    fallbackSources: [
      bundledEpilogGuruFallbackUrl,
      './assets/voice/voice_epilog_guru.mp3',
      './assets/voice-epilog-guru.mp3',
    ],
  },
  epilogNaedie: {
    id: 'epilogNaedie',
    label: 'Narasi Penutup Tahap 2 — Perayaan & Pengingat Istirahat (Pak Naedie)',
    src: './assets/voice/voice-epilog-naedie.mp3',
    fallbackSources: [
      bundledEpilogNaedieFallbackUrl,
      './assets/voice/voice_epilog_naedie.mp3',
      './assets/voice-epilog-naedie.mp3',
    ],
  },
  gameOver: {
    id: 'gameOver',
    label: 'Narasi Layar Gagal / Game Over (Menabrak Rintangan 3x / Kehabisan Nyawa atau Waktu Habis)',
    src: './assets/voice/voice-gameover.mp3',
    fallbackSources: [
      bundledGameOverFallbackUrl,
      './assets/voice/voice_gameover.mp3',
      './assets/voice-gameover.mp3',
    ],
  },
};

type NarratorStateListener = (isSpeaking: boolean) => void;
type NarratorAmplitudeListener = (level: number) => void;

class StaticVoiceNarratorEngine {
  private narratorAudio: HTMLAudioElement | null = null;
  private preloadAudio: HTMLAudioElement | null = null;
  private preloadTimerId: number | null = null;
  private preloadedSrcCache: Set<string> = new Set();
  private externalAudioRef: MutableRefObject<HTMLAudioElement | null> | null =
    null;

  private enabled: boolean = true;
  private masterMuted: boolean = false;
  private speaking: boolean = false;
  private activeSrc: string = '';
  private fallbackQueue: string[] = [];
  private listeners: Set<NarratorStateListener> = new Set();

  // Kontrol Audio Sprite (batas berhenti otomatis, pemantau presisi, & posisi siap tahap berikutnya)
  private spriteEndTimeSec: number | null = null;
  private spritePreparedNextStartSec: number | null = null;
  private spriteWatchRafId: number | null = null;
  private pendingSeekSec: number | null = null;
  private lastRequestedStartTimeSec: number = 0;

  // Web Audio API AnalyserNode untuk sinkronisasi gerakan mulut (real-time lip-sync)
  private audioCtx: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private mediaSourceConnected: boolean = false;
  private analyserBuffer: Uint8Array<ArrayBuffer> | null = null;
  private amplitudeListeners: Set<NarratorAmplitudeListener> = new Set();
  private amplitudeRafId: number | null = null;
  private smoothedAmplitude: number = 0;

  // Cooldown 1,5 detik untuk suara tertabrak agar tidak bertumpuk saat tombol arah ditekan berulang
  private static readonly COLLISION_COOLDOWN_MS = 1500;
  private lastCollisionVoiceTimeMs: number = 0;

  constructor() {
    this.enabled = this.loadSavedEnabled();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.stop();
        }
      });
    }
  }

  private loadSavedEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    try {
      const raw = window.localStorage.getItem(NARRATOR_STORAGE_KEY);
      if (raw === 'false') return false;
      if (raw === 'true') return true;
    } catch {
      // Abaikan jika localStorage tidak tersedia
    }
    return true;
  }

  private notifyListeners(): void {
    this.listeners.forEach((cb) => {
      try {
        cb(this.speaking);
      } catch {
        // Abaikan error listener
      }
    });
  }

  private notifyAmplitudeListeners(level: number): void {
    this.amplitudeListeners.forEach((cb) => {
      try {
        cb(level);
      } catch {
        // Abaikan error listener
      }
    });
  }

  private ensureAudioAnalyser(): void {
    if (typeof window === 'undefined') return;
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtxClass) return;

    if (!this.audioCtx) {
      try {
        this.audioCtx = new AudioCtxClass();
        this.analyserNode = this.audioCtx.createAnalyser();
        this.analyserNode.fftSize = 256;
        this.analyserNode.smoothingTimeConstant = 0.55;
        this.analyserBuffer = new Uint8Array(
          new ArrayBuffer(this.analyserNode.frequencyBinCount)
        );
      } catch {
        this.audioCtx = null;
        this.analyserNode = null;
        this.analyserBuffer = null;
        return;
      }
    }

    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx
        .resume()
        .then(() => {
          this.tryAttachMediaElementSource();
        })
        .catch(() => {
          // Fallback modulasi tetap menjaga lip-sync jika AudioContext tertunda
        });
    } else {
      this.tryAttachMediaElementSource();
    }
  }

  private tryAttachMediaElementSource(): void {
    if (
      this.mediaSourceConnected ||
      !this.audioCtx ||
      this.audioCtx.state !== 'running' ||
      !this.analyserNode ||
      !this.narratorAudio
    ) {
      return;
    }

    try {
      const source = this.audioCtx.createMediaElementSource(this.narratorAudio);
      source.connect(this.analyserNode);
      this.analyserNode.connect(this.audioCtx.destination);
      this.mediaSourceConnected = true;
    } catch {
      // Abaikan jika source sudah terhubung atau tidak didukung; fallback lip-sync tetap berjalan
    }
  }

  private stopAmplitudeLoop(): void {
    if (
      this.amplitudeRafId !== null &&
      typeof window !== 'undefined' &&
      typeof window.cancelAnimationFrame === 'function'
    ) {
      window.cancelAnimationFrame(this.amplitudeRafId);
    }
    this.amplitudeRafId = null;
    if (this.smoothedAmplitude !== 0) {
      this.smoothedAmplitude = 0;
      this.notifyAmplitudeListeners(0);
    }
  }

  private startAmplitudeLoop(): void {
    if (
      typeof window === 'undefined' ||
      typeof window.requestAnimationFrame !== 'function'
    ) {
      return;
    }
    if (this.amplitudeRafId !== null) return;
    if (!this.speaking || this.amplitudeListeners.size === 0) return;

    const tick = (now: number) => {
      if (!this.speaking || !this.narratorAudio || this.narratorAudio.paused) {
        this.amplitudeRafId = null;
        if (this.smoothedAmplitude !== 0) {
          this.smoothedAmplitude = 0;
          this.notifyAmplitudeListeners(0);
        }
        return;
      }

      let rawLevel = 0;
      if (
        this.mediaSourceConnected &&
        this.analyserNode &&
        this.analyserBuffer &&
        this.audioCtx?.state === 'running'
      ) {
        this.analyserNode.getByteTimeDomainData(this.analyserBuffer);
        let sumSquares = 0;
        const len = this.analyserBuffer.length;
        for (let i = 0; i < len; i += 1) {
          const normalized = (this.analyserBuffer[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / Math.max(1, len));
        // Noise gate tipis agar jeda antar kata membuat mulut menutup natural
        rawLevel = rms > 0.014 ? Math.min(1, (rms - 0.014) * 5.6) : 0;
      } else {
        // Fallback ritmik alami apabila AudioContext belum running
        const t = now * 0.001;
        const syllable = Math.abs(Math.sin(t * 14.5) * Math.cos(t * 6.2));
        const cadence = Math.max(0, Math.sin(t * 3.1 + 0.4) * 0.8 + 0.35);
        rawLevel = Math.min(1, syllable * cadence * 0.9);
      }

      const smoothing = rawLevel > this.smoothedAmplitude ? 0.48 : 0.32;
      this.smoothedAmplitude =
        this.smoothedAmplitude +
        (rawLevel - this.smoothedAmplitude) * smoothing;

      const clamped =
        this.smoothedAmplitude < 0.02
          ? 0
          : Math.min(1, this.smoothedAmplitude);
      this.notifyAmplitudeListeners(clamped);

      this.amplitudeRafId = window.requestAnimationFrame(tick);
    };

    this.amplitudeRafId = window.requestAnimationFrame(tick);
  }

  private cancelSpriteWatcher(): void {
    if (
      this.spriteWatchRafId !== null &&
      typeof window !== 'undefined' &&
      typeof window.cancelAnimationFrame === 'function'
    ) {
      window.cancelAnimationFrame(this.spriteWatchRafId);
    }
    this.spriteWatchRafId = null;
  }

  private cancelPendingPreload(): void {
    if (
      this.preloadTimerId !== null &&
      typeof window !== 'undefined'
    ) {
      window.clearTimeout(this.preloadTimerId);
    }
    this.preloadTimerId = null;
  }

  private getOrCreatePreloadAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      return null;
    }
    if (!this.preloadAudio) {
      const preloader = new Audio();
      preloader.preload = 'auto';
      preloader.muted = true;
      preloader.volume = 0;
      this.preloadAudio = preloader;
    }
    return this.preloadAudio;
  }

  /**
   * Smart Next-Audio Preloading:
   * Memuat ringan (preload="auto") hanya untuk 1 file narasi berikutnya yang akan segera dibutuhkan
   * menggunakan satu elemen preloader yang dipakai ulang agar hemat memori & jaringan.
   */
  public preloadNextVoice(src: string): void {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    if (!this.canSpeak()) return;

    const cleanSrc = src.trim();
    if (!cleanSrc) return;
    if (cleanSrc === this.activeSrc || this.preloadedSrcCache.has(cleanSrc)) {
      return;
    }

    this.cancelPendingPreload();
    this.preloadTimerId = window.setTimeout(() => {
      this.preloadTimerId = null;
      if (!this.canSpeak()) return;
      if (cleanSrc === this.activeSrc || this.preloadedSrcCache.has(cleanSrc)) {
        return;
      }

      const preloader = this.getOrCreatePreloadAudio();
      if (!preloader) return;

      try {
        preloader.preload = 'auto';
        const currentAttrSrc = preloader.getAttribute('src') ?? '';
        if (currentAttrSrc !== cleanSrc && !preloader.src.endsWith(cleanSrc)) {
          preloader.src = cleanSrc;
          preloader.load();
        }
        this.preloadedSrcCache.add(cleanSrc);
      } catch {
        // Abaikan jika browser membatasi preload di latar belakang
      }
    }, 450);
  }

  public preloadTrack(trackId: VoiceTrackId): void {
    const config = VOICE_TRACK_MAP[trackId];
    if (!config) return;
    this.preloadNextVoice(config.src);
  }

  public preloadLevelIntroVoice(levelNumber: number = 1): void {
    this.preloadNextVoice(this.getLevelIntroSrc(levelNumber));
  }

  private finishSpriteSegmentIfReached(audio: HTMLAudioElement): boolean {
    if (
      this.spriteEndTimeSec === null ||
      audio.currentTime < this.spriteEndTimeSec
    ) {
      return false;
    }

    const preparedNextStart = this.spritePreparedNextStartSec;
    this.spriteEndTimeSec = null;
    this.spritePreparedNextStartSec = null;
    this.cancelSpriteWatcher();
    this.activeSrc = '';

    try {
      audio.pause();
      if (preparedNextStart !== null && Number.isFinite(preparedNextStart)) {
        audio.currentTime = preparedNextStart;
      }
    } catch {
      // Abaikan
    }

    this.setSpeakingState(false);
    return true;
  }

  private startSpriteEndWatcher(audio: HTMLAudioElement): void {
    this.cancelSpriteWatcher();
    if (
      this.spriteEndTimeSec === null ||
      typeof window === 'undefined' ||
      typeof window.requestAnimationFrame !== 'function'
    ) {
      return;
    }

    const checkFrame = () => {
      if (this.spriteEndTimeSec === null || this.narratorAudio !== audio) {
        this.spriteWatchRafId = null;
        return;
      }
      if (this.finishSpriteSegmentIfReached(audio)) {
        return;
      }
      if (!audio.paused && !audio.ended) {
        this.spriteWatchRafId = window.requestAnimationFrame(checkFrame);
      } else {
        this.spriteWatchRafId = null;
      }
    };

    this.spriteWatchRafId = window.requestAnimationFrame(checkFrame);
  }

  private isTrackLoaded(trackId: VoiceTrackId): boolean {
    if (!this.narratorAudio) return false;
    const config = VOICE_TRACK_MAP[trackId];
    if (!config) return false;
    const currentAttrSrc = this.narratorAudio.getAttribute('src') ?? '';
    const currentResolvedSrc = this.narratorAudio.src ?? '';
    const candidates = [config.src, ...config.fallbackSources];
    return candidates.some(
      (candidate) => {
        if (!candidate) return false;
        const suffix = candidate.replace(/^\.\//, '');
        return (
          currentAttrSrc === candidate ||
          currentResolvedSrc === candidate ||
          currentResolvedSrc.endsWith(suffix)
        );
      }
    );
  }

  private setSpeakingState(next: boolean): void {
    if (this.speaking !== next) {
      this.speaking = next;
      this.notifyListeners();
    }
    if (next) {
      this.startAmplitudeLoop();
    } else {
      this.stopAmplitudeLoop();
    }
    // Auto-ducking BGM: turunkan BGM ke 0.10 saat onplay, kembalikan ke volume normal saat onended / onpause
    bgmEngine.setNarrationSpeaking(next);
  }

  /**
   * Mengembalikan objek tunggal HTML5 Audio khusus narator (narratorRef)
   * agar hanya satu suara narasi yang dapat berbunyi dalam satu waktu dan
   * tidak menumpuk instance Audio baru di memori.
   */
  public getOrCreateAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      return null;
    }

    if (!this.narratorAudio) {
      const audio = new Audio();
      audio.loop = false;
      audio.preload = 'auto';
      audio.volume = NARRATOR_DEFAULT_VOLUME;

      // Jika pemutaran melompat ke titik waktu tertentu (Audio Sprite) dan metadata baru termuat
      audio.onloadedmetadata = () => {
        if (this.pendingSeekSec !== null) {
          const targetSec = this.pendingSeekSec;
          this.pendingSeekSec = null;
          try {
            audio.currentTime = targetSec;
          } catch {
            // Abaikan
          }
          audio.volume = NARRATOR_DEFAULT_VOLUME;
        }
      };

      // Pantau timeupdate untuk menghentikan segmen Audio Sprite tepat setelah kalimat selesai
      audio.ontimeupdate = () => {
        this.finishSpriteSegmentIfReached(audio);
      };

      // Saat narator mulai berbunyi (onplay), aktifkan auto-ducking BGM
      audio.onplay = () => {
        if (!this.canSpeak()) {
          this.spriteEndTimeSec = null;
          this.spritePreparedNextStartSec = null;
          this.cancelSpriteWatcher();
          this.pendingSeekSec = null;
          audio.pause();
          audio.currentTime = 0;
          this.setSpeakingState(false);
          return;
        }
        if (this.spriteEndTimeSec !== null) {
          this.startSpriteEndWatcher(audio);
        }
        this.setSpeakingState(true);
      };

      // Saat narasi selesai (onended), kembalikan volume BGM ke normal
      audio.onended = () => {
        this.spriteEndTimeSec = null;
        this.spritePreparedNextStartSec = null;
        this.cancelSpriteWatcher();
        this.pendingSeekSec = null;
        this.activeSrc = '';
        this.setSpeakingState(false);
      };

      // Saat narasi dijeda/dihentikan (onpause), kembalikan volume BGM ke normal
      audio.onpause = () => {
        if (!audio.paused) return;
        this.cancelSpriteWatcher();
        this.activeSrc = '';
        this.setSpeakingState(false);
      };

      // Jika path utama belum ditemukan, coba kandidat path fallback di folder assets
      audio.onerror = () => {
        if (this.fallbackQueue.length > 0 && this.canSpeak()) {
          const nextFallback = this.fallbackQueue.shift();
          if (nextFallback && nextFallback !== audio.src) {
            this.activeSrc = nextFallback;
            audio.src = nextFallback;
            audio.loop = false;
            if (this.lastRequestedStartTimeSec > 0) {
              this.pendingSeekSec = this.lastRequestedStartTimeSec;
              audio.volume = 0;
              try {
                audio.currentTime = this.lastRequestedStartTimeSec;
                this.pendingSeekSec = null;
                audio.volume = NARRATOR_DEFAULT_VOLUME;
              } catch {
                // Akan diterapkan ulang pada onloadedmetadata
              }
            } else {
              this.pendingSeekSec = null;
              audio.volume = NARRATOR_DEFAULT_VOLUME;
              audio.currentTime = 0;
            }
            void audio.play().catch(() => {
              audio.volume = NARRATOR_DEFAULT_VOLUME;
              this.setSpeakingState(false);
            });
            return;
          }
        }
        audio.volume = NARRATOR_DEFAULT_VOLUME;
        this.spriteEndTimeSec = null;
        this.spritePreparedNextStartSec = null;
        this.cancelSpriteWatcher();
        this.pendingSeekSec = null;
        this.setSpeakingState(false);
      };

      this.narratorAudio = audio;
    }

    if (this.externalAudioRef) {
      this.externalAudioRef.current = this.narratorAudio;
    }

    return this.narratorAudio;
  }

  /**
   * Menghubungkan React ref (narratorRef) di komponen utama ke objek HTML5 Audio narator terpusat.
   */
  public bindNarratorRef(ref: MutableRefObject<HTMLAudioElement | null>): void {
    this.externalAudioRef = ref;
    ref.current = this.getOrCreateAudio();
  }

  public unlock(): void {
    this.getOrCreateAudio();
    this.ensureAudioAnalyser();
  }

  public subscribe(listener: NarratorStateListener): () => void {
    this.listeners.add(listener);
    listener(this.speaking);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeAmplitude(listener: NarratorAmplitudeListener): () => void {
    this.amplitudeListeners.add(listener);
    listener(this.speaking ? this.smoothedAmplitude : 0);
    if (this.speaking) {
      this.startAmplitudeLoop();
    }
    return () => {
      this.amplitudeListeners.delete(listener);
      if (this.amplitudeListeners.size === 0) {
        this.stopAmplitudeLoop();
      }
    };
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public isSpeaking(): boolean {
    return this.speaking;
  }

  public getActiveSrc(): string {
    return this.activeSrc;
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          NARRATOR_STORAGE_KEY,
          next ? 'true' : 'false'
        );
      } catch {
        // Abaikan jika localStorage tidak tersedia
      }
    }
    if (!next) {
      this.stop();
    }
  }

  public setMasterMuted(muted: boolean): void {
    this.masterMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  public canSpeak(): boolean {
    return this.enabled && !this.masterMuted;
  }

  /**
   * Menghentikan narasi yang sedang berjalan (pause() dan currentTime = 0)
   * serta mengembalikan volume BGM ke normal.
   */
  public stop(): void {
    this.fallbackQueue = [];
    this.activeSrc = '';
    this.spriteEndTimeSec = null;
    this.spritePreparedNextStartSec = null;
    this.cancelSpriteWatcher();
    this.cancelPendingPreload();
    this.pendingSeekSec = null;
    this.lastRequestedStartTimeSec = 0;

    if (this.narratorAudio) {
      try {
        this.narratorAudio.pause();
        this.narratorAudio.currentTime = 0;
        this.narratorAudio.volume = NARRATOR_DEFAULT_VOLUME;
      } catch {
        // Abaikan
      }
    }

    this.setSpeakingState(false);
  }

  /**
   * Memutar file narasi MP3 satu kali (loop = false) dengan memakai ulang
   * satu instance Audio terpusat (mengganti properti src tanpa membuat objek Audio baru).
   * Mendukung teknik Audio Sprite melalui startTime, endTime, dan prepareNextStartTime.
   */
  public playVoiceFile(
    src: string,
    fallbackSources: string[] = [],
    options?: VoicePlayOptions
  ): void {
    const cleanSrc = src.trim();
    if (!cleanSrc) return;

    const startTime = Math.max(0, options?.startTime ?? 0);
    const endTime =
      typeof options?.endTime === 'number' && options.endTime > startTime
        ? options.endTime
        : null;
    const prepareNextStartTime =
      typeof options?.prepareNextStartTime === 'number' &&
      options.prepareNextStartTime >= 0
        ? options.prepareNextStartTime
        : null;

    // 1. Selalu hentikan narasi sebelumnya terlebih dahulu agar tidak tumpang tindih
    this.stop();

    // 2. Patuhi tombol mute Audio utama di header dan sakelar Suara Narator di Pengaturan
    if (!this.canSpeak()) {
      return;
    }

    const audio = this.getOrCreateAudio();
    if (!audio) return;

    this.ensureAudioAnalyser();

    this.fallbackQueue = fallbackSources.filter(
      (item) => item && item !== cleanSrc
    );
    this.activeSrc = cleanSrc;
    this.preloadedSrcCache.add(cleanSrc);
    this.lastRequestedStartTimeSec = startTime;
    this.spriteEndTimeSec = endTime;
    this.spritePreparedNextStartSec = prepareNextStartTime;

    try {
      audio.loop = false;
      audio.preload = 'auto';

      const currentAttrSrc = audio.getAttribute('src') ?? '';
      if (currentAttrSrc !== cleanSrc && !audio.src.endsWith(cleanSrc)) {
        audio.src = cleanSrc;
      }

      if (startTime > 0) {
        if (audio.readyState >= 1) {
          this.pendingSeekSec = null;
          audio.volume = NARRATOR_DEFAULT_VOLUME;
          audio.currentTime = startTime;
        } else {
          this.pendingSeekSec = startTime;
          audio.volume = 0;
          try {
            audio.currentTime = startTime;
          } catch {
            // Akan diterapkan begitu metadata audio selesai dimuat (onloadedmetadata)
          }
        }
      } else {
        this.pendingSeekSec = null;
        audio.volume = NARRATOR_DEFAULT_VOLUME;
        audio.currentTime = 0;
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          audio.volume = NARRATOR_DEFAULT_VOLUME;
          // Jika gagal diputar atau menunggu interaksi pengguna, pastikan BGM kembali ke normal
          if (audio.paused) {
            this.setSpeakingState(false);
          }
        });
      }
    } catch {
      audio.volume = NARRATOR_DEFAULT_VOLUME;
      this.setSpeakingState(false);
    }
  }

  /**
   * Memutar track narasi berdasarkan ID terpetakan (contoh: 'selectMode' -> /assets/voice/voice-pilih-mode.mp3).
   */
  public playTrack(trackId: VoiceTrackId, options?: VoicePlayOptions): void {
    const config = VOICE_TRACK_MAP[trackId];
    if (!config) return;
    this.playVoiceFile(config.src, config.fallbackSources, options);
  }

  /**
   * Pemicu khusus Layar Pilih Mode Permainan (/assets/voice/voice-pilih-mode.mp3, loop = false).
   */
  public playSelectModeVoice(): void {
    this.playTrack('selectMode');
    this.preloadTrack('setup');
  }

  /**
   * Pemicu khusus Layar Kenalan Dulu (/assets/voice/voice-kenalan.mp3, loop = false).
   */
  public playSetupVoice(): void {
    this.playTrack('setup');
    this.preloadTrack('prologueNaedie');
  }

  /**
   * Pemicu khusus Layar Prolog bagian Pak Naedie (/assets/voice/voice-prolog-naedie.mp3, loop = false).
   */
  public playPrologueNaedieVoice(): void {
    this.playTrack('prologueNaedie');
    this.preloadTrack('prologueGuru');
  }

  /**
   * Pemicu khusus Layar Prolog bagian Bunda / Ibu Guru (/assets/voice/voice-prolog-guru.mp3, loop = false).
   */
  public playPrologueGuruVoice(): void {
    this.playTrack('prologueGuru');
    this.preloadLevelIntroVoice(1);
  }

  /**
   * Mengembalikan path narasi pengantar dinamis sesuai nomor level (./assets/voice/voice-level-{nomorLevel}.mp3).
   */
  public getLevelIntroSrc(levelNumber: number = 1): string {
    const clampedLevel = Math.max(
      1,
      Math.min(10, Math.round(levelNumber || 1))
    );
    return `./assets/voice/voice-level-${clampedLevel}.mp3`;
  }

  /**
   * Mengecek apakah narasi pengantar untuk level tertentu sedang aktif diputar.
   */
  public isPlayingLevelIntro(levelNumber: number = 1): boolean {
    if (!this.speaking || !this.activeSrc) return false;
    const clampedLevel = Math.max(
      1,
      Math.min(10, Math.round(levelNumber || 1))
    );
    const candidates = [
      `./assets/voice/voice-level-${clampedLevel}.mp3`,
      BUNDLED_LEVEL_VOICE_URLS[clampedLevel],
      `./assets/voice/voice_level_${clampedLevel}.mp3`,
      `./assets/voice-level-${clampedLevel}.mp3`,
    ];
    if (clampedLevel === 1) {
      candidates.push(
        './assets/voice/voice-level-1-intro.mp3',
        bundledLevel1IntroFallbackUrl
      );
    }
    return candidates.some((candidate) => {
      if (!candidate) return false;
      const suffix = candidate.replace(/^\.\//, '');
      return this.activeSrc === candidate || this.activeSrc.endsWith(suffix);
    });
  }

  /**
   * Pemicu dinamis Narasi Pengantar Level 1–10 (./assets/voice/voice-level-{nomorLevel}.mp3, loop = false, currentTime = 0).
   * Sekaligus melakukan Smart Preloading untuk level berikutnya (N+1) atau epilog saat di Level 10.
   */
  public playLevelIntroVoice(levelNumber: number = 1): void {
    const clampedLevel = Math.max(
      1,
      Math.min(10, Math.round(levelNumber || 1))
    );
    const primarySrc = `./assets/voice/voice-level-${clampedLevel}.mp3`;
    const fallbackSources: string[] = [
      BUNDLED_LEVEL_VOICE_URLS[clampedLevel],
      `./assets/voice/voice_level_${clampedLevel}.mp3`,
      `./assets/voice-level-${clampedLevel}.mp3`,
    ].filter(Boolean);

    if (clampedLevel === 1) {
      fallbackSources.unshift(
        './assets/voice/voice-level-1-intro.mp3',
        bundledLevel1IntroFallbackUrl
      );
    }

    this.playVoiceFile(primarySrc, fallbackSources, {
      startTime: 0,
      endTime: null,
    });

    if (clampedLevel < 10) {
      this.preloadLevelIntroVoice(clampedLevel + 1);
    } else {
      this.preloadTrack('epilogGuru');
    }
  }

  /**
   * Pemicu khusus Awal Papan Permainan Level 1 (kompatibilitas pemanggilan langsung Level 1).
   */
  public playLevel1IntroVoice(): void {
    this.playLevelIntroVoice(1);
  }

  /**
   * Pemicu global saat seluruh item koleksi pada level selesai dikumpulkan & pintu tujuan terbuka
   * (/assets/voice/voice-koleksi-lengkap.mp3, loop = false).
   */
  public playAllCollectedVoice(): void {
    this.playTrack('koleksiLengkap');
  }

  /**
   * Pemicu global saat karakter menabrak rintangan/dinding (/assets/voice/voice-tertabrak.mp3, loop = false)
   * dengan jeda cooldown minimal 1,5 detik (1500 ms).
   */
  public playCollisionVoice(): void {
    const now = Date.now();
    if (
      now - this.lastCollisionVoiceTimeMs <
      StaticVoiceNarratorEngine.COLLISION_COOLDOWN_MS
    ) {
      return;
    }
    this.lastCollisionVoiceTimeMs = now;
    this.playTrack('tertabrak');
  }

  /**
   * Audio Sprite Tahap 1 — Saat Jendela Papan Skor Pertama Kali Muncul (Dialog Ibu Guru):
   * Memutar /assets/voice/voice-level-selesai.mp3 dari currentTime = 0 hingga seluruh kalimat Ibu Guru
   * ("Horeee! Selamat ya...") selesai utuh (7.62s di jeda hening), lalu otomatis pause() dan
   * menyiapkan posisi audio di awal dialog Pak Naedie (7.72s).
   */
  public playLevelCompleteStage1Voice(): void {
    this.playTrack('levelSelesai', {
      startTime: 0,
      endTime: LEVEL_COMPLETE_STAGE1_END_SEC,
      prepareNextStartTime: LEVEL_COMPLETE_STAGE2_START_SEC,
    });
  }

  /**
   * Audio Sprite Tahap 2 — Saat Tombol Tutup Papan Skor Ditekan / Transisi ke Jendela Perhitungan Skor (Dialog Pak Naedie):
   * Memutar /assets/voice/voice-level-selesai.mp3 dari posisi awal dialog Pak Naedie (7.72s) hingga selesai (ended).
   * Jika file sudah termuat dan diposisikan dari Tahap 1, langsung melanjutkan tanpa jeda ulang.
   */
  public playLevelCompleteStage2Voice(): void {
    if (!this.canSpeak()) {
      this.stop();
      return;
    }

    const audio = this.getOrCreateAudio();
    const config = VOICE_TRACK_MAP.levelSelesai;
    if (!audio || !config) return;

    if (this.isTrackLoaded('levelSelesai') && audio.readyState >= 1) {
      this.ensureAudioAnalyser();
      this.spriteEndTimeSec = null;
      this.spritePreparedNextStartSec = null;
      this.cancelSpriteWatcher();
      this.pendingSeekSec = null;
      this.lastRequestedStartTimeSec = LEVEL_COMPLETE_STAGE2_START_SEC;
      this.fallbackQueue = config.fallbackSources.filter(
        (item) => item && item !== config.src
      );
      this.activeSrc = config.src;

      try {
        audio.loop = false;
        audio.volume = NARRATOR_DEFAULT_VOLUME;
        if (Math.abs(audio.currentTime - LEVEL_COMPLETE_STAGE2_START_SEC) > 0.08) {
          audio.currentTime = LEVEL_COMPLETE_STAGE2_START_SEC;
        }
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            if (audio.paused) {
              this.setSpeakingState(false);
            }
          });
        }
        return;
      } catch {
        // Lanjut ke pemutaran track standar apabila gagal seek langsung
      }
    }

    this.playTrack('levelSelesai', {
      startTime: LEVEL_COMPLETE_STAGE2_START_SEC,
      endTime: null,
      prepareNextStartTime: null,
    });
  }

  /**
   * Pemicu khusus saat modal pop-up Pesan Pak Naedie — Lembah Kunang-Kunang Ajaib muncul
   * (/assets/voice/voice-bonus-prolog.mp3, loop = false, currentTime = 0).
   */
  public playBonusPrologVoice(): void {
    this.playTrack('bonusProlog', { startTime: 0, endTime: null });
    this.preloadTrack('bonusSelesai');
  }

  /**
   * Pemicu khusus saat jendela pop-up apresiasi Pak Naedie muncul setelah Level Bonus selesai
   * (/assets/voice/voice-bonus-selesai.mp3, loop = false, currentTime = 0).
   */
  public playBonusCompleteVoice(): void {
    this.playTrack('bonusSelesai', { startTime: 0, endTime: null });
  }

  /**
   * Pemicu khusus Layar Penutup (Ending Screen) Tahap 1 — Piagam Penjaga Alam Cilik bersama Ibu Guru
   * (/assets/voice/voice-epilog-guru.mp3, loop = false, currentTime = 0).
   * Sekaligus preload ringan narasi penutup Tahap 2 (voice-epilog-naedie.mp3).
   */
  public playEpilogueGuruVoice(): void {
    this.playTrack('epilogGuru', { startTime: 0, endTime: null });
    this.preloadTrack('epilogNaedie');
  }

  /**
   * Pemicu khusus Layar Penutup (Ending Screen) Tahap 2 — Perayaan 10 Satwa & Pengingat Istirahat bersama Pak Naedie
   * (/assets/voice/voice-epilog-naedie.mp3, loop = false, currentTime = 0).
   */
  public playEpilogueNaedieVoice(): void {
    this.playTrack('epilogNaedie', { startTime: 0, endTime: null });
  }

  /**
   * Pemicu khusus Layar Gagal / Game Over pada semua kondisi kekalahan
   * (baik karena menabrak rintangan hingga 3 kali / kehabisan nyawa maupun karena waktu permainan habis).
   * Menghentikan seluruh narasi lain yang sedang berjalan, lalu memutar /assets/voice/voice-gameover.mp3
   * dari awal (currentTime = 0, loop = false) menggunakan instance audio terpusat dengan auto-ducking BGM.
   */
  public playGameOverVoice(): void {
    this.playTrack('gameOver', { startTime: 0, endTime: null });
  }

  public resetCollisionCooldown(): void {
    this.lastCollisionVoiceTimeMs = 0;
  }

  /**
   * Kompatibilitas pemanggilan narasi: hanya memutar apabila diberikan path file MP3 di /assets/voice/.
   */
  public speak(
    textOrPath: string,
    _speaker: NarratorSpeaker = 'guru',
    _options?: { forceReplay?: boolean }
  ): void {
    const trimmed = textOrPath.trim();
    if (
      trimmed.startsWith('./assets/voice/') ||
      trimmed.startsWith('assets/voice/') ||
      trimmed.startsWith('/assets/voice/') ||
      trimmed.endsWith('.mp3')
    ) {
      const normalizedPath = trimmed.startsWith('/assets/')
        ? `.${trimmed}`
        : trimmed;
      this.playVoiceFile(normalizedPath);
    }
  }
}

export const narrator = new StaticVoiceNarratorEngine();
