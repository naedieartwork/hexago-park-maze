// Arsitektur Musik Latar Berbasis Status Layar (State-Based BGM) dengan HTML5 <audio>
// 1. Musik Pembuka (/assets/bgm-intro.mp3) - Loop (0.35, ducking 0.12)
// 2. Musik Gameplay Utama (/assets/bgm-gameplay.mp3) - Loop (0.35, ducking 0.12)
// 3. Musik Level Bonus (/assets/bgm-bonus.mp3) - Loop (0.35, ducking 0.12)
// 4. Musik Kemenangan (/assets/bgm-victory.mp3) - One-Shot / loop = false (0.40, ducking 0.15)

export type BgmTrackId = 'intro' | 'gameplay' | 'bonus' | 'victory';
export type ActiveBgmSlot = BgmTrackId | 'none';

export type BgmScreenState =
  | 'SCREEN_COVER'
  | 'SELECT_MODE'
  | 'SETUP'
  | 'PROLOGUE'
  | 'TRANSITION'
  | 'PLAYING'
  | 'LEADERBOARD';

export interface BgmStateContext {
  screenState: BgmScreenState;
  isBonusLevelActive?: boolean;
  hasWon?: boolean;
  isTimeUp?: boolean;
  isLeaderboardOpen?: boolean;
}

export interface BgmTrackConfig {
  id: BgmTrackId;
  label: string;
  src: string;
  fallbackSources?: string[];
  loop: boolean;
  volume: number;
  duckedVolume: number;
}

const BGM_STORAGE_KEY = 'forest_maze_bgm_enabled_v1';

// Keseimbangan volume standar (35% default / 10% auto-ducking narator) & khusus Kemenangan (40% default / 10% auto-ducking narator)
export const BGM_DEFAULT_VOLUME = 0.35;
export const BGM_DUCKED_VOLUME = 0.1;
export const BGM_VICTORY_VOLUME = 0.4;
export const BGM_VICTORY_DUCKED_VOLUME = 0.1;

const VOLUME_RAMP_INTERVAL_MS = 20;

const bundledIntroFallbackUrl = (() => {
  try {
    return new URL('../assets/bgm_intro.mp3', import.meta.url).href;
  } catch {
    return './assets/bgm-intro.mp3';
  }
})();

const bundledGameplayFallbackUrl = (() => {
  try {
    return new URL('../assets/bgm-gameplay.mp3', import.meta.url).href;
  } catch {
    return './assets/bgm-gameplay.mp3';
  }
})();

const bundledBonusFallbackUrl = (() => {
  try {
    return new URL('../assets/bgm-bonus.mp3', import.meta.url).href;
  } catch {
    return './assets/bgm-bonus.mp3';
  }
})();

const bundledVictoryFallbackUrl = (() => {
  try {
    return new URL('../assets/bgm-victory.mp3', import.meta.url).href;
  } catch {
    return './assets/bgm-victory.mp3';
  }
})();

// Pemetaan 4 Track Audio Berbasis Status Layar
export const BGM_TRACK_MAP: Record<BgmTrackId, BgmTrackConfig> = {
  intro: {
    id: 'intro',
    label: 'Musik Pembuka (Cover, Pilih Mode, Kenalan Dulu, Prolog)',
    src: './assets/bgm-intro.mp3',
    fallbackSources: [
      bundledIntroFallbackUrl,
      './assets/bgm_intro.mp3',
    ],
    loop: true,
    volume: BGM_DEFAULT_VOLUME,
    duckedVolume: BGM_DUCKED_VOLUME,
  },
  gameplay: {
    id: 'gameplay',
    label: 'Musik Gameplay Utama (Level 1–10)',
    src: './assets/bgm-gameplay.mp3',
    fallbackSources: [
      bundledGameplayFallbackUrl,
      './assets/bgm_gameplay.mp3',
    ],
    loop: true,
    volume: BGM_DEFAULT_VOLUME,
    duckedVolume: BGM_DUCKED_VOLUME,
  },
  bonus: {
    id: 'bonus',
    label: 'Musik Level Bonus Kunang-Kunang',
    src: './assets/bgm-bonus.mp3',
    fallbackSources: [
      bundledBonusFallbackUrl,
      './assets/bgm_bonus.mp3',
    ],
    loop: true,
    volume: BGM_DEFAULT_VOLUME,
    duckedVolume: BGM_DUCKED_VOLUME,
  },
  victory: {
    id: 'victory',
    label: 'Musik Kemenangan / Level Selesai (One-Shot)',
    src: './assets/bgm-victory.mp3',
    fallbackSources: [
      bundledVictoryFallbackUrl,
      './assets/bgm_victory.mp3',
    ],
    loop: false,
    volume: BGM_VICTORY_VOLUME,
    duckedVolume: BGM_VICTORY_DUCKED_VOLUME,
  },
};

class StateBasedBgmEngine {
  private audioElements: Partial<Record<BgmTrackId, HTMLAudioElement>> = {};
  private bgmEnabled: boolean = true;
  private masterMuted: boolean = false;
  private isTabHidden: boolean = false;

  private lastGameContext: BgmStateContext = {
    screenState: 'SCREEN_COVER',
    isBonusLevelActive: false,
    hasWon: false,
    isTimeUp: false,
    isLeaderboardOpen: false,
  };
  private bonusResultState: 'playing' | 'won' | 'timeout' = 'playing';

  private currentSlot: ActiveBgmSlot = 'intro';
  private activeAudio: HTMLAudioElement | null = null;
  private victoryOneShotFinished: boolean = false;

  // Status auto-ducking (turun ke 0.10 saat narator berbicara -> kembali ke 0.35 / 0.40 setelah selesai)
  private manualDucked: boolean = false;
  private narratorSpeaking: boolean = false;
  private activeNarrationCount: number = 0;
  private speechSynthSpeaking: boolean = false;
  private timedDuckTimerId: number | null = null;

  private volumeRampTimerId: number | null = null;
  private speechMonitorTimerId: number | null = null;
  private currentVolume: number = BGM_DEFAULT_VOLUME;

  constructor() {
    this.bgmEnabled = this.loadSavedEnabled();

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.isTabHidden = document.visibilityState === 'hidden';
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      this.attachAutoplayUnlockListeners();

      // Listener event kustom untuk sinkronisasi auto-ducking narasi suara karakter
      window.addEventListener('narration-start', this.handleNarrationStartEvent);
      window.addEventListener('narration-end', this.handleNarrationEndEvent);
      window.addEventListener(
        'bgm-duck',
        this.handleCustomDuckEvent as EventListener
      );

      this.startSpeechSynthesisMonitor();
    }
  }

  private loadSavedEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    try {
      const raw = window.localStorage.getItem(BGM_STORAGE_KEY);
      if (raw === 'false') return false;
      if (raw === 'true') return true;
    } catch {
      // Abaikan jika localStorage tidak tersedia
    }
    return true;
  }

  private attachAutoplayUnlockListeners(): void {
    if (typeof window === 'undefined') return;

    const handleFirstInteraction = () => {
      this.unlock();
    };

    window.addEventListener('pointerdown', handleFirstInteraction, {
      passive: true,
      capture: true,
    });
    window.addEventListener('touchstart', handleFirstInteraction, {
      passive: true,
      capture: true,
    });
    window.addEventListener('mousedown', handleFirstInteraction, {
      passive: true,
      capture: true,
    });
    window.addEventListener('click', handleFirstInteraction, {
      passive: true,
      capture: true,
    });
    window.addEventListener('keydown', handleFirstInteraction, {
      passive: true,
      capture: true,
    });
  }

  private startSpeechSynthesisMonitor(): void {
    if (typeof window === 'undefined' || this.speechMonitorTimerId !== null) {
      return;
    }
    this.speechMonitorTimerId = window.setInterval(() => {
      try {
        const synth = window.speechSynthesis;
        const speakingNow = Boolean(synth && synth.speaking);
        if (speakingNow !== this.speechSynthSpeaking) {
          this.speechSynthSpeaking = speakingNow;
          this.updateVolumeForDuckingState();
        }
      } catch {
        // Abaikan jika speechSynthesis tidak didukung
      }
    }, 120);
  }

  private handleNarrationStartEvent = (): void => {
    this.startNarrationDucking();
  };

  private handleNarrationEndEvent = (): void => {
    this.stopNarrationDucking();
  };

  private handleCustomDuckEvent = (
    event: CustomEvent<{ ducked?: boolean; durationMs?: number }>
  ): void => {
    const detail = event.detail;
    if (!detail) return;
    if (typeof detail.durationMs === 'number' && detail.durationMs > 0) {
      this.duckForNarration(detail.durationMs);
    } else if (typeof detail.ducked === 'boolean') {
      this.setDucked(detail.ducked);
    }
  };

  private handleVisibilityChange = (): void => {
    if (typeof document === 'undefined') return;
    this.isTabHidden = document.visibilityState === 'hidden';
    this.syncPlaybackState();
  };

  private shouldPlayAudio(): boolean {
    return this.bgmEnabled && !this.masterMuted && !this.isTabHidden;
  }

  public isEnabled(): boolean {
    return this.bgmEnabled;
  }

  public isDucked(): boolean {
    return (
      this.manualDucked ||
      this.narratorSpeaking ||
      this.activeNarrationCount > 0 ||
      this.speechSynthSpeaking ||
      this.timedDuckTimerId !== null
    );
  }

  public setNarrationSpeaking(speaking: boolean): void {
    if (this.narratorSpeaking === speaking) return;
    this.narratorSpeaking = speaking;
    this.updateVolumeForDuckingState();
  }

  private getTargetVolumeForTrack(trackId: BgmTrackId): number {
    const config = BGM_TRACK_MAP[trackId];
    if (!config) return BGM_DEFAULT_VOLUME;
    return this.isDucked() ? config.duckedVolume : config.volume;
  }

  public getCurrentSlot(): ActiveBgmSlot {
    return this.currentSlot;
  }

  public setEnabled(next: boolean): void {
    this.bgmEnabled = next;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(BGM_STORAGE_KEY, next ? 'true' : 'false');
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

  /**
   * Mengatur auto-ducking secara langsung:
   * - true: turunkan volume ke 0.12 (atau 0.15 untuk musik kemenangan) saat narasi berbicara
   * - false: kembalikan volume ke 0.35 (atau 0.40 untuk musik kemenangan) setelah selesai
   */
  public setDucked(ducked: boolean): void {
    this.manualDucked = ducked;
    if (
      !ducked &&
      this.timedDuckTimerId !== null &&
      typeof window !== 'undefined'
    ) {
      window.clearTimeout(this.timedDuckTimerId);
      this.timedDuckTimerId = null;
    }
    this.updateVolumeForDuckingState();
  }

  public startNarrationDucking(): void {
    this.activeNarrationCount += 1;
    this.updateVolumeForDuckingState();
  }

  public stopNarrationDucking(): void {
    this.activeNarrationCount = Math.max(0, this.activeNarrationCount - 1);
    this.updateVolumeForDuckingState();
  }

  public duckForNarration(durationMs = 3000): void {
    if (typeof window === 'undefined') return;
    if (this.timedDuckTimerId !== null) {
      window.clearTimeout(this.timedDuckTimerId);
      this.timedDuckTimerId = null;
    }
    this.timedDuckTimerId = window.setTimeout(() => {
      this.timedDuckTimerId = null;
      this.updateVolumeForDuckingState();
    }, Math.max(300, durationMs));
    this.updateVolumeForDuckingState();
  }

  private updateVolumeForDuckingState(): void {
    if (
      !this.shouldPlayAudio() ||
      !this.activeAudio ||
      this.activeAudio.paused ||
      this.currentSlot === 'none'
    ) {
      return;
    }
    const target = this.getTargetVolumeForTrack(this.currentSlot);
    this.rampVolumeTo(this.activeAudio, target, 240);
  }

  private resolveSlot(): ActiveBgmSlot {
    const {
      screenState,
      isBonusLevelActive = false,
      hasWon = false,
      isTimeUp = false,
    } = this.lastGameContext;

    // 1. Alur Pembuka: Halaman Cover, Pilih Mode Permainan, Kenalan Dulu, hingga Layar Prolog
    if (
      screenState === 'SCREEN_COVER' ||
      screenState === 'SELECT_MODE' ||
      screenState === 'SETUP' ||
      screenState === 'PROLOGUE'
    ) {
      return 'intro';
    }

    // 2. Layar Leaderboard Akhir Giliran Kelompok (Kemenangan)
    if (screenState === 'LEADERBOARD') {
      return 'victory';
    }

    // 3. Fase Level Bonus Kunang-Kunang
    if (isBonusLevelActive) {
      if (this.bonusResultState === 'won') {
        return 'victory';
      }
      if (this.bonusResultState === 'timeout') {
        return 'none';
      }
      return 'bonus';
    }

    // 4. Kemenangan di Level Utama maupun Tamat Seluruh Level
    if (screenState === 'PLAYING' && hasWon) {
      return 'victory';
    }

    // 5. Papan Permainan Level Utama & Layar Gagal / Game Over (BGM tetap aktif dan ter-ducking halus saat voice-gameover.mp3 diputar)
    return 'gameplay';
  }

  /**
   * Dipanggil oleh modal Level Bonus saat sesi bonus dimulai, dimenangkan, atau habis waktu.
   */
  public setBonusResultState(state: 'playing' | 'won' | 'timeout'): void {
    if (this.bonusResultState === state) return;
    this.bonusResultState = state;
    this.applyResolvedSlot();
  }

  /**
   * Menyinkronkan status layar permainan dengan pemutar HTML5 <audio>:
   * - Alur Pembuka (Cover, Pilih Mode, Kenalan Dulu, Prolog): putar /assets/bgm-intro.mp3 (loop = true)
   * - Masuk ke Gameplay Utama (Level 1–10): hentikan track sebelumnya (pause & currentTime = 0), putar /assets/bgm-gameplay.mp3 (loop = true)
   * - Masuk ke Level Bonus: hentikan bgm-gameplay.mp3 (pause & currentTime = 0), putar /assets/bgm-bonus.mp3 (loop = true)
   * - Saat Menang (Level Utama, Level Bonus, maupun Tamat Seluruh Level): hentikan musik aktif dan putar /assets/bgm-victory.mp3 satu kali saja (loop = false, currentTime = 0)
   * - Saat tombol Lanjut / Main Lagi / Kembali ke Cover ditekan: hentikan bgm-victory.mp3 (pause & currentTime = 0) dan putar musik layar tujuan
   */
  public syncGameState(context: BgmStateContext): void {
    const wasBonusActive = Boolean(this.lastGameContext.isBonusLevelActive);
    this.lastGameContext = { ...context };

    if (!context.isBonusLevelActive && wasBonusActive) {
      this.bonusResultState = 'playing';
    }

    this.applyResolvedSlot();
  }

  private applyResolvedSlot(): void {
    const nextSlot = this.resolveSlot();
    if (nextSlot === this.currentSlot) {
      if (this.shouldPlayAudio()) {
        this.ensureCurrentSlotPlaying(false);
      }
      return;
    }

    const previousSlot = this.currentSlot;
    this.currentSlot = nextSlot;

    // Reset status one-shot setiap kali masuk atau keluar dari slot 'victory'
    this.victoryOneShotFinished = false;

    this.switchSlot(previousSlot, nextSlot);
  }

  /**
   * Memulai pemutaran otomatis pada interaksi sentuhan/klik pertama pengguna.
   */
  public unlock(): void {
    if (!this.shouldPlayAudio()) return;
    this.ensureCurrentSlotPlaying(false);
  }

  private getOrCreateAudioForTrack(trackId: BgmTrackId): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      return null;
    }

    const config = BGM_TRACK_MAP[trackId];
    if (!config || !config.src) {
      return null;
    }

    const existing = this.audioElements[trackId];
    if (existing) {
      return existing;
    }

    try {
      const audio = new Audio(config.src);
      audio.loop = config.loop;
      audio.preload = 'auto';
      audio.volume = this.getTargetVolumeForTrack(trackId);

      let fallbackIdx = 0;
      const fallbacks = config.fallbackSources ?? [];
      audio.addEventListener('error', () => {
        if (fallbackIdx < fallbacks.length) {
          const nextSrc = fallbacks[fallbackIdx];
          fallbackIdx += 1;
          if (nextSrc && nextSrc !== audio.src) {
            audio.src = nextSrc;
            audio.load();
            if (this.shouldPlayAudio() && this.currentSlot === trackId) {
              void audio.play().catch(() => {
                // Abaikan jika masih menunggu interaksi pengguna
              });
            }
          }
        }
      });

      audio.addEventListener('ended', () => {
        if (trackId === 'victory') {
          // One-shot: jangan ulangi lagi setelah selesai satu kali putar
          this.victoryOneShotFinished = true;
          return;
        }
        if (
          config.loop &&
          this.shouldPlayAudio() &&
          this.currentSlot === trackId
        ) {
          audio.currentTime = 0;
          void audio.play().catch(() => {
            // Abaikan
          });
        }
      });

      this.audioElements[trackId] = audio;
      return audio;
    } catch {
      return null;
    }
  }

  private clearVolumeRampTimer(): void {
    if (this.volumeRampTimerId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.volumeRampTimerId);
      this.volumeRampTimerId = null;
    }
  }

  private setAudioVolumeSafe(audio: HTMLAudioElement, volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.currentVolume = clamped;
    try {
      audio.volume = clamped;
    } catch {
      // Abaikan pada perangkat yang mengunci volume di level OS
    }
  }

  private switchSlot(fromSlot: ActiveBgmSlot, _toSlot: ActiveBgmSlot): void {
    this.clearVolumeRampTimer();

    // Hentikan track sebelumnya (pause() dan reset currentTime = 0)
    if (fromSlot !== 'none') {
      const outgoingAudio = this.audioElements[fromSlot] ?? this.activeAudio;
      if (outgoingAudio) {
        try {
          outgoingAudio.pause();
          outgoingAudio.currentTime = 0;
        } catch {
          // Abaikan
        }
        if (this.activeAudio === outgoingAudio) {
          this.activeAudio = null;
        }
      }
    }

    if (this.shouldPlayAudio()) {
      this.ensureCurrentSlotPlaying(true);
    } else if (this.currentSlot === 'victory') {
      // Pastikan currentTime bgm-victory.mp3 tetap di-reset ke 0 meskipun sedang di-mute
      const victoryAudio = this.getOrCreateAudioForTrack('victory');
      if (victoryAudio) {
        try {
          victoryAudio.currentTime = 0;
        } catch {
          // Abaikan
        }
      }
    }
  }

  private syncPlaybackState(): void {
    if (this.shouldPlayAudio()) {
      this.ensureCurrentSlotPlaying(false);
    } else {
      this.pauseAllAudioImmediately(false);
    }
  }

  private ensureCurrentSlotPlaying(forceRestartFromZero: boolean): void {
    if (this.currentSlot === 'none') {
      this.pauseAllAudioImmediately(true);
      return;
    }

    const trackId = this.currentSlot;
    const config = BGM_TRACK_MAP[trackId];
    if (!config || !config.src) {
      this.pauseAllAudioImmediately(true);
      return;
    }

    // Jika slot 'victory' (one-shot) sudah selesai diputar satu kali untuk kemenangan ini, jangan putar ulang
    if (
      trackId === 'victory' &&
      this.victoryOneShotFinished &&
      !forceRestartFromZero
    ) {
      return;
    }

    const audio = this.getOrCreateAudioForTrack(trackId);
    if (!audio) return;

    // Pastikan tidak ada track lain yang berputar bersamaan
    (Object.keys(this.audioElements) as BgmTrackId[]).forEach((id) => {
      const other = this.audioElements[id];
      if (other && other !== audio && !other.paused) {
        try {
          other.pause();
          other.currentTime = 0;
        } catch {
          // Abaikan
        }
      }
    });

    this.activeAudio = audio;
    audio.loop = config.loop;
    const targetVol = this.getTargetVolumeForTrack(trackId);

    if (forceRestartFromZero || (trackId === 'victory' && audio.paused)) {
      try {
        audio.currentTime = 0;
      } catch {
        // Abaikan
      }
    }

    if (audio.paused) {
      this.clearVolumeRampTimer();
      this.setAudioVolumeSafe(audio, targetVol);

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (!this.shouldPlayAudio() || this.currentSlot !== config.id) {
              audio.pause();
              audio.currentTime = 0;
              return;
            }
            this.setAudioVolumeSafe(
              audio,
              this.getTargetVolumeForTrack(trackId)
            );
          })
          .catch(() => {
            // Menunggu interaksi klik/sentuhan pertama pengguna sesuai kebijakan autoplay browser
          });
      }
    } else {
      this.rampVolumeTo(audio, targetVol, 200);
    }
  }

  private rampVolumeTo(
    audio: HTMLAudioElement,
    targetVol: number,
    durationMs: number
  ): void {
    if (typeof window === 'undefined') return;
    this.clearVolumeRampTimer();

    const startVol = audio.volume;
    const diff = targetVol - startVol;
    if (Math.abs(diff) < 0.005 || durationMs <= VOLUME_RAMP_INTERVAL_MS) {
      this.setAudioVolumeSafe(audio, targetVol);
      return;
    }

    const totalSteps = Math.max(
      1,
      Math.round(durationMs / VOLUME_RAMP_INTERVAL_MS)
    );
    let step = 0;

    this.volumeRampTimerId = window.setInterval(() => {
      step += 1;
      if (step >= totalSteps) {
        this.clearVolumeRampTimer();
        this.setAudioVolumeSafe(audio, targetVol);
        return;
      }
      const progress = step / totalSteps;
      const eased = 0.5 - Math.cos(progress * Math.PI) / 2;
      this.setAudioVolumeSafe(audio, startVol + diff * eased);
    }, VOLUME_RAMP_INTERVAL_MS);
  }

  private pauseAllAudioImmediately(resetTime = false): void {
    this.clearVolumeRampTimer();
    (Object.keys(this.audioElements) as BgmTrackId[]).forEach((id) => {
      const el = this.audioElements[id];
      if (el) {
        try {
          if (!el.paused) {
            el.pause();
          }
          if (resetTime) {
            el.currentTime = 0;
          }
        } catch {
          // Abaikan
        }
      }
    });
  }
}

export const bgmEngine = new StateBasedBgmEngine();
