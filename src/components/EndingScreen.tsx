import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, Award, Sparkles, BookOpen, MoonStar } from 'lucide-react';
import {
  CompanionTeacherFullBody,
  ZookeeperNaedieFullBody,
  KawaiiCharacterIcon,
  type KawaiiCharacterKey,
} from './KawaiiCharacters';
import type { GameMode } from './PassAndPlayScreens';
import {
  DEFAULT_KEY_BINDINGS,
  getActionBadgeLabel,
  matchesKeyAction,
  type KeyBindingsMap,
} from '../utils/keyboardConfig';
import { narrator } from '../utils/narrator';
import { sfxEngine } from '../utils/sfxEngine';

export type EndingScreenProps = {
  isOpen: boolean;
  mode: GameMode;
  playerName: string;
  groupName?: string;
  companionName: string;
  totalScore: number;
  totalStars: number;
  maxStars?: number;
  shouldReduceMotion: boolean;
  keyBindings?: KeyBindingsMap;
  showShortcutLabels?: boolean;
  onFinishToHome: () => void;
};

type EndingStage = 'CERTIFICATE' | 'CELEBRATION';

const ALL_PARK_ANIMALS: Array<{
  level: number;
  key: KawaiiCharacterKey;
  name: string;
  habitat: string;
}> = [
  { level: 1, key: 'deer', name: 'Rusa', habitat: 'Hutan Cemara' },
  { level: 2, key: 'rabbit', name: 'Kelinci', habitat: 'Padang Rumput' },
  { level: 3, key: 'cat', name: 'Kucing', habitat: 'Taman Bunga' },
  { level: 4, key: 'bear', name: 'Beruang', habitat: 'Lembah Madu' },
  { level: 5, key: 'fox', name: 'Rubah', habitat: 'Bukit Daun' },
  { level: 6, key: 'hedgehog', name: 'Landak', habitat: 'Semak Rimbun' },
  { level: 7, key: 'lion', name: 'Singa', habitat: 'Batu Sabana' },
  { level: 8, key: 'elephant', name: 'Gajah', habitat: 'Danau Segar' },
  { level: 9, key: 'giraffe', name: 'Jerapah', habitat: 'Pohon Akasia' },
  { level: 10, key: 'zebra', name: 'Zebra', habitat: 'Padang Lembah' },
];

const CONFETTI_PIECES = [
  { left: '8%', delay: 0, duration: 4.1, color: '#FBBF24', size: 10, sway: 16 },
  { left: '19%', delay: 0.7, duration: 3.8, color: '#34D399', size: 8, sway: -16 },
  { left: '31%', delay: 1.2, duration: 4.4, color: '#38BDF8', size: 10, sway: 18 },
  { left: '44%', delay: 0.4, duration: 3.9, color: '#FB7185', size: 9, sway: -14 },
  { left: '57%', delay: 0.9, duration: 4.2, color: '#A78BFA', size: 10, sway: 15 },
  { left: '69%', delay: 0.2, duration: 3.7, color: '#4ADE80', size: 10, sway: -18 },
  { left: '81%', delay: 1.1, duration: 4.3, color: '#F472B6', size: 8, sway: 14 },
  { left: '91%', delay: 0.5, duration: 4.0, color: '#60A5FA', size: 9, sway: -16 },
];

const FIREFLY_DOTS = [
  { top: '16%', left: '10%', delay: 0, duration: 3.2, sizePx: 14, flyX: 10, flyY: -12 },
  { top: '24%', left: '86%', delay: 0.6, duration: 3.6, sizePx: 16, flyX: -12, flyY: -10 },
  { top: '44%', left: '7%', delay: 1.1, duration: 3.9, sizePx: 12, flyX: 10, flyY: 12 },
  { top: '50%', left: '91%', delay: 0.8, duration: 3.4, sizePx: 14, flyX: -10, flyY: -12 },
  { top: '70%', left: '12%', delay: 0.3, duration: 4.0, sizePx: 14, flyX: 12, flyY: -10 },
  { top: '72%', left: '87%', delay: 1.3, duration: 3.5, sizePx: 16, flyX: -10, flyY: 10 },
];

export const EndingScreen: React.FC<EndingScreenProps> = ({
  isOpen,
  mode,
  playerName,
  groupName = 'Bintang Hutan',
  companionName,
  totalScore,
  totalStars,
  maxStars = 30,
  shouldReduceMotion,
  keyBindings = DEFAULT_KEY_BINDINGS,
  showShortcutLabels = false,
  onFinishToHome,
}) => {
  const [stage, setStage] = useState<EndingStage>('CERTIFICATE');
  const [isOriginModalOpen, setIsOriginModalOpen] = useState<boolean>(false);
  const [isNarrating, setIsNarrating] = useState<boolean>(false);
  const [mouthAmplitude, setMouthAmplitude] = useState<number>(0);
  const [jumpingAnimals, setJumpingAnimals] = useState<Record<string, number>>({});
  const [focusedBtnIndex, setFocusedBtnIndex] = useState<number>(0);

  const seeAnimalsBtnRef = useRef<HTMLButtonElement | null>(null);
  const restBtnRef = useRef<HTMLButtonElement | null>(null);
  const originBtnRef = useRef<HTMLButtonElement | null>(null);
  const closeOriginBtnRef = useRef<HTMLButtonElement | null>(null);

  const safeRecipientName =
    mode === 'group'
      ? `Kelompok ${groupName.trim() || 'Bintang Hutan'}`
      : playerName.trim() || 'Rusa Kecil';
  const safeCompanionName = companionName.trim() || 'Ibu Guru';
  const clampedStars = Math.max(10, Math.min(maxStars, totalStars || maxStars));

  useEffect(() => {
    return narrator.subscribe(setIsNarrating);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setMouthAmplitude(0);
      return;
    }
    return narrator.subscribeAmplitude(setMouthAmplitude);
  }, [isOpen]);

  // Reset ke Tahap 1 saat EndingScreen baru dibuka, dan hentikan audio saat ditutup
  useEffect(() => {
    if (!isOpen) {
      setStage('CERTIFICATE');
      setIsOriginModalOpen(false);
      setFocusedBtnIndex(0);
      narrator.stop();
      return;
    }
    setStage('CERTIFICATE');
    setIsOriginModalOpen(false);
    setFocusedBtnIndex(0);
  }, [isOpen]);

  // Putar narasi sesuai Tahap aktif (Tahap 1: voice-epilog-guru.mp3, Tahap 2: voice-epilog-naedie.mp3)
  useEffect(() => {
    if (!isOpen) return;
    if (stage === 'CERTIFICATE') {
      narrator.playEpilogueGuruVoice();
    } else if (stage === 'CELEBRATION') {
      narrator.playEpilogueNaedieVoice();
    }
  }, [isOpen, stage]);

  useEffect(() => {
    return () => {
      narrator.stop();
    };
  }, []);

  const handleGoToCelebration = useCallback(() => {
    sfxEngine.playButtonPop();
    narrator.stop();
    setStage('CELEBRATION');
    setFocusedBtnIndex(0);
  }, []);

  const handleRestAndReturnHome = useCallback(() => {
    sfxEngine.playButtonPop();
    narrator.stop();
    setIsOriginModalOpen(false);
    onFinishToHome();
  }, [onFinishToHome]);

  const handleOpenOriginModal = useCallback(() => {
    sfxEngine.playModalOpen();
    setIsOriginModalOpen(true);
  }, []);

  const handleCloseOriginModal = useCallback(() => {
    sfxEngine.playModalClose();
    setIsOriginModalOpen(false);
  }, []);

  const handleReplayStageVoice = useCallback(() => {
    if (stage === 'CERTIFICATE') {
      narrator.playEpilogueGuruVoice();
    } else {
      narrator.playEpilogueNaedieVoice();
    }
  }, [stage]);

  const handleAnimalJump = useCallback((animalKey: string) => {
    sfxEngine.playButtonPop();
    setJumpingAnimals((prev) => ({
      ...prev,
      [animalKey]: (prev[animalKey] ?? 0) + 1,
    }));
  }, []);

  // Navigasi Keyboard & Numpad OTG untuk Tahap 1, Tahap 2, dan Modal Asal Usul Taman
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isOriginModalOpen) {
        if (
          matchesKeyAction(event, 'back', keyBindings) ||
          matchesKeyAction(event, 'confirm', keyBindings) ||
          event.key === ' '
        ) {
          event.preventDefault();
          handleCloseOriginModal();
        }
        return;
      }

      if (stage === 'CERTIFICATE') {
        if (
          matchesKeyAction(event, 'confirm', keyBindings) ||
          matchesKeyAction(event, 'moveRight', keyBindings) ||
          event.key === ' '
        ) {
          event.preventDefault();
          handleGoToCelebration();
        } else if (matchesKeyAction(event, 'back', keyBindings)) {
          event.preventDefault();
          handleRestAndReturnHome();
        }
        return;
      }

      // Tahap 2: CELEBRATION (2 tombol: 0 = Silakan Istirahat, 1 = Asal Usul Taman)
      if (
        matchesKeyAction(event, 'moveLeft', keyBindings) ||
        matchesKeyAction(event, 'moveUp', keyBindings)
      ) {
        event.preventDefault();
        setFocusedBtnIndex(0);
        restBtnRef.current?.focus();
      } else if (
        matchesKeyAction(event, 'moveRight', keyBindings) ||
        matchesKeyAction(event, 'moveDown', keyBindings)
      ) {
        event.preventDefault();
        setFocusedBtnIndex(1);
        originBtnRef.current?.focus();
      } else if (
        matchesKeyAction(event, 'confirm', keyBindings) ||
        event.key === ' '
      ) {
        event.preventDefault();
        if (
          document.activeElement === originBtnRef.current ||
          focusedBtnIndex === 1
        ) {
          handleOpenOriginModal();
        } else {
          handleRestAndReturnHome();
        }
      } else if (matchesKeyAction(event, 'back', keyBindings)) {
        event.preventDefault();
        handleRestAndReturnHome();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    focusedBtnIndex,
    handleCloseOriginModal,
    handleGoToCelebration,
    handleOpenOriginModal,
    handleRestAndReturnHome,
    isOpen,
    isOriginModalOpen,
    keyBindings,
    stage,
  ]);

  const isGuruSpeaking = isNarrating && stage === 'CERTIFICATE';
  const isNaedieSpeaking = isNarrating && stage === 'CELEBRATION';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-labelledby="ending-screen-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`fixed inset-0 z-[125] min-h-[100dvh] w-full flex flex-col items-center justify-between px-3.5 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] overflow-y-auto ${
            stage === 'CERTIFICATE'
              ? 'bg-gradient-to-b from-amber-100 via-emerald-50 to-amber-100 text-stone-800'
              : 'bg-gradient-to-b from-sky-100 via-emerald-100 to-lime-100 text-stone-800'
          }`}
        >
          {/* Dekorasi Latar Belakang: Cahaya Kunang-Kunang & Konfeti Perayaan */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 overflow-hidden"
          >
            <div className="absolute -top-20 -left-16 w-72 h-72 rounded-full bg-amber-300/35 blur-3xl" />
            <div className="absolute top-1/4 -right-16 w-72 h-72 rounded-full bg-emerald-300/35 blur-3xl" />
            <div className="absolute -bottom-16 left-1/4 w-80 h-60 rounded-full bg-lime-300/40 blur-3xl" />

            {/* Bukit Padang Hijau di Bawah */}
            <div className="absolute -bottom-16 -left-16 w-[65%] h-44 rounded-[100%] bg-emerald-300/55" />
            <div className="absolute -bottom-16 -right-16 w-[65%] h-48 rounded-[100%] bg-lime-300/55" />

            {/* Titik-titik cahaya kunang-kunang hangat yang melayang lembut (GPU CSS transform + opacity) */}
            {FIREFLY_DOTS.map((dot, idx) => (
              <span
                key={`firefly-${idx}`}
                style={
                  {
                    top: dot.top,
                    left: dot.left,
                    width: dot.sizePx,
                    height: dot.sizePx,
                    background:
                      'radial-gradient(circle, #FEF08A 0%, #FACC15 45%, rgba(250,204,21,0) 75%)',
                    animationDuration: `${dot.duration}s`,
                    animationDelay: `${dot.delay}s`,
                    '--fly-x': `${dot.flyX}px`,
                    '--fly-y': `${dot.flyY}px`,
                  } as React.CSSProperties
                }
                className={`absolute rounded-full ${
                  shouldReduceMotion ? 'opacity-75' : 'gpu-firefly-particle'
                }`}
              />
            ))}

            {/* Taburan Konfeti Ceria pada Tahap 2 (GPU CSS transform + opacity) */}
            {stage === 'CELEBRATION' &&
              !shouldReduceMotion &&
              CONFETTI_PIECES.map((piece, idx) => (
                <span
                  key={`confetti-${idx}`}
                  style={
                    {
                      left: piece.left,
                      width: piece.size,
                      height: piece.size * 0.65,
                      backgroundColor: piece.color,
                      animationDuration: `${piece.duration}s`,
                      animationDelay: `${piece.delay}s`,
                      '--confetti-sway': `${piece.sway}px`,
                    } as React.CSSProperties
                  }
                  className="absolute rounded-xs gpu-confetti-piece"
                />
              ))}
          </div>

          <AnimatePresence mode="wait">
            {stage === 'CERTIFICATE' ? (
              /* ============================================================================
               * TAHAP 1: HALAMAN PIAGAM "PENJAGA ALAM CILIK" & AVATAR IBU GURU
               * ============================================================================ */
              <motion.div
                key="stage-certificate"
                initial={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 16, scale: 0.97 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: -12, scale: 0.97 }
                }
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                className="relative z-10 w-full max-w-3xl my-auto flex flex-col items-center gap-3.5 py-2"
              >
                {/* Badge Tahap 1 & Tombol Dengarkan Ulang */}
                <div className="w-full flex items-center justify-between gap-2 px-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-200/90 border border-amber-400 text-amber-950 text-xs font-extrabold shadow-2xs">
                    <Award className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                    <span>Tahap 1/2 · Piagam Kehormatan</span>
                  </span>

                  <button
                    type="button"
                    data-sfx="custom"
                    onClick={handleReplayStageVoice}
                    aria-label="Dengarkan ulang ucapan Ibu Guru"
                    title="Dengarkan Ulang"
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-extrabold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      isGuruSpeaking
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                        : 'bg-white/90 hover:bg-white border-amber-300 text-amber-950 shadow-2xs'
                    }`}
                  >
                    <Volume2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isGuruSpeaking ? 'animate-pulse text-emerald-700' : ''
                      }`}
                      aria-hidden="true"
                    />
                    <span>Dengarkan Ulang</span>
                  </button>
                </div>

                {/* Kontainer Utama: Piagam + Kartu Lencana di Kiri, Ilustrasi Ibu Guru di Kanan */}
                <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
                  {/* Kolom Piagam & Kartu Lencana Penjaga Alam */}
                  <div className="md:col-span-8 flex flex-col gap-3">
                    {/* Bingkai Piagam Penghargaan "Penjaga Alam Cilik" */}
                    <div className="relative rounded-3xl bg-gradient-to-b from-[#FFFDF7] via-[#FEF9E7] to-[#FDE68A]/35 border-4 border-amber-400 shadow-[0_18px_45px_rgba(180,83,9,0.16)] p-4 sm:p-5 text-center overflow-hidden">
                      {/* Ornamen Sudut Bingkai Piagam */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-2 rounded-2xl border-2 border-dashed border-amber-300/90"
                      />

                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 border-2 border-white shadow-md flex items-center justify-center mb-1.5">
                          <span role="img" aria-hidden="true" className="text-2xl">
                            🏅
                          </span>
                        </div>

                        <p className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-amber-800">
                          Piagam Penghargaan Hexago Park
                        </p>
                        <h1
                          id="ending-screen-title"
                          className="font-display text-2xl sm:text-3xl font-bold text-emerald-950 leading-tight mt-0.5"
                        >
                          Penjaga Alam Cilik
                        </h1>

                        <p className="text-xs font-bold text-stone-600 mt-1.5">
                          Diberikan dengan penuh kebanggaan kepada:
                        </p>
                        <div className="mt-1 px-5 py-1.5 rounded-2xl bg-emerald-100/90 border-2 border-emerald-300 shadow-2xs">
                          <p className="font-display text-xl sm:text-2xl font-bold text-emerald-900">
                            {safeRecipientName}
                          </p>
                        </div>

                        <p className="text-xs sm:text-sm font-bold text-stone-700 leading-relaxed mt-2.5 max-w-md">
                          Atas keberanian, ketelitian, dan kasih sayang dalam
                          memandu ke-10 satwa sahabat kembali ke rumah mereka
                          dengan selamat di Taman Ajaib Hexago Park!
                        </p>

                        <div className="mt-3 pt-2 border-t border-amber-300/70 w-full flex items-center justify-around text-[11px] font-extrabold text-amber-900">
                          <span>Disahkan: Pak Naedie</span>
                          <span>•</span>
                          <span>Pendamping: {safeCompanionName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Kartu Lencana Penjaga Alam (Total Skor Akhir & Total Bintang 10 Level) */}
                    <div className="rounded-3xl bg-white/90 backdrop-blur-xl border-2 border-emerald-300 shadow-md p-3.5 sm:p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-white shadow-md flex items-center justify-center shrink-0 text-white">
                          <Sparkles className="w-6 h-6" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                            Kartu Lencana Penjaga Alam
                          </p>
                          <p className="font-display text-sm sm:text-base font-bold text-emerald-950 truncate">
                            Lulus Seluruh 10 Level Petualangan
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 tabular-nums">
                        <div className="rounded-2xl bg-amber-50 border border-amber-300 px-3 py-1.5 text-center">
                          <p className="text-[10px] font-extrabold uppercase text-amber-800">
                            Total Skor Akhir
                          </p>
                          <p className="font-display text-base sm:text-lg font-bold text-amber-950">
                            {totalScore}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 border border-emerald-300 px-3 py-1.5 text-center">
                          <p className="text-[10px] font-extrabold uppercase text-emerald-800">
                            Total Bintang
                          </p>
                          <p className="font-display text-base sm:text-lg font-bold text-emerald-950 flex items-center justify-center gap-1">
                            <span className="text-amber-500" aria-hidden="true">
                              ★
                            </span>
                            <span>
                              {clampedStars}/{maxStars}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Kolom Avatar Ibu Guru Tersinkronisasi (Kedipan Mata & Lip-Sync) */}
                  <div className="md:col-span-4 flex flex-col items-center justify-center">
                    <div className="relative w-full max-w-[240px] rounded-3xl bg-white/80 backdrop-blur-xl border-2 border-rose-200 shadow-lg px-4 pt-4 pb-3 flex flex-col items-center">
                      {/* Sorotan lembut saat Ibu Guru berbicara */}
                      <div
                        aria-hidden="true"
                        className={`pointer-events-none absolute inset-2 rounded-full bg-[radial-gradient(circle,rgba(253,230,138,0.65)_0%,rgba(254,205,211,0.45)_50%,transparent_75%)] blur-xl transition-opacity duration-300 ${
                          isGuruSpeaking ? 'opacity-100' : 'opacity-45'
                        }`}
                      />
                      <div
                        className={`relative h-44 sm:h-52 flex items-end justify-center ${
                          shouldReduceMotion ? '' : 'prologue-breathe'
                        }`}
                      >
                        <CompanionTeacherFullBody
                          alt={`${safeCompanionName} memberikan piagam penghargaan`}
                          animateLiving={true}
                          isSpeaking={isGuruSpeaking}
                          mouthOpen={isGuruSpeaking ? mouthAmplitude : 0}
                          rightArmPose={isGuruSpeaking ? 'wave' : 'down'}
                          blinkDelaySec={0}
                          reduceMotion={shouldReduceMotion}
                          className="h-full w-auto max-h-44 sm:max-h-52 select-none pointer-events-none drop-shadow-[0_12px_22px_rgba(244,63,94,0.22)]"
                        />
                      </div>
                      <span className="mt-1 px-3 py-0.5 rounded-full bg-rose-100 border border-rose-300 text-xs font-extrabold text-rose-900">
                        {safeCompanionName}
                      </span>
                      <p className="text-[11px] font-bold text-stone-600 text-center mt-1 leading-snug">
                        “Selamat ya! Kamu resmi menjadi Penjaga Alam Cilik yang
                        hebat!”
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tombol Aksi Utama Tahap 1: "Lihat Para Satwa" */}
                <motion.button
                  ref={seeAnimalsBtnRef}
                  type="button"
                  data-kb-default="true"
                  data-sfx="custom"
                  onClick={handleGoToCelebration}
                  whileHover={
                    shouldReduceMotion ? undefined : { scale: 1.03, y: -2 }
                  }
                  whileTap={
                    shouldReduceMotion ? undefined : { scale: 0.97, y: 1.5 }
                  }
                  className="w-full max-w-md min-h-[54px] px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-xl font-bold shadow-lg active:border-b-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 flex items-center justify-center gap-2.5"
                >
                  <span>Lihat Para Satwa</span>
                  <span aria-hidden="true" className="text-xl leading-none">
                    🐾
                  </span>
                  {showShortcutLabels && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-700/70 text-[10px] font-black font-mono">
                      {getActionBadgeLabel('confirm', keyBindings)}
                    </span>
                  )}
                </motion.button>
              </motion.div>
            ) : (
              /* ============================================================================
               * TAHAP 2: HALAMAN PERAYAAN "SELAMAT! PETUALANGAN SELESAI!"
               * ============================================================================ */
              <motion.div
                key="stage-celebration"
                initial={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 16, scale: 0.97 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: -12, scale: 0.97 }
                }
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                className="relative z-10 w-full max-w-3xl my-auto flex flex-col items-center gap-3 py-1.5"
              >
                {/* Header Tahap 2 & Tombol Dengarkan Ulang */}
                <div className="w-full flex items-center justify-between gap-2 px-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-200/90 border border-emerald-400 text-emerald-950 text-xs font-extrabold shadow-2xs">
                    <span>🎉 Tahap 2/2 · Parade 10 Satwa</span>
                  </span>

                  <button
                    type="button"
                    data-sfx="custom"
                    onClick={handleReplayStageVoice}
                    aria-label="Dengarkan ulang pesan Pak Naedie"
                    title="Dengarkan Ulang"
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-extrabold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      isNaedieSpeaking
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                        : 'bg-white/90 hover:bg-white border-emerald-300 text-emerald-950 shadow-2xs'
                    }`}
                  >
                    <Volume2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isNaedieSpeaking ? 'animate-pulse text-emerald-700' : ''
                      }`}
                      aria-hidden="true"
                    />
                    <span>Dengarkan Ulang</span>
                  </button>
                </div>

                {/* Judul Besar Perayaan */}
                <div className="text-center px-2">
                  <h1
                    id="ending-screen-title"
                    className="font-display text-2xl sm:text-4xl font-bold text-emerald-950 leading-tight drop-shadow-2xs"
                  >
                    Selamat! Petualangan Selesai!
                  </h1>
                  <p className="text-xs sm:text-sm font-bold text-emerald-800 mt-0.5">
                    Ke-10 sahabat satwa sudah berkumpul gembira di Hexago Park
                    (Ketuk satwa untuk melompat!)
                  </p>
                </div>

                {/* Panggung Perayaan: Pak Naedie + 10 Karakter Hewan (Level 1–10) */}
                <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Pak Naedie dengan Topi Rimba & Kacamata + Lip-Sync & Kedipan Mata */}
                  <div className="md:col-span-4 flex flex-col items-center">
                    <div className="relative w-full max-w-[230px] rounded-3xl bg-white/85 backdrop-blur-xl border-2 border-emerald-300 shadow-lg px-3.5 pt-3.5 pb-2.5 flex flex-col items-center">
                      <div
                        aria-hidden="true"
                        className={`pointer-events-none absolute inset-2 rounded-full bg-[radial-gradient(circle,rgba(253,230,138,0.7)_0%,rgba(167,243,208,0.5)_50%,transparent_75%)] blur-xl transition-opacity duration-300 ${
                          isNaedieSpeaking ? 'opacity-100' : 'opacity-45'
                        }`}
                      />
                      <div
                        className={`relative h-40 sm:h-44 flex items-end justify-center ${
                          shouldReduceMotion ? '' : 'prologue-breathe'
                        }`}
                      >
                        <ZookeeperNaedieFullBody
                          alt="Pak Naedie merayakan keberhasilan petualangan"
                          animateLiving={true}
                          isSpeaking={isNaedieSpeaking}
                          mouthOpen={isNaedieSpeaking ? mouthAmplitude : 0}
                          blinkDelaySec={0}
                          reduceMotion={shouldReduceMotion}
                          className="h-full w-auto max-h-40 sm:max-h-44 select-none pointer-events-none drop-shadow-[0_12px_22px_rgba(16,185,129,0.25)]"
                        />
                      </div>
                      <span className="mt-1 px-3 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-xs font-extrabold text-emerald-900">
                        Pak Naedie · Zookeeper
                      </span>
                    </div>
                  </div>

                  {/* Grid 10 Karakter Hewan (Rusa, Kelinci, Kucing, Beruang, Rubah, Landak, Singa, Gajah, Jerapah, Zebra) */}
                  <div className="md:col-span-8 rounded-3xl bg-white/85 backdrop-blur-xl border-2 border-white shadow-lg p-3 sm:p-4">
                    <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
                      {ALL_PARK_ANIMALS.map((animal, idx) => {
                        const jumpTick = jumpingAnimals[animal.key] ?? 0;
                        return (
                          <motion.button
                            key={animal.key}
                            type="button"
                            data-sfx="custom"
                            onClick={() => handleAnimalJump(animal.key)}
                            aria-label={`${animal.name} gembira, ketuk untuk melompat`}
                            whileHover={
                              shouldReduceMotion
                                ? undefined
                                : { scale: 1.07, y: -3 }
                            }
                            whileTap={
                              shouldReduceMotion ? undefined : { scale: 0.94 }
                            }
                            className="group rounded-2xl bg-gradient-to-b from-emerald-50/90 via-white to-amber-50/80 border border-emerald-200/90 hover:border-amber-400 p-1.5 sm:p-2 flex flex-col items-center justify-center shadow-2xs hover:shadow-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                          >
                            {jumpTick > 0 && !shouldReduceMotion ? (
                              <motion.div
                                key={`${animal.key}-${jumpTick}`}
                                animate={{
                                  y: [0, -16, 0, -8, 0],
                                  rotate: [0, -8, 8, -4, 0],
                                  scale: [1, 1.12, 0.96, 1.05, 1],
                                }}
                                transition={{ duration: 0.55, ease: 'easeOut' }}
                                className="w-11 h-11 sm:w-14 sm:h-14"
                              >
                                <KawaiiCharacterIcon
                                  character={animal.key}
                                  mood="cheer"
                                  alt={`${animal.name} bahagia`}
                                  className="w-full h-full pointer-events-none select-none"
                                />
                              </motion.div>
                            ) : (
                              <div
                                style={
                                  shouldReduceMotion
                                    ? undefined
                                    : {
                                        animationDuration: `${2.0 + (idx % 4) * 0.25}s`,
                                        animationDelay: `${idx * 0.12}s`,
                                      }
                                }
                                className={`w-11 h-11 sm:w-14 sm:h-14 ${
                                  shouldReduceMotion ? '' : 'gpu-animal-bob'
                                }`}
                              >
                                <KawaiiCharacterIcon
                                  character={animal.key}
                                  mood="cheer"
                                  alt={`${animal.name} bahagia`}
                                  className="w-full h-full pointer-events-none select-none"
                                />
                              </div>
                            )}
                            <span className="mt-1 text-[10px] sm:text-xs font-extrabold text-emerald-950 leading-tight truncate max-w-full">
                              {animal.name}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-700/80 leading-none">
                              Lv.{animal.level}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Kotak Pengingat Istirahat Hangat */}
                <div className="w-full max-w-xl rounded-2xl bg-amber-50/95 border-2 border-amber-300 shadow-sm px-4 py-2.5 flex items-center justify-center gap-2.5 text-center">
                  <MoonStar
                    className="w-5 h-5 text-amber-600 shrink-0"
                    aria-hidden="true"
                  />
                  <p className="font-display text-sm sm:text-base font-bold text-amber-950 leading-snug">
                    “Sudah dulu ya main gamenya, sekarang waktunya istirahat..”
                  </p>
                </div>

                {/* Dua Tombol Aksi Tahap 2: "Silakan Istirahat" & "Asal Usul Taman" */}
                <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <motion.button
                    ref={restBtnRef}
                    type="button"
                    data-kb-default="true"
                    data-sfx="custom"
                    onClick={handleRestAndReturnHome}
                    whileHover={
                      shouldReduceMotion ? undefined : { scale: 1.02, y: -2 }
                    }
                    whileTap={
                      shouldReduceMotion ? undefined : { scale: 0.97, y: 1.5 }
                    }
                    className={`min-h-[52px] px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-lg font-bold shadow-lg active:border-b-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 flex items-center justify-center gap-2 ${
                      focusedBtnIndex === 0 ? 'ring-2 ring-emerald-300' : ''
                    }`}
                  >
                    <span>Silakan Istirahat</span>
                    {showShortcutLabels && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-700/70 text-[10px] font-black font-mono">
                        {getActionBadgeLabel('confirm', keyBindings)}
                      </span>
                    )}
                  </motion.button>

                  <motion.button
                    ref={originBtnRef}
                    type="button"
                    data-sfx="custom"
                    onClick={handleOpenOriginModal}
                    whileHover={
                      shouldReduceMotion ? undefined : { scale: 1.02, y: -2 }
                    }
                    whileTap={
                      shouldReduceMotion ? undefined : { scale: 0.97, y: 1.5 }
                    }
                    className={`min-h-[52px] px-5 py-2.5 rounded-2xl bg-amber-300 hover:bg-amber-400 border-b-4 border-amber-500 text-amber-950 font-display text-lg font-bold shadow-md active:border-b-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 flex items-center justify-center gap-2 ${
                      focusedBtnIndex === 1 ? 'ring-2 ring-amber-500' : ''
                    }`}
                  >
                    <BookOpen className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span>Asal Usul Taman</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ============================================================================
           * MODAL INFORMASI TENTANG GAME: "ASAL USUL TAMAN"
           * ============================================================================ */}
          <AnimatePresence>
            {isOriginModalOpen && (
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="origin-modal-title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={handleCloseOriginModal}
                className="fixed inset-0 z-[135] flex items-center justify-center p-4 bg-emerald-950/45 backdrop-blur-md"
              >
                <motion.div
                  initial={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, scale: 0.92, y: 14 }
                  }
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, scale: 0.95, y: 10 }
                  }
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-2xl border-2 border-amber-300 shadow-[0_24px_60px_rgba(15,23,42,0.35)] p-5 sm:p-6 text-stone-800 max-h-[88dvh] overflow-y-auto flex flex-col gap-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-amber-300 border-2 border-white shadow-md flex items-center justify-center shrink-0">
                      <span role="img" aria-hidden="true" className="text-2xl">
                        🌳
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                        Tentang Permainan
                      </p>
                      <h2
                        id="origin-modal-title"
                        className="font-display text-xl sm:text-2xl font-bold text-emerald-950 leading-tight"
                      >
                        Asal Usul Taman Hexago Park
                      </h2>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-emerald-50/90 border border-emerald-200 p-3.5 text-xs sm:text-sm font-bold text-stone-700 leading-relaxed space-y-2">
                    <p className="font-extrabold text-emerald-900">
                      🦌 Cerita Singkat Taman Satwa
                    </p>
                    <p>
                      <strong>Hexago Park (Taman Ajaib)</strong> dibangun oleh{' '}
                      <strong>Pak Naedie</strong> sebagai rumah bermain yang
                      aman, asri, dan penuh kasih sayang bagi 10 satwa sahabat.
                      Di taman ini, anak-anak belajar memandu satwa pulang
                      sambil mengenali makanan favorit dan tempat tinggal alami
                      mereka.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-amber-50/90 border border-amber-200 p-3.5 text-xs sm:text-sm font-bold text-stone-700 leading-relaxed space-y-1.5">
                    <p className="font-extrabold text-amber-900">
                      🎯 Tujuan Edukasi Permainan
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-stone-700">
                      <li>
                        Melatih orientasi arah, fokus, dan pemecahan masalah
                        spasial anak usia dini secara menyenangkan.
                      </li>
                      <li>
                        Menumbuhkan rasa empati serta kepedulian terhadap satwa
                        dan kelestarian alam.
                      </li>
                      <li>
                        Mendukung interaksi hangat bersama Bunda, Ayah, atau
                        Ibu Guru serta membiasakan waktu istirahat layar yang
                        sehat.
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-2xl bg-sky-50/90 border border-sky-200 p-3.5 text-xs font-bold text-sky-950 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700">
                        Kredit Pengembang &amp; Kreator
                      </p>
                      <p className="font-display text-sm sm:text-base font-bold text-sky-950 mt-0.5">
                        Pak Naedie (Naedie Artwork)
                      </p>
                      <p className="text-[11px] text-sky-800/85">
                        Desain Cerita, Suara Narator &amp; Taman Edukasi Anak
                      </p>
                    </div>
                    <span
                      role="img"
                      aria-hidden="true"
                      className="text-2xl shrink-0"
                    >
                      🎨
                    </span>
                  </div>

                  <motion.button
                    ref={closeOriginBtnRef}
                    type="button"
                    data-sfx="custom"
                    onClick={handleCloseOriginModal}
                    whileHover={
                      shouldReduceMotion ? undefined : { scale: 1.02, y: -1 }
                    }
                    whileTap={
                      shouldReduceMotion ? undefined : { scale: 0.97 }
                    }
                    className="w-full min-h-[48px] px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-base font-bold shadow-md active:border-b-0 transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Tutup Informasi</span>
                    {showShortcutLabels && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-700/70 text-[10px] font-black font-mono">
                        {getActionBadgeLabel('back', keyBindings)}
                      </span>
                    )}
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      )}
    </AnimatePresence>
  );
};
