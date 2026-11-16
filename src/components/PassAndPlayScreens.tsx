import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, X } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import {
  CompanionKawaiiAvatar,
  CompanionTeacherFullBody,
  KawaiiCharacterIcon,
  KindergartenChildAvatar,
  KindergartenChildrenGroupAvatar,
  KindergartenChildFullBody,
  ZookeeperNaedieAvatar,
  ZookeeperNaedieFullBody,
  type KawaiiCharacterKey,
} from './KawaiiCharacters';
import { KeyboardSettingsPanel } from './KeyboardSettingsPanel';
import {
  DEFAULT_KEY_BINDINGS,
  activateFocusedOrDefault,
  getActionBadgeLabel,
  isTextEntryTarget,
  matchesKeyAction,
  navigateContainerFocus,
  type KeyActionId,
  type KeyBindingsMap,
} from '../utils/keyboardConfig';
import { sfxEngine } from '../utils/sfxEngine';
import { narrator } from '../utils/narrator';

export type GameMode = 'solo' | 'group';

export type DisplayMode = 'portrait' | 'landscape';

/**
 * URL halaman Katalog Permainan (Launcher) saat pemain memilih "Ya, Keluar".
 * Biarkan kosong ("") sebelum portal Launcher dirilis agar aplikasi menampilkan info penutup.
 */
export const LAUNCHER_URL = '';

export type ScreenState =
  | 'SCREEN_COVER'
  | 'SELECT_MODE'
  | 'SETUP'
  | 'PROLOGUE'
  | 'TRANSITION'
  | 'PLAYING'
  | 'LEADERBOARD';

export type GroupTurnResult = {
  playerIndex: number;
  playerName: string;
  score: number;
  steps: number;
  optimalSteps: number;
  timeUsedSeconds: number;
  itemsCollected: number;
  totalItems: number;
  completed: boolean;
  stars: number;
  level: number;
  characterKey: KawaiiCharacterKey;
  characterName: string;
  outcomeReason: 'won' | 'timeout' | 'dizzy';
};

export type AppreciativeBadge = {
  title: string;
  icon: string;
  description: string;
  colorClass: string;
};

export function assignAppreciativeBadges(
  results: GroupTurnResult[]
): Record<number, AppreciativeBadge> {
  const badges: Record<number, AppreciativeBadge> = {};
  if (results.length === 0) return badges;

  let fastestIdx = -1;
  let bestTime = Infinity;

  let mostEfficientIdx = -1;
  let bestEfficiency = -1;

  let bestCollectorIdx = -1;
  let bestCollectorRatio = -1;

  results.forEach((r, idx) => {
    const timeScoreMetric = r.completed
      ? r.timeUsedSeconds
      : r.timeUsedSeconds + 30;
    if (timeScoreMetric < bestTime) {
      bestTime = timeScoreMetric;
      fastestIdx = idx;
    }
  });

  results.forEach((r, idx) => {
    if (idx === fastestIdx) return;
    const ratio = r.totalItems > 0 ? r.itemsCollected / r.totalItems : 1;
    if (
      ratio > bestCollectorRatio ||
      (ratio === bestCollectorRatio &&
        r.score > (results[bestCollectorIdx]?.score ?? -1))
    ) {
      bestCollectorRatio = ratio;
      bestCollectorIdx = idx;
    }
  });

  results.forEach((r, idx) => {
    if (idx === fastestIdx || idx === bestCollectorIdx) return;
    const eff = r.steps > 0 ? r.optimalSteps / r.steps : 1;
    if (eff > bestEfficiency) {
      bestEfficiency = eff;
      mostEfficientIdx = idx;
    }
  });

  const fallbackPool: AppreciativeBadge[] = [
    {
      title: 'Petualang Pemberani',
      icon: '🌟',
      description: 'Penuh semangat dan pantang menyerah menjelajahi hutan!',
      colorClass: 'bg-sky-100 border-sky-300 text-sky-900',
    },
    {
      title: 'Sahabat Satwa Ceria',
      icon: '💖',
      description: 'Sabar menunggu giliran dan menyayangi hewan hutan!',
      colorClass: 'bg-rose-100 border-rose-300 text-rose-900',
    },
  ];

  results.forEach((r, idx) => {
    if (idx === fastestIdx) {
      badges[r.playerIndex] = {
        title: 'Rusa Tercepat',
        icon: '⚡',
        description: 'Langkah super gesit dan cekatan membantu hewan di hutan!',
        colorClass: 'bg-amber-100 border-amber-300 text-amber-950',
      };
    } else if (idx === bestCollectorIdx) {
      badges[r.playerIndex] = {
        title: 'Pengumpul Hebat',
        icon: '🍎',
        description: 'Sangat teliti mengumpulkan bekal makanan favorit hewan!',
        colorClass: 'bg-emerald-100 border-emerald-300 text-emerald-950',
      };
    } else if (idx === mostEfficientIdx) {
      badges[r.playerIndex] = {
        title: 'Ahli Jejak Hutan',
        icon: '🧭',
        description: 'Cerdas memilih jalur langkah yang rapi dan terarah!',
        colorClass: 'bg-teal-100 border-teal-300 text-teal-950',
      };
    } else {
      badges[r.playerIndex] = fallbackPool[idx % fallbackPool.length];
    }
  });

  return badges;
}

const COVER_FALLING_LEAVES = [
  { id: 1, left: '8%', delay: 0, duration: 7.5, size: 15, color: '#4ADE80', sway: 18 },
  { id: 2, left: '21%', delay: 1.4, duration: 8.2, size: 13, color: '#F472B6', sway: -16 },
  { id: 3, left: '35%', delay: 2.8, duration: 6.9, size: 14, color: '#A3E635', sway: 20 },
  { id: 4, left: '49%', delay: 0.7, duration: 8.6, size: 12, color: '#FBBF24', sway: -18 },
  { id: 5, left: '64%', delay: 2.1, duration: 7.3, size: 15, color: '#22C55E', sway: 16 },
  { id: 6, left: '78%', delay: 3.3, duration: 8.0, size: 13, color: '#FB7185', sway: -20 },
  { id: 7, left: '90%', delay: 1.1, duration: 7.7, size: 14, color: '#86EFAC', sway: 15 },
] as const;

type CoverScreenProps = {
  isOpen: boolean;
  shouldReduceMotion: boolean;
  displayMode: DisplayMode;
  onChangeDisplayMode: (mode: DisplayMode) => void;
  isLicenseActive: boolean;
  licenseBadgeLabel?: string;
  licenseDetailText?: string;
  onToggleLicense: () => void;
  keyBindings?: KeyBindingsMap;
  showShortcutLabels?: boolean;
  soundEnabled?: boolean;
  bgmEnabled?: boolean;
  narratorEnabled?: boolean;
  ambientEnabled?: boolean;
  isOtherModalOpen?: boolean;
  onUpdateKeyBinding?: (action: KeyActionId, newCode: string) => void;
  onResetKeyBindings?: () => void;
  onToggleShowShortcutLabels?: () => void;
  onToggleSound?: () => void;
  onToggleBgm?: () => void;
  onToggleNarrator?: () => void;
  onToggleAmbient?: () => void;
  onStart: () => void;
  onOpenLeaderboard: () => void;
  onOpenHelp: () => void;
};

export const CoverScreen: React.FC<CoverScreenProps> = ({
  isOpen,
  shouldReduceMotion,
  displayMode,
  onChangeDisplayMode,
  isLicenseActive,
  licenseBadgeLabel,
  licenseDetailText,
  onToggleLicense,
  keyBindings = DEFAULT_KEY_BINDINGS,
  showShortcutLabels = false,
  soundEnabled = true,
  bgmEnabled = true,
  narratorEnabled = true,
  ambientEnabled = true,
  isOtherModalOpen = false,
  onUpdateKeyBinding,
  onResetKeyBindings,
  onToggleShowShortcutLabels,
  onToggleSound,
  onToggleBgm,
  onToggleNarrator,
  onToggleAmbient,
  onStart,
  onOpenLeaderboard,
  onOpenHelp,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'keyboard'>('general');
  const [isRecordingKey, setIsRecordingKey] = useState<boolean>(false);
  const [isAboutHelpOpen, setIsAboutHelpOpen] = useState<boolean>(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState<boolean>(false);
  const [isLauncherNoticeOpen, setIsLauncherNoticeOpen] = useState<boolean>(false);
  const [cheeredAnimal, setCheeredAnimal] = useState<string | null>(null);

  const prevCoverSettingsOpenRef = useRef<boolean>(false);
  const prevAboutHelpOpenRef = useRef<boolean>(false);
  const prevExitConfirmOpenRef = useRef<boolean>(false);
  const prevLauncherNoticeOpenRef = useRef<boolean>(false);

  useEffect(() => {
    if (isSettingsOpen !== prevCoverSettingsOpenRef.current) {
      if (isSettingsOpen) {
        sfxEngine.playModalOpen();
      } else {
        sfxEngine.playModalClose();
      }
      prevCoverSettingsOpenRef.current = isSettingsOpen;
    }
  }, [isSettingsOpen]);

  useEffect(() => {
    if (isAboutHelpOpen !== prevAboutHelpOpenRef.current) {
      if (isAboutHelpOpen) {
        sfxEngine.playModalOpen();
      } else {
        sfxEngine.playModalClose();
      }
      prevAboutHelpOpenRef.current = isAboutHelpOpen;
    }
  }, [isAboutHelpOpen]);

  useEffect(() => {
    if (isExitConfirmOpen !== prevExitConfirmOpenRef.current) {
      if (isExitConfirmOpen) {
        sfxEngine.playModalOpen();
      } else {
        sfxEngine.playModalClose();
      }
      prevExitConfirmOpenRef.current = isExitConfirmOpen;
    }
  }, [isExitConfirmOpen]);

  useEffect(() => {
    if (isLauncherNoticeOpen !== prevLauncherNoticeOpenRef.current) {
      if (isLauncherNoticeOpen) {
        sfxEngine.playModalOpen();
      } else {
        sfxEngine.playModalClose();
      }
      prevLauncherNoticeOpenRef.current = isLauncherNoticeOpen;
    }
  }, [isLauncherNoticeOpen]);

  const coverMainRef = useRef<HTMLElement | null>(null);
  const coverSettingsRef = useRef<HTMLDivElement | null>(null);
  const coverAboutRef = useRef<HTMLDivElement | null>(null);
  const coverExitConfirmRef = useRef<HTMLDivElement | null>(null);
  const coverLauncherNoticeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleCloseFromLicense = () => {
      setIsSettingsOpen(false);
    };
    window.addEventListener('close-license-popup', handleCloseFromLicense);
    return () => {
      window.removeEventListener('close-license-popup', handleCloseFromLicense);
    };
  }, []);

  useEffect(() => {
    if (!isSettingsOpen) {
      setSettingsTab('general');
      setIsRecordingKey(false);
    }
  }, [isSettingsOpen]);

  useEffect(() => {
    if (!isOpen || isOtherModalOpen || isRecordingKey) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeContainer = isLauncherNoticeOpen
        ? coverLauncherNoticeRef.current
        : isExitConfirmOpen
        ? coverExitConfirmRef.current
        : isSettingsOpen
        ? coverSettingsRef.current
        : isAboutHelpOpen
        ? coverAboutRef.current
        : coverMainRef.current;

      if (matchesKeyAction(event, 'back', keyBindings)) {
        if (isLauncherNoticeOpen) {
          event.preventDefault();
          setIsLauncherNoticeOpen(false);
        } else if (isExitConfirmOpen) {
          event.preventDefault();
          setIsExitConfirmOpen(false);
        } else if (isSettingsOpen) {
          event.preventDefault();
          setIsSettingsOpen(false);
        } else if (isAboutHelpOpen) {
          event.preventDefault();
          setIsAboutHelpOpen(false);
        }
        return;
      }

      if (matchesKeyAction(event, 'moveUp', keyBindings)) {
        event.preventDefault();
        navigateContainerFocus(activeContainer, 'UP');
        return;
      }
      if (matchesKeyAction(event, 'moveDown', keyBindings)) {
        event.preventDefault();
        navigateContainerFocus(activeContainer, 'DOWN');
        return;
      }
      if (matchesKeyAction(event, 'moveLeft', keyBindings)) {
        event.preventDefault();
        navigateContainerFocus(activeContainer, 'LEFT');
        return;
      }
      if (matchesKeyAction(event, 'moveRight', keyBindings)) {
        event.preventDefault();
        navigateContainerFocus(activeContainer, 'RIGHT');
        return;
      }
      if (matchesKeyAction(event, 'confirm', keyBindings)) {
        event.preventDefault();
        activateFocusedOrDefault(activeContainer);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isAboutHelpOpen,
    isExitConfirmOpen,
    isLauncherNoticeOpen,
    isOpen,
    isOtherModalOpen,
    isRecordingKey,
    isSettingsOpen,
    keyBindings,
  ]);

  const handleCharacterTap = (key: string) => {
    setCheeredAnimal(key);
    window.setTimeout(() => {
      setCheeredAnimal((prev) => (prev === key ? null : prev));
    }, 650);
  };

  const isLandscape = displayMode === 'landscape';

  const coverStageSvg = (
    <svg
      viewBox="0 -4 420 318"
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full max-h-full object-contain drop-shadow-[0_6px_12px_rgba(6,78,59,0.16)]"
      role="img"
      aria-label="Ilustrasi Papan Nama Hexago Park Taman Ajaib, Penjaga Kebun, Ibu Guru PAUD berhijab, Rusa Kecil, Kelinci Putih, Gajah Kecil, Kucing, dan Landak di depan labirin hutan"
    >
      {/* Semak Labirin Rimbun Berlapis di Belakang Karakter */}
      <g>
        <path
          d="M15 118 Q105 88 210 108 Q315 88 405 118 L405 190 L15 190 Z"
          fill="#15803D"
          stroke="#052E16"
          strokeWidth="2.2"
        />
        <path
          d="M25 140 C65 116, 135 118, 175 138 L155 156 C115 144, 75 146, 35 164 Z"
          fill="#4ADE80"
          stroke="#14532D"
          strokeWidth="2"
        />
        <path
          d="M395 140 C355 116, 285 118, 245 138 L265 156 C305 144, 345 146, 385 164 Z"
          fill="#4ADE80"
          stroke="#14532D"
          strokeWidth="2"
        />
        <path
          d="M60 175 C105 158, 150 162, 182 182 L152 204 C118 192, 85 194, 42 206 Z"
          fill="#22C55E"
          stroke="#14532D"
          strokeWidth="2.2"
        />
        <path
          d="M360 175 C315 158, 270 162, 238 182 L268 204 C302 192, 335 194, 378 206 Z"
          fill="#22C55E"
          stroke="#14532D"
          strokeWidth="2.2"
        />
        <path
          d="M192 126 C186 165, 172 220, 154 295 L266 295 C248 220, 234 165, 228 126 Z"
          fill="#BEF264"
        />
      </g>

      {/* PAPAN NAMA TAMAN KAYU RUSTIC: "Hexago Park" & "Taman Ajaib" di Gerbang Masuk Labirin */}
      <g transform="translate(210, 30)">
        <defs>
          <linearGradient id="signPostGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5C2D0C" />
            <stop offset="45%" stopColor="#854D0E" />
            <stop offset="100%" stopColor="#451A03" />
          </linearGradient>
          <linearGradient id="signOuterWoodGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B45309" />
            <stop offset="48%" stopColor="#92400E" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>
          <linearGradient id="signInnerPlankGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="52%" stopColor="#FDE68A" />
            <stop offset="100%" stopColor="#FCD34D" />
          </linearGradient>
        </defs>

        {/* Tiang Penyangga Kayu Kiri & Kanan dengan Serat Kayu */}
        <g>
          <rect
            x="-50"
            y="14"
            width="12"
            height="70"
            rx="3"
            fill="url(#signPostGrad)"
            stroke="#3E2723"
            strokeWidth="2"
          />
          <path
            d="M-44 20 V78 M-41 26 V72"
            stroke="#451A03"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.55"
          />
          <rect
            x="38"
            y="14"
            width="12"
            height="70"
            rx="3"
            fill="url(#signPostGrad)"
            stroke="#3E2723"
            strokeWidth="2"
          />
          <path
            d="M44 20 V78 M41 26 V72"
            stroke="#451A03"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.55"
          />
        </g>

        {/* Ikatan Tali Tambang Taman pada Tiang */}
        <rect
          x="-52"
          y="24"
          width="16"
          height="5"
          rx="2.5"
          fill="#FDE047"
          stroke="#78350F"
          strokeWidth="1.4"
        />
        <rect
          x="36"
          y="24"
          width="16"
          height="5"
          rx="2.5"
          fill="#FDE047"
          stroke="#78350F"
          strokeWidth="1.4"
        />

        {/* Bayangan Lembut di Belakang Papan */}
        <path
          d="M-74 -20 H74 C80 -20 84 -16 84 -10 V18 C84 24 80 28 74 28 H-74 C-80 28 -84 24 -84 18 V-10 C-84 -16 -80 -20 -74 -20 Z"
          fill="#052E16"
          opacity="0.28"
          transform="translate(0, 3)"
        />

        {/* Bingkai Kayu Luar Berukir Rustic (Notched Timber Border) */}
        <path
          d="M-74 -24 L-22 -24 L-18 -21 L-14 -24 H74 C80 -24 84 -19 84 -13 V17 C84 23 80 28 74 28 L28 28 L24 25 L20 28 H-74 C-80 28 -84 23 -84 17 V-13 C-84 -19 -80 -24 -74 -24 Z"
          fill="url(#signOuterWoodGrad)"
          stroke="#3E2723"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Garis Serat & Sambungan Papan pada Bingkai Luar */}
        <path
          d="M-80 -2 H80 M-76 -21 H70"
          stroke="#D97706"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.45"
        />

        {/* Bidang Dalam Papan Kayu Pahatan Cerah */}
        <rect
          x="-75"
          y="-18"
          width="150"
          height="40"
          rx="9"
          fill="url(#signInnerPlankGrad)"
          stroke="#78350F"
          strokeWidth="2"
        />

        {/* Tekstur Serat Kayu Halus & Sambungan Papan Horizontal di Dalam */}
        <path
          d="M-73 3 H73"
          stroke="#D97706"
          strokeWidth="1.1"
          opacity="0.4"
        />
        <path
          d="M-66 -12 Q-35 -15 -5 -12 M20 -13 Q48 -15 66 -11 M-64 16 Q-25 19 15 16 M35 15 Q55 18 67 15"
          stroke="#B45309"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity="0.32"
        />
        {/* Mata Kayu Kecil (Wood Knot) */}
        <ellipse
          cx="-58"
          cy="2"
          rx="3.5"
          ry="1.8"
          fill="none"
          stroke="#B45309"
          strokeWidth="1"
          opacity="0.38"
        />

        {/* Paku Besi Tempa Taman di Keempat Sudut Papan */}
        {[
          { cx: -67, cy: -11 },
          { cx: 67, cy: -11 },
          { cx: -67, cy: 15 },
          { cx: 67, cy: 15 },
        ].map((rivet, idx) => (
          <g key={idx}>
            <circle
              cx={rivet.cx}
              cy={rivet.cy}
              r="2.6"
              fill="#57534E"
              stroke="#292524"
              strokeWidth="1"
            />
            <circle
              cx={rivet.cx - 0.6}
              cy={rivet.cy - 0.6}
              r="0.8"
              fill="#E7E5E4"
            />
          </g>
        ))}

        {/* Sulur Daun & Bunga Taman Merambat di Sudut Atas Papan */}
        <g>
          <ellipse
            cx="-73"
            cy="-22"
            rx="8"
            ry="4.2"
            transform="rotate(-28 -73 -22)"
            fill="#22C55E"
            stroke="#14532D"
            strokeWidth="1.5"
          />
          <ellipse
            cx="-61"
            cy="-24"
            rx="6.5"
            ry="3.5"
            transform="rotate(14 -61 -24)"
            fill="#4ADE80"
            stroke="#14532D"
            strokeWidth="1.4"
          />
          <circle
            cx="-67"
            cy="-23"
            r="3.2"
            fill="#F472B6"
            stroke="#831843"
            strokeWidth="1.2"
          />
          <circle cx="-67" cy="-23" r="1.2" fill="#FDE047" />

          <ellipse
            cx="73"
            cy="-22"
            rx="8"
            ry="4.2"
            transform="rotate(28 73 -22)"
            fill="#22C55E"
            stroke="#14532D"
            strokeWidth="1.5"
          />
          <ellipse
            cx="61"
            cy="-24"
            rx="6.5"
            ry="3.5"
            transform="rotate(-14 61 -24)"
            fill="#4ADE80"
            stroke="#14532D"
            strokeWidth="1.4"
          />
          <circle
            cx="67"
            cy="-23"
            r="3.2"
            fill="#F472B6"
            stroke="#831843"
            strokeWidth="1.2"
          />
          <circle cx="67" cy="-23" r="1.2" fill="#FDE047" />
        </g>

        {/* Teks Utama Papan: "Hexago Park" */}
        <text
          x="0"
          y="-1"
          textAnchor="middle"
          fill="#14532D"
          stroke="#FFFFFF"
          strokeWidth="2.8"
          paintOrder="stroke"
          fontFamily="inherit"
          fontSize="16.5"
          fontWeight="900"
          letterSpacing="0.5"
        >
          Hexago Park
        </text>

        {/* Pita Kayu Kecil & Teks Sub-judul: "Taman Ajaib" */}
        <rect
          x="-44"
          y="6"
          width="88"
          height="13"
          rx="6.5"
          fill="#FEF9C3"
          opacity="0.75"
        />
        <text
          x="0"
          y="15.5"
          textAnchor="middle"
          fill="#7E22CE"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          paintOrder="stroke"
          fontFamily="inherit"
          fontSize="10.5"
          fontWeight="800"
          letterSpacing="0.7"
        >
          Taman Ajaib
        </text>
      </g>

      {/* Burung Kecil & Kupu-Kupu Terbang Hidup (Animated motion.g) */}
      {/* Burung Biru Kiri */}
      <motion.g
        animate={
          shouldReduceMotion
            ? undefined
            : {
                x: [0, 8, 0, -5, 0],
                y: [0, -5, -2, -6, 0],
              }
        }
        transition={{ repeat: Infinity, duration: 4.2, ease: 'easeInOut' }}
      >
        <g transform="translate(112, 26) scale(0.85)">
          <path
            d="M0 0 Q-10 -10 -18 -4 Q-10 4 0 6 Z"
            fill="#38BDF8"
            stroke="#0369A1"
            strokeWidth="1.8"
          />
          <ellipse
            cx="4"
            cy="5"
            rx="9"
            ry="6"
            fill="#0284C7"
            stroke="#0C4A6E"
            strokeWidth="1.8"
          />
          <circle cx="8" cy="3" r="1.5" fill="#FFFFFF" />
          <polygon points="13,4 18,6 13,8" fill="#F59E0B" />
        </g>
      </motion.g>

      {/* Burung Biru Kanan */}
      <motion.g
        animate={
          shouldReduceMotion
            ? undefined
            : {
                x: [0, -9, 0, 6, 0],
                y: [0, -6, -1, -5, 0],
              }
        }
        transition={{ repeat: Infinity, duration: 4.6, ease: 'easeInOut' }}
      >
        <g transform="translate(308, 24) scale(0.9)">
          <path
            d="M0 0 Q10 -12 18 -5 Q10 4 0 6 Z"
            fill="#38BDF8"
            stroke="#0369A1"
            strokeWidth="1.8"
          />
          <ellipse
            cx="-4"
            cy="5"
            rx="9"
            ry="6"
            fill="#0284C7"
            stroke="#0C4A6E"
            strokeWidth="1.8"
          />
          <polygon points="-13,4 -18,6 -13,8" fill="#F59E0B" />
        </g>
      </motion.g>

      {/* Kupu-Kupu Oranye Kiri Terbang Mengepak */}
      <motion.g
        animate={
          shouldReduceMotion
            ? undefined
            : {
                x: [0, 14, 4, -8, 0],
                y: [0, -8, 4, -5, 0],
                rotate: [-4, 6, -3, 5, -4],
              }
        }
        transition={{ repeat: Infinity, duration: 3.6, ease: 'easeInOut' }}
      >
        <g transform="translate(88, 42) rotate(-18) scale(0.9)">
          <ellipse
            cx="-6"
            cy="-4"
            rx="7"
            ry="9"
            fill="#FB923C"
            stroke="#7C2D12"
            strokeWidth="1.6"
          />
          <ellipse
            cx="6"
            cy="-4"
            rx="7"
            ry="9"
            fill="#FDBA74"
            stroke="#7C2D12"
            strokeWidth="1.6"
          />
          <rect x="-1.5" y="-10" width="3" height="14" rx="1.5" fill="#431407" />
        </g>
      </motion.g>

      {/* Kupu-Kupu Biru Kanan Terbang Mengepak */}
      <motion.g
        animate={
          shouldReduceMotion
            ? undefined
            : {
                x: [0, -14, -4, 9, 0],
                y: [0, -9, 3, -6, 0],
                rotate: [4, -6, 3, -5, 4],
              }
        }
        transition={{ repeat: Infinity, duration: 3.9, ease: 'easeInOut' }}
      >
        <g transform="translate(334, 38) rotate(20) scale(0.95)">
          <ellipse
            cx="-7"
            cy="-4"
            rx="8"
            ry="10"
            fill="#38BDF8"
            stroke="#1E3A8A"
            strokeWidth="1.6"
          />
          <ellipse
            cx="7"
            cy="-4"
            rx="8"
            ry="10"
            fill="#60A5FA"
            stroke="#1E3A8A"
            strokeWidth="1.6"
          />
          <rect x="-1.5" y="-11" width="3" height="15" rx="1.5" fill="#1E1B4B" />
        </g>
      </motion.g>

      {/* KARAKTER 1: Penjaga Kebun di Sisi Kiri-Tengah (Animasi Gerakan Lembut & Interaktif) */}
      <motion.g
        onClick={() => handleCharacterTap('zookeeper')}
        className="cursor-pointer"
        animate={
          shouldReduceMotion
            ? undefined
            : cheeredAnimal === 'zookeeper'
            ? { y: [0, -10, 0], scale: [1, 1.05, 1] }
            : { y: [0, -3.5, 0] }
        }
        transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
      >
        <svg x="64" y="56" width="124" height="192" viewBox="0 0 120 170">
          <ZookeeperNaedieFullBody className="w-full h-full" />
        </svg>
      </motion.g>

      {/* KARAKTER 2: Ibu Guru PAUD/RA di Sisi Kanan-Tengah (Animasi Melambai Lembut & Interaktif) */}
      <motion.g
        onClick={() => handleCharacterTap('teacher')}
        className="cursor-pointer"
        animate={
          shouldReduceMotion
            ? undefined
            : cheeredAnimal === 'teacher'
            ? { y: [0, -10, 0], scale: [1, 1.05, 1] }
            : { y: [0, -4, 0] }
        }
        transition={{
          repeat: Infinity,
          duration: 2.6,
          delay: 0.4,
          ease: 'easeInOut',
        }}
      >
        <svg x="232" y="58" width="122" height="190" viewBox="0 0 120 170">
          <CompanionTeacherFullBody className="w-full h-full" />
        </svg>
      </motion.g>

      {/* KARAKTER 3: Anak Petualang Full-Body Tepat di Tengah di Antara Zoo Keeper & Ibu Guru */}
      <motion.g
        onClick={() => handleCharacterTap('child')}
        className="cursor-pointer"
        animate={
          shouldReduceMotion
            ? undefined
            : cheeredAnimal === 'child'
            ? { y: [0, -12, 0], scale: [1, 1.06, 1] }
            : { y: [0, -4.5, 0] }
        }
        transition={{
          repeat: Infinity,
          duration: 2.3,
          delay: 0.2,
          ease: 'easeInOut',
        }}
      >
        <svg x="156" y="96" width="108" height="162" viewBox="0 0 120 170">
          <KindergartenChildFullBody className="w-full h-full" />
        </svg>
      </motion.g>

      {/* KARAKTER HEWAN 1: Rusa Kecil Kawaii di Sisi Kiri Depan */}
      <motion.g
        onClick={() => handleCharacterTap('deer')}
        className="cursor-pointer"
        animate={
          shouldReduceMotion
            ? undefined
            : cheeredAnimal === 'deer'
            ? { y: [0, -12, 0] }
            : { y: [0, -4.5, 0] }
        }
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
      >
        <svg x="22" y="166" width="104" height="104" viewBox="0 0 100 100">
          <KawaiiCharacterIcon
            character="deer"
            mood="happy"
            className="w-full h-full"
          />
        </svg>
      </motion.g>

      {/* KARAKTER HEWAN 2: Kelinci Putih Ceria Digeser ke Dekat Rusa untuk Harmoni Visual Erat */}
      <motion.g
        onClick={() => handleCharacterTap('rabbit')}
        className="cursor-pointer"
        animate={
          shouldReduceMotion
            ? undefined
            : cheeredAnimal === 'rabbit'
            ? { y: [0, -14, 0] }
            : { y: [0, -6.5, 0] }
        }
        transition={{
          repeat: Infinity,
          duration: 1.85,
          delay: 0.2,
          ease: 'easeInOut',
        }}
      >
        <svg x="104" y="190" width="78" height="78" viewBox="0 0 100 100">
          <KawaiiCharacterIcon
            character="rabbit"
            mood="cheer"
            className="w-full h-full"
          />
        </svg>
      </motion.g>

      {/* KARAKTER HEWAN 3: Gajah Kecil Berbelalai Aktif */}
      <motion.g
        onClick={() => handleCharacterTap('elephant')}
        className="cursor-pointer"
        animate={
          shouldReduceMotion
            ? undefined
            : cheeredAnimal === 'elephant'
            ? { y: [0, -11, 0] }
            : { y: [0, -4, 0] }
        }
        transition={{
          repeat: Infinity,
          duration: 2.5,
          delay: 0.5,
          ease: 'easeInOut',
        }}
      >
        <svg x="268" y="158" width="112" height="112" viewBox="0 0 100 100">
          <KawaiiCharacterIcon
            character="elephant"
            mood="happy"
            className="w-full h-full"
          />
        </svg>
      </motion.g>

      {/* KARAKTER HEWAN 4: Kucing Domestik Menggemaskan */}
      <motion.g
        onClick={() => handleCharacterTap('cat')}
        className="cursor-pointer"
        animate={
          shouldReduceMotion
            ? undefined
            : cheeredAnimal === 'cat'
            ? { y: [0, -12, 0] }
            : { y: [0, -5, 0] }
        }
        transition={{
          repeat: Infinity,
          duration: 2.1,
          delay: 0.3,
          ease: 'easeInOut',
        }}
      >
        <svg x="234" y="220" width="78" height="78" viewBox="0 0 100 100">
          <KawaiiCharacterIcon
            character="cat"
            mood="cheer"
            className="w-full h-full"
          />
        </svg>
      </motion.g>

      {/* KARAKTER HEWAN 5: Landak Kecil */}
      <motion.g
        onClick={() => handleCharacterTap('hedgehog')}
        className="cursor-pointer"
        animate={
          shouldReduceMotion
            ? undefined
            : cheeredAnimal === 'hedgehog'
            ? { y: [0, -10, 0] }
            : { y: [0, -3.5, 0] }
        }
        transition={{
          repeat: Infinity,
          duration: 2.3,
          delay: 0.6,
          ease: 'easeInOut',
        }}
      >
        <svg x="306" y="228" width="72" height="72" viewBox="0 0 100 100">
          <KawaiiCharacterIcon
            character="hedgehog"
            mood="happy"
            className="w-full h-full"
          />
        </svg>
      </motion.g>

      {/* Bunga Hiasan Samping Kiri & Kanan Panggung */}
      <g transform="translate(26, 210)">
        <circle cx="0" cy="-10" r="7" fill="#F472B6" />
        <circle cx="10" cy="0" r="7" fill="#F472B6" />
        <circle cx="0" cy="10" r="7" fill="#F472B6" />
        <circle cx="-10" cy="0" r="7" fill="#F472B6" />
        <circle cx="0" cy="0" r="5" fill="#FACC15" />
      </g>
      <g transform="translate(392, 206)">
        <circle cx="0" cy="-10" r="7" fill="#C084FC" />
        <circle cx="10" cy="0" r="7" fill="#C084FC" />
        <circle cx="0" cy="10" r="7" fill="#C084FC" />
        <circle cx="-10" cy="0" r="7" fill="#C084FC" />
        <circle cx="0" cy="0" r="5" fill="#FACC15" />
      </g>
    </svg>
  );

  const coverNavBar = (
    <nav
      aria-label="Navigasi halaman utama"
      className={`w-full mx-auto grid grid-cols-4 items-center justify-items-center ${
        isLandscape
          ? 'gap-1 sm:gap-1.5 max-w-[264px] md:max-w-[292px]'
          : 'gap-1.5 sm:gap-2 max-w-[264px] sm:max-w-[288px] mb-2.5 sm:mb-3'
      }`}
    >
      {/* 1. Tombol Pengaturan */}
      <button
        type="button"
        data-sfx="custom"
        onClick={() => {
          setIsSettingsOpen(true);
        }}
        className="group w-full min-h-[44px] flex flex-col items-center justify-center gap-1 hover:scale-105 active:scale-95 transition-transform cursor-pointer focus-visible:outline-none"
      >
        <span
          className={`relative overflow-hidden rounded-full bg-purple-600 text-white border-2 border-white shadow-[0_6px_16px_rgba(88,28,135,0.45),inset_0_-3px_6px_rgba(59,7,100,0.45)] group-hover:bg-white group-hover:text-purple-700 group-hover:border-purple-600 group-active:bg-white group-active:text-purple-700 transition-colors duration-200 flex items-center justify-center ${
            isLandscape ? 'w-9 h-9 sm:w-10 sm:h-10' : 'w-10 h-10 sm:w-11 sm:h-11'
          }`}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0.5 left-2 right-2 h-3.5 rounded-full bg-gradient-to-b from-white/65 to-white/5 group-hover:from-purple-300/45 group-hover:to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1.5 left-2 w-1.5 h-1.5 rounded-full bg-white/85 group-hover:bg-purple-400/50"
          />
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="relative z-10 w-5 h-5 shrink-0 drop-shadow-[0_1px_2px_rgba(59,7,100,0.4)]"
            aria-hidden="true"
          >
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62-.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" />
          </svg>
        </span>
        <span
          className={`font-extrabold text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.85)] leading-none whitespace-nowrap ${
            isLandscape ? 'text-[10px] md:text-xs' : 'text-[11px] sm:text-xs'
          }`}
        >
          Pengaturan
        </span>
      </button>

      {/* 2. Tombol Papan Skor */}
      <button
        type="button"
        data-sfx="custom"
        onClick={onOpenLeaderboard}
        className="group w-full min-h-[44px] flex flex-col items-center justify-center gap-1 hover:scale-105 active:scale-95 transition-transform cursor-pointer focus-visible:outline-none"
      >
        <span
          className={`relative overflow-hidden rounded-full bg-purple-600 text-white border-2 border-white shadow-[0_6px_16px_rgba(88,28,135,0.45),inset_0_-3px_6px_rgba(59,7,100,0.45)] group-hover:bg-white group-hover:text-purple-700 group-hover:border-purple-600 group-active:bg-white group-active:text-purple-700 transition-colors duration-200 flex items-center justify-center ${
            isLandscape ? 'w-9 h-9 sm:w-10 sm:h-10' : 'w-10 h-10 sm:w-11 sm:h-11'
          }`}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0.5 left-2 right-2 h-3.5 rounded-full bg-gradient-to-b from-white/65 to-white/5 group-hover:from-purple-300/45 group-hover:to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1.5 left-2 w-1.5 h-1.5 rounded-full bg-white/85 group-hover:bg-purple-400/50"
          />
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="relative z-10 w-5 h-5 shrink-0 drop-shadow-[0_1px_2px_rgba(59,7,100,0.4)]"
            aria-hidden="true"
          >
            <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
          </svg>
        </span>
        <span
          className={`font-extrabold text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.85)] leading-none whitespace-nowrap ${
            isLandscape ? 'text-[10px] md:text-xs' : 'text-[11px] sm:text-xs'
          }`}
        >
          Papan Skor
        </span>
      </button>

      {/* 3. Tombol Tutorial */}
      <button
        type="button"
        data-sfx="custom"
        onClick={onOpenHelp}
        className="group w-full min-h-[44px] flex flex-col items-center justify-center gap-1 hover:scale-105 active:scale-95 transition-transform cursor-pointer focus-visible:outline-none"
      >
        <span
          className={`relative overflow-hidden rounded-full bg-purple-600 text-white border-2 border-white shadow-[0_6px_16px_rgba(88,28,135,0.45),inset_0_-3px_6px_rgba(59,7,100,0.45)] group-hover:bg-white group-hover:text-purple-700 group-hover:border-purple-600 group-active:bg-white group-active:text-purple-700 transition-colors duration-200 flex items-center justify-center ${
            isLandscape ? 'w-9 h-9 sm:w-10 sm:h-10' : 'w-10 h-10 sm:w-11 sm:h-11'
          }`}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0.5 left-2 right-2 h-3.5 rounded-full bg-gradient-to-b from-white/65 to-white/5 group-hover:from-purple-300/45 group-hover:to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1.5 left-2 w-1.5 h-1.5 rounded-full bg-white/85 group-hover:bg-purple-400/50"
          />
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="relative z-10 w-5 h-5 shrink-0 drop-shadow-[0_1px_2px_rgba(59,7,100,0.4)]"
            aria-hidden="true"
          >
            <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 4h2v5l-1-.75L9 9V4zm9 16H6V4h1v9l3-2.25L13 13V4h5v16z" />
          </svg>
        </span>
        <span
          className={`font-extrabold text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.85)] leading-none whitespace-nowrap ${
            isLandscape ? 'text-[10px] md:text-xs' : 'text-[11px] sm:text-xs'
          }`}
        >
          Tutorial
        </span>
      </button>

      {/* 4. Tombol Bantuan */}
      <button
        type="button"
        data-sfx="custom"
        onClick={() => {
          setIsAboutHelpOpen(true);
        }}
        className="group w-full min-h-[44px] flex flex-col items-center justify-center gap-1 hover:scale-105 active:scale-95 transition-transform cursor-pointer focus-visible:outline-none"
      >
        <span
          className={`relative overflow-hidden rounded-full bg-purple-600 text-white border-2 border-white shadow-[0_6px_16px_rgba(88,28,135,0.45),inset_0_-3px_6px_rgba(59,7,100,0.45)] group-hover:bg-white group-hover:text-purple-700 group-hover:border-purple-600 group-active:bg-white group-active:text-purple-700 transition-colors duration-200 flex items-center justify-center ${
            isLandscape ? 'w-9 h-9 sm:w-10 sm:h-10' : 'w-10 h-10 sm:w-11 sm:h-11'
          }`}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0.5 left-2 right-2 h-3.5 rounded-full bg-gradient-to-b from-white/65 to-white/5 group-hover:from-purple-300/45 group-hover:to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1.5 left-2 w-1.5 h-1.5 rounded-full bg-white/85 group-hover:bg-purple-400/50"
          />
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="relative z-10 w-5 h-5 shrink-0 drop-shadow-[0_1px_2px_rgba(59,7,100,0.4)]"
            aria-hidden="true"
          >
            <path d="M12 3.25c-3.45 0-6.25 2.42-6.25 5.5a1.5 1.5 0 0 0 3 0c0-1.36 1.42-2.5 3.25-2.5s3.25 1.14 3.25 2.5c0 1.08-.72 1.82-2.08 2.62-1.46.86-2.67 1.97-2.67 3.88v.25a1.5 1.5 0 0 0 3 0v-.25c0-.66.48-1.15 1.62-1.82 1.76-1.04 3.13-2.52 3.13-4.68 0-3.08-2.8-5.5-6.25-5.5zm0 14.25a1.88 1.88 0 1 0 0 3.75 1.88 1.88 0 0 0 0-3.75z" />
          </svg>
        </span>
        <span
          className={`font-extrabold text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.85)] leading-none whitespace-nowrap ${
            isLandscape ? 'text-[10px] md:text-xs' : 'text-[11px] sm:text-xs'
          }`}
        >
          Bantuan
        </span>
      </button>
    </nav>
  );

  const coverStartButton = (
    <div className="relative flex items-center justify-center shrink-0">
      {!shouldReduceMotion && (
        <motion.span
          aria-hidden="true"
          animate={{
            scale: [1, 1.14, 1],
            opacity: [0.65, 0.15, 0.65],
          }}
          transition={{
            repeat: Infinity,
            duration: 2.2,
            ease: 'easeInOut',
          }}
          className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-pink-400 via-sky-300 to-emerald-400 blur-md"
        />
      )}

      <motion.button
        type="button"
        data-kb-default="true"
        onClick={onStart}
        animate={
          shouldReduceMotion
            ? undefined
            : {
                scale: [1, 1.05, 1],
                y: [0, -3, 0],
              }
        }
        transition={{
          repeat: Infinity,
          duration: 2.2,
          ease: 'easeInOut',
        }}
        whileHover={
          shouldReduceMotion
            ? undefined
            : {
                scale: 1.09,
                transition: { type: 'spring', stiffness: 420, damping: 16 },
              }
        }
        whileTap={
          shouldReduceMotion
            ? undefined
            : {
                scale: 0.93,
                transition: { type: 'spring', stiffness: 550, damping: 20 },
              }
        }
        className={`relative rounded-full p-2 bg-white/90 backdrop-blur-md border-4 border-white shadow-[0_14px_34px_rgba(15,23,42,0.32)] flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 ${
          isLandscape
            ? 'w-20 h-20 md:w-26 md:h-26 lg:w-28 lg:h-28'
            : 'w-26 h-26 sm:w-30 sm:h-30'
        }`}
      >
        <span className="relative w-full h-full rounded-full bg-gradient-to-tr from-pink-400 via-sky-300 to-emerald-400 border-2 border-white/90 shadow-inner flex items-center justify-center overflow-hidden">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1.5 left-4 right-4 h-7 rounded-full bg-gradient-to-b from-white/80 to-white/5"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-4 left-4 w-3.5 h-3.5 rounded-full bg-white/90"
          />
          <span
            className={`relative z-10 font-display font-black tracking-wide text-white [text-shadow:0_2px_0_#0F766E,0_4px_10px_rgba(15,23,42,0.35)] [-webkit-text-stroke:1px_#0F766E] ${
              isLandscape ? 'text-lg md:text-2xl' : 'text-2xl sm:text-[28px]'
            }`}
          >
            MULAI
          </span>
        </span>
        {showShortcutLabels && (
          <span
            aria-hidden="true"
            className="absolute -bottom-1.5 right-1 px-1.5 py-0.5 rounded-md bg-amber-300 border border-amber-500 text-[10px] font-black text-amber-950 shadow-sm font-mono"
          >
            {getActionBadgeLabel('confirm', keyBindings)}
          </span>
        )}
      </motion.button>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.section
          ref={coverMainRef}
          role="region"
          aria-label="Halaman Cover Utama Petualangan di Hutan Ajaib"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          className="fixed inset-0 z-[96] flex items-center justify-center bg-gradient-to-b from-emerald-950 via-emerald-900 to-teal-950 select-none overflow-hidden sm:p-3"
        >
          {/* Bingkai Layar Cover Responsif (Dinamis Menyesuaikan Mode Tampilan Potret / Lanskap) */}
          <div
            className={`relative w-full h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden sm:rounded-[34px] sm:border-4 sm:border-white/80 shadow-[0_24px_70px_rgba(0,0,0,0.45)] transition-all duration-300 ${
              isLandscape
                ? 'max-w-[1040px] sm:h-[min(92dvh,640px)] bg-gradient-to-br from-[#BAE6FD] via-[#FEF9C3] to-[#4ADE80]'
                : 'max-w-[440px] sm:h-[96dvh] sm:max-h-[860px] justify-between bg-gradient-to-b from-[#BAE6FD] via-[#A7F3D0] to-[#4ADE80]'
            }`}
          >
            {/* Satu Tombol Keluar (X) di Pojok Kanan Atas Layar Cover */}
            <button
              type="button"
              onClick={() => setIsExitConfirmOpen(true)}
              aria-label="Keluar dari permainan"
              title="Keluar"
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-40 min-w-[44px] min-h-[44px] w-11 h-11 rounded-2xl bg-white/90 hover:bg-rose-50 text-rose-600 border-2 border-white border-b-4 border-b-rose-200 shadow-[0_6px_16px_rgba(6,78,59,0.26)] flex items-center justify-center hover:scale-105 active:scale-95 active:border-b-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <X className="w-6 h-6 stroke-[2.8]" aria-hidden="true" />
            </button>

            {/* Latar Belakang Dinamis Sesuai Mode: Panorama Lembah (Lanskap) vs Gerbang Taman Pagi (Potret) */}
            {isLandscape ? (
              <svg
                viewBox="0 0 960 560"
                preserveAspectRatio="xMidYMid slice"
                className="pointer-events-none absolute inset-0 w-full h-full object-cover"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="coverLandscapeSky" x1="0" y1="0" x2="0.4" y2="1">
                    <stop offset="0%" stopColor="#BAE6FD" />
                    <stop offset="35%" stopColor="#E0F2FE" />
                    <stop offset="62%" stopColor="#FEF9C3" />
                    <stop offset="100%" stopColor="#86EFAC" />
                  </linearGradient>
                  <radialGradient id="coverLandscapeSun" cx="30%" cy="28%" r="48%">
                    <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.9" />
                    <stop offset="55%" stopColor="#FDE68A" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#FEF9C3" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="coverLandscapeMeadow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#86EFAC" />
                    <stop offset="50%" stopColor="#4ADE80" />
                    <stop offset="100%" stopColor="#16A34A" />
                  </linearGradient>
                  <linearGradient id="coverLandscapeTrunk" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#5D4037" />
                    <stop offset="55%" stopColor="#795548" />
                    <stop offset="100%" stopColor="#4E342E" />
                  </linearGradient>
                </defs>

                {/* Langit & Cahaya Keemasan Lembut */}
                <rect width="960" height="560" fill="url(#coverLandscapeSky)" />
                <circle cx="290" cy="155" r="245" fill="url(#coverLandscapeSun)" />

                {/* Awan Panorama Lebar */}
                <g fill="#FFFFFF" opacity="0.82">
                  <ellipse cx="210" cy="64" rx="52" ry="18" />
                  <circle cx="192" cy="56" r="18" />
                  <circle cx="222" cy="54" r="21" />
                  <ellipse cx="485" cy="52" rx="44" ry="15" />
                  <circle cx="470" cy="45" r="15" />
                  <circle cx="496" cy="44" r="17" />
                  <ellipse cx="740" cy="78" rx="48" ry="16" />
                  <circle cx="725" cy="71" r="16" />
                  <circle cx="752" cy="70" r="19" />
                </g>

                {/* Bukit-Bukit Hutan Zamrud Berlapis di Kejauhan */}
                <path
                  d="M0 300 Q160 220 340 275 Q520 210 720 265 Q850 230 960 270 L960 560 L0 560 Z"
                  fill="#A7F3D0"
                  opacity="0.7"
                />
                <path
                  d="M0 325 Q220 265 460 305 Q710 250 960 315 L960 560 L0 560 Z"
                  fill="url(#coverLandscapeMeadow)"
                />

                {/* Jalan Setapak Taman yang Menghubungkan Gerbang Kiri dan Area Tombol Kanan */}
                <path
                  d="M170 330 C250 385, 420 420, 620 450 C730 468, 820 500, 880 560 L540 560 C460 490, 290 455, 130 355 Z"
                  fill="#BEF264"
                  opacity="0.58"
                />

                {/* Lentera Taman Klasik & Bangku Kayu (Detail Eksklusif Panorama Lanskap) */}
                <g transform="translate(505, 295)">
                  <rect x="-3" y="-36" width="6" height="58" rx="2" fill="#451A03" />
                  <rect x="-11" y="-52" width="22" height="20" rx="5" fill="#FDE047" stroke="#78350F" strokeWidth="2" />
                  <path d="M-14 -52 L0 -62 L14 -52 Z" fill="#78350F" />
                  <circle cx="0" cy="-42" r="18" fill="#FEF08A" opacity="0.28" />
                </g>
                <g transform="translate(565, 326)">
                  <rect x="-26" y="0" width="52" height="7" rx="2" fill="#B45309" stroke="#451A03" strokeWidth="1.5" />
                  <rect x="-26" y="-10" width="52" height="6" rx="2" fill="#D97706" stroke="#451A03" strokeWidth="1.4" />
                  <rect x="-20" y="7" width="5" height="12" fill="#451A03" />
                  <rect x="15" y="7" width="5" height="12" fill="#451A03" />
                </g>

                {/* Pohon Apel Raksasa di Tepi Kiri & Tepi Kanan (Tidak Menutup Teks & Karakter) */}
                <path
                  d="M-10 380 C16 280, 22 175, 18 60 L54 60 C44 165, 42 275, 24 380 Z"
                  fill="url(#coverLandscapeTrunk)"
                  stroke="#3E2723"
                  strokeWidth="2.5"
                />
                <path
                  d="M970 385 C944 285, 938 180, 942 65 L906 65 C916 170, 918 280, 936 385 Z"
                  fill="url(#coverLandscapeTrunk)"
                  stroke="#3E2723"
                  strokeWidth="2.5"
                />

                {/* Kanopi Daun & Apel Segar di Sudut Kiri & Kanan Atas */}
                <g stroke="#15803D" strokeWidth="2.2">
                  <circle cx="28" cy="36" r="52" fill="#22C55E" />
                  <circle cx="88" cy="24" r="44" fill="#4ADE80" />
                  <circle cx="48" cy="76" r="36" fill="#16A34A" />
                  <circle cx="932" cy="38" r="52" fill="#22C55E" />
                  <circle cx="872" cy="26" r="44" fill="#4ADE80" />
                  <circle cx="912" cy="78" r="36" fill="#16A34A" />
                </g>
                {[
                  { cx: 24, cy: 36 },
                  { cx: 68, cy: 52 },
                  { cx: 92, cy: 24 },
                  { cx: 932, cy: 40 },
                  { cx: 888, cy: 54 },
                  { cx: 866, cy: 26 },
                ].map((apple, idx) => (
                  <g key={`land-apple-${idx}`} transform={`translate(${apple.cx}, ${apple.cy})`}>
                    <circle cx="0" cy="0" r="8.5" fill="#EF4444" stroke="#7F1D1D" strokeWidth="1.6" />
                    <circle cx="-2.8" cy="-2.8" r="2.2" fill="#FCA5A5" opacity="0.85" />
                  </g>
                ))}

                {/* Semak Bunga Rimbun Berlapis Sepanjang Bawah Panorama */}
                <path
                  d="M-10 560 L-10 512 Q120 492 260 520 Q460 498 660 522 Q820 494 970 512 L970 560 Z"
                  fill="#15803D"
                  stroke="#052E16"
                  strokeWidth="2"
                />
                <path
                  d="M-10 560 L-10 528 Q90 514 190 534 Q310 520 420 542 L420 560 Z"
                  fill="#22C55E"
                />
                <path
                  d="M540 560 L540 540 Q680 518 810 534 Q890 514 970 528 L970 560 Z"
                  fill="#22C55E"
                />
                {[
                  { x: 34, y: 528, petal: '#F472B6' },
                  { x: 96, y: 536, petal: '#38BDF8' },
                  { x: 162, y: 530, petal: '#C084FC' },
                  { x: 482, y: 536, petal: '#FB7185' },
                  { x: 838, y: 534, petal: '#F472B6' },
                  { x: 912, y: 528, petal: '#38BDF8' },
                ].map((fl, idx) => (
                  <g key={`land-fl-${idx}`} transform={`translate(${fl.x}, ${fl.y})`}>
                    <circle cx="0" cy="-4.5" r="3.2" fill={fl.petal} />
                    <circle cx="4.5" cy="0" r="3.2" fill={fl.petal} />
                    <circle cx="0" cy="4.5" r="3.2" fill={fl.petal} />
                    <circle cx="-4.5" cy="0" r="3.2" fill={fl.petal} />
                    <circle cx="0" cy="0" r="2.4" fill="#FDE047" />
                  </g>
                ))}
              </svg>
            ) : (
              <svg
                viewBox="0 0 440 800"
                preserveAspectRatio="xMidYMid slice"
                className="pointer-events-none absolute inset-0 w-full h-full object-cover"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="coverSkyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#BAE6FD" />
                    <stop offset="38%" stopColor="#E0F2FE" />
                    <stop offset="65%" stopColor="#D9F99D" />
                    <stop offset="100%" stopColor="#4ADE80" />
                  </linearGradient>
                  <radialGradient id="coverSunGlow" cx="50%" cy="34%" r="42%">
                    <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.85" />
                    <stop offset="65%" stopColor="#FEF9C3" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#FEF9C3" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="coverMeadowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#86EFAC" />
                    <stop offset="45%" stopColor="#4ADE80" />
                    <stop offset="100%" stopColor="#22C55E" />
                  </linearGradient>
                  <linearGradient id="coverTrunkLeft" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#5D4037" />
                    <stop offset="60%" stopColor="#795548" />
                    <stop offset="100%" stopColor="#4E342E" />
                  </linearGradient>
                </defs>

                {/* Langit & Cahaya Matahari Hangat */}
                <rect width="440" height="800" fill="url(#coverSkyGrad)" />
                <circle cx="220" cy="275" r="190" fill="url(#coverSunGlow)" />

                {/* Awan Lembut */}
                <g fill="#FFFFFF" opacity="0.82">
                  <ellipse cx="245" cy="66" rx="34" ry="13" />
                  <circle cx="230" cy="60" r="14" />
                  <circle cx="255" cy="58" r="16" />
                  <ellipse cx="145" cy="88" rx="26" ry="10" />
                </g>

                {/* Siluet Pepohonan Hutan di Kejauhan */}
                <g opacity="0.45" fill="#65A30D">
                  <rect x="65" y="130" width="14" height="170" fill="#78716C" />
                  <rect x="115" y="145" width="11" height="150" fill="#78716C" />
                  <rect x="315" y="140" width="12" height="155" fill="#78716C" />
                  <rect x="355" y="125" width="15" height="170" fill="#78716C" />
                  <circle cx="120" cy="270" r="55" />
                  <circle cx="220" cy="260" r="65" />
                  <circle cx="320" cy="270" r="55" />
                </g>

                {/* Batang Pohon Apel Raksasa Kiri & Kanan */}
                <path
                  d="M-12 430 C22 330, 34 210, 26 70 L68 70 C54 190, 48 320, 26 430 Z"
                  fill="url(#coverTrunkLeft)"
                  stroke="#3E2723"
                  strokeWidth="3"
                />
                <path
                  d="M44 135 Q92 98 136 82"
                  stroke="#5D4037"
                  strokeWidth="15"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M452 430 C418 330, 406 210, 414 70 L372 70 C386 190, 392 320, 414 430 Z"
                  fill="url(#coverTrunkLeft)"
                  stroke="#3E2723"
                  strokeWidth="3"
                />
                <path
                  d="M396 135 Q348 98 304 82"
                  stroke="#5D4037"
                  strokeWidth="15"
                  strokeLinecap="round"
                  fill="none"
                />

                {/* Kanopi Daun Pohon Apel di Bagian Atas */}
                <g stroke="#15803D" strokeWidth="2.5">
                  <circle cx="35" cy="45" r="62" fill="#22C55E" />
                  <circle cx="105" cy="34" r="58" fill="#4ADE80" />
                  <circle cx="170" cy="24" r="52" fill="#22C55E" />
                  <circle cx="270" cy="24" r="52" fill="#22C55E" />
                  <circle cx="335" cy="34" r="58" fill="#4ADE80" />
                  <circle cx="405" cy="45" r="62" fill="#22C55E" />
                  <circle cx="72" cy="84" r="46" fill="#16A34A" />
                  <circle cx="145" cy="64" r="38" fill="#4ADE80" />
                  <circle cx="295" cy="64" r="38" fill="#4ADE80" />
                  <circle cx="368" cy="84" r="46" fill="#16A34A" />
                </g>

                {/* Buah Apel Merah Segar di Kanopi Atas */}
                {[
                  { cx: 26, cy: 36 },
                  { cx: 74, cy: 62 },
                  { cx: 122, cy: 34 },
                  { cx: 146, cy: 76 },
                  { cx: 184, cy: 26 },
                  { cx: 268, cy: 48 },
                  { cx: 332, cy: 26 },
                  { cx: 364, cy: 76 },
                ].map((apple, idx) => (
                  <g key={idx} transform={`translate(${apple.cx}, ${apple.cy})`}>
                    <path
                      d="M0 -9 Q2 -14 5 -13"
                      stroke="#3E2723"
                      strokeWidth="2"
                      fill="none"
                    />
                    <ellipse
                      cx="4"
                      cy="-12"
                      rx="4.5"
                      ry="2.3"
                      transform="rotate(-25 4 -12)"
                      fill="#65A30D"
                    />
                    <circle
                      cx="0"
                      cy="0"
                      r="10.5"
                      fill="#EF4444"
                      stroke="#7F1D1D"
                      strokeWidth="1.8"
                    />
                    <circle cx="-3.5" cy="-3.5" r="2.8" fill="#FCA5A5" opacity="0.85" />
                  </g>
                ))}

                {/* Padang Rumput & Jalan Labirin Hijau di Bawah */}
                <path
                  d="M0 320 Q220 295 440 320 L440 800 L0 800 Z"
                  fill="url(#coverMeadowGrad)"
                />

                {/* Jalan Setapak Kuning-Hijau Cerah Menuju Tombol MULAI */}
                <path
                  d="M195 360 C175 460, 145 590, 130 800 L310 800 C295 590, 265 460, 245 360 Z"
                  fill="#A3E635"
                  opacity="0.55"
                />

                {/* Bingkai Rumput & Semak-Semak Rimbun Berlapis dengan Kelopak Bunga Kecil-Kecil di Bagian Bawah */}
                <path
                  d="M-12 800 L-12 752 Q65 736 135 764 Q220 748 305 764 Q375 736 452 752 L452 800 Z"
                  fill="#15803D"
                  stroke="#052E16"
                  strokeWidth="2"
                />

                {/* Rumpun Semak Besar Sudut Bawah Kiri */}
                <g>
                  <path
                    d="M-14 800 L-14 664 Q16 648 42 672 Q68 664 88 698 Q104 718 114 758 L114 800 Z"
                    fill="#15803D"
                    stroke="#052E16"
                    strokeWidth="2.2"
                  />
                  <path
                    d="M-14 800 L-14 692 Q14 678 38 700 Q64 692 82 724 Q98 740 106 800 Z"
                    fill="#16A34A"
                    stroke="#14532D"
                    strokeWidth="2"
                  />
                  <path
                    d="M-14 800 L-14 722 Q12 710 36 728 Q58 722 76 748 Q90 762 98 800 Z"
                    fill="#22C55E"
                    stroke="#14532D"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M12 680 Q6 658 2 648 M26 686 Q30 664 36 656 M56 700 Q62 680 68 674 M78 724 Q84 708 90 702"
                    stroke="#16A34A"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {[
                    { x: 16, y: 690, petal: '#F472B6', center: '#FDE047', scale: 1.05 },
                    { x: 42, y: 684, petal: '#C084FC', center: '#FEF08A', scale: 0.92 },
                    { x: 24, y: 716, petal: '#FB7185', center: '#FDE047', scale: 0.98 },
                    { x: 60, y: 708, petal: '#38BDF8', center: '#FEF08A', scale: 0.9 },
                    { x: 46, y: 740, petal: '#F472B6', center: '#FDE047', scale: 0.95 },
                    { x: 76, y: 736, petal: '#C084FC', center: '#FEF08A', scale: 0.85 },
                    { x: 18, y: 758, petal: '#38BDF8', center: '#FDE047', scale: 0.9 },
                    { x: 64, y: 768, petal: '#FB7185', center: '#FEF08A', scale: 0.85 },
                    { x: 92, y: 774, petal: '#F472B6', center: '#FDE047', scale: 0.8 },
                  ].map((fl, idx) => (
                    <g
                      key={`left-fl-${idx}`}
                      transform={`translate(${fl.x}, ${fl.y}) scale(${fl.scale})`}
                    >
                      <circle cx="0" cy="-4.2" r="2.9" fill={fl.petal} />
                      <circle cx="4" cy="-1.3" r="2.9" fill={fl.petal} />
                      <circle cx="2.5" cy="3.4" r="2.9" fill={fl.petal} />
                      <circle cx="-2.5" cy="3.4" r="2.9" fill={fl.petal} />
                      <circle cx="-4" cy="-1.3" r="2.9" fill={fl.petal} />
                      <circle
                        cx="0"
                        cy="0"
                        r="2.2"
                        fill={fl.center}
                        stroke="#78350F"
                        strokeWidth="0.7"
                      />
                    </g>
                  ))}
                </g>

                {/* Rumpun Semak Besar Sudut Bawah Kanan */}
                <g>
                  <path
                    d="M454 800 L454 664 Q424 648 398 672 Q372 664 352 698 Q336 718 326 758 L326 800 Z"
                    fill="#15803D"
                    stroke="#052E16"
                    strokeWidth="2.2"
                  />
                  <path
                    d="M454 800 L454 692 Q426 678 402 700 Q376 692 358 724 Q342 740 334 800 Z"
                    fill="#16A34A"
                    stroke="#14532D"
                    strokeWidth="2"
                  />
                  <path
                    d="M454 800 L454 722 Q428 710 404 728 Q382 722 364 748 Q350 762 342 800 Z"
                    fill="#22C55E"
                    stroke="#14532D"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M428 680 Q434 658 438 648 M414 686 Q410 664 404 656 M384 700 Q378 680 372 674 M362 724 Q356 708 350 702"
                    stroke="#16A34A"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {[
                    { x: 424, y: 690, petal: '#FB7185', center: '#FDE047', scale: 1.05 },
                    { x: 398, y: 684, petal: '#38BDF8', center: '#FEF08A', scale: 0.92 },
                    { x: 416, y: 716, petal: '#F472B6', center: '#FDE047', scale: 0.98 },
                    { x: 380, y: 708, petal: '#C084FC', center: '#FEF08A', scale: 0.9 },
                    { x: 394, y: 740, petal: '#FB7185', center: '#FDE047', scale: 0.95 },
                    { x: 364, y: 736, petal: '#38BDF8', center: '#FEF08A', scale: 0.85 },
                    { x: 422, y: 758, petal: '#C084FC', center: '#FDE047', scale: 0.9 },
                    { x: 376, y: 768, petal: '#F472B6', center: '#FEF08A', scale: 0.85 },
                    { x: 348, y: 774, petal: '#FB7185', center: '#FDE047', scale: 0.8 },
                  ].map((fl, idx) => (
                    <g
                      key={`right-fl-${idx}`}
                      transform={`translate(${fl.x}, ${fl.y}) scale(${fl.scale})`}
                    >
                      <circle cx="0" cy="-4.2" r="2.9" fill={fl.petal} />
                      <circle cx="4" cy="-1.3" r="2.9" fill={fl.petal} />
                      <circle cx="2.5" cy="3.4" r="2.9" fill={fl.petal} />
                      <circle cx="-2.5" cy="3.4" r="2.9" fill={fl.petal} />
                      <circle cx="-4" cy="-1.3" r="2.9" fill={fl.petal} />
                      <circle
                        cx="0"
                        cy="0"
                        r="2.2"
                        fill={fl.center}
                        stroke="#78350F"
                        strokeWidth="0.7"
                      />
                    </g>
                  ))}
                </g>
              </svg>
            )}

            {/* Partikel Daun & Kelopak Bunga Berguguran Lembut di Layar Cover (Arah Berbeda per Mode) */}
            {!shouldReduceMotion && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-15 overflow-hidden"
              >
                {COVER_FALLING_LEAVES.map((leaf) => (
                  <div
                    key={leaf.id}
                    style={
                      {
                        left: leaf.left,
                        animationDuration: `${isLandscape ? leaf.duration * 0.92 : leaf.duration}s`,
                        animationDelay: `${leaf.delay}s`,
                        '--sway-x': `${isLandscape ? leaf.sway + 24 : leaf.sway}px`,
                        '--drift-end-x': isLandscape ? '86px' : `${leaf.sway * -0.4}px`,
                        '--peak-opacity': 0.88,
                      } as React.CSSProperties
                    }
                    className="absolute gpu-leaf-particle"
                  >
                    <svg
                      width={leaf.size}
                      height={leaf.size}
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="M10 2C15 2 18 6 18 11C18 15 14 18 10 18C6 18 2 15 2 11C2 6 5 2 10 2Z"
                        fill={leaf.color}
                        stroke="#14532D"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M10 4V16"
                        stroke="#FEF9C3"
                        strokeWidth="1"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                ))}
              </div>
            )}

            {isLandscape ? (
              /* ============================================================================
               * MODE LANSKAP: Tata Letak Split Panorama dengan Tombol MULAI di Samping Layar
               * ============================================================================ */
              <div className="relative z-20 flex-1 min-h-0 w-full grid grid-cols-1 min-[520px]:grid-cols-[0.84fr_1.16fr] md:grid-cols-[0.94fr_1.06fr] items-center gap-2 sm:gap-3 md:gap-4 px-2.5 sm:px-4 md:px-6 py-3 sm:py-5 overflow-hidden">
                {/* Kolom Kiri: Panggung Ilustrasi Karakter & Gerbang Hexago Park Utuh Tanpa Terpotong */}
                <div className="h-full min-h-0 w-full flex items-center justify-center overflow-hidden">
                  {coverStageSvg}
                </div>

                {/* Kolom Kanan: Judul & Navigasi di Kiri-Tengah, Tombol MULAI di Samping Kanan Layar */}
                <div className="h-full min-h-0 w-full flex flex-row items-center justify-between gap-2.5 sm:gap-3.5 md:gap-4 rounded-3xl bg-emerald-950/15 backdrop-blur-[3px] border border-white/45 px-2.5 py-2 sm:px-4 sm:py-3 md:px-5 md:py-4 shadow-[0_12px_32px_rgba(6,78,59,0.16)] overflow-hidden">
                  {/* Blok Kiri Panel: Identitas, Judul Utama, & Baris Navigasi */}
                  <div className="flex-1 min-w-0 h-full flex flex-col items-center justify-evenly gap-1 sm:gap-2 text-center">
                    <header className="shrink-0 w-full flex flex-col items-center pointer-events-none">
                      <p className="text-purple-800 font-extrabold text-[9.5px] sm:text-[11px] md:text-xs uppercase tracking-wider leading-none mb-0.5 drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]">
                        HEXAGO MEDIA CREATIVE
                      </p>
                      <p className="font-display text-[clamp(0.9rem,1.95vw,1.45rem)] font-black uppercase tracking-wide text-yellow-300 [text-shadow:0_2px_0_#78350F,0_4px_0_#451A03,0_6px_10px_rgba(0,0,0,0.4)] [-webkit-text-stroke:1.1px_#78350F] leading-tight">
                        GAME LABIRIN EDUKATIF
                      </p>
                      <p className="mt-0.5 font-display text-[clamp(0.68rem,1.3vw,0.95rem)] font-black uppercase tracking-wide text-pink-300 [text-shadow:0_1.5px_0_#831843,0_3px_0_#500724,0_5px_8px_rgba(0,0,0,0.35)] [-webkit-text-stroke:0.85px_#831843] leading-tight">
                        untuk usia 4-6 tahun
                      </p>
                    </header>

                    <h1
                      aria-label="Petualangan Seru Anak Kreatif"
                      className="shrink-0 font-display font-black uppercase tracking-tight leading-[1.02] select-none flex flex-col items-center text-balance drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
                    >
                      <span className="block text-[clamp(1.08rem,2.3vw,1.85rem)] text-amber-300 [text-shadow:0_3px_0_#78350F,0_5px_0_#451A03,0_8px_14px_rgba(0,0,0,0.4)] [-webkit-text-stroke:1.4px_#78350F]">
                        Petualangan Seru
                      </span>
                      <span className="block text-[clamp(1.12rem,2.45vw,1.95rem)] mt-0.5">
                        <span className="text-emerald-300 [text-shadow:0_3px_0_#064E3B,0_5px_0_#022C22,0_8px_14px_rgba(0,0,0,0.38)] [-webkit-text-stroke:1.4px_#064E3B]">
                          Anak{' '}
                        </span>
                        <span className="text-sky-300 [text-shadow:0_3px_0_#0C4A6E,0_5px_0_#082F49,0_8px_14px_rgba(0,0,0,0.38)] [-webkit-text-stroke:1.4px_#0C4A6E]">
                          Kreatif
                        </span>
                      </span>
                    </h1>

                    <div className="shrink-0 w-full flex justify-center">
                      {coverNavBar}
                    </div>
                  </div>

                  {/* Sisi Kanan Luar Panel: Tombol Utama MULAI Sejajar dengan Judul & Navigasi */}
                  <div className="shrink-0 flex flex-col items-center justify-center">
                    {coverStartButton}
                  </div>
                </div>
              </div>
            ) : (
              /* ============================================================================
               * MODE POTRET: Komposisi Gerbang Taman Vertikal Klasik
               * ============================================================================ */
              <>
                <header className="relative z-20 shrink-0 w-full flex flex-col items-center pt-3 pb-0 px-4 text-center pointer-events-none">
                  <div className="mt-24 sm:mt-32 flex flex-col items-center">
                    <p className="text-purple-700 font-extrabold text-xs sm:text-sm uppercase tracking-wider leading-none mb-1 drop-shadow-[0_1.5px_2px_rgba(255,255,255,0.95)]">
                      HEXAGO MEDIA CREATIVE
                    </p>

                    <p className="font-display text-2xl sm:text-3xl md:text-[32px] font-black uppercase tracking-wide text-yellow-300 drop-shadow-lg [text-shadow:0_2.5px_0_#78350F,0_5px_0_#451A03,0_8px_14px_rgba(0,0,0,0.45)] [-webkit-text-stroke:1.4px_#78350F] leading-tight">
                      GAME LABIRIN EDUKATIF
                    </p>

                    <p className="mt-1 font-display text-base sm:text-lg md:text-xl font-black uppercase tracking-wide text-pink-300 drop-shadow-md [text-shadow:0_2px_0_#831843,0_4px_0_#500724,0_6px_10px_rgba(0,0,0,0.4)] [-webkit-text-stroke:1.1px_#831843] leading-tight">
                      untuk usia 4-6 tahun
                    </p>
                  </div>
                </header>

                <div className="relative z-10 flex-1 min-h-0 w-full -mt-2 flex items-center justify-center px-2 pt-0 pb-1 overflow-hidden">
                  {coverStageSvg}
                </div>

                <footer className="relative shrink-0 w-full flex flex-col items-center z-30 px-4 sm:px-6 pb-3.5 sm:pb-5 text-center">
                  <h1
                    aria-label="Petualangan Seru Anak Kreatif"
                    className="-mt-2 mb-3.5 sm:mb-5 font-display font-black uppercase tracking-tight leading-[1.05] select-none flex flex-col items-center drop-shadow-[0_10px_20px_rgba(0,0,0,0.42)]"
                  >
                    <span className="block text-[28px] sm:text-[35px] md:text-[38px] text-amber-300 [text-shadow:0_3.5px_0_#78350F,0_6.5px_0_#451A03,0_10px_18px_rgba(0,0,0,0.45)] [-webkit-text-stroke:2px_#78350F]">
                      Petualangan Seru
                    </span>
                    <span className="block text-[30px] sm:text-[37px] md:text-[40px] mt-1">
                      <span className="text-emerald-300 [text-shadow:0_3.5px_0_#064E3B,0_6.5px_0_#022C22,0_10px_18px_rgba(0,0,0,0.42)] [-webkit-text-stroke:2px_#064E3B]">
                        Anak{' '}
                      </span>
                      <span className="text-sky-300 [text-shadow:0_3.5px_0_#0C4A6E,0_6.5px_0_#082F49,0_10px_18px_rgba(0,0,0,0.42)] [-webkit-text-stroke:2px_#0C4A6E]">
                        Kreatif
                      </span>
                    </span>
                  </h1>

                  {coverNavBar}
                  {coverStartButton}
                </footer>
              </>
            )}

            {/* Modal Pengaturan Permainan (Mode Tampilan Potret/Lanskap, Label, Lisensi & Keyboard) */}
            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="cover-settings-title"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSettingsOpen(false)}
                  className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-emerald-950/45 backdrop-blur-md"
                >
                  <motion.div
                    ref={coverSettingsRef}
                    initial={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.9, y: 14 }
                    }
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.94, y: 10 }
                    }
                    transition={{ type: 'spring', stiffness: 360, damping: 25 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-sm rounded-3xl bg-white/95 backdrop-blur-2xl border-2 border-white shadow-[0_24px_60px_rgba(15,23,42,0.3)] p-5 text-center text-stone-800 max-h-[90dvh] overflow-y-auto"
                  >
                    <div className="w-14 h-14 mx-auto mb-2 rounded-2xl bg-purple-100 border-2 border-purple-300 flex items-center justify-center text-2xl shadow-xs">
                      ⚙️
                    </div>
                    <h2
                      id="cover-settings-title"
                      className="font-display text-xl font-bold text-emerald-950"
                    >
                      Pengaturan Permainan
                    </h2>
                    <p className="text-xs font-bold text-stone-600 mt-1 mb-3">
                      Atur tampilan layar, label tombol, lisensi, dan tombol Keyboard / Numpad OTG!
                    </p>

                    {/* Tab Pengaturan: Umum vs Konfigurasi Keyboard / Numpad */}
                    <div
                      role="tablist"
                      aria-label="Kategori pengaturan"
                      className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-stone-100 border border-stone-200 mb-3.5"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={settingsTab === 'general'}
                        onClick={() => {
                          setSettingsTab('general');
                        }}
                        className={`px-2.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          settingsTab === 'general'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        ⚙️ Umum &amp; Lisensi
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={settingsTab === 'keyboard'}
                        onClick={() => {
                          setSettingsTab('keyboard');
                        }}
                        className={`px-2.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          settingsTab === 'keyboard'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        ⌨️ Keyboard / Numpad
                      </button>
                    </div>

                    {settingsTab === 'general' ? (
                      <>
                        {/* 1. Opsi Mode Tampilan (Potret / Lanskap) */}
                        <div className="rounded-2xl bg-purple-50/90 border border-purple-200 p-3.5 mb-3 text-left">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-extrabold text-purple-950 uppercase tracking-wide">
                              Mode Tampilan
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-purple-200/80 text-[10px] font-extrabold text-purple-900">
                              {displayMode === 'landscape' ? 'Lanskap Aktif' : 'Potret Aktif'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onChangeDisplayMode('portrait');
                              }}
                              className={`px-3 py-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                                displayMode === 'portrait'
                                  ? 'bg-purple-600 border-purple-700 text-white shadow-sm'
                                  : 'bg-white border-purple-200 text-stone-700 hover:bg-purple-100/60'
                              }`}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-5 h-5"
                                aria-hidden="true"
                              >
                                <rect x="6" y="2" width="12" height="20" rx="2.5" />
                                <line x1="12" y1="18" x2="12.01" y2="18" />
                              </svg>
                              <span className="text-xs font-extrabold leading-tight">
                                Potret (Tegak)
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                onChangeDisplayMode('landscape');
                              }}
                              className={`px-3 py-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                                displayMode === 'landscape'
                                  ? 'bg-purple-600 border-purple-700 text-white shadow-sm'
                                  : 'bg-white border-purple-200 text-stone-700 hover:bg-purple-100/60'
                              }`}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-5 h-5"
                                aria-hidden="true"
                              >
                                <rect x="2" y="6" width="20" height="12" rx="2.5" />
                                <line x1="18" y1="12" x2="18.01" y2="12" />
                              </svg>
                              <span className="text-xs font-extrabold leading-tight">
                                Lanskap (Lebar)
                              </span>
                            </button>
                          </div>

                          <p className="text-[11px] font-bold text-stone-600 mt-2 leading-snug">
                            {displayMode === 'landscape'
                              ? 'Tata letak melebar: Papan Skor di kiri, Labirin di tengah, dan Informasi Misi di kanan.'
                              : 'Tata letak vertikal ringkas untuk layar ponsel tegak.'}
                          </p>
                        </div>

                        {/* 2. Toggle Efek Suara (SFX) */}
                        <div className="rounded-2xl bg-emerald-50/90 border border-emerald-200 p-3.5 mb-3 flex items-center justify-between gap-2.5">
                          <div className="text-left min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-extrabold text-emerald-950">
                                Efek Suara (SFX)
                              </p>
                              <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  soundEnabled
                                    ? 'bg-emerald-200 text-emerald-900'
                                    : 'bg-stone-200 text-stone-700'
                                }`}
                              >
                                {soundEnabled ? 'Aktif' : 'Bisu'}
                              </span>
                            </div>
                            <p className="text-[11px] font-bold text-emerald-900/80 leading-snug mt-0.5">
                              {soundEnabled
                                ? 'Suara langkah, lonceng item, & selebrasi aktif.'
                                : 'Seluruh efek suara permainan sedang dimatikan.'}
                            </p>
                          </div>
                          <button
                            type="button"
                            data-sfx="custom"
                            role="switch"
                            aria-checked={soundEnabled}
                            aria-label={
                              soundEnabled
                                ? 'Matikan efek suara'
                                : 'Aktifkan efek suara'
                            }
                            onClick={() => {
                              onToggleSound?.();
                            }}
                            className={`relative inline-flex h-7 w-13 shrink-0 items-center rounded-full border-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                              soundEnabled
                                ? 'bg-emerald-500 border-emerald-600'
                                : 'bg-stone-300 border-stone-400'
                            }`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                                soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>

                        {/* 2b. Toggle Musik Latar (BGM) Terpisah */}
                        <div className="rounded-2xl bg-teal-50/90 border border-teal-200 p-3.5 mb-3 flex items-center justify-between gap-2.5">
                          <div className="text-left min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-extrabold text-teal-950">
                                Musik Latar (BGM)
                              </p>
                              <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  bgmEnabled && soundEnabled
                                    ? 'bg-teal-200 text-teal-900'
                                    : bgmEnabled && !soundEnabled
                                    ? 'bg-amber-200 text-amber-900'
                                    : 'bg-stone-200 text-stone-700'
                                }`}
                              >
                                {bgmEnabled
                                  ? soundEnabled
                                    ? 'Aktif'
                                    : 'Dibisukan'
                                  : 'Nonaktif'}
                              </span>
                            </div>
                            <p className="text-[11px] font-bold text-teal-900/80 leading-snug mt-0.5">
                              {!bgmEnabled
                                ? 'Musik latar petualangan sedang dimatikan.'
                                : !soundEnabled
                                ? 'Audio utama sedang Bisu — aktifkan Suara untuk mendengar.'
                                : 'Melodi ceria 90-an (Taman Ceria & Lembah Malam).'}
                            </p>
                          </div>
                          <button
                            type="button"
                            data-sfx="custom"
                            role="switch"
                            aria-checked={bgmEnabled}
                            aria-label={
                              bgmEnabled
                                ? 'Matikan musik latar'
                                : 'Aktifkan musik latar'
                            }
                            onClick={() => {
                              onToggleBgm?.();
                            }}
                            className={`relative inline-flex h-7 w-13 shrink-0 items-center rounded-full border-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                              bgmEnabled
                                ? 'bg-teal-500 border-teal-600'
                                : 'bg-stone-300 border-stone-400'
                            }`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                                bgmEnabled ? 'translate-x-6' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>

                        {/* 2c. Toggle Suara Narator */}
                        <div className="rounded-2xl bg-amber-50/90 border border-amber-200 p-3.5 mb-3 flex items-center justify-between gap-2.5">
                          <div className="text-left min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-extrabold text-amber-950">
                                Suara Narator
                              </p>
                              <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  narratorEnabled && soundEnabled
                                    ? 'bg-amber-200 text-amber-900'
                                    : narratorEnabled && !soundEnabled
                                    ? 'bg-stone-200 text-stone-800'
                                    : 'bg-stone-200 text-stone-700'
                                }`}
                              >
                                {narratorEnabled
                                  ? soundEnabled
                                    ? 'Aktif'
                                    : 'Dibisukan'
                                  : 'Nonaktif'}
                              </span>
                            </div>
                            <p className="text-[11px] font-bold text-amber-900/80 leading-snug mt-0.5">
                              {!narratorEnabled
                                ? 'Suara cerita Pak Naedie & Ibu Guru dimatikan.'
                                : !soundEnabled
                                ? 'Audio utama sedang Bisu — aktifkan Suara untuk mendengar.'
                                : 'Suara Pak Naedie & Ibu Guru membacakan cerita, petunjuk, & ucapan selamat.'}
                            </p>
                          </div>
                          <button
                            type="button"
                            data-sfx="custom"
                            role="switch"
                            aria-checked={narratorEnabled}
                            aria-label={
                              narratorEnabled
                                ? 'Matikan suara narator'
                                : 'Aktifkan suara narator'
                            }
                            onClick={() => {
                              onToggleNarrator?.();
                            }}
                            className={`relative inline-flex h-7 w-13 shrink-0 items-center rounded-full border-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                              narratorEnabled
                                ? 'bg-amber-500 border-amber-600'
                                : 'bg-stone-300 border-stone-400'
                            }`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                                narratorEnabled ? 'translate-x-6' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>

                        {/* 2d. Toggle Suara Alam Hutan (Ambient SFX) */}
                        <div className="rounded-2xl bg-emerald-50/90 border border-emerald-200 p-3.5 mb-3 flex items-center justify-between gap-2.5">
                          <div className="text-left min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-extrabold text-emerald-950">
                                Suara Alam Hutan
                              </p>
                              <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  ambientEnabled && soundEnabled
                                    ? 'bg-emerald-200 text-emerald-900'
                                    : ambientEnabled && !soundEnabled
                                    ? 'bg-stone-200 text-stone-800'
                                    : 'bg-stone-200 text-stone-700'
                                }`}
                              >
                                {ambientEnabled
                                  ? soundEnabled
                                    ? 'Aktif'
                                    : 'Dibisukan'
                                  : 'Nonaktif'}
                              </span>
                            </div>
                            <p className="text-[11px] font-bold text-emerald-900/80 leading-snug mt-0.5">
                              {!ambientEnabled
                                ? 'Suara ambient hutan dimatikan.'
                                : !soundEnabled
                                ? 'Audio utama sedang Bisu — aktifkan Suara untuk mendengar.'
                                : 'Kicau burung tipis & gemerisik daun lembut di latar.'}
                            </p>
                          </div>
                          <button
                            type="button"
                            data-sfx="custom"
                            role="switch"
                            aria-checked={ambientEnabled}
                            aria-label={
                              ambientEnabled
                                ? 'Matikan suara alam hutan'
                                : 'Aktifkan suara alam hutan'
                            }
                            onClick={() => {
                              onToggleAmbient?.();
                            }}
                            className={`relative inline-flex h-7 w-13 shrink-0 items-center rounded-full border-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                              ambientEnabled
                                ? 'bg-emerald-500 border-emerald-600'
                                : 'bg-stone-300 border-stone-400'
                            }`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                                ambientEnabled ? 'translate-x-6' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>

                        {/* 3. Toggle Tampilkan Label Tombol */}
                        <div className="rounded-2xl bg-sky-50/90 border border-sky-200 p-3.5 mb-3 flex items-center justify-between gap-2.5">
                          <div className="text-left min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-extrabold text-sky-950">
                                Tampilkan Label Tombol
                              </p>
                              <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  showShortcutLabels
                                    ? 'bg-emerald-200 text-emerald-900'
                                    : 'bg-stone-200 text-stone-700'
                                }`}
                              >
                                {showShortcutLabels ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </div>
                            <p className="text-[11px] font-bold text-sky-900/80 leading-snug mt-0.5">
                              {showShortcutLabels
                                ? 'Petunjuk pintasan tombol ditampilkan pada tombol aksi.'
                                : 'Nonaktif agar tampilan tombol tetap bersih.'}
                            </p>
                          </div>
                          <button
                            type="button"
                            data-sfx="custom"
                            role="switch"
                            aria-checked={showShortcutLabels}
                            aria-label={
                              showShortcutLabels
                                ? 'Sembunyikan label tombol'
                                : 'Tampilkan label tombol'
                            }
                            onClick={() => {
                              onToggleShowShortcutLabels?.();
                            }}
                            className={`relative inline-flex h-7 w-13 shrink-0 items-center rounded-full border-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                              showShortcutLabels
                                ? 'bg-emerald-500 border-emerald-600'
                                : 'bg-stone-300 border-stone-400'
                            }`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                                showShortcutLabels ? 'translate-x-6' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>

                        {/* 3. Toggle Status Lisensi Game Penuh */}
                        <div className="rounded-2xl bg-amber-50/90 border border-amber-200 p-3.5 mb-4 flex items-center justify-between gap-2.5">
                          <div className="text-left min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-extrabold text-amber-950">
                                Status Lisensi
                              </p>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  isLicenseActive
                                    ? 'bg-emerald-200 text-emerald-900'
                                    : 'bg-stone-200 text-stone-700'
                                }`}
                              >
                                {licenseBadgeLabel ??
                                  (isLicenseActive ? 'Aktif' : 'Nonaktif')}
                              </span>
                            </div>
                            <p className="text-[11px] font-bold text-amber-900/80 leading-snug mt-0.5">
                              {licenseDetailText ??
                                (isLicenseActive
                                  ? 'Akses penuh 10 level terbuka.'
                                  : 'Aktifkan untuk membuka Level 4+ Solo & Level 2+ Kelompok.')}
                            </p>
                          </div>
                          <button
                            type="button"
                            data-sfx="custom"
                            role="switch"
                            aria-checked={isLicenseActive}
                            aria-label={
                              isLicenseActive
                                ? 'Nonaktifkan status lisensi'
                                : 'Aktifkan status lisensi'
                            }
                            onClick={onToggleLicense}
                            className={`relative inline-flex h-7 w-13 shrink-0 items-center rounded-full border-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                              isLicenseActive
                                ? 'bg-emerald-500 border-emerald-600'
                                : 'bg-stone-300 border-stone-400'
                            }`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                                isLicenseActive ? 'translate-x-6' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>

                        {/* 4. Tombol Pasang Aplikasi PWA Layar Penuh */}
                        <PWAInstallButton />
                      </>
                    ) : (
                      <div className="mb-4">
                        <KeyboardSettingsPanel
                          keyBindings={keyBindings}
                          showShortcutLabels={showShortcutLabels}
                          onUpdateBinding={(action, code) =>
                            onUpdateKeyBinding?.(action, code)
                          }
                          onResetBindings={() => onResetKeyBindings?.()}
                          onToggleShowShortcutLabels={() =>
                            onToggleShowShortcutLabels?.()
                          }
                          onRecordingChange={setIsRecordingKey}
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      data-sfx="custom"
                      data-kb-default="true"
                      onClick={() => setIsSettingsOpen(false)}
                      className="w-full min-h-[44px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-base font-bold shadow-md active:border-b-0 transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Simpan &amp; Tutup</span>
                      {showShortcutLabels && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-700/70 text-[10px] font-black font-mono">
                          {getActionBadgeLabel('confirm', keyBindings)}
                        </span>
                      )}
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Modal Bantuan: Tentang Game Edukatif & Tombol Ikon WhatsApp Developer (Tanpa Menampilkan Nomor) */}
            <AnimatePresence>
              {isAboutHelpOpen && (
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="cover-about-help-title"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsAboutHelpOpen(false)}
                  className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-emerald-950/45 backdrop-blur-md"
                >
                  <motion.div
                    ref={coverAboutRef}
                    initial={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.9, y: 14 }
                    }
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.94, y: 10 }
                    }
                    transition={{ type: 'spring', stiffness: 360, damping: 25 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-sm rounded-3xl bg-white/95 backdrop-blur-2xl border-2 border-white shadow-[0_24px_60px_rgba(15,23,42,0.32)] p-5 text-stone-800 max-h-[88dvh] overflow-y-auto"
                  >
                    <div className="flex flex-col items-center text-center mb-3">
                      <div className="w-14 h-14 mb-2 rounded-2xl bg-purple-100 border-2 border-purple-300 flex items-center justify-center text-2xl shadow-xs">
                        🌿
                      </div>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-purple-700">
                        Hexago Media Creative
                      </p>
                      <h2
                        id="cover-about-help-title"
                        className="font-display text-xl sm:text-2xl font-bold text-emerald-950 leading-tight"
                      >
                        Tentang Game Edukatif
                      </h2>
                    </div>

                    <div className="space-y-2.5 text-left text-xs sm:text-sm font-bold text-stone-700 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3.5 mb-4">
                      <p className="leading-relaxed">
                        <strong className="text-emerald-950">
                          Petualangan Seru Anak Kreatif
                        </strong>{' '}
                        adalah game labirin edukatif interaktif yang dirancang
                        khusus untuk anak usia <strong>4–6 tahun (PAUD/TK/RA)</strong>.
                      </p>
                      <ul className="space-y-1.5 text-xs text-stone-600">
                        <li className="flex items-start gap-2">
                          <span aria-hidden="true" className="text-emerald-600">
                            ✦
                          </span>
                          <span>
                            Melatih logika pemecahan masalah, pengenalan arah,
                            serta koordinasi visual-motorik anak.
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span aria-hidden="true" className="text-emerald-600">
                            ✦
                          </span>
                          <span>
                            Mengenalkan 10 sahabat satwa beserta makanan favorit,
                            tempat tinggal, dan fakta uniknya.
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span aria-hidden="true" className="text-emerald-600">
                            ✦
                          </span>
                          <span>
                            Mendukung mode <strong>Petualang Solo</strong> dan{' '}
                            <strong>Estafet Kelompok</strong> bersama Guru atau
                            Orang Tua Pendamping.
                          </span>
                        </li>
                      </ul>
                    </div>

                    {/* Bagian Kontak WhatsApp Developer (Nomor Disembunyikan, Hanya Ikon WhatsApp) */}
                    <div className="rounded-2xl bg-stone-100/90 border border-stone-200/90 p-3 mb-4 flex items-center justify-between gap-3">
                      <div className="text-left">
                        <p className="text-xs font-extrabold text-stone-800">
                          Butuh Bantuan atau Masukan?
                        </p>
                        <p className="text-[11px] font-bold text-stone-500">
                          Hubungi Developer via WhatsApp
                        </p>
                      </div>

                      <a
                        href="https://wa.me/62882001234606"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Hubungi Developer melalui WhatsApp"
                        title="Chat WhatsApp Developer"
                        className="relative overflow-hidden w-12 h-12 rounded-2xl bg-[#25D366] hover:bg-[#20BD5A] border-b-4 border-[#128C7E] text-white shadow-md flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 active:border-b-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]"
                      >
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute top-0.5 left-2 right-2 h-3.5 rounded-full bg-gradient-to-b from-white/55 to-transparent"
                        />
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="relative z-10 w-6 h-6 drop-shadow-xs"
                          aria-hidden="true"
                        >
                          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67ZM8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7 8.5 7 9.71C7 10.93 7.89 12.1 8 12.27C8.14 12.44 9.76 14.94 12.25 16C12.84 16.27 13.3 16.42 13.66 16.53C14.25 16.72 14.79 16.69 15.22 16.63C15.7 16.56 16.68 16.03 16.89 15.45C17.1 14.87 17.1 14.38 17.04 14.27C16.97 14.17 16.81 14.11 16.56 14C16.31 13.86 15.09 13.26 14.87 13.18C14.64 13.1 14.5 13.06 14.31 13.3C14.15 13.55 13.67 14.11 13.53 14.27C13.38 14.44 13.24 14.46 13 14.34C12.74 14.21 11.94 13.95 11 13.11C10.26 12.45 9.77 11.64 9.62 11.39C9.5 11.15 9.61 11 9.73 10.89C9.84 10.78 10 10.6 10.1 10.45C10.23 10.31 10.27 10.2 10.35 10.04C10.43 9.87 10.39 9.73 10.33 9.61C10.27 9.5 9.77 8.26 9.56 7.77C9.36 7.29 9.16 7.35 9 7.34C8.86 7.34 8.7 7.33 8.53 7.33Z" />
                        </svg>
                      </a>
                    </div>

                    <button
                      type="button"
                      data-sfx="custom"
                      data-kb-default="true"
                      onClick={() => setIsAboutHelpOpen(false)}
                      className="w-full min-h-[44px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-base font-bold shadow-md active:border-b-0 transition-colors flex items-center justify-center gap-2"
                    >
                      <span>Tutup</span>
                      {showShortcutLabels && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-700/70 text-[10px] font-black font-mono">
                          {getActionBadgeLabel('back', keyBindings)}
                        </span>
                      )}
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Modal Konfirmasi Keluar Permainan (Ramah Anak) */}
            <AnimatePresence>
              {isExitConfirmOpen && (
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="cover-exit-confirm-title"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsExitConfirmOpen(false)}
                  className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-emerald-950/50 backdrop-blur-md"
                >
                  <motion.div
                    ref={coverExitConfirmRef}
                    initial={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.9, y: 14 }
                    }
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.94, y: 10 }
                    }
                    transition={{ type: 'spring', stiffness: 360, damping: 25 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-xs sm:max-w-sm rounded-3xl bg-white/95 backdrop-blur-2xl border-2 border-white shadow-[0_24px_60px_rgba(15,23,42,0.34)] p-6 text-center text-stone-800"
                  >
                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-3xl shadow-xs">
                      👋
                    </div>
                    <h2
                      id="cover-exit-confirm-title"
                      className="font-display text-lg sm:text-xl font-bold text-emerald-950 leading-snug mb-2"
                    >
                      Apakah kamu yakin ingin keluar dari permainan?
                    </h2>
                    <p className="text-xs font-bold text-stone-500 mb-5">
                      Rusa dan teman-teman hutan selalu siap menunggu kamu bermain lagi!
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        data-sfx="custom"
                        data-kb-default="true"
                        onClick={() => setIsExitConfirmOpen(false)}
                        className="min-h-[46px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-sm sm:text-base font-bold shadow-md active:border-b-0 active:translate-y-0.5 transition-all cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        data-sfx="custom"
                        onClick={() => {
                          const targetUrl = LAUNCHER_URL.trim();
                          if (targetUrl) {
                            window.location.href = targetUrl;
                          } else {
                            setIsExitConfirmOpen(false);
                            setIsLauncherNoticeOpen(true);
                          }
                        }}
                        className="min-h-[46px] rounded-2xl bg-rose-500 hover:bg-rose-600 border-b-4 border-rose-700 text-white font-display text-sm sm:text-base font-bold shadow-md active:border-b-0 active:translate-y-0.5 transition-all cursor-pointer"
                      >
                        Ya, Keluar
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Modal Info Launcher Saat LAUNCHER_URL Belum Diisi */}
            <AnimatePresence>
              {isLauncherNoticeOpen && (
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="cover-launcher-notice-title"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsLauncherNoticeOpen(false)}
                  className="fixed inset-0 z-[135] flex items-center justify-center p-4 bg-emerald-950/55 backdrop-blur-md"
                >
                  <motion.div
                    ref={coverLauncherNoticeRef}
                    initial={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.9, y: 14 }
                    }
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.94, y: 10 }
                    }
                    transition={{ type: 'spring', stiffness: 360, damping: 25 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-xs sm:max-w-sm rounded-3xl bg-white/95 backdrop-blur-2xl border-2 border-white shadow-[0_24px_60px_rgba(15,23,42,0.34)] p-6 text-center text-stone-800"
                  >
                    <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-sky-100 border-2 border-sky-300 flex items-center justify-center text-3xl shadow-xs">
                      🏡
                    </div>
                    <h2
                      id="cover-launcher-notice-title"
                      className="font-display text-lg font-bold text-emerald-950 mb-2"
                    >
                      Katalog Permainan (Launcher)
                    </h2>
                    <p className="text-xs sm:text-sm font-bold text-stone-700 leading-relaxed mb-5">
                      Halaman Katalog Permainan (Launcher) akan segera hadir! Silakan tekan tombol Home di HP Anda untuk menutup aplikasi.
                    </p>
                    <button
                      type="button"
                      data-sfx="custom"
                      data-kb-default="true"
                      onClick={() => setIsLauncherNoticeOpen(false)}
                      className="w-full min-h-[46px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-sm sm:text-base font-bold shadow-md active:border-b-0 transition-all cursor-pointer"
                    >
                      Oke, Mengerti
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
};

type ModeSelectScreenProps = {
  isOpen: boolean;
  shouldReduceMotion: boolean;
  keyBindings?: KeyBindingsMap;
  showShortcutLabels?: boolean;
  onSelectMode: (mode: GameMode) => void;
  onBackToCover?: () => void;
};

export const ModeSelectScreen: React.FC<ModeSelectScreenProps> = ({
  isOpen,
  shouldReduceMotion,
  keyBindings = DEFAULT_KEY_BINDINGS,
  showShortcutLabels = false,
  onSelectMode,
  onBackToCover,
}) => {
  const modeCardRef = useRef<HTMLDivElement | null>(null);
  const [isModeNarrating, setIsModeNarrating] = useState<boolean>(false);

  useEffect(() => {
    return narrator.subscribe(setIsModeNarrating);
  }, []);

  const handleReplaySelectModeVoice = useCallback(() => {
    narrator.playSelectModeVoice();
  }, []);

  const handleSelectModeWithStop = useCallback(
    (selectedMode: GameMode) => {
      narrator.stop();
      onSelectMode(selectedMode);
    },
    [onSelectMode]
  );

  const handleBackToCoverWithStop = useCallback(() => {
    narrator.stop();
    onBackToCover?.();
  }, [onBackToCover]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (matchesKeyAction(event, 'back', keyBindings)) {
        if (onBackToCover) {
          event.preventDefault();
          handleBackToCoverWithStop();
        }
        return;
      }
      if (matchesKeyAction(event, 'moveUp', keyBindings)) {
        event.preventDefault();
        navigateContainerFocus(modeCardRef.current, 'UP');
        return;
      }
      if (matchesKeyAction(event, 'moveDown', keyBindings)) {
        event.preventDefault();
        navigateContainerFocus(modeCardRef.current, 'DOWN');
        return;
      }
      if (matchesKeyAction(event, 'moveLeft', keyBindings)) {
        event.preventDefault();
        navigateContainerFocus(modeCardRef.current, 'LEFT');
        return;
      }
      if (matchesKeyAction(event, 'moveRight', keyBindings)) {
        event.preventDefault();
        navigateContainerFocus(modeCardRef.current, 'RIGHT');
        return;
      }
      if (matchesKeyAction(event, 'confirm', keyBindings)) {
        event.preventDefault();
        activateFocusedOrDefault(modeCardRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBackToCoverWithStop, isOpen, keyBindings, onBackToCover]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-labelledby="select-mode-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-gradient-to-b from-sky-200/80 via-emerald-100/85 to-amber-100/85 backdrop-blur-xl select-none overflow-y-auto"
        >
          <motion.div
            ref={modeCardRef}
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.92, y: 18 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.95, y: 10 }
            }
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
            className="relative w-full max-w-md rounded-3xl bg-white/88 backdrop-blur-2xl border-2 border-white shadow-[0_24px_60px_rgba(15,23,42,0.22)] p-5 sm:p-6 text-stone-800 my-auto"
          >
            {/* Tombol Kecil Ikon Speaker ("Dengarkan Ulang") di Pojok Atas Kartu Pilih Mode */}
            <div className="flex items-center justify-end mb-1">
              <button
                type="button"
                data-sfx="custom"
                onClick={handleReplaySelectModeVoice}
                aria-label="Dengarkan ulang panduan pilih mode permainan"
                title="Dengarkan Ulang"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-extrabold shadow-2xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  isModeNarrating
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                    : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
                }`}
              >
                <Volume2
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isModeNarrating ? 'animate-pulse text-emerald-700' : ''
                  }`}
                  aria-hidden="true"
                />
                <span>Dengarkan Ulang</span>
              </button>
            </div>

            {/* Header Sambutan Kawaii */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 border-2 border-white shadow-sm p-1 flex items-center justify-center">
                  <ZookeeperNaedieAvatar
                    speaking={isModeNarrating}
                    alt="Pak Naedie"
                    className="w-full h-full"
                  />
                </div>
                <div className="w-14 h-14 rounded-2xl bg-sky-100 border-2 border-white shadow-md p-1.5 flex items-center justify-center">
                  <KindergartenChildAvatar
                    alt="Karakter Siswa-Siswi Netral"
                    className="w-full h-full"
                  />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-rose-100 border-2 border-white shadow-sm p-1 flex items-center justify-center">
                  <CompanionKawaiiAvatar
                    speaking={false}
                    alt="Ibu Guru Pendamping"
                    className="w-full h-full"
                  />
                </div>
              </div>

              <span className="px-3 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-[11px] font-extrabold tracking-wide mb-1">
                Taman Ajaib Hexago Park
              </span>
              <h1
                id="select-mode-title"
                className="font-display text-2xl sm:text-3xl font-bold text-emerald-950 leading-tight"
              >
                Pilih Mode Permainan
              </h1>
              <p className="text-xs sm:text-sm font-bold text-stone-600 mt-1">
                Mau berpetualang sendiri atau bermain bergantian bersama teman kelompokmu?
              </p>
            </div>

            {/* Dua Kartu Pilihan Mode yang Intuitif untuk Anak */}
            <div className="grid grid-cols-1 gap-3.5">
              {/* Kartu 1: Mode Petualang Solo */}
              <motion.button
                type="button"
                data-kb-default="true"
                onClick={() => handleSelectModeWithStop('solo')}
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : {
                        scale: 1.02,
                        y: -2,
                        transition: { type: 'spring', stiffness: 420, damping: 18 },
                      }
                }
                whileTap={
                  shouldReduceMotion
                    ? undefined
                    : {
                        scale: 0.97,
                        y: 1,
                        transition: { type: 'spring', stiffness: 550, damping: 22 },
                      }
                }
                className="group w-full text-left rounded-3xl bg-gradient-to-br from-emerald-50/95 via-white to-sky-50/95 hover:from-emerald-100/90 hover:to-sky-100/90 border-2 border-emerald-300 border-b-4 border-b-emerald-500 p-4 shadow-md hover:shadow-lg transition-all flex items-center gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-sky-100 border-2 border-white shadow-sm p-1.5 flex items-center justify-center shrink-0">
                  <KindergartenChildAvatar
                    alt="Mode Petualang Solo"
                    className="w-full h-full"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-lg bg-emerald-500 text-white text-[10px] font-black shadow-xs"
                  >
                    1P
                  </span>
                </div>
                <div className="min-w-0 flex-1 flex flex-col items-start">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-200/85 text-emerald-900 text-[10px] font-extrabold mb-1">
                    1 Pemain
                  </span>
                  <span className="font-display text-lg sm:text-xl font-bold text-emerald-950 leading-tight mb-1">
                    Petualang Solo
                  </span>
                  <p className="text-xs font-bold text-stone-600 leading-snug">
                    Bermain sendiri ditemani Ibu/Guru untuk membantu hewan-hewan lucu di 10 level!
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className="w-9 h-9 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center shadow-sm shrink-0 group-hover:translate-x-0.5 transition-transform"
                >
                  ➔
                </span>
              </motion.button>

              {/* Kartu 2: Mode Estafet Kelompok */}
              <motion.button
                type="button"
                onClick={() => handleSelectModeWithStop('group')}
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : {
                        scale: 1.02,
                        y: -2,
                        transition: { type: 'spring', stiffness: 420, damping: 18 },
                      }
                }
                whileTap={
                  shouldReduceMotion
                    ? undefined
                    : {
                        scale: 0.97,
                        y: 1,
                        transition: { type: 'spring', stiffness: 550, damping: 22 },
                      }
                }
                className="group w-full text-left rounded-3xl bg-gradient-to-br from-amber-50/95 via-white to-rose-50/95 hover:from-amber-100/90 hover:to-rose-100/90 border-2 border-amber-300 border-b-4 border-b-amber-500 p-4 shadow-md hover:shadow-lg transition-all flex items-center gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-amber-100 border-2 border-white shadow-sm p-1 flex items-center justify-center shrink-0">
                  <KindergartenChildrenGroupAvatar
                    alt="Mode Estafet Kelompok"
                    className="w-full h-full"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-lg bg-amber-500 text-amber-950 text-[10px] font-black shadow-xs"
                  >
                    2-4P
                  </span>
                </div>
                <div className="min-w-0 flex-1 flex flex-col items-start">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-200/90 text-amber-950 text-[10px] font-extrabold mb-1">
                    2–4 Pemain
                  </span>
                  <span className="font-display text-lg sm:text-xl font-bold text-amber-950 leading-tight mb-1">
                    Estafet Kelompok
                  </span>
                  <p className="text-xs font-bold text-stone-600 leading-snug">
                    Bermain bergiliran (Pass-and-Play) dengan teman sekelompok dan raih Lencana Apresiasi bersama!
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className="w-9 h-9 rounded-full bg-amber-500 text-amber-950 font-black flex items-center justify-center shadow-sm shrink-0 group-hover:translate-x-0.5 transition-transform"
                >
                  ➔
                </span>
              </motion.button>
            </div>

            {onBackToCover && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={handleBackToCoverWithStop}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-xs font-extrabold text-stone-600 transition-colors inline-flex items-center gap-1.5"
                >
                  <span>← Kembali ke Halaman Cover</span>
                  {showShortcutLabels && (
                    <span className="px-1.5 py-0.2 rounded bg-stone-200 text-[10px] font-black font-mono text-stone-700">
                      {getActionBadgeLabel('back', keyBindings)}
                    </span>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  );
};

export type SetupSubmitPayload = {
  mode: GameMode;
  playerName: string;
  companionName: string;
  groupName: string;
  groupPlayers: string[];
};

type SetupScreenProps = {
  isOpen: boolean;
  mode: GameMode;
  initialPlayerName: string;
  initialCompanionName: string;
  initialGroupName: string;
  initialGroupPlayers: string[];
  shouldReduceMotion: boolean;
  keyBindings?: KeyBindingsMap;
  showShortcutLabels?: boolean;
  onBackToModeSelect: () => void;
  onSubmitSetup: (payload: SetupSubmitPayload) => void;
};

export const SetupScreen: React.FC<SetupScreenProps> = ({
  isOpen,
  mode,
  initialPlayerName,
  initialCompanionName,
  initialGroupName,
  initialGroupPlayers,
  shouldReduceMotion,
  keyBindings = DEFAULT_KEY_BINDINGS,
  showShortcutLabels = false,
  onBackToModeSelect,
  onSubmitSetup,
}) => {
  const setupCardRef = useRef<HTMLDivElement | null>(null);
  const [soloPlayerName, setSoloPlayerName] = useState<string>(initialPlayerName);
  const [companionName, setCompanionName] = useState<string>(initialCompanionName);
  const [playerCount, setPlayerCount] = useState<number>(
    Math.min(4, Math.max(2, initialGroupPlayers.length || 2))
  );
  const [groupName, setGroupName] = useState<string>(initialGroupName);
  const [groupPlayerNames, setGroupPlayerNames] = useState<string[]>([
    initialGroupPlayers[0] || '',
    initialGroupPlayers[1] || '',
    initialGroupPlayers[2] || '',
    initialGroupPlayers[3] || '',
  ]);
  const [errorText, setErrorText] = useState<string>('');
  const [isSetupNarrating, setIsSetupNarrating] = useState<boolean>(false);

  useEffect(() => {
    return narrator.subscribe(setIsSetupNarrating);
  }, []);

  const handleReplaySetupVoice = useCallback(() => {
    narrator.playSetupVoice();
  }, []);

  const handleBackToModeSelectWithStop = useCallback(() => {
    narrator.stop();
    onBackToModeSelect();
  }, [onBackToModeSelect]);

  useEffect(() => {
    if (!isOpen) return;
    setSoloPlayerName(
      initialPlayerName === 'Rusa Kecil' ? '' : initialPlayerName
    );
    setCompanionName(
      initialCompanionName === 'Ibu Guru' ? '' : initialCompanionName
    );
    setGroupName(
      initialGroupName === 'Bintang Hutan' ? '' : initialGroupName
    );
    setErrorText('');
  }, [
    initialCompanionName,
    initialGroupName,
    initialPlayerName,
    isOpen,
    mode,
  ]);

  const handleGroupPlayerChange = (idx: number, val: string) => {
    setGroupPlayerNames((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
    if (errorText) setErrorText('');
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanedCompanion = companionName.trim();

    if (mode === 'solo') {
      const cleanedSolo = soloPlayerName.trim();
      if (!cleanedSolo) {
        setErrorText('Tulis Nama Anak terlebih dahulu ya!');
        return;
      }
      if (!cleanedCompanion) {
        setErrorText('Tulis Nama Guru Pendamping terlebih dahulu ya!');
        return;
      }
      setErrorText('');
      narrator.stop();
      onSubmitSetup({
        mode: 'solo',
        playerName: cleanedSolo,
        companionName: cleanedCompanion,
        groupName: 'Petualang Solo',
        groupPlayers: [cleanedSolo],
      });
      return;
    }

    // Validasi Mode Kelompok
    const cleanedGroup = groupName.trim();
    if (!cleanedGroup) {
      setErrorText('Tulis Nama Kelompok terlebih dahulu ya!');
      return;
    }

    const activePlayers: string[] = [];
    for (let i = 0; i < playerCount; i += 1) {
      const name = (groupPlayerNames[i] ?? '').trim();
      if (!name) {
        setErrorText(`Tulis Nama Anak ${i + 1} terlebih dahulu ya!`);
        return;
      }
      activePlayers.push(name);
    }

    if (!cleanedCompanion) {
      setErrorText('Tulis Nama Guru Pendamping terlebih dahulu ya!');
      return;
    }

    setErrorText('');
    narrator.stop();
    onSubmitSetup({
      mode: 'group',
      playerName: activePlayers[0],
      companionName: cleanedCompanion,
      groupName: cleanedGroup,
      groupPlayers: activePlayers,
    });
  };

  const handleQuickFill = () => {
    narrator.stop();
    if (mode === 'solo') {
      onSubmitSetup({
        mode: 'solo',
        playerName: 'Rusa Kecil',
        companionName: 'Ibu Guru',
        groupName: 'Petualang Solo',
        groupPlayers: ['Rusa Kecil'],
      });
    } else {
      const defaultNames = ['Anak 1', 'Anak 2', 'Anak 3', 'Anak 4'].slice(
        0,
        playerCount
      );
      onSubmitSetup({
        mode: 'group',
        playerName: defaultNames[0],
        companionName: 'Ibu Guru',
        groupName: 'Bintang Hutan',
        groupPlayers: defaultNames,
      });
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextEntryTarget(event.target)) {
        if (event.key === 'Escape') {
          event.preventDefault();
          (event.target as HTMLElement).blur();
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          navigateContainerFocus(setupCardRef.current, 'UP');
          return;
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          navigateContainerFocus(setupCardRef.current, 'DOWN');
        }
        return;
      }

      if (matchesKeyAction(event, 'back', keyBindings)) {
        event.preventDefault();
        handleBackToModeSelectWithStop();
        return;
      }
      if (matchesKeyAction(event, 'moveUp', keyBindings)) {
        event.preventDefault();
        navigateContainerFocus(setupCardRef.current, 'UP');
        return;
      }
      if (matchesKeyAction(event, 'moveDown', keyBindings)) {
        event.preventDefault();
        navigateContainerFocus(setupCardRef.current, 'DOWN');
        return;
      }
      if (matchesKeyAction(event, 'moveLeft', keyBindings)) {
        event.preventDefault();
        navigateContainerFocus(setupCardRef.current, 'LEFT');
        return;
      }
      if (matchesKeyAction(event, 'moveRight', keyBindings)) {
        event.preventDefault();
        navigateContainerFocus(setupCardRef.current, 'RIGHT');
        return;
      }
      if (matchesKeyAction(event, 'confirm', keyBindings)) {
        event.preventDefault();
        activateFocusedOrDefault(setupCardRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBackToModeSelectWithStop, isOpen, keyBindings]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-labelledby="setup-screen-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24 }}
          className="fixed inset-0 z-[92] flex items-center justify-center p-4 bg-emerald-950/35 backdrop-blur-md select-none overflow-y-auto"
        >
          <motion.div
            ref={setupCardRef}
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.92, y: 18 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.95, y: 10 }
            }
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
            className="w-full max-w-md rounded-3xl bg-white/92 backdrop-blur-2xl border-2 border-white shadow-[0_24px_60px_rgba(15,23,42,0.28)] p-5 sm:p-6 text-stone-800 max-h-[92dvh] overflow-y-auto my-auto"
          >
            {/* Baris Atas: Tombol Kembali Pilih Mode, Badge Mode, & Tombol Ikon Speaker ("Dengarkan Ulang") */}
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <motion.button
                type="button"
                onClick={handleBackToModeSelectWithStop}
                whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 text-xs font-extrabold flex items-center gap-1.5 transition-colors"
              >
                <span aria-hidden="true">←</span>
                <span>Pilih Mode</span>
                {showShortcutLabels && (
                  <span className="px-1 py-0.2 rounded bg-stone-200 text-[9px] font-black font-mono text-stone-700">
                    {getActionBadgeLabel('back', keyBindings)}
                  </span>
                )}
              </motion.button>

              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                    mode === 'solo'
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                      : 'bg-amber-100 border-amber-300 text-amber-950'
                  }`}
                >
                  {mode === 'solo' ? 'Petualang Solo' : 'Estafet Kelompok'}
                </span>

                <button
                  type="button"
                  data-sfx="custom"
                  onClick={handleReplaySetupVoice}
                  aria-label="Dengarkan ulang panduan kenalan dulu"
                  title="Dengarkan Ulang"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-extrabold shadow-2xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    isSetupNarrating
                      ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                      : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
                  }`}
                >
                  <Volume2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isSetupNarrating ? 'animate-pulse text-emerald-700' : ''
                    }`}
                    aria-hidden="true"
                  />
                  <span>Dengarkan Ulang</span>
                </button>
              </div>
            </div>

            {/* Judul Layar Pengaturan */}
            <div className="text-center mb-4">
              <h2
                id="setup-screen-title"
                className="font-display text-2xl font-bold text-emerald-950 leading-tight"
              >
                {mode === 'solo'
                  ? 'Kenalan Dulu Yuk!'
                  : 'Pengaturan Kelompok'}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-stone-600 mt-0.5">
                {mode === 'solo'
                  ? 'Isi Nama Anak dan Nama Guru Pendamping sebelum masuk ke Hutan Ajaib.'
                  : 'Pilih jumlah pemain (2–4 anak), nama kelompok, dan nama masing-masing anak.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'solo' ? (
                /* FORM MODE SOLO */
                <div>
                  <label
                    htmlFor="solo-player-name-input"
                    className="block text-xs font-extrabold text-emerald-900 mb-1"
                  >
                    Nama Anak
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-13 h-13 shrink-0 rounded-2xl bg-sky-50 border-2 border-sky-200 p-1 shadow-xs flex items-center justify-center">
                      <KindergartenChildAvatar
                        alt="Avatar Anak"
                        className="w-full h-full"
                      />
                    </div>
                    <input
                      id="solo-player-name-input"
                      type="text"
                      maxLength={18}
                      value={soloPlayerName}
                      onChange={(e) => {
                        setSoloPlayerName(e.target.value);
                        if (errorText) setErrorText('');
                      }}
                      placeholder="Tulis nama anak di sini..."
                      className="flex-1 min-w-0 min-h-[48px] rounded-2xl bg-white border-2 border-emerald-200 px-3.5 py-2 text-sm sm:text-base font-extrabold text-emerald-950 placeholder:text-stone-400 shadow-inner focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200/70"
                    />
                  </div>
                </div>
              ) : (
                /* FORM MODE KELOMPOK (2-4 Pemain) */
                <>
                  {/* Pemilih Jumlah Pemain (2, 3, atau 4) */}
                  <div>
                    <label className="block text-xs font-extrabold text-amber-950 mb-1.5">
                      Jumlah Pemain (Maksimal 4 Anak)
                    </label>
                    <div
                      role="group"
                      aria-label="Pilih jumlah pemain kelompok"
                      className="grid grid-cols-3 gap-2"
                    >
                      {[2, 3, 4].map((count) => {
                        const active = playerCount === count;
                        return (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setPlayerCount(count)}
                            className={`min-h-[42px] rounded-2xl font-display text-sm sm:text-base font-bold border-2 border-b-4 transition-all flex items-center justify-center gap-1 ${
                              active
                                ? 'bg-amber-400 border-amber-600 text-amber-950 shadow-sm'
                                : 'bg-white/90 border-stone-200 text-stone-600 hover:bg-amber-50'
                            }`}
                          >
                            <span>{count} Anak</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Input Nama Kelompok */}
                  <div>
                    <label
                      htmlFor="group-team-name-input"
                      className="block text-xs font-extrabold text-amber-950 mb-1"
                    >
                      Nama Kelompok
                    </label>
                    <input
                      id="group-team-name-input"
                      type="text"
                      maxLength={22}
                      value={groupName}
                      onChange={(e) => {
                        setGroupName(e.target.value);
                        if (errorText) setErrorText('');
                      }}
                      placeholder="Contoh: Regu Bintang / Kelompok Ceria..."
                      className="w-full min-h-[46px] rounded-2xl bg-white border-2 border-amber-300 px-3.5 py-2 text-sm sm:text-base font-extrabold text-emerald-950 placeholder:text-stone-400 shadow-inner focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-200/70"
                    />
                  </div>

                  {/* Input Dinamis Nama Anak 1 s/d N */}
                  <div className="space-y-2.5 pt-0.5">
                    {Array.from({ length: playerCount }, (_, idx) => (
                      <div key={idx}>
                        <label
                          htmlFor={`group-player-input-${idx}`}
                          className="block text-xs font-extrabold text-emerald-900 mb-1"
                        >
                          Nama Anak {idx + 1}
                        </label>
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-11 h-11 shrink-0 rounded-2xl bg-sky-50 border-2 border-sky-200 p-1 shadow-xs flex items-center justify-center">
                            <KindergartenChildAvatar
                              alt={`Avatar Anak ${idx + 1}`}
                              className="w-full h-full"
                            />
                            <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">
                              {idx + 1}
                            </span>
                          </div>
                          <input
                            id={`group-player-input-${idx}`}
                            type="text"
                            maxLength={18}
                            value={groupPlayerNames[idx] ?? ''}
                            onChange={(e) =>
                              handleGroupPlayerChange(idx, e.target.value)
                            }
                            placeholder={`Tulis nama anak ke-${idx + 1}...`}
                            className="flex-1 min-w-0 min-h-[44px] rounded-2xl bg-white border-2 border-emerald-200 px-3 py-1.5 text-sm font-extrabold text-emerald-950 placeholder:text-stone-400 shadow-inner focus:outline-none focus:border-emerald-500 focus:ring-3 focus:ring-emerald-200/70"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Field Nama Guru Pendamping (Tampil di Solo maupun Kelompok) */}
              <div>
                <label
                  htmlFor="setup-companion-name-input"
                  className="block text-xs font-extrabold text-rose-900 mb-1"
                >
                  Nama Guru Pendamping
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-rose-50 border-2 border-rose-200 p-1 shadow-xs flex items-center justify-center">
                    <CompanionKawaiiAvatar
                      speaking={isSetupNarrating}
                      alt="Avatar Guru Pendamping"
                      className="w-full h-full"
                    />
                  </div>
                  <input
                    id="setup-companion-name-input"
                    type="text"
                    maxLength={22}
                    value={companionName}
                    onChange={(e) => {
                      setCompanionName(e.target.value);
                      if (errorText) setErrorText('');
                    }}
                    placeholder="Contoh: Ibu Sari / Bu Guru..."
                    className="flex-1 min-w-0 min-h-[46px] rounded-2xl bg-white border-2 border-rose-200 px-3.5 py-2 text-sm sm:text-base font-extrabold text-emerald-950 placeholder:text-stone-400 shadow-inner focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-200/70"
                  />
                </div>
              </div>

              {errorText && (
                <p
                  role="alert"
                  className="text-xs font-extrabold text-rose-600 text-center bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5"
                >
                  {errorText}
                </p>
              )}

              {/* Tombol Lanjut ke Prolog */}
              <div className="pt-1 flex flex-col gap-2">
                <motion.button
                  type="submit"
                  data-kb-default="true"
                  whileHover={
                    shouldReduceMotion
                      ? undefined
                      : {
                          scale: 1.02,
                          y: -2,
                          transition: { type: 'spring', stiffness: 420, damping: 18 },
                        }
                  }
                  whileTap={
                    shouldReduceMotion
                      ? undefined
                      : {
                          scale: 0.97,
                          y: 1,
                          transition: { type: 'spring', stiffness: 550, damping: 22 },
                        }
                  }
                  className="w-full min-h-[52px] px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-lg sm:text-xl font-bold shadow-lg active:border-b-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 flex items-center justify-center gap-2"
                >
                  <span>Lanjut ke Cerita Pak Naedie ➔</span>
                  {showShortcutLabels && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-700/70 text-[10px] font-black font-mono">
                      {getActionBadgeLabel('confirm', keyBindings)}
                    </span>
                  )}
                </motion.button>

                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="min-h-[34px] px-3 py-1 rounded-xl text-xs font-extrabold text-stone-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                >
                  Isi Cepat (Pakai Nama Contoh)
                </button>
              </div>
            </form>
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  );
};

type GroupTransitionScreenProps = {
  isOpen: boolean;
  groupName: string;
  companionName: string;
  currentPlayerIndex: number;
  totalPlayers: number;
  currentPlayerName: string;
  level: number;
  characterKey: KawaiiCharacterKey;
  characterName: string;
  previousTurnResult: GroupTurnResult | null;
  shouldReduceMotion: boolean;
  keyBindings?: KeyBindingsMap;
  showShortcutLabels?: boolean;
  onStartTurn: () => void;
};

export const GroupTransitionScreen: React.FC<GroupTransitionScreenProps> = ({
  isOpen,
  groupName,
  companionName,
  currentPlayerIndex,
  totalPlayers,
  currentPlayerName,
  level,
  characterKey,
  characterName,
  previousTurnResult,
  shouldReduceMotion,
  keyBindings = DEFAULT_KEY_BINDINGS,
  showShortcutLabels = false,
  onStartTurn,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (matchesKeyAction(event, 'confirm', keyBindings)) {
        event.preventDefault();
        onStartTurn();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, keyBindings, onStartTurn]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-labelledby="group-transition-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24 }}
          className="fixed inset-0 z-[88] flex items-center justify-center p-4 bg-emerald-950/45 backdrop-blur-lg select-none overflow-y-auto"
        >
          <motion.div
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.9, y: 20 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.94, y: 12 }
            }
            transition={{ type: 'spring', stiffness: 360, damping: 25 }}
            className="w-full max-w-sm rounded-3xl bg-white/94 backdrop-blur-2xl border-3 border-white shadow-[0_24px_60px_rgba(15,23,42,0.32)] p-5 sm:p-6 text-center text-stone-800 my-auto"
          >
            {/* Ringkasan Singkat Giliran Anak Sebelumnya (Jika Ada) */}
            {previousTurnResult && (
              <div className="mb-3.5 px-3 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-extrabold text-emerald-900 flex items-center justify-between gap-2">
                <span className="truncate">
                  👏 Skor <strong>{previousTurnResult.playerName}</strong> tersimpan!
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500 text-white tabular-nums shrink-0">
                  +{previousTurnResult.score} Poin
                </span>
              </div>
            )}

            {/* Lencana Kelompok & Urutan Giliran */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-950 text-xs font-extrabold mb-3">
              <span>Kelompok {groupName}</span>
              <span>·</span>
              <span className="tabular-nums">
                Giliran {currentPlayerIndex + 1}/{totalPlayers}
              </span>
            </div>

            {/* Ilustrasi Anak & Karakter Hewan Kawaii */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <motion.div
                animate={
                  shouldReduceMotion
                    ? undefined
                    : { y: [0, -5, 0], rotate: [0, -3, 3, 0] }
                }
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                className="w-20 h-20 rounded-2xl bg-sky-100 border-2 border-sky-300 shadow-md p-2 flex items-center justify-center"
              >
                <KindergartenChildAvatar
                  alt={`Avatar ${currentPlayerName}`}
                  className="w-full h-full"
                />
              </motion.div>

              <span className="text-2xl" aria-hidden="true">
                🤝
              </span>

              <motion.div
                animate={
                  shouldReduceMotion
                    ? undefined
                    : { y: [0, -6, 0], scale: [1, 1.05, 1] }
                }
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="w-20 h-20 rounded-2xl bg-amber-100 border-2 border-amber-300 shadow-md p-2 flex items-center justify-center"
              >
                <KawaiiCharacterIcon
                  character={characterKey}
                  mood="cheer"
                  alt={characterName}
                  className="w-full h-full"
                />
              </motion.div>
            </div>

            {/* Teks Utama Panggilan Giliran Sesuai Spesifikasi */}
            <p className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider mb-1">
              Estafet Kelompok · Level {String(level).padStart(2, '0')} ({characterName})
            </p>
            <h2
              id="group-transition-title"
              className="font-display text-2xl sm:text-[26px] font-bold text-emerald-950 leading-snug mb-2"
            >
              Bersiaplah! Sekarang giliran:{' '}
              <span className="text-amber-600 underline decoration-amber-400 decoration-wavy underline-offset-4">
                {currentPlayerName}
              </span>
              !
            </h2>
            <p className="text-xs sm:text-sm font-bold text-stone-600 mb-5 leading-relaxed">
              Berikan perangkat kepada <strong>{currentPlayerName}</strong>.{' '}
              {companionName} siap menyemangati langkahmu!
            </p>

            {/* Tombol Mulai */}
            <motion.button
              type="button"
              data-kb-default="true"
              onClick={onStartTurn}
              whileHover={
                shouldReduceMotion
                  ? undefined
                  : {
                      scale: 1.04,
                      y: -2,
                      transition: { type: 'spring', stiffness: 420, damping: 18 },
                    }
              }
              whileTap={
                shouldReduceMotion
                  ? undefined
                  : {
                      scale: 0.96,
                      y: 2,
                      transition: { type: 'spring', stiffness: 550, damping: 22 },
                    }
              }
              className="w-full min-h-[54px] px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-xl font-bold shadow-lg active:border-b-0 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <span>Mulai</span>
              <span aria-hidden="true">➔</span>
              {showShortcutLabels && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-700/70 text-[10px] font-black font-mono">
                  {getActionBadgeLabel('confirm', keyBindings)}
                </span>
              )}
            </motion.button>
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  );
};

type GroupAppreciativeLeaderboardScreenProps = {
  isOpen: boolean;
  groupName: string;
  companionName: string;
  level: number;
  results: GroupTurnResult[];
  shouldReduceMotion: boolean;
  keyBindings?: KeyBindingsMap;
  showShortcutLabels?: boolean;
  onPlayNextRound: () => void;
  onReplaySameRound: () => void;
  onChangeMode: () => void;
};

export const GroupAppreciativeLeaderboardScreen: React.FC<
  GroupAppreciativeLeaderboardScreenProps
> = ({
  isOpen,
  groupName,
  companionName,
  level,
  results,
  shouldReduceMotion,
  keyBindings = DEFAULT_KEY_BINDINGS,
  showShortcutLabels = false,
  onPlayNextRound,
  onReplaySameRound,
  onChangeMode,
}) => {
  const groupLbRef = useRef<HTMLDivElement | null>(null);
  const [isGroupNarrating, setIsGroupNarrating] = useState<boolean>(false);
  const totalGroupScore = results.reduce((sum, item) => sum + item.score, 0);
  const totalItemsGathered = results.reduce(
    (sum, item) => sum + item.itemsCollected,
    0
  );
  const totalGroupStars = results.reduce(
    (sum, item) => sum + (item.stars ?? 0),
    0
  );
  const assignedBadges = assignAppreciativeBadges(results);

  const groupVictoryNarration = `Hebat sekali, kelompok ${groupName}! Pak Naedie dan ${companionName} sangat bangga melihat kerja sama kalian di Level ${level} dengan total ${totalGroupStars} bintang dan ${totalGroupScore} poin!`;

  useEffect(() => {
    return narrator.subscribe(setIsGroupNarrating);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const timer = window.setTimeout(() => {
      narrator.speak(groupVictoryNarration, 'naedie');
    }, 650);
    return () => {
      window.clearTimeout(timer);
      narrator.stop();
    };
  }, [isOpen, groupVictoryNarration]);

  const handleReplayGroupNarration = useCallback(() => {
    narrator.speak(groupVictoryNarration, 'naedie', { forceReplay: true });
  }, [groupVictoryNarration]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (matchesKeyAction(event, 'back', keyBindings)) {
        event.preventDefault();
        onChangeMode();
        return;
      }
      if (matchesKeyAction(event, 'moveUp', keyBindings)) {
        event.preventDefault();
        navigateContainerFocus(groupLbRef.current, 'UP');
        return;
      }
      if (matchesKeyAction(event, 'moveDown', keyBindings)) {
        event.preventDefault();
        navigateContainerFocus(groupLbRef.current, 'DOWN');
        return;
      }
      if (matchesKeyAction(event, 'moveLeft', keyBindings)) {
        event.preventDefault();
        navigateContainerFocus(groupLbRef.current, 'LEFT');
        return;
      }
      if (matchesKeyAction(event, 'moveRight', keyBindings)) {
        event.preventDefault();
        navigateContainerFocus(groupLbRef.current, 'RIGHT');
        return;
      }
      if (matchesKeyAction(event, 'confirm', keyBindings)) {
        event.preventDefault();
        activateFocusedOrDefault(groupLbRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, keyBindings, onChangeMode]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-labelledby="group-leaderboard-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.26 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-gradient-to-b from-sky-200/85 via-emerald-100/90 to-amber-100/90 backdrop-blur-xl select-none overflow-y-auto"
        >
          <motion.div
            ref={groupLbRef}
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.92, y: 18 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.95, y: 10 }
            }
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            className="w-full max-w-md rounded-3xl bg-white/92 backdrop-blur-2xl border-3 border-white shadow-[0_24px_60px_rgba(15,23,42,0.28)] p-5 sm:p-6 text-stone-800 max-h-[94dvh] overflow-y-auto my-auto"
          >
            {/* Header Apresiasi Kelompok */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-950 text-xs font-extrabold mb-2">
                <span aria-hidden="true">🏆</span>
                <span>Papan Apresiasi Kelompok {groupName}</span>
              </div>
              <h2
                id="group-leaderboard-title"
                className="font-display text-2xl sm:text-3xl font-bold text-emerald-950 leading-tight"
              >
                Hebat Sekali, Semuanya! 🎉
              </h2>
              <p className="text-xs sm:text-sm font-bold text-stone-600 mt-1">
                {companionName} dan Pak Naedie bangga melihat kerja sama kalian di Level{' '}
                {String(level).padStart(2, '0')}!
              </p>
              <button
                type="button"
                data-sfx="custom"
                onClick={handleReplayGroupNarration}
                aria-label="Dengarkan ulang ucapan selamat kelompok"
                title="Dengarkan Ulang"
                className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-extrabold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  isGroupNarrating
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                    : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
                }`}
              >
                <Volume2
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isGroupNarrating ? 'animate-pulse text-emerald-700' : ''
                  }`}
                  aria-hidden="true"
                />
                <span>Dengarkan Ulang</span>
              </button>
            </div>

            {/* Kartu Total Skor Kelompok */}
            <div className="rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white p-4 shadow-md mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-100">
                  Total Skor Kelompok
                </p>
                <p className="font-display text-3xl sm:text-4xl font-black tabular-nums leading-none mt-1">
                  {totalGroupScore}{' '}
                  <span className="text-base font-extrabold text-emerald-100">
                    Poin
                  </span>
                </p>
              </div>
              <div className="text-right bg-white/20 backdrop-blur-xs rounded-2xl px-3 py-2 border border-white/30">
                <p className="text-[11px] font-extrabold text-emerald-50">
                  Total Bekal Terkumpul
                </p>
                <p className="font-display text-lg font-black tabular-nums">
                  🌟 {totalItemsGathered} Item
                </p>
              </div>
            </div>

            {/* Daftar Pencapaian & Lencana Apresiasi Masing-Masing Anak */}
            <div className="space-y-2.5 mb-5">
              {results.map((item, idx) => {
                const badge = assignedBadges[item.playerIndex] ?? {
                  title: 'Petualang Hebat',
                  icon: '🌟',
                  description: 'Berani menyelesaikan misi dengan ceria!',
                  colorClass: 'bg-sky-100 border-sky-300 text-sky-900',
                };

                return (
                  <motion.div
                    key={`${item.playerIndex}-${idx}`}
                    initial={
                      shouldReduceMotion
                        ? false
                        : { opacity: 0, y: 8 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="rounded-2xl bg-white border-2 border-stone-200/90 p-3 shadow-xs flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 shrink-0 rounded-xl bg-sky-50 border border-sky-200 p-1 flex items-center justify-center">
                          <KindergartenChildAvatar
                            alt={item.playerName}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-display text-base font-bold text-emerald-950 truncate">
                            {item.playerName}
                          </p>
                          <p className="text-[11px] font-bold text-stone-500 tabular-nums">
                            {item.itemsCollected}/{item.totalItems} item ·{' '}
                            {item.steps} langkah · {item.timeUsedSeconds}d
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block px-2.5 py-1 rounded-xl bg-amber-100 border border-amber-300 font-display text-sm font-black text-amber-950 tabular-nums">
                          +{item.score} Poin
                        </span>
                      </div>
                    </div>

                    {/* Lencana Apresiasi Individu */}
                    <div
                      className={`rounded-xl border px-3 py-1.5 flex items-center gap-2 ${badge.colorClass}`}
                    >
                      <span className="text-base leading-none shrink-0" aria-hidden="true">
                        {badge.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold leading-tight">
                          Lencana: {badge.title}
                        </p>
                        <p className="text-[11px] font-bold opacity-85 leading-snug">
                          {badge.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Tombol Aksi Berikutnya */}
            <div className="flex flex-col gap-2">
              <motion.button
                type="button"
                data-kb-default="true"
                onClick={onPlayNextRound}
                whileHover={shouldReduceMotion ? undefined : { scale: 1.02, y: -1.5 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                className="w-full min-h-[50px] px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-lg font-bold shadow-lg active:border-b-0 transition-colors flex items-center justify-center gap-2"
              >
                <span>
                  {level < 10
                    ? 'Lanjut Putaran Level Berikutnya ➔'
                    : 'Terima Piagam Penjaga Alam 🏅'}
                </span>
                {showShortcutLabels && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-700/70 text-[10px] font-black font-mono">
                    {getActionBadgeLabel('confirm', keyBindings)}
                  </span>
                )}
              </motion.button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onReplaySameRound}
                  className="min-h-[42px] px-3 py-2 rounded-2xl bg-amber-200 hover:bg-amber-300 border-b-3 border-amber-400 text-amber-950 font-extrabold text-xs transition-colors"
                >
                  Ulangi Putaran Ini
                </button>
                <button
                  type="button"
                  onClick={onChangeMode}
                  className="min-h-[42px] px-3 py-2 rounded-2xl bg-stone-100 hover:bg-stone-200 border-b-3 border-stone-300 text-stone-700 font-extrabold text-xs transition-colors flex items-center justify-center gap-1"
                >
                  <span>Pilih Mode Lain</span>
                  {showShortcutLabels && (
                    <span className="px-1 py-0.2 rounded bg-stone-200 text-[9px] font-black font-mono text-stone-700">
                      {getActionBadgeLabel('back', keyBindings)}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  );
};
