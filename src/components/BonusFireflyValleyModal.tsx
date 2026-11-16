import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ZookeeperNaedieAvatar } from './KawaiiCharacters';
import {
  DEFAULT_KEY_BINDINGS,
  getActionBadgeLabel,
  matchesKeyAction,
  type KeyBindingsMap,
} from '../utils/keyboardConfig';
import { sfxEngine } from '../utils/sfxEngine';
import { bgmEngine } from '../utils/bgmEngine';
import { narrator } from '../utils/narrator';

type BonusPosition = {
  row: number;
  col: number;
};

type BonusDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

type BonusFireflyValleyModalProps = {
  isOpen: boolean;
  hintsLeft: number;
  maxHints: number;
  shouldReduceMotion: boolean;
  keyBindings?: KeyBindingsMap;
  showShortcutLabels?: boolean;
  onCollectFirefly: () => void;
  onFinishBonus: () => void;
};

const BONUS_DURATION_SECONDS = 30;
const BONUS_TARGET_FIREFLIES = 3;

// Peta 5x5 sederhana & ramah anak tanpa jebakan rumit (0 = jalan terbuka, 1 = semak senja lembut)
const BONUS_VALLEY_LAYOUTS: Array<{
  grid: number[][];
  start: BonusPosition;
  fireflies: BonusPosition[];
}> = [
  {
    grid: [
      [0, 0, 0, 1, 0],
      [0, 1, 0, 0, 0],
      [0, 0, 0, 1, 0],
      [1, 0, 1, 0, 0],
      [0, 0, 0, 0, 0],
    ],
    start: { row: 4, col: 0 },
    fireflies: [
      { row: 0, col: 2 },
      { row: 2, col: 4 },
      { row: 0, col: 4 },
    ],
  },
  {
    grid: [
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1],
      [1, 0, 1, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 1, 0, 1, 0],
    ],
    start: { row: 4, col: 2 },
    fireflies: [
      { row: 0, col: 0 },
      { row: 0, col: 4 },
      { row: 2, col: 4 },
    ],
  },
  {
    grid: [
      [0, 0, 0, 0, 0],
      [0, 1, 0, 1, 0],
      [0, 0, 0, 0, 0],
      [0, 1, 1, 0, 1],
      [0, 0, 0, 0, 0],
    ],
    start: { row: 2, col: 2 },
    fireflies: [
      { row: 0, col: 0 },
      { row: 0, col: 4 },
      { row: 4, col: 3 },
    ],
  },
];

// Ilustrasi SVG Kunang-Kunang Bercahaya (Kawaii & Hangat)
const GlowingFireflyIcon: React.FC<{ className?: string }> = ({
  className = 'w-full h-full',
}) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Aura cahaya hangat */}
    <circle cx="32" cy="36" r="22" fill="#FDE047" fillOpacity="0.28" />
    <circle cx="32" cy="36" r="15" fill="#FACC15" fillOpacity="0.35" />
    {/* Sayap kiri & kanan */}
    <ellipse
      cx="20"
      cy="24"
      rx="11"
      ry="6"
      transform="rotate(-28 20 24)"
      fill="#E0F2FE"
      fillOpacity="0.88"
      stroke="#BAE6FD"
      strokeWidth="1.5"
    />
    <ellipse
      cx="44"
      cy="24"
      rx="11"
      ry="6"
      transform="rotate(28 44 24)"
      fill="#E0F2FE"
      fillOpacity="0.88"
      stroke="#BAE6FD"
      strokeWidth="1.5"
    />
    {/* Badan bercahaya */}
    <ellipse cx="32" cy="38" rx="9" ry="12" fill="#FEF08A" stroke="#F59E0B" strokeWidth="2" />
    <ellipse cx="32" cy="42" rx="6.5" ry="7" fill="#FDE047" />
    {/* Kepala mungil */}
    <circle cx="32" cy="24" r="7" fill="#312E81" stroke="#FDE68A" strokeWidth="1.5" />
    {/* Antena */}
    <path d="M29 18C27 14 25 13 23 14" stroke="#FDE68A" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M35 18C37 14 39 13 41 14" stroke="#FDE68A" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="23" cy="14" r="1.8" fill="#FEF08A" />
    <circle cx="41" cy="14" r="1.8" fill="#FEF08A" />
    {/* Mata berbinar */}
    <circle cx="29.5" cy="24" r="1.5" fill="#FFFFFF" />
    <circle cx="34.5" cy="24" r="1.5" fill="#FFFFFF" />
    <path d="M30 27.5C31 28.5 33 28.5 34 27.5" stroke="#FDE68A" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const BonusFireflyValleyModal: React.FC<BonusFireflyValleyModalProps> = ({
  isOpen,
  hintsLeft,
  maxHints,
  shouldReduceMotion,
  keyBindings = DEFAULT_KEY_BINDINGS,
  showShortcutLabels = false,
  onCollectFirefly,
  onFinishBonus,
}) => {
  const [layoutIndex, setLayoutIndex] = useState<number>(0);
  const [playerPos, setPlayerPos] = useState<BonusPosition>({ row: 4, col: 0 });
  const [facing, setFacing] = useState<'LEFT' | 'RIGHT'>('RIGHT');
  const [collectedSet, setCollectedSet] = useState<Set<number>>(() => new Set());
  const [bonusTimeLeft, setBonusTimeLeft] = useState<number>(BONUS_DURATION_SECONDS);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>(
    'Gerakkan Pak Naedie untuk menangkap 3 Kunang-Kunang Cahaya!'
  );
  const [pickupBannerTick, setPickupBannerTick] = useState<number>(0);
  const prevBonusTimeRef = useRef<number>(BONUS_DURATION_SECONDS);

  const activeLayout = BONUS_VALLEY_LAYOUTS[layoutIndex] ?? BONUS_VALLEY_LAYOUTS[0];

  // Inisialisasi ulang arena bonus setiap kali layar bonus dibuka
  useEffect(() => {
    if (!isOpen) {
      narrator.stop();
      bgmEngine.setBonusResultState('playing');
      return;
    }
    bgmEngine.setBonusResultState('playing');
    const nextIdx = Math.floor(Math.random() * BONUS_VALLEY_LAYOUTS.length);
    const chosen = BONUS_VALLEY_LAYOUTS[nextIdx] ?? BONUS_VALLEY_LAYOUTS[0];
    setLayoutIndex(nextIdx);
    setPlayerPos(chosen.start);
    setFacing('RIGHT');
    setCollectedSet(new Set());
    prevBonusTimeRef.current = BONUS_DURATION_SECONDS;
    setBonusTimeLeft(BONUS_DURATION_SECONDS);
    setIsCompleted(false);
    setPickupBannerTick(0);
    setStatusMessage(
      `Tangkap ${BONUS_TARGET_FIREFLIES} Kunang-Kunang Cahaya dalam ${BONUS_DURATION_SECONDS} detik untuk mengisi lentera!`
    );
  }, [isOpen]);

  // Hitung mundur 30 detik khusus Level Bonus
  useEffect(() => {
    if (!isOpen || isCompleted) return;

    const interval = window.setInterval(() => {
      setBonusTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isOpen, isCompleted]);

  // Ketukan woodblock lembut di 5 detik terakhir Level Bonus
  useEffect(() => {
    if (!isOpen || isCompleted) {
      prevBonusTimeRef.current = bonusTimeLeft;
      return;
    }
    if (
      prevBonusTimeRef.current - bonusTimeLeft === 1 &&
      bonusTimeLeft >= 1 &&
      bonusTimeLeft <= 5
    ) {
      sfxEngine.playCountdownTick(bonusTimeLeft);
    }
    prevBonusTimeRef.current = bonusTimeLeft;
  }, [bonusTimeLeft, isCompleted, isOpen]);

  // Akhiri Level Bonus jika waktu 30 detik habis
  useEffect(() => {
    if (!isOpen || isCompleted) return;
    if (bonusTimeLeft <= 0) {
      sfxEngine.playTimeout();
      bgmEngine.setBonusResultState(collectedSet.size > 0 ? 'won' : 'timeout');
      setIsCompleted(true);
    }
  }, [bonusTimeLeft, collectedSet.size, isCompleted, isOpen]);

  // Putar narasi epilog /assets/voice/voice-bonus-selesai.mp3 tepat saat pop-up apresiasi Pak Naedie muncul
  useEffect(() => {
    if (isOpen && isCompleted) {
      narrator.playBonusCompleteVoice();
    }
  }, [isCompleted, isOpen]);

  const moveInBonus = useCallback(
    (dir: BonusDirection) => {
      if (!isOpen || isCompleted) return;

      const deltaMap: Record<BonusDirection, BonusPosition> = {
        UP: { row: -1, col: 0 },
        DOWN: { row: 1, col: 0 },
        LEFT: { row: 0, col: -1 },
        RIGHT: { row: 0, col: 1 },
      };

      const delta = deltaMap[dir];
      const nextRow = playerPos.row + delta.row;
      const nextCol = playerPos.col + delta.col;
      const rows = activeLayout.grid.length;
      const cols = activeLayout.grid[0].length;

      if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) {
        sfxEngine.playBump();
        setStatusMessage('Itu batas Lembah Senja, coba arah lain ya!');
        return;
      }

      if (activeLayout.grid[nextRow][nextCol] === 1) {
        sfxEngine.playBump();
        setStatusMessage('Ada semak senja yang lembut, yuk memutar lewat jalan terbuka!');
        return;
      }

      if (dir === 'LEFT' || dir === 'RIGHT') {
        setFacing(dir);
      }

      setPlayerPos({ row: nextRow, col: nextCol });

      const hitFireflyIndex = activeLayout.fireflies.findIndex(
        (pos, idx) =>
          !collectedSet.has(idx) && pos.row === nextRow && pos.col === nextCol
      );

      if (hitFireflyIndex !== -1) {
        const nextCollected = new Set(collectedSet);
        nextCollected.add(hitFireflyIndex);
        setCollectedSet(nextCollected);
        setPickupBannerTick((prev) => prev + 1);
        onCollectFirefly();
        sfxEngine.playCollectItem(nextCollected.size - 1);

        if (nextCollected.size >= BONUS_TARGET_FIREFLIES) {
          sfxEngine.playVictory(0.16);
          bgmEngine.setBonusResultState('won');
          setIsCompleted(true);
          setStatusMessage('Hore! Semua 3 Kunang-Kunang Cahaya berhasil ditangkap!');
        } else {
          const remaining = BONUS_TARGET_FIREFLIES - nextCollected.size;
          setStatusMessage(
            `Berhasil! +1 Kuota Bantu! Tinggal ${remaining} kunang-kunang lagi!`
          );
        }
      } else {
        sfxEngine.playStep();
      }
    },
    [
      activeLayout,
      collectedSet,
      isCompleted,
      isOpen,
      onCollectFirefly,
      playerPos,
    ]
  );

  // Dukungan keyboard & numpad OTG di dalam Level Bonus
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isCompleted) {
        if (
          matchesKeyAction(event, 'confirm', keyBindings) ||
          matchesKeyAction(event, 'back', keyBindings) ||
          event.key === ' '
        ) {
          event.preventDefault();
          narrator.stop();
          onFinishBonus();
        }
        return;
      }

      if (matchesKeyAction(event, 'moveUp', keyBindings) || event.key === 'w' || event.key === 'W') {
        event.preventDefault();
        moveInBonus('UP');
      } else if (matchesKeyAction(event, 'moveDown', keyBindings) || event.key === 's' || event.key === 'S') {
        event.preventDefault();
        moveInBonus('DOWN');
      } else if (matchesKeyAction(event, 'moveLeft', keyBindings) || event.key === 'a' || event.key === 'A') {
        event.preventDefault();
        moveInBonus('LEFT');
      } else if (matchesKeyAction(event, 'moveRight', keyBindings) || event.key === 'd' || event.key === 'D') {
        event.preventDefault();
        moveInBonus('RIGHT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCompleted, isOpen, keyBindings, moveInBonus, onFinishBonus]);

  const timePct = Math.max(
    0,
    Math.min(100, (bonusTimeLeft / BONUS_DURATION_SECONDS) * 100)
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-labelledby="bonus-valley-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[118] flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto bg-gradient-to-b from-[#1e1b4b] via-[#312e81] to-[#4c1d95]"
        >
          {/* Latar senja/malam lembut & hangat dengan cahaya bulan sabit dan bintang */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 overflow-hidden"
          >
            <div className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="absolute bottom-[-80px] right-[-40px] w-80 h-80 rounded-full bg-rose-400/20 blur-3xl" />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-64 rounded-full bg-yellow-300/10 blur-3xl" />
            {/* Bulan Sabit Hangat */}
            <svg
              viewBox="0 0 64 64"
              className="absolute top-5 right-6 w-12 h-12 sm:w-16 sm:h-16 opacity-80 drop-shadow-[0_0_16px_rgba(253,224,71,0.5)]"
            >
              <path
                d="M42 12C30 14 22 25 24 37C26 48 36 55 47 54C36 59 22 54 16 43C10 31 15 17 27 12C32 10 37 10 42 12Z"
                fill="#FDE68A"
              />
            </svg>
            {/* Bintang-bintang lembut */}
            {[
              { top: '12%', left: '14%', size: 'w-2 h-2', delay: 0 },
              { top: '22%', left: '82%', size: 'w-2.5 h-2.5', delay: 0.5 },
              { top: '76%', left: '10%', size: 'w-2 h-2', delay: 1.1 },
              { top: '82%', left: '88%', size: 'w-2 h-2', delay: 0.7 },
              { top: '16%', left: '48%', size: 'w-1.5 h-1.5', delay: 0.3 },
            ].map((star, idx) => (
              <motion.span
                key={idx}
                animate={
                  shouldReduceMotion
                    ? undefined
                    : { opacity: [0.35, 1, 0.35], scale: [0.9, 1.25, 0.9] }
                }
                transition={{
                  repeat: Infinity,
                  duration: 2.6 + idx * 0.4,
                  delay: star.delay,
                  ease: 'easeInOut',
                }}
                style={{ top: star.top, left: star.left }}
                className={`absolute rounded-full bg-amber-200 shadow-[0_0_8px_#fde047] ${star.size}`}
              />
            ))}
          </div>

          <div className="relative z-10 w-full max-w-md rounded-3xl bg-indigo-950/75 backdrop-blur-xl border-2 border-amber-300/35 shadow-[0_24px_64px_rgba(15,23,42,0.55)] p-3.5 sm:p-5 text-amber-50 flex flex-col items-center gap-3 my-auto">
            {/* Header Lembah Kunang-Kunang Ajaib */}
            <div className="w-full flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-[10px] font-extrabold uppercase tracking-wider text-amber-200">
                  ✨ Level Bonus
                </span>
                <h2
                  id="bonus-valley-title"
                  className="font-display text-lg sm:text-xl font-bold text-amber-100 leading-tight mt-0.5"
                >
                  Lembah Kunang-Kunang Ajaib
                </h2>
              </div>

              {/* Timer 30 detik & Kuota Bantu langsung terisi */}
              <div className="shrink-0 flex flex-col items-end gap-1">
                <div
                  className={`px-3 py-1 rounded-xl border font-extrabold text-xs sm:text-sm tabular-nums ${
                    bonusTimeLeft <= 8
                      ? 'bg-rose-500/30 border-rose-300 text-rose-100 animate-pulse'
                      : 'bg-indigo-900/80 border-amber-300/40 text-amber-200'
                  }`}
                >
                  ⏱ {bonusTimeLeft}d
                </div>
                <div className="px-2.5 py-0.5 rounded-full bg-yellow-400/20 border border-yellow-300/50 text-[11px] font-extrabold text-yellow-200 tabular-nums">
                  💡 Bantu: {hintsLeft}/{maxHints}
                </div>
              </div>
            </div>

            {/* Bilah progres waktu senja */}
            <div className="w-full h-2 rounded-full bg-indigo-900/90 overflow-hidden border border-indigo-700/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-400 transition-all duration-500"
                style={{ width: `${timePct}%` }}
              />
            </div>

            {/* Indikator Kunang-Kunang Terkumpul & Notifikasi +1 Hint */}
            <div className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-2xl bg-indigo-900/60 border border-indigo-700/50">
              <span className="text-xs font-bold text-indigo-100">
                Kunang-Kunang Terkumpul: {collectedSet.size}/{BONUS_TARGET_FIREFLIES}
              </span>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((idx) => {
                  const active = idx < collectedSet.size;
                  return (
                    <span
                      key={idx}
                      className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                        active
                          ? 'bg-yellow-300/30 border-yellow-300 shadow-[0_0_10px_rgba(253,224,71,0.65)] scale-105'
                          : 'bg-indigo-950/60 border-indigo-700/60 opacity-45'
                      }`}
                    >
                      <GlowingFireflyIcon className="w-4 h-4" />
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Pesan Panduan / Umpan Balik */}
            <div className="w-full text-center min-h-[20px]">
              <AnimatePresence mode="wait">
                <motion.p
                  key={`${pickupBannerTick}-${statusMessage}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="text-xs sm:text-sm font-bold text-amber-200 leading-snug"
                >
                  {statusMessage}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Arena Labirin Senja 5x5 Sederhana */}
            <div
              role="grid"
              aria-label="Labirin Lembah Kunang-Kunang Ajaib"
              className="w-full max-w-[290px] sm:max-w-[320px] aspect-square rounded-2xl p-2 bg-gradient-to-br from-indigo-950/90 via-purple-950/85 to-indigo-900/90 border-2 border-amber-300/40 shadow-[inset_0_2px_12px_rgba(0,0,0,0.45)] grid grid-cols-5 grid-rows-5 gap-1.5"
            >
              {activeLayout.grid.map((row, rIdx) =>
                row.map((cell, cIdx) => {
                  const isBush = cell === 1;
                  const isPlayerHere =
                    playerPos.row === rIdx && playerPos.col === cIdx;
                  const fireflyIdx = activeLayout.fireflies.findIndex(
                    (f) => f.row === rIdx && f.col === cIdx
                  );
                  const hasFirefly =
                    fireflyIdx !== -1 && !collectedSet.has(fireflyIdx);

                  return (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className={`relative rounded-xl flex items-center justify-center transition-colors ${
                        isBush
                          ? 'bg-indigo-800/80 border border-indigo-600/60 shadow-inner'
                          : hasFirefly
                          ? 'bg-amber-400/20 border border-amber-300/60 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                          : 'bg-indigo-900/45 border border-indigo-700/40'
                      }`}
                    >
                      {isBush && (
                        <svg
                          viewBox="0 0 32 32"
                          className="w-[74%] h-[74%] opacity-85"
                          aria-hidden="true"
                        >
                          <circle cx="11" cy="19" r="7" fill="#312E81" />
                          <circle cx="21" cy="19" r="7" fill="#3730A3" />
                          <circle cx="16" cy="14" r="8" fill="#4338CA" />
                          <circle cx="13" cy="13" r="1.5" fill="#FDE68A" fillOpacity="0.6" />
                          <circle cx="20" cy="17" r="1.3" fill="#FDE68A" fillOpacity="0.5" />
                        </svg>
                      )}

                      {!isBush && hasFirefly && !isPlayerHere && (
                        <motion.div
                          animate={
                            shouldReduceMotion
                              ? undefined
                              : { y: [0, -3, 0], scale: [1, 1.12, 1] }
                          }
                          transition={{
                            repeat: Infinity,
                            duration: 1.6,
                            ease: 'easeInOut',
                            delay: fireflyIdx * 0.25,
                          }}
                          className="w-[82%] h-[82%] drop-shadow-[0_0_10px_rgba(253,224,71,0.85)]"
                        >
                          <GlowingFireflyIcon />
                        </motion.div>
                      )}

                      {isPlayerHere && (
                        <motion.div
                          layout
                          transition={{
                            type: 'spring',
                            stiffness: 420,
                            damping: 26,
                          }}
                          className="w-[90%] h-[90%] z-10"
                          style={{
                            transform:
                              facing === 'LEFT' ? 'scaleX(-1)' : 'scaleX(1)',
                          }}
                        >
                          <ZookeeperNaedieAvatar
                            alt="Pak Naedie di Lembah Kunang-Kunang Ajaib"
                            className="w-full h-full drop-shadow-[0_2px_8px_rgba(253,224,71,0.55)] pointer-events-none select-none"
                          />
                        </motion.div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Kontrol D-Pad Level Bonus */}
            <div className="flex flex-col items-center gap-1.5 pt-0.5">
              <button
                type="button"
                data-sfx="custom"
                onClick={() => moveInBonus('UP')}
                disabled={isCompleted}
                aria-label="Gerak ke Atas"
                className="relative w-11 h-11 rounded-full bg-amber-400 hover:bg-amber-300 border-b-4 border-amber-600 text-indigo-950 shadow-md flex items-center justify-center active:border-b-0 transition-colors cursor-pointer disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
                  <path d="M12 19V5" />
                  <path d="m5 12 7-7 7 7" />
                </svg>
                {showShortcutLabels && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-1.5 -right-1.5 px-1 rounded bg-indigo-950/90 border border-amber-300/70 text-[8px] font-black text-amber-200 font-mono leading-tight"
                  >
                    {getActionBadgeLabel('moveUp', keyBindings)}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-sfx="custom"
                  onClick={() => moveInBonus('LEFT')}
                  disabled={isCompleted}
                  aria-label="Gerak ke Kiri"
                  className="relative w-11 h-11 rounded-full bg-amber-400 hover:bg-amber-300 border-b-4 border-amber-600 text-indigo-950 shadow-md flex items-center justify-center active:border-b-0 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
                    <path d="M19 12H5" />
                    <path d="m12 19-7-7 7-7" />
                  </svg>
                  {showShortcutLabels && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-1.5 -left-1.5 px-1 rounded bg-indigo-950/90 border border-amber-300/70 text-[8px] font-black text-amber-200 font-mono leading-tight"
                    >
                      {getActionBadgeLabel('moveLeft', keyBindings)}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  data-sfx="custom"
                  onClick={() => moveInBonus('DOWN')}
                  disabled={isCompleted}
                  aria-label="Gerak ke Bawah"
                  className="relative w-11 h-11 rounded-full bg-amber-400 hover:bg-amber-300 border-b-4 border-amber-600 text-indigo-950 shadow-md flex items-center justify-center active:border-b-0 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
                    <path d="M12 5v14" />
                    <path d="m19 12-7 7-7-7" />
                  </svg>
                  {showShortcutLabels && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-1.5 -right-1.5 px-1 rounded bg-indigo-950/90 border border-amber-300/70 text-[8px] font-black text-amber-200 font-mono leading-tight"
                    >
                      {getActionBadgeLabel('moveDown', keyBindings)}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  data-sfx="custom"
                  onClick={() => moveInBonus('RIGHT')}
                  disabled={isCompleted}
                  aria-label="Gerak ke Kanan"
                  className="relative w-11 h-11 rounded-full bg-amber-400 hover:bg-amber-300 border-b-4 border-amber-600 text-indigo-950 shadow-md flex items-center justify-center active:border-b-0 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                  {showShortcutLabels && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-1.5 -right-1.5 px-1 rounded bg-indigo-950/90 border border-amber-300/70 text-[8px] font-black text-amber-200 font-mono leading-tight"
                    >
                      {getActionBadgeLabel('moveRight', keyBindings)}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Pesan Penutup Singkat Pak Naedie saat ke-3 Kunang-Kunang Terkumpul atau Waktu 30 Detik Berakhir */}
          <AnimatePresence>
            {isCompleted && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-indigo-950/65 backdrop-blur-md"
              >
                <motion.div
                  initial={
                    shouldReduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, scale: 0.9, y: 14 }
                  }
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 24 }}
                  className="w-full max-w-sm rounded-3xl bg-white/95 border-2 border-amber-200 shadow-[0_24px_60px_rgba(15,23,42,0.45)] p-5 sm:p-6 text-center text-stone-800"
                >
                  <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 via-yellow-50 to-indigo-100 border-2 border-amber-300 shadow-md flex items-center justify-center p-1 mb-3">
                    <ZookeeperNaedieAvatar className="w-full h-full" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-[11px] font-extrabold text-amber-900 mb-2">
                    <span>Pak Naedie · Kuota Bantu: {hintsLeft}/{maxHints}</span>
                  </span>
                  <p className="font-display text-lg sm:text-xl font-bold text-emerald-950 leading-snug mb-4">
                    “Hebat! Lentera petunjuk sudah terisi. Ayo lanjutkan petualangan kita!”
                  </p>
                  <motion.button
                    type="button"
                    data-kb-default="true"
                    onClick={() => {
                      narrator.stop();
                      onFinishBonus();
                    }}
                    whileHover={
                      shouldReduceMotion ? undefined : { scale: 1.03, y: -1.5 }
                    }
                    whileTap={
                      shouldReduceMotion ? undefined : { scale: 0.97, y: 1.5 }
                    }
                    className="w-full min-h-[48px] px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-lg font-bold shadow-lg active:border-b-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 flex items-center justify-center gap-2"
                  >
                    <span>Lanjutkan Petualangan</span>
                    {showShortcutLabels && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-700/70 text-[10px] font-black font-mono">
                        {getActionBadgeLabel('confirm', keyBindings)}
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

export default BonusFireflyValleyModal;
