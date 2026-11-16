import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, RotateCcw, Lightbulb, Sparkles } from 'lucide-react';
import { KawaiiCharacterIcon } from './KawaiiCharacters';
import { CollectibleIcon, ObstacleIcon } from './MissionIcons';
import {
  DEFAULT_KEY_BINDINGS,
  getActionBadgeLabel,
  matchesKeyAction,
  type KeyBindingsMap,
} from '../utils/keyboardConfig';
import { sfxEngine } from '../utils/sfxEngine';

type TutorialDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type TutorialRecommendedAction = TutorialDirection | 'HINT' | 'DONE';
type TutorialStage = 'collect' | 'hint' | 'goal' | 'done';

type Position = {
  row: number;
  col: number;
};

type InteractiveTutorialModalProps = {
  isOpen: boolean;
  onComplete: () => void;
  shouldReduceMotion: boolean;
  keyBindings?: KeyBindingsMap;
  showShortcutLabels?: boolean;
};

// Peta Simulasi Latihan Menyeluruh 4x4:
// 0 = Jalan aman
// 1 = Semak rintangan
// 2 = Titik awal Rusa (3, 0)
// 3 = Rumah / Titik Akhir (0, 2) - terkunci sebelum 2 Apel terkumpul
const MINI_GRID_4X4 = [
  [1, 0, 3, 1],
  [1, 0, 0, 0],
  [1, 0, 1, 1],
  [2, 0, 0, 1],
] as const;

type TutorialCollectible = {
  id: string;
  row: number;
  col: number;
  label: string;
};

const TUTORIAL_COLLECTIBLES: readonly TutorialCollectible[] = [
  { id: 'apple-1', row: 3, col: 1, label: 'Apel Pertama' },
  { id: 'apple-2', row: 1, col: 3, label: 'Apel Kedua' },
];

const START_POS: Position = { row: 3, col: 0 };
const CONFUSION_FORK_POS: Position = { row: 1, col: 1 };
const GOAL_POS: Position = { row: 0, col: 2 };

function posKey(row: number, col: number): string {
  return `${row},${col}`;
}

function LittleHandPointer({
  shouldReduceMotion,
}: {
  shouldReduceMotion: boolean;
}) {
  return (
    <motion.div
      aria-hidden="true"
      animate={
        shouldReduceMotion
          ? undefined
          : {
              y: [0, -7, 0, -4, 0],
              scale: [1, 0.92, 1, 0.95, 1],
            }
      }
      transition={{
        repeat: Infinity,
        duration: 1.15,
        ease: 'easeInOut',
      }}
      className="pointer-events-none flex flex-col items-center drop-shadow-[0_6px_10px_rgba(15,23,42,0.28)]"
    >
      {!shouldReduceMotion && (
        <motion.span
          animate={{
            scale: [0.6, 1.4, 0.6],
            opacity: [0.85, 0, 0.85],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.15,
            ease: 'easeOut',
          }}
          className="w-6 h-6 -mb-2.5 rounded-full border-2 border-amber-300 bg-amber-200/40"
        />
      )}

      <svg
        width="38"
        height="42"
        viewBox="0 0 44 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="23" cy="34" rx="13" ry="11" fill="#FDE68A" opacity="0.35" />
        <path
          d="M17 20V8.5C17 6.01472 19.0147 4 21.5 4C23.9853 4 26 6.01472 26 8.5V19.5C26.75 18.6 27.9 18 29.2 18C31.3 18 33 19.7 33 21.8V22.5C33.8 21.9 34.8 21.5 35.8 21.5C38.1 21.5 40 23.4 40 25.7V31.5C40 38.4036 34.4036 44 27.5 44H21.5C15.9 44 11.4 40.3 9.7 35.1L7.3 28.4C6.5 26.2 7.7 23.8 9.9 23.1C11.9 22.5 14.1 23.5 15 25.4L17 29.2V20Z"
          fill="#FFEDD5"
          stroke="#9A3412"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19.5 8.5C19.5 7.4 20.4 6.5 21.5 6.5C22.6 6.5 23.5 7.4 23.5 8.5V10.5H19.5V8.5Z"
          fill="#FED7AA"
        />
        <ellipse cx="26" cy="33" rx="3.2" ry="1.8" fill="#FDA4AF" opacity="0.55" />
      </svg>
    </motion.div>
  );
}

/**
 * Ikon Rumah Hutan / Titik Akhir bergaya kawaii untuk simulasi tujuan akhir
 */
function TutorialHomeIcon({ className = 'w-full h-full' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      className={className}
      role="img"
      aria-label="Rumah tujuan akhir"
    >
      {/* Bayangan tanah rumput */}
      <ellipse cx="40" cy="69" rx="30" ry="6" fill="#16A34A" opacity="0.22" />
      {/* Cerobong asap mungil */}
      <rect
        x="52"
        y="16"
        width="9"
        height="16"
        rx="3"
        fill="#FB923C"
        stroke="#9A3412"
        strokeWidth="2.4"
      />
      {/* Badan rumah kayu hangat */}
      <rect
        x="16"
        y="34"
        width="48"
        height="34"
        rx="8"
        fill="#FEF3C7"
        stroke="#B45309"
        strokeWidth="2.6"
      />
      {/* Atap daun & kayu rimba */}
      <path
        d="M8 38L40 13L72 38"
        fill="#22C55E"
        stroke="#15803D"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 36L40 16L66 36"
        fill="#4ADE80"
      />
      {/* Pintu lengkung hangat */}
      <path
        d="M32 68V49C32 44.6 35.6 41 40 41C44.4 41 48 44.6 48 49V68H32Z"
        fill="#92400E"
        stroke="#78350F"
        strokeWidth="2.2"
      />
      <circle cx="44" cy="55" r="2" fill="#FDE047" />
      {/* Jendela bulat bercahaya */}
      <circle
        cx="24"
        cy="47"
        r="4.5"
        fill="#BAE6FD"
        stroke="#B45309"
        strokeWidth="2"
      />
      <circle
        cx="56"
        cy="47"
        r="4.5"
        fill="#BAE6FD"
        stroke="#B45309"
        strokeWidth="2"
      />
      {/* Bunga mini di halaman */}
      <circle cx="14" cy="66" r="2.6" fill="#FB7185" />
      <circle cx="66" cy="66" r="2.6" fill="#FDE047" />
    </svg>
  );
}

/**
 * Menentukan aksi panduan berikutnya berdasarkan posisi Rusa, status Apel, dan demo Tombol Bantu
 */
function getRecommendedAction(
  pos: Position,
  collectedIds: string[],
  hintDemonstrated: boolean,
  isCompleted: boolean
): TutorialRecommendedAction {
  if (isCompleted) return 'DONE';

  const hasApple1 = collectedIds.includes('apple-1');
  const hasApple2 = collectedIds.includes('apple-2');

  // Tahap 1: Kumpulkan Apel Pertama di (3, 1)
  if (!hasApple1) {
    if (pos.row === 3 && pos.col === 0) return 'RIGHT';
    if (pos.row === 3 && pos.col === 2) return 'LEFT';
    if (pos.row === 2 && pos.col === 1) return 'DOWN';
    return 'RIGHT';
  }

  // Tahap 2: Menuju persimpangan (1, 1) lalu demonstrasi klik Tombol Bantu
  if (!hasApple2) {
    if (pos.row === 3 && pos.col === 2) return 'LEFT';
    if (pos.row === 3 && pos.col === 1) return 'UP';
    if (pos.row === 2 && pos.col === 1) return 'UP';
    if (pos.row === 0 && pos.col === 1) return 'DOWN';
    if (pos.row === CONFUSION_FORK_POS.row && pos.col === CONFUSION_FORK_POS.col) {
      return hintDemonstrated ? 'RIGHT' : 'HINT';
    }
    if (pos.row === 1 && pos.col === 2) return 'RIGHT';
    return 'RIGHT';
  }

  // Tahap 3: Semua Apel terkumpul -> Berjalan menuju Rumah di (0, 2)
  if (pos.row === 1 && pos.col === 3) return 'LEFT';
  if (pos.row === 1 && pos.col === 1) return 'RIGHT';
  if (pos.row === 0 && pos.col === 1) return 'DOWN';
  if (pos.row === 2 && pos.col === 1) return 'UP';
  if (pos.row === 3 && pos.col === 1) return 'UP';
  if (pos.row === 1 && pos.col === 2) return 'UP';
  return 'UP';
}

export function InteractiveTutorialModal({
  isOpen,
  onComplete,
  shouldReduceMotion,
  keyBindings = DEFAULT_KEY_BINDINGS,
  showShortcutLabels = false,
}: InteractiveTutorialModalProps) {
  const [deerPos, setDeerPos] = useState<Position>(START_POS);
  const [deerFacing, setDeerFacing] = useState<'LEFT' | 'RIGHT'>('RIGHT');
  const [collectedIds, setCollectedIds] = useState<string[]>([]);
  const [hintDemonstrated, setHintDemonstrated] = useState<boolean>(false);
  const [hintTrailKeys, setHintTrailKeys] = useState<string[]>([]);
  const [simHintsLeft, setSimHintsLeft] = useState<number>(3);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isAutoDemoRunning, setIsAutoDemoRunning] = useState<boolean>(false);
  const [hintFeedback, setHintFeedback] = useState<string>(
    'Langkah 1: Kumpulkan 2 buah apel dulu! Ketuk panah KANAN.'
  );
  const [wiggleDeer, setWiggleDeer] = useState<boolean>(false);
  const [gateBlockedTick, setGateBlockedTick] = useState<number>(0);
  const [dpadPulse, setDpadPulse] = useState<{
    dir: TutorialDirection;
    tick: number;
  }>({ dir: 'RIGHT', tick: 0 });
  const [activeDpadDir, setActiveDpadDir] = useState<TutorialDirection | null>(
    null
  );
  const [tutorialMoveTick, setTutorialMoveTick] = useState<number>(0);

  const totalCollectibles = TUTORIAL_COLLECTIBLES.length;
  const collectedCount = collectedIds.length;
  const isGateUnlocked = collectedCount >= totalCollectibles;

  const isConfusedAtFork =
    !isCompleted &&
    !collectedIds.includes('apple-2') &&
    !hintDemonstrated &&
    ((deerPos.row === CONFUSION_FORK_POS.row &&
      deerPos.col === CONFUSION_FORK_POS.col) ||
      (deerPos.row === 0 && deerPos.col === 1));

  const activeStage: TutorialStage = useMemo(() => {
    if (isCompleted) return 'done';
    if (isGateUnlocked) return 'goal';
    if (isConfusedAtFork || hintDemonstrated) return 'hint';
    return 'collect';
  }, [hintDemonstrated, isCompleted, isConfusedAtFork, isGateUnlocked]);

  const recommendedAction = useMemo(
    () =>
      getRecommendedAction(deerPos, collectedIds, hintDemonstrated, isCompleted),
    [collectedIds, deerPos, hintDemonstrated, isCompleted]
  );

  const resetTutorialProgress = useCallback((startAutoDemo = false) => {
    setDeerPos(START_POS);
    setDeerFacing('RIGHT');
    setCollectedIds([]);
    setHintDemonstrated(false);
    setHintTrailKeys([]);
    setSimHintsLeft(3);
    setIsCompleted(false);
    setWiggleDeer(false);
    setGateBlockedTick(0);
    setActiveDpadDir(null);
    setTutorialMoveTick(0);
    setIsAutoDemoRunning(startAutoDemo);
    setHintFeedback(
      startAutoDemo
        ? 'Memutar simulasi: Langkah 1 — Mengumpulkan buah apel...'
        : 'Langkah 1: Kumpulkan 2 buah apel dulu! Ketuk panah KANAN.'
    );
  }, []);

  // Reset progress setiap kali modal dibuka
  useEffect(() => {
    if (isOpen) {
      resetTutorialProgress(false);
    } else {
      setIsAutoDemoRunning(false);
    }
  }, [isOpen, resetTutorialProgress]);

  const handleQuickClose = useCallback(() => {
    setIsAutoDemoRunning(false);
    sfxEngine.playModalClose();
    onComplete();
  }, [onComplete]);

  const triggerBumpFeedback = useCallback(
    (message: string, blockedAtGate = false) => {
      setHintFeedback(message);
      setWiggleDeer(true);
      if (blockedAtGate) {
        setGateBlockedTick((prev) => prev + 1);
      }
      window.setTimeout(() => setWiggleDeer(false), 320);
    },
    []
  );

  const handleUseDemoHint = useCallback(
    (fromAutoDemo = false) => {
      if (isCompleted) return;
      if (!fromAutoDemo) {
        setIsAutoDemoRunning(false);
      }

      sfxEngine.playHint();
      setHintDemonstrated(true);
      setSimHintsLeft((prev) => (prev > 1 ? prev - 1 : 2));

      if (!collectedIds.includes('apple-1')) {
        setHintTrailKeys([posKey(3, 1)]);
        setHintFeedback(
          'Bantuan aktif! Ikuti jalan kuning ke KANAN untuk mengambil Apel Pertama.'
        );
      } else if (!collectedIds.includes('apple-2')) {
        setHintTrailKeys([posKey(1, 2), posKey(1, 3)]);
        setHintFeedback(
          'Bantuan aktif! Ikuti jalan kuning ke KANAN untuk mengambil Apel Kedua.'
        );
      } else {
        setHintTrailKeys([posKey(1, 2), posKey(0, 2)]);
        setHintFeedback(
          'Bantuan aktif! Ikuti jalan kuning menuju Rumah tujuan!'
        );
      }
    },
    [collectedIds, isCompleted]
  );

  const handlePracticeDirection = useCallback(
    (dir: TutorialDirection, fromAutoDemo = false) => {
      if (isCompleted) return;
      if (!fromAutoDemo) {
        setIsAutoDemoRunning(false);
      }

      setDpadPulse((prev) => ({ dir, tick: prev.tick + 1 }));
      setActiveDpadDir(dir);
      window.setTimeout(() => {
        setActiveDpadDir((curr) => (curr === dir ? null : curr));
      }, 220);

      if (dir === 'LEFT') setDeerFacing('LEFT');
      if (dir === 'RIGHT') setDeerFacing('RIGHT');

      const deltaRow = dir === 'UP' ? -1 : dir === 'DOWN' ? 1 : 0;
      const deltaCol = dir === 'LEFT' ? -1 : dir === 'RIGHT' ? 1 : 0;
      const nextRow = deerPos.row + deltaRow;
      const nextCol = deerPos.col + deltaCol;

      if (nextRow < 0 || nextRow >= 4 || nextCol < 0 || nextCol >= 4) {
        sfxEngine.playBump();
        triggerBumpFeedback(
          'Mentok tepi taman! Ikuti panah yang ditunjuk tangan kecil ya.'
        );
        return;
      }

      const targetCell = MINI_GRID_4X4[nextRow][nextCol];

      if (targetCell === 1) {
        sfxEngine.playBump();
        triggerBumpFeedback(
          'Ada semak penghalang! Pilih jalan yang terbuka ya.'
        );
        return;
      }

      if (targetCell === 3) {
        if (!isGateUnlocked) {
          sfxEngine.playBump();
          triggerBumpFeedback(
            `Rumah masih TERKUNCI! Kumpulkan ${
              totalCollectibles - collectedCount
            } apel lagi dulu ya.`,
            true
          );
          return;
        }

        // Langkah terakhir: Rusa masuk ke Rumah / Titik Akhir!
        sfxEngine.playVictory();
        setDeerPos({ row: nextRow, col: nextCol });
        setTutorialMoveTick((prev) => prev + 1);
        setWiggleDeer(false);
        setHintTrailKeys([]);
        setIsCompleted(true);
        setIsAutoDemoRunning(false);
        setHintFeedback(
          'Hebat! Buah terkumpul, Bantuan digunakan, dan Rusa sampai di Rumah!'
        );
        return;
      }

      const nextPos: Position = { row: nextRow, col: nextCol };
      setDeerPos(nextPos);
      setTutorialMoveTick((prev) => prev + 1);
      setWiggleDeer(false);

      const foundCollectible = TUTORIAL_COLLECTIBLES.find(
        (item) =>
          item.row === nextRow &&
          item.col === nextCol &&
          !collectedIds.includes(item.id)
      );

      if (foundCollectible) {
        const updatedCollected = [...collectedIds, foundCollectible.id];
        setCollectedIds(updatedCollected);
        sfxEngine.playCollectItem(updatedCollected.length - 1);

        if (updatedCollected.length >= totalCollectibles) {
          sfxEngine.playGateUnlock(0.18);
          setHintTrailKeys([]);
          setHintFeedback(
            'Semua buah terkumpul & Rumah TERBUKA! Jalan ke KIRI lalu ke ATAS menuju Rumah!'
          );
        } else {
          setHintFeedback(
            'Pintar! Apel ke-1 didapat. Ayo ketuk panah ATAS ke persimpangan!'
          );
        }
        return;
      }

      sfxEngine.playStep();

      // Memasuki persimpangan bingung (1, 1) sebelum menggunakan Bantu
      if (
        nextRow === CONFUSION_FORK_POS.row &&
        nextCol === CONFUSION_FORK_POS.col &&
        !collectedIds.includes('apple-2') &&
        !hintDemonstrated
      ) {
        setHintFeedback(
          'Wah, ada persimpangan! Kalau bingung, ketuk tombol Bantu (Lampu) ya!'
        );
        return;
      }

      // Masuk jalan buntu (0, 1) atau (3, 2)
      if (nextRow === 0 && nextCol === 1) {
        setHintFeedback(
          'Oops, ini jalan buntu! Kembali ke BAWAH lalu ketuk tombol Bantu ya.'
        );
        return;
      }
      if (nextRow === 3 && nextCol === 2) {
        setHintFeedback(
          'Ini jalan buntu! Kembali ke KIRI lalu lanjut ke ATAS ya.'
        );
        return;
      }

      if (isGateUnlocked) {
        if (nextRow === 1 && nextCol === 2) {
          setHintFeedback(
            'Rumah sudah di depanmu! Ketuk panah ATAS untuk masuk ke Rumah!'
          );
        } else {
          setHintFeedback(
            'Rumah sudah terbuka! Ikuti jalan menuju titik akhir.'
          );
        }
      } else if (hintDemonstrated && !collectedIds.includes('apple-2')) {
        setHintFeedback(
          'Ikuti cahaya kuning ke KANAN untuk mengambil Apel Kedua!'
        );
      } else {
        setHintFeedback('Bagus! Terus ke ATAS menuju persimpangan.');
      }
    },
    [
      collectedCount,
      collectedIds,
      deerPos.col,
      deerPos.row,
      hintDemonstrated,
      isCompleted,
      isGateUnlocked,
      totalCollectibles,
      triggerBumpFeedback,
    ]
  );

  // Timer Auto-Demo menyeluruh (Buah -> Bingung & Tombol Bantu -> Jalan ke Rumah)
  useEffect(() => {
    if (!isOpen || !isAutoDemoRunning || isCompleted) return;

    const delayMs =
      recommendedAction === 'HINT'
        ? 1050
        : collectedIds.length >= totalCollectibles &&
          deerPos.row === 1 &&
          deerPos.col === 3
        ? 950
        : 760;

    const timerId = window.setTimeout(() => {
      if (recommendedAction === 'HINT') {
        handleUseDemoHint(true);
      } else if (recommendedAction !== 'DONE') {
        handlePracticeDirection(recommendedAction, true);
      }
    }, delayMs);

    return () => window.clearTimeout(timerId);
  }, [
    collectedIds.length,
    deerPos.col,
    deerPos.row,
    handlePracticeDirection,
    handleUseDemoHint,
    isAutoDemoRunning,
    isCompleted,
    isOpen,
    recommendedAction,
    totalCollectibles,
  ]);

  // Dukungan keyboard & numpad OTG
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (matchesKeyAction(event, 'back', keyBindings)) {
        event.preventDefault();
        handleQuickClose();
        return;
      }

      if (
        isCompleted &&
        (matchesKeyAction(event, 'confirm', keyBindings) || event.key === ' ')
      ) {
        event.preventDefault();
        handleQuickClose();
        return;
      }

      if (
        matchesKeyAction(event, 'hint', keyBindings) ||
        event.key === 'h' ||
        event.key === 'H'
      ) {
        event.preventDefault();
        handleUseDemoHint(false);
        return;
      }

      if (
        matchesKeyAction(event, 'moveRight', keyBindings) ||
        event.key === 'd' ||
        event.key === 'D'
      ) {
        event.preventDefault();
        handlePracticeDirection('RIGHT');
      } else if (
        matchesKeyAction(event, 'moveUp', keyBindings) ||
        event.key === 'w' ||
        event.key === 'W'
      ) {
        event.preventDefault();
        handlePracticeDirection('UP');
      } else if (
        matchesKeyAction(event, 'moveLeft', keyBindings) ||
        event.key === 'a' ||
        event.key === 'A'
      ) {
        event.preventDefault();
        handlePracticeDirection('LEFT');
      } else if (
        matchesKeyAction(event, 'moveDown', keyBindings) ||
        event.key === 's' ||
        event.key === 'S'
      ) {
        event.preventDefault();
        handlePracticeDirection('DOWN');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handlePracticeDirection,
    handleQuickClose,
    handleUseDemoHint,
    isCompleted,
    isOpen,
    keyBindings,
  ]);

  // Petak langkah berikutnya sebagai panduan visual lembut
  const nextHighlightCell = useMemo((): Position | null => {
    if (isCompleted || recommendedAction === 'HINT' || recommendedAction === 'DONE') {
      return null;
    }
    const dRow =
      recommendedAction === 'UP' ? -1 : recommendedAction === 'DOWN' ? 1 : 0;
    const dCol =
      recommendedAction === 'LEFT' ? -1 : recommendedAction === 'RIGHT' ? 1 : 0;
    return { row: deerPos.row + dRow, col: deerPos.col + dCol };
  }, [deerPos.col, deerPos.row, isCompleted, recommendedAction]);

  const stageSteps: { id: TutorialStage; num: string; label: string }[] = [
    { id: 'collect', num: '1', label: 'Kumpulkan Buah' },
    { id: 'hint', num: '2', label: 'Pakai Bantu' },
    { id: 'goal', num: '3', label: 'Menuju Rumah' },
  ];

  const getStageStepState = (stageId: TutorialStage) => {
    if (isCompleted) return 'completed';
    const order = { collect: 0, hint: 1, goal: 2, done: 3 };
    const currentIdx = order[activeStage];
    const stepIdx = order[stageId];
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'active';
    return 'upcoming';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={handleQuickClose}
          className="fixed inset-0 z-[110] flex items-center justify-center p-2.5 sm:p-4 bg-emerald-950/45 backdrop-blur-md"
        >
          <motion.div
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.93, y: 16 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.95, y: 10 }
            }
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl rounded-3xl bg-white/95 backdrop-blur-2xl border-2 border-white shadow-[0_24px_60px_rgba(15,23,42,0.32)] p-3.5 sm:p-5 text-stone-800 max-h-[94dvh] overflow-y-auto"
          >
            {/* Header Atas dengan Judul & Tombol Silang (X) Jalan Keluar Cepat */}
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="min-w-0 text-left">
                <p className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                  Simulasi Labirin Menyeluruh
                </p>
                <h2
                  id="tutorial-modal-title"
                  className="font-display text-lg sm:text-2xl font-bold text-emerald-950 leading-tight"
                >
                  {isCompleted
                    ? 'Kamu Siap Berpetualang!'
                    : isGateUnlocked
                    ? 'Rumah Terbuka! Ayo Pulang!'
                    : isConfusedAtFork
                    ? 'Bingung? Gunakan Tombol Bantu!'
                    : 'Panduan Bermain Labirin'}
                </h2>
              </div>

              <button
                type="button"
                data-sfx="custom"
                onClick={handleQuickClose}
                aria-label="Tutup Tutorial"
                title="Keluar Cepat"
                className="min-w-[44px] min-h-[44px] w-11 h-11 shrink-0 rounded-2xl bg-stone-100 hover:bg-rose-100 border border-stone-200 hover:border-rose-300 text-stone-700 hover:text-rose-700 flex items-center justify-center shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <X className="w-5 h-5 stroke-[2.6]" aria-hidden="true" />
              </button>
            </div>

            {/* Stepper 3 Tahap Simulasi: Kumpulkan Buah -> Pakai Bantu -> Menuju Rumah */}
            <div
              aria-label="Tahapan simulasi tutorial"
              className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3"
            >
              {stageSteps.map((step) => {
                const state = getStageStepState(step.id);
                return (
                  <div
                    key={step.id}
                    className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl border text-[11px] sm:text-xs font-extrabold transition-colors ${
                      state === 'completed'
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                        : state === 'active'
                        ? 'bg-amber-100 border-amber-400 text-amber-950 shadow-2xs'
                        : 'bg-stone-100/80 border-stone-200 text-stone-500'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                        state === 'completed'
                          ? 'bg-emerald-500 text-white'
                          : state === 'active'
                          ? 'bg-amber-500 text-white'
                          : 'bg-stone-300 text-stone-700'
                      }`}
                    >
                      {state === 'completed' ? '✓' : step.num}
                    </span>
                    <span className="truncate">{step.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Layout Utama 2 Kolom (Papan Simulasi Labirin di Kiri | Instruksi & Kontrol di Kanan) */}
            <div className="grid grid-cols-1 min-[600px]:grid-cols-[1.02fr_0.98fr] gap-3 sm:gap-4 items-center">
              {/* KOLOM KIRI: Status Misi + Grid Simulasi Labirin 4x4 */}
              <div className="flex flex-col items-center w-full">
                {/* Bar Status Koleksi Buah & Gembok Rumah Tujuan */}
                <div className="w-full max-w-[276px] flex items-center justify-between gap-2 px-2.5 py-1.5 mb-2 rounded-2xl bg-amber-50/90 border border-amber-200/90">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-extrabold text-amber-950">
                      Buah:
                    </span>
                    <div className="flex items-center gap-1">
                      {TUTORIAL_COLLECTIBLES.map((item) => {
                        const isTaken = collectedIds.includes(item.id);
                        return (
                          <motion.span
                            key={item.id}
                            animate={
                              isTaken && !shouldReduceMotion
                                ? { scale: [0.8, 1.2, 1] }
                                : { scale: 1 }
                            }
                            className={`w-6 h-6 rounded-lg p-0.5 flex items-center justify-center border transition-colors ${
                              isTaken
                                ? 'bg-emerald-100 border-emerald-400 shadow-2xs'
                                : 'bg-white/80 border-amber-300/80 opacity-65'
                            }`}
                            title={item.label}
                          >
                            <CollectibleIcon
                              kind="apple"
                              className="w-full h-full"
                            />
                          </motion.span>
                        );
                      })}
                    </div>
                    <span className="text-[11px] font-black text-emerald-800 tabular-nums">
                      {collectedCount}/{totalCollectibles}
                    </span>
                  </div>

                  <motion.div
                    key={isGateUnlocked ? 'home-open' : 'home-locked'}
                    initial={
                      shouldReduceMotion ? false : { scale: 0.9, opacity: 0.7 }
                    }
                    animate={{ scale: 1, opacity: 1 }}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${
                      isGateUnlocked
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                        : 'bg-stone-200/90 text-stone-700 border-stone-300'
                    }`}
                  >
                    <span>
                      {isGateUnlocked ? 'Rumah Terbuka' : 'Rumah Terkunci'}
                    </span>
                  </motion.div>
                </div>

                {/* Papan Simulasi Labirin 4x4 */}
                <div className="w-full max-w-[276px] rounded-2xl bg-[#FDF2DA] border-3 border-[#E8D2A6] p-2 shadow-inner">
                  <div className="relative grid grid-cols-4 grid-rows-4 gap-1.5 aspect-square">
                    {MINI_GRID_4X4.map((row, rowIndex) =>
                      row.map((cell, colIndex) => {
                        const isBush = cell === 1;
                        const isGoal = cell === 3;
                        const isDeerHere =
                          deerPos.row === rowIndex && deerPos.col === colIndex;
                        const collectibleHere = TUTORIAL_COLLECTIBLES.find(
                          (item) =>
                            item.row === rowIndex &&
                            item.col === colIndex &&
                            !collectedIds.includes(item.id)
                        );
                        const isHintTrail = hintTrailKeys.includes(
                          posKey(rowIndex, colIndex)
                        );
                        const isNextStepTarget =
                          nextHighlightCell?.row === rowIndex &&
                          nextHighlightCell?.col === colIndex;

                        return (
                          <motion.div
                            key={`${rowIndex}-${colIndex}`}
                            animate={
                              isGoal && gateBlockedTick > 0 && !isGateUnlocked
                                ? { x: [0, -5, 5, -4, 4, 0] }
                                : { x: 0 }
                            }
                            transition={{ duration: 0.32 }}
                            className={`relative rounded-xl flex items-center justify-center p-1 transition-all duration-200 ${
                              isBush
                                ? 'bg-[#DFF5E3] border-2 border-[#A7DFB5]'
                                : isGoal
                                ? isGateUnlocked
                                  ? 'bg-[#E6FAEE] border-2 border-emerald-400 ring-2 ring-emerald-300/80 shadow-[0_0_14px_rgba(16,185,129,0.35)]'
                                  : 'bg-stone-200/85 border-2 border-amber-500/80 border-dashed'
                                : isHintTrail
                                ? 'bg-yellow-200/95 border-2 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.55)]'
                                : isNextStepTarget
                                ? 'bg-amber-100/95 border-2 border-amber-400/90'
                                : 'bg-[#FFF6E5] border-2 border-[#EBD1A0]'
                            }`}
                          >
                            {/* Rintangan Semak */}
                            {isBush && (
                              <ObstacleIcon
                                kind="bush"
                                alt="Semak rintangan"
                                className="w-full h-full pointer-events-none select-none"
                              />
                            )}

                            {/* Rumah / Titik Akhir Tujuan */}
                            {isGoal && (
                              <div className="relative w-full h-full flex items-center justify-center">
                                <TutorialHomeIcon
                                  className={`w-full h-full pointer-events-none select-none transition-all duration-300 ${
                                    !isGateUnlocked
                                      ? 'opacity-45 grayscale-[35%]'
                                      : isCompleted
                                      ? 'opacity-65 scale-95'
                                      : 'opacity-100 scale-105'
                                  }`}
                                />

                                {!isGateUnlocked && (
                                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-stone-900/20 rounded-lg">
                                    <span className="w-6 h-6 rounded-full bg-amber-400 border-2 border-white shadow-md flex items-center justify-center text-amber-950">
                                      <svg
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="w-3.5 h-3.5"
                                        aria-hidden="true"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Item Koleksi Buah Apel */}
                            {collectibleHere && (
                              <motion.div
                                initial={
                                  shouldReduceMotion ? false : { scale: 0.85 }
                                }
                                animate={
                                  shouldReduceMotion
                                    ? undefined
                                    : {
                                        y: [0, -2.5, 0],
                                        scale: [1, 1.08, 1],
                                      }
                                }
                                transition={{
                                  repeat: Infinity,
                                  duration: 1.4,
                                  ease: 'easeInOut',
                                }}
                                className="w-[82%] h-[82%] pointer-events-none select-none z-10"
                              >
                                <CollectibleIcon
                                  kind="apple"
                                  className="w-full h-full drop-shadow-xs"
                                />
                              </motion.div>
                            )}

                            {/* Jejak Bantuan Kuning Menyala */}
                            {isHintTrail && !collectibleHere && !isGoal && (
                              <span
                                aria-hidden="true"
                                className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.85)] animate-pulse"
                              />
                            )}

                            {/* Indikator Petak Langkah Berikutnya */}
                            {!isHintTrail &&
                              isNextStepTarget &&
                              !collectibleHere &&
                              !isGoal && (
                                <span
                                  aria-hidden="true"
                                  className="w-2.5 h-2.5 rounded-full bg-amber-400/80 animate-ping"
                                />
                              )}

                            {/* Karakter Rusa + Balon '?' saat bingung di persimpangan */}
                            {isDeerHere && (
                              <motion.div
                                layoutId="tutorial-deer-avatar"
                                animate={{
                                  rotate: wiggleDeer ? [0, -8, 8, -6, 0] : 0,
                                  scale: isCompleted ? [1, 1.12, 1] : 1,
                                }}
                                transition={{
                                  layout: {
                                    type: 'spring',
                                    stiffness: 360,
                                    damping: 25,
                                  },
                                  rotate: { duration: 0.3 },
                                  scale:
                                    isCompleted && !shouldReduceMotion
                                      ? { repeat: Infinity, duration: 1.1 }
                                      : { duration: 0.2 },
                                }}
                                className="pointer-events-none absolute inset-0.5 flex items-center justify-center z-20"
                              >
                                {isConfusedAtFork && (
                                  <motion.span
                                    initial={
                                      shouldReduceMotion
                                        ? { opacity: 0 }
                                        : { opacity: 0, y: 4, scale: 0.7 }
                                    }
                                    animate={{ opacity: 1, y: -4, scale: 1 }}
                                    className="absolute -top-3.5 -right-1 z-30 w-5 h-5 rounded-full bg-amber-400 border-2 border-white text-amber-950 font-black text-xs flex items-center justify-center shadow-md"
                                  >
                                    ?
                                  </motion.span>
                                )}
                                <div
                                  className={`w-full h-full transition-transform duration-150 ${
                                    deerFacing === 'LEFT' ? '-scale-x-100' : ''
                                  }`}
                                >
                                  <KawaiiCharacterIcon
                                    character="deer"
                                    mood={
                                      isCompleted
                                        ? 'cheer'
                                        : wiggleDeer || isConfusedAtFork
                                        ? 'dizzy'
                                        : 'happy'
                                    }
                                    moveTick={tutorialMoveTick}
                                    reduceMotion={shouldReduceMotion}
                                    alt="Rusa kecil kawaii"
                                    className="w-full h-full drop-shadow-sm select-none"
                                  />
                                </div>
                              </motion.div>
                            )}
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* KOLOM KANAN: Pesan Panduan + D-Pad + Tombol Bantu + Putar Demo Otomatis */}
              <div className="flex flex-col justify-between gap-2.5 w-full">
                {/* Kartu Pesan Panduan Kontekstual */}
                <div
                  role="status"
                  aria-live="polite"
                  className={`rounded-2xl px-3.5 py-2.5 border text-left transition-colors ${
                    isCompleted
                      ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                      : isConfusedAtFork
                      ? 'bg-yellow-50 text-amber-950 border-amber-400 shadow-xs'
                      : isGateUnlocked
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : 'bg-amber-50 text-amber-950 border-amber-200'
                  }`}
                >
                  <p className="text-[11px] font-black uppercase tracking-wide opacity-75 mb-0.5">
                    {isCompleted
                      ? 'Simulasi Selesai'
                      : activeStage === 'hint'
                      ? 'Tips Saat Bingung'
                      : activeStage === 'goal'
                      ? 'Langkah Terakhir'
                      : 'Misi Pertama'}
                  </p>
                  <p className="text-xs sm:text-sm font-extrabold leading-snug">
                    {hintFeedback}
                  </p>
                </div>

                {/* Area Kontrol: D-Pad Latihan + Tombol Bantu (Hint) atau Tombol Selesai */}
                {!isCompleted ? (
                  <div className="rounded-2xl bg-stone-50/90 border border-stone-200/90 p-3 flex flex-col items-center gap-3">
                    <div className="w-full flex items-center justify-center gap-3 sm:gap-4 pt-1 pb-3">
                      {/* D-Pad Latihan */}
                      <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-white border-2 border-stone-200/90 shadow-inner">
                        {/* KIRI */}
                        <div className="relative">
                          <motion.button
                            type="button"
                            data-sfx="custom"
                            onClick={() => handlePracticeDirection('LEFT')}
                            aria-label="Gerak ke Kiri"
                            whileHover={
                              shouldReduceMotion ? undefined : { scale: 1.06 }
                            }
                            whileTap={
                              shouldReduceMotion ? undefined : { scale: 0.9 }
                            }
                            animate={
                              activeDpadDir === 'LEFT' && !shouldReduceMotion
                                ? { scale: [0.9, 1.12, 1] }
                                : {
                                    scale:
                                      recommendedAction === 'LEFT' ? 1.05 : 1,
                                  }
                            }
                            className={`relative w-11 h-11 rounded-full bg-amber-400 hover:bg-amber-500 border-b-4 border-amber-600 text-amber-950 shadow-sm flex items-center justify-center active:border-b-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 ${
                              recommendedAction === 'LEFT'
                                ? 'ring-4 ring-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.7)]'
                                : 'opacity-75'
                            }`}
                          >
                            {dpadPulse.dir === 'LEFT' &&
                              dpadPulse.tick > 0 &&
                              !shouldReduceMotion && (
                                <motion.span
                                  key={`tut-ring-left-${dpadPulse.tick}`}
                                  aria-hidden="true"
                                  initial={{ opacity: 0.78, scale: 0.76 }}
                                  animate={{ opacity: 0, scale: 1.35 }}
                                  transition={{ duration: 0.34, ease: 'easeOut' }}
                                  className="pointer-events-none absolute inset-0 rounded-full border-3 border-white/90"
                                />
                              )}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="w-5 h-5"
                              aria-hidden="true"
                            >
                              <path d="M19 12H5" />
                              <path d="m12 19-7-7 7-7" />
                            </svg>
                          </motion.button>

                          {recommendedAction === 'LEFT' && (
                            <motion.div
                              layoutId="tutorial-hand-pointer"
                              transition={{
                                type: 'spring',
                                stiffness: 320,
                                damping: 24,
                              }}
                              className="pointer-events-none absolute -left-2 -bottom-7 z-20"
                            >
                              <LittleHandPointer
                                shouldReduceMotion={shouldReduceMotion}
                              />
                            </motion.div>
                          )}
                        </div>

                        {/* ATAS & BAWAH */}
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="relative">
                            <motion.button
                              type="button"
                              data-sfx="custom"
                              onClick={() => handlePracticeDirection('UP')}
                              aria-label="Gerak ke Atas"
                              whileHover={
                                shouldReduceMotion ? undefined : { scale: 1.06 }
                              }
                              whileTap={
                                shouldReduceMotion ? undefined : { scale: 0.9 }
                              }
                              animate={
                                activeDpadDir === 'UP' && !shouldReduceMotion
                                  ? { scale: [0.9, 1.12, 1] }
                                  : {
                                      scale:
                                        recommendedAction === 'UP' ? 1.05 : 1,
                                    }
                              }
                              className={`relative w-12 h-9 rounded-full bg-sky-400 hover:bg-sky-500 border-b-4 border-sky-600 text-white shadow-sm flex items-center justify-center active:border-b-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 ${
                                recommendedAction === 'UP'
                                  ? 'ring-4 ring-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.7)]'
                                  : 'opacity-75'
                              }`}
                            >
                              {dpadPulse.dir === 'UP' &&
                                dpadPulse.tick > 0 &&
                                !shouldReduceMotion && (
                                  <motion.span
                                    key={`tut-ring-up-${dpadPulse.tick}`}
                                    aria-hidden="true"
                                    initial={{ opacity: 0.78, scale: 0.76 }}
                                    animate={{ opacity: 0, scale: 1.35 }}
                                    transition={{
                                      duration: 0.34,
                                      ease: 'easeOut',
                                    }}
                                    className="pointer-events-none absolute inset-0 rounded-full border-3 border-white/90"
                                  />
                                )}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-5 h-5"
                                aria-hidden="true"
                              >
                                <path d="M12 19V5" />
                                <path d="m5 12 7-7 7 7" />
                              </svg>
                            </motion.button>

                            {recommendedAction === 'UP' && (
                              <motion.div
                                layoutId="tutorial-hand-pointer"
                                transition={{
                                  type: 'spring',
                                  stiffness: 320,
                                  damping: 24,
                                }}
                                className="pointer-events-none absolute -right-4 -bottom-7 z-20"
                              >
                                <LittleHandPointer
                                  shouldReduceMotion={shouldReduceMotion}
                                />
                              </motion.div>
                            )}
                          </div>

                          <div className="relative">
                            <motion.button
                              type="button"
                              data-sfx="custom"
                              onClick={() => handlePracticeDirection('DOWN')}
                              aria-label="Gerak ke Bawah"
                              whileHover={
                                shouldReduceMotion ? undefined : { scale: 1.06 }
                              }
                              whileTap={
                                shouldReduceMotion ? undefined : { scale: 0.9 }
                              }
                              animate={
                                activeDpadDir === 'DOWN' && !shouldReduceMotion
                                  ? { scale: [0.9, 1.12, 1] }
                                  : {
                                      scale:
                                        recommendedAction === 'DOWN' ? 1.05 : 1,
                                    }
                              }
                              className={`relative w-12 h-9 rounded-full bg-rose-400 hover:bg-rose-500 border-b-4 border-rose-600 text-white shadow-sm flex items-center justify-center active:border-b-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 ${
                                recommendedAction === 'DOWN'
                                  ? 'ring-4 ring-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.7)]'
                                  : 'opacity-75'
                              }`}
                            >
                              {dpadPulse.dir === 'DOWN' &&
                                dpadPulse.tick > 0 &&
                                !shouldReduceMotion && (
                                  <motion.span
                                    key={`tut-ring-down-${dpadPulse.tick}`}
                                    aria-hidden="true"
                                    initial={{ opacity: 0.78, scale: 0.76 }}
                                    animate={{ opacity: 0, scale: 1.35 }}
                                    transition={{
                                      duration: 0.34,
                                      ease: 'easeOut',
                                    }}
                                    className="pointer-events-none absolute inset-0 rounded-full border-3 border-white/90"
                                  />
                                )}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-5 h-5"
                                aria-hidden="true"
                              >
                                <path d="M12 5v14" />
                                <path d="m19 12-7 7-7-7" />
                              </svg>
                            </motion.button>

                            {recommendedAction === 'DOWN' && (
                              <motion.div
                                layoutId="tutorial-hand-pointer"
                                transition={{
                                  type: 'spring',
                                  stiffness: 320,
                                  damping: 24,
                                }}
                                className="pointer-events-none absolute -right-4 -bottom-7 z-20"
                              >
                                <LittleHandPointer
                                  shouldReduceMotion={shouldReduceMotion}
                                />
                              </motion.div>
                            )}
                          </div>
                        </div>

                        {/* KANAN */}
                        <div className="relative">
                          <motion.button
                            type="button"
                            data-sfx="custom"
                            onClick={() => handlePracticeDirection('RIGHT')}
                            aria-label="Gerak ke Kanan"
                            whileHover={
                              shouldReduceMotion ? undefined : { scale: 1.06 }
                            }
                            whileTap={
                              shouldReduceMotion ? undefined : { scale: 0.9 }
                            }
                            animate={
                              activeDpadDir === 'RIGHT' && !shouldReduceMotion
                                ? { scale: [0.9, 1.12, 1] }
                                : {
                                    scale:
                                      recommendedAction === 'RIGHT' ? 1.05 : 1,
                                  }
                            }
                            className={`relative w-11 h-11 rounded-full bg-emerald-400 hover:bg-emerald-500 border-b-4 border-emerald-600 text-white shadow-sm flex items-center justify-center active:border-b-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                              recommendedAction === 'RIGHT'
                                ? 'ring-4 ring-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.7)]'
                                : 'opacity-75'
                            }`}
                          >
                            {dpadPulse.dir === 'RIGHT' &&
                              dpadPulse.tick > 0 &&
                              !shouldReduceMotion && (
                                <motion.span
                                  key={`tut-ring-right-${dpadPulse.tick}`}
                                  aria-hidden="true"
                                  initial={{ opacity: 0.78, scale: 0.76 }}
                                  animate={{ opacity: 0, scale: 1.35 }}
                                  transition={{ duration: 0.34, ease: 'easeOut' }}
                                  className="pointer-events-none absolute inset-0 rounded-full border-3 border-white/90"
                                />
                              )}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="w-5 h-5"
                              aria-hidden="true"
                            >
                              <path d="M5 12h14" />
                              <path d="m12 5 7 7-7 7" />
                            </svg>
                          </motion.button>

                          {recommendedAction === 'RIGHT' && (
                            <motion.div
                              layoutId="tutorial-hand-pointer"
                              transition={{
                                type: 'spring',
                                stiffness: 320,
                                damping: 24,
                              }}
                              className="pointer-events-none absolute -right-3 -bottom-7 z-20"
                            >
                              <LittleHandPointer
                                shouldReduceMotion={shouldReduceMotion}
                              />
                            </motion.div>
                          )}
                        </div>
                      </div>

                      {/* Tombol Simulasi Bantuan / Hint */}
                      <div className="relative shrink-0">
                        <motion.button
                          type="button"
                          data-sfx="custom"
                          onClick={() => handleUseDemoHint(false)}
                          aria-label={`Gunakan Bantuan petunjuk jalan, sisa ${simHintsLeft}`}
                          whileHover={
                            shouldReduceMotion
                              ? undefined
                              : { scale: 1.07, y: -2 }
                          }
                          whileTap={
                            shouldReduceMotion ? undefined : { scale: 0.93, y: 2 }
                          }
                          animate={
                            recommendedAction === 'HINT' && !shouldReduceMotion
                              ? { scale: [1, 1.08, 1] }
                              : { scale: 1 }
                          }
                          transition={
                            recommendedAction === 'HINT' && !shouldReduceMotion
                              ? { repeat: Infinity, duration: 1.2 }
                              : { duration: 0.2 }
                          }
                          className={`relative min-h-[58px] min-w-[70px] px-3 py-2 rounded-2xl border-b-4 font-extrabold shadow-md flex flex-col items-center justify-center gap-1 active:border-b-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                            recommendedAction === 'HINT'
                              ? 'bg-yellow-300 hover:bg-yellow-400 border-amber-500 text-amber-950 ring-4 ring-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.8)]'
                              : 'bg-yellow-200 hover:bg-yellow-300 border-amber-400 text-amber-950'
                          }`}
                        >
                          {showShortcutLabels && (
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute -top-1.5 -right-1 px-1 rounded bg-white border border-amber-600 text-[8px] font-black text-amber-950 font-mono leading-tight"
                            >
                              {getActionBadgeLabel('hint', keyBindings)}
                            </span>
                          )}
                          <Lightbulb className="w-5 h-5 shrink-0" aria-hidden="true" />
                          <span className="text-[11px] font-extrabold leading-none tabular-nums whitespace-nowrap">
                            Bantu ({simHintsLeft})
                          </span>
                        </motion.button>

                        {recommendedAction === 'HINT' && (
                          <motion.div
                            layoutId="tutorial-hand-pointer"
                            transition={{
                              type: 'spring',
                              stiffness: 320,
                              damping: 24,
                            }}
                            className="pointer-events-none absolute -right-2 -bottom-7 z-20"
                          >
                            <LittleHandPointer
                              shouldReduceMotion={shouldReduceMotion}
                            />
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Kontrol Demo Otomatis & Ulangi */}
                    <div className="w-full flex items-center justify-center gap-2 pt-1 border-t border-stone-200/80">
                      <button
                        type="button"
                        data-sfx="custom"
                        onClick={() => {
                          sfxEngine.playButtonPop();
                          if (isAutoDemoRunning) {
                            setIsAutoDemoRunning(false);
                          } else {
                            setIsAutoDemoRunning(true);
                          }
                        }}
                        className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                          isAutoDemoRunning
                            ? 'bg-sky-100 border-sky-400 text-sky-900'
                            : 'bg-white hover:bg-sky-50 border-sky-200 text-sky-800'
                        }`}
                      >
                        {isAutoDemoRunning ? (
                          <>
                            <Pause className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>Jeda Demo</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>Putar Demo Otomatis</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        data-sfx="custom"
                        onClick={() => {
                          sfxEngine.playButtonPop();
                          resetTutorialProgress(false);
                        }}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                      >
                        <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>Ulangi</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Layar Selesai Simulasi: Ringkasan + Tombol Saya Mengerti */
                  <div className="rounded-2xl bg-emerald-50/90 border border-emerald-200 p-3.5 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 text-emerald-900">
                      <Sparkles className="w-5 h-5 text-amber-500 shrink-0" aria-hidden="true" />
                      <p className="text-xs sm:text-sm font-extrabold">
                        Semua langkah selesai: Buah dikumpulkan, tombol Bantu diuji, dan Rusa tiba di Rumah!
                      </p>
                    </div>

                    <motion.button
                      type="button"
                      onClick={handleQuickClose}
                      initial={
                        shouldReduceMotion ? false : { scale: 0.94, opacity: 0 }
                      }
                      animate={
                        shouldReduceMotion
                          ? { opacity: 1 }
                          : { opacity: 1, scale: [1, 1.02, 1] }
                      }
                      whileHover={
                        shouldReduceMotion ? undefined : { scale: 1.03, y: -1.5 }
                      }
                      whileTap={
                        shouldReduceMotion ? undefined : { scale: 0.97, y: 1.5 }
                      }
                      transition={{
                        opacity: { duration: 0.2 },
                        scale: { repeat: Infinity, duration: 1.6 },
                      }}
                      className="w-full min-h-[50px] px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-lg font-bold shadow-lg active:border-b-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 flex items-center justify-center gap-2"
                    >
                      <span>Saya Mengerti</span>
                      {showShortcutLabels && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-700/70 text-[10px] font-black font-mono">
                          {getActionBadgeLabel('confirm', keyBindings)}
                        </span>
                      )}
                    </motion.button>

                    <button
                      type="button"
                      data-sfx="custom"
                      onClick={() => {
                        sfxEngine.playButtonPop();
                        resetTutorialProgress(false);
                      }}
                      className="w-full min-h-[40px] px-4 py-2 rounded-xl bg-white hover:bg-emerald-100/60 border border-emerald-200 text-emerald-800 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>Ulangi Simulasi</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
