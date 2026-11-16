import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Volume2 } from 'lucide-react';
import {
  LeaderboardModal,
  INITIAL_LEADERBOARD_MOCK,
  type LeaderboardEntry,
} from './components/LeaderboardModal';
import {
  ForestWeatherOverlay,
  type WeatherKind,
} from './components/ForestWeatherOverlay';
import {
  GoalFireworksCanvas,
  type GoalFireworkBurst,
} from './components/GoalFireworksCanvas';
import { InteractiveTutorialModal } from './components/InteractiveTutorialModal';
import { PrologueScreen } from './components/PrologueScreen';
import LicensePopup from './components/LicensePopup';
import {
  CoverScreen,
  ModeSelectScreen,
  SetupScreen,
  GroupTransitionScreen,
  GroupAppreciativeLeaderboardScreen,
  type DisplayMode,
  type GameMode,
  type ScreenState,
  type GroupTurnResult,
  type SetupSubmitPayload,
} from './components/PassAndPlayScreens';
import {
  AppreciationDialogModal,
  ANIMAL_TIPS_BY_CHARACTER,
  pickLevelAnimalTip,
} from './components/AppreciationDialogModal';
import {
  DidYouKnowModal,
  pickDidYouKnowFact,
  type AnimalDidYouKnowFact,
} from './components/DidYouKnowModal';
import {
  CollectibleIcon,
  DestinationIcon,
  ObstacleIcon,
  type CollectibleKind,
  type DestinationKind,
  type ObstacleKind,
} from './components/MissionIcons';
import {
  KawaiiCharacterIcon,
  ZookeeperNaedieAvatar,
  type KawaiiCharacterKey,
} from './components/KawaiiCharacters';
import { BonusFireflyValleyModal } from './components/BonusFireflyValleyModal';
import { EndingScreen } from './components/EndingScreen';
import { KeyboardSettingsPanel } from './components/KeyboardSettingsPanel';
import {
  activateFocusedOrDefault,
  cloneDefaultKeyBindings,
  getActionBadgeLabel,
  isTextEntryTarget,
  loadKeyBindings,
  loadShowShortcutLabels,
  matchesKeyAction,
  navigateContainerFocus,
  saveKeyBindings,
  saveShowShortcutLabels,
  type KeyActionId,
  type KeyBindingsMap,
} from './utils/keyboardConfig';
import { sfxEngine } from './utils/sfxEngine';
import { bgmEngine } from './utils/bgmEngine';
import { narrator } from './utils/narrator';
import { ambientEngine } from './utils/ambientEngine';
import {
  clearStoredLicenseSession,
  formatLicenseCountdownDetail,
  formatLicenseStatusBadge,
  getOrCreateDeviceId,
  isLicenseSessionValid,
  loadStoredLicenseSession,
  saveStoredLicenseSession,
  verifyAndActivateLicenseRpc,
  type StoredLicenseSession,
} from './utils/licenseManager';

type Position = {
  row: number;
  col: number;
};

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

type CharacterKey = KawaiiCharacterKey;

type LevelConfig = {
  level: number;
  title: string;
  difficulty: string;
  gridSize: 5 | 6 | 7;
  characterKey: CharacterKey;
  characterName: string;
  characterEmoji: string;
  collectibleKind: CollectibleKind;
  collectibleName: string;
  collectibleCount: number;
  destinationKind: DestinationKind;
  destinationName: string;
  obstacleIcon: ObstacleKind;
  obstacleName: string;
  missionText: string;
  minSteps: number;
  maxSteps: number;
  deadEnds: number;
  timeLimitSeconds: number;
  fallbackGrid: number[][];
  fallbackStart: Position;
};

type GeneratedMaze = {
  grid: number[][];
  startPos: Position;
  initialFacing: 'LEFT' | 'RIGHT';
  collectibles: Position[];
  optimalSteps: number;
};

type LevelResult = {
  won: boolean;
  stepsTaken: number;
  optimalSteps: number;
  efficiencyPct: number;
  stepScore: number;
  timeLeft: number;
  timeLimit: number;
  timeScore: number;
  totalScore: number;
  stars: number;
};

// Legenda Peta Labirin Dinamis (5x5 -> 6x6 -> 7x7):
// 0 = Jalan setapak (aman dilalui)
// 1 = Rintangan unik per karakter (tidak bisa ditembus)
// 2 = Titik awal Karakter Hewan
// 3 = Titik finis Tujuan Karakter

// Batas level gratis berdasarkan mode permainan:
// - Mode Petualang Solo ('solo'): Gratis Level 1–3 (Grid 5x5 Mudah), Level 4+ memerlukan aktivasi lisensi
// - Mode Estafet Kelompok ('group'): Gratis Level 1 (1 putaran penuh kelompok), Level 2+ memerlukan aktivasi lisensi
const FREE_LEVEL_LIMIT_BY_MODE: Record<GameMode, number> = {
  solo: 3,
  group: 1,
};

const LEVELS: LevelConfig[] = [
  {
    level: 1,
    title: 'Kebun Cerah',
    difficulty: 'Sangat Mudah',
    gridSize: 5,
    characterKey: 'deer',
    characterName: 'Rusa',
    characterEmoji: '🦌',
    collectibleKind: 'apple',
    collectibleName: 'Apel',
    collectibleCount: 2,
    destinationKind: 'forest',
    destinationName: 'Hutan Cemara',
    obstacleIcon: 'bush',
    obstacleName: 'semak hijau',
    missionText: 'Kumpulkan 2 Apel lalu masuk ke Hutan Cemara!',
    minSteps: 7,
    maxSteps: 10,
    deadEnds: 2,
    timeLimitSeconds: 50,
    fallbackStart: { row: 0, col: 0 },
    fallbackGrid: [
      [2, 0, 1, 0, 0],
      [1, 0, 1, 0, 1],
      [0, 0, 0, 0, 1],
      [0, 1, 1, 0, 0],
      [0, 0, 1, 1, 3],
    ],
  },
  {
    level: 2,
    title: 'Padang Rumput',
    difficulty: 'Mudah',
    gridSize: 5,
    characterKey: 'rabbit',
    characterName: 'Kelinci',
    characterEmoji: '🐰',
    collectibleKind: 'carrot',
    collectibleName: 'Wortel',
    collectibleCount: 3,
    destinationKind: 'burrow',
    destinationName: 'Lubang Persembunyian',
    obstacleIcon: 'fence',
    obstacleName: 'pagar kebun',
    missionText: 'Kumpulkan 3 Wortel sebelum masuk ke Lubang Persembunyian!',
    minSteps: 9,
    maxSteps: 12,
    deadEnds: 3,
    timeLimitSeconds: 46,
    fallbackStart: { row: 4, col: 0 },
    fallbackGrid: [
      [0, 0, 0, 1, 3],
      [0, 1, 0, 1, 0],
      [0, 1, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [2, 0, 0, 1, 0],
    ],
  },
  {
    level: 3,
    title: 'Taman Bunga',
    difficulty: 'Mudah',
    gridSize: 5,
    characterKey: 'cat',
    characterName: 'Kucing',
    characterEmoji: '🐱',
    collectibleKind: 'fish',
    collectibleName: 'Ikan',
    collectibleCount: 3,
    destinationKind: 'cathouse',
    destinationName: 'Rumah Kucing',
    obstacleIcon: 'puddle',
    obstacleName: 'genangan air',
    missionText: 'Kumpulkan 3 Ikan lalu pulang ke Rumah Kucing!',
    minSteps: 11,
    maxSteps: 15,
    deadEnds: 4,
    timeLimitSeconds: 42,
    fallbackStart: { row: 0, col: 4 },
    fallbackGrid: [
      [0, 0, 0, 0, 2],
      [0, 1, 1, 1, 0],
      [0, 1, 3, 1, 0],
      [0, 1, 0, 1, 0],
      [0, 0, 0, 1, 0],
    ],
  },
  {
    level: 4,
    title: 'Lembah Madu',
    difficulty: 'Sedang',
    gridSize: 6,
    characterKey: 'bear',
    characterName: 'Beruang',
    characterEmoji: '🐻',
    collectibleKind: 'honey',
    collectibleName: 'Madu',
    collectibleCount: 3,
    destinationKind: 'cave',
    destinationName: 'Gua Beruang',
    obstacleIcon: 'fallenlog',
    obstacleName: 'batang kayu tumbang',
    missionText: 'Kumpulkan 3 Madu sebelum beristirahat di Gua Beruang!',
    minSteps: 12,
    maxSteps: 16,
    deadEnds: 5,
    timeLimitSeconds: 40,
    fallbackStart: { row: 0, col: 0 },
    fallbackGrid: [
      [2, 0, 0, 1, 0, 0],
      [1, 1, 0, 1, 0, 1],
      [0, 0, 0, 0, 0, 1],
      [0, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 0],
      [1, 1, 0, 0, 0, 3],
    ],
  },
  {
    level: 5,
    title: 'Bukit Daun',
    difficulty: 'Sedang',
    gridSize: 6,
    characterKey: 'fox',
    characterName: 'Rubah',
    characterEmoji: '🦊',
    collectibleKind: 'berry',
    collectibleName: 'Berry',
    collectibleCount: 3,
    destinationKind: 'treeden',
    destinationName: 'Sarang Pohon',
    obstacleIcon: 'rock',
    obstacleName: 'batu besar',
    missionText: 'Kumpulkan 3 Berry lalu sembunyi di Sarang Pohon!',
    minSteps: 14,
    maxSteps: 18,
    deadEnds: 6,
    timeLimitSeconds: 38,
    fallbackStart: { row: 5, col: 0 },
    fallbackGrid: [
      [0, 0, 1, 0, 0, 3],
      [0, 1, 1, 0, 1, 0],
      [0, 0, 0, 0, 1, 0],
      [1, 1, 0, 1, 0, 0],
      [0, 0, 0, 1, 0, 1],
      [2, 1, 1, 1, 0, 0],
    ],
  },
  {
    level: 6,
    title: 'Rimbun Ranting',
    difficulty: 'Menengah',
    gridSize: 6,
    characterKey: 'hedgehog',
    characterName: 'Landak',
    characterEmoji: '🦔',
    collectibleKind: 'mushroom',
    collectibleName: 'Jamur',
    collectibleCount: 3,
    destinationKind: 'leafnest',
    destinationName: 'Sarang Daun',
    obstacleIcon: 'twigs',
    obstacleName: 'tumpukan ranting',
    missionText: 'Kumpulkan 3 Jamur sebelum menuju Sarang Daun!',
    minSteps: 15,
    maxSteps: 20,
    deadEnds: 7,
    timeLimitSeconds: 36,
    fallbackStart: { row: 0, col: 5 },
    fallbackGrid: [
      [0, 0, 0, 1, 0, 2],
      [0, 1, 0, 1, 0, 1],
      [0, 1, 0, 0, 0, 0],
      [0, 1, 3, 1, 1, 0],
      [0, 0, 1, 0, 0, 0],
      [1, 0, 0, 0, 1, 0],
    ],
  },
  {
    level: 7,
    title: 'Sabana Emas',
    difficulty: 'Sulit',
    gridSize: 6,
    characterKey: 'lion',
    characterName: 'Singa',
    characterEmoji: '🦁',
    collectibleKind: 'crown',
    collectibleName: 'Mahkota',
    collectibleCount: 3,
    destinationKind: 'priderock',
    destinationName: 'Batu Sabana',
    obstacleIcon: 'cactus',
    obstacleName: 'kaktus sabana',
    missionText: 'Kumpulkan 3 Mahkota lalu naik ke Batu Sabana!',
    minSteps: 16,
    maxSteps: 22,
    deadEnds: 8,
    timeLimitSeconds: 34,
    fallbackStart: { row: 5, col: 5 },
    fallbackGrid: [
      [3, 0, 1, 0, 0, 0],
      [1, 0, 1, 0, 1, 0],
      [0, 0, 0, 0, 1, 0],
      [0, 1, 1, 0, 1, 0],
      [0, 0, 1, 0, 0, 0],
      [1, 0, 0, 1, 1, 2],
    ],
  },
  {
    level: 8,
    title: 'Hutan Rimba',
    difficulty: 'Sulit',
    gridSize: 7,
    characterKey: 'elephant',
    characterName: 'Gajah',
    characterEmoji: '🐘',
    collectibleKind: 'banana',
    collectibleName: 'Pisang',
    collectibleCount: 4,
    destinationKind: 'oasis',
    destinationName: 'Danau Segar',
    obstacleIcon: 'bamboo',
    obstacleName: 'rumpun bambu',
    missionText: 'Kumpulkan 4 Pisang sebelum bermain di Danau Segar!',
    minSteps: 17,
    maxSteps: 23,
    deadEnds: 9,
    timeLimitSeconds: 32,
    fallbackStart: { row: 0, col: 0 },
    fallbackGrid: [
      [2, 0, 0, 1, 0, 0, 0],
      [1, 1, 0, 1, 0, 1, 0],
      [0, 0, 0, 0, 0, 1, 0],
      [0, 1, 1, 1, 0, 1, 0],
      [0, 0, 0, 1, 0, 0, 0],
      [1, 1, 0, 1, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 3],
    ],
  },
  {
    level: 9,
    title: 'Malam Kunang',
    difficulty: 'Sangat Sulit',
    gridSize: 7,
    characterKey: 'giraffe',
    characterName: 'Jerapah',
    characterEmoji: '🦒',
    collectibleKind: 'leaf',
    collectibleName: 'Daun Akasia',
    collectibleCount: 4,
    destinationKind: 'acacia',
    destinationName: 'Pohon Tinggi',
    obstacleIcon: 'stump',
    obstacleName: 'tunggul pohon',
    missionText: 'Kumpulkan 4 Daun Akasia lalu menuju Pohon Tinggi!',
    minSteps: 18,
    maxSteps: 25,
    deadEnds: 11,
    timeLimitSeconds: 30,
    fallbackStart: { row: 6, col: 0 },
    fallbackGrid: [
      [0, 0, 1, 0, 0, 0, 3],
      [0, 1, 1, 0, 1, 1, 0],
      [0, 0, 0, 0, 1, 0, 0],
      [1, 1, 0, 1, 1, 0, 1],
      [0, 0, 0, 0, 0, 0, 1],
      [0, 1, 1, 1, 0, 1, 0],
      [2, 0, 0, 1, 0, 0, 0],
    ],
  },
  {
    level: 10,
    title: 'Puncak Hutan',
    difficulty: 'Ahli',
    gridSize: 7,
    characterKey: 'zebra',
    characterName: 'Zebra',
    characterEmoji: '🦓',
    collectibleKind: 'grass',
    collectibleName: 'Rumput Segar',
    collectibleCount: 4,
    destinationKind: 'savanna',
    destinationName: 'Padang Sabana',
    obstacleIcon: 'stream',
    obstacleName: 'sungai kecil',
    missionText: 'Kumpulkan 4 Rumput Segar sebelum ke Padang Sabana!',
    minSteps: 20,
    maxSteps: 27,
    deadEnds: 13,
    timeLimitSeconds: 28,
    fallbackStart: { row: 0, col: 6 },
    fallbackGrid: [
      [0, 0, 0, 0, 1, 0, 2],
      [0, 1, 1, 0, 1, 0, 1],
      [0, 1, 0, 0, 0, 0, 0],
      [0, 1, 0, 3, 1, 1, 0],
      [0, 0, 0, 1, 0, 0, 0],
      [1, 1, 0, 1, 0, 1, 0],
      [0, 0, 0, 0, 0, 1, 0],
    ],
  },
];

const OBSTACLE_TILE_STYLES: Record<ObstacleKind, string> = {
  bush: 'bg-[#DFF5E3] border-2 border-[#A7DFB5] shadow-sm',
  fence: 'bg-[#FEF3C7] border-2 border-[#FCD34D] shadow-sm',
  puddle: 'bg-[#E0F2FE] border-2 border-[#7DD3FC] shadow-sm',
  fallenlog: 'bg-[#FEF3C7] border-2 border-[#F59E0B]/50 shadow-sm',
  rock: 'bg-[#E2E8F0] border-2 border-[#94A3B8] shadow-sm',
  twigs: 'bg-[#FFEDD5] border-2 border-[#FDBA74] shadow-sm',
  cactus: 'bg-[#ECFCCB] border-2 border-[#A3E635] shadow-sm',
  bamboo: 'bg-[#DCFCE7] border-2 border-[#86EFAC] shadow-sm',
  stump: 'bg-[#FEF3C7] border-2 border-[#D97706]/45 shadow-sm',
  stream: 'bg-[#E0F2FE] border-2 border-[#38BDF8]/70 shadow-sm',
};

const MAX_SESSION_HINTS = 3;
const MAX_WALL_BUMPS = 3;
const MAX_LIVES = 3;

const cloneGrid = (grid: number[][]): number[][] =>
  grid.map((row) => [...row]);

const shuffleArray = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const gridSignature = (grid: number[][]): string =>
  grid.map((row) => row.join(',')).join(';');

const findSafePathToGoal = (
  grid: number[][],
  start: Position
): Set<string> => {
  const rows = grid.length;
  const cols = grid[0].length;
  const queue: Position[] = [start];
  const visited = new Set<string>([`${start.row}-${start.col}`]);
  const parent = new Map<string, string>();
  const dirs = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  let goalKey: string | null = null;
  let head = 0;

  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    const currentKey = `${current.row}-${current.col}`;
    if (grid[current.row][current.col] === 3) {
      goalKey = currentKey;
      break;
    }

    for (const d of dirs) {
      const nextRow = current.row + d.row;
      const nextCol = current.col + d.col;
      if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) {
        continue;
      }
      if (grid[nextRow][nextCol] === 1) continue;
      const nextKey = `${nextRow}-${nextCol}`;
      if (visited.has(nextKey)) continue;
      visited.add(nextKey);
      parent.set(nextKey, currentKey);
      queue.push({ row: nextRow, col: nextCol });
    }
  }

  const path = new Set<string>();
  let cursor = goalKey;
  while (cursor) {
    path.add(cursor);
    cursor = parent.get(cursor) ?? null;
  }
  return path;
};

const getReachableWalkableCells = (
  grid: number[][],
  start: Position
): Position[] => {
  const rows = grid.length;
  const cols = grid[0].length;
  const queue: Position[] = [start];
  const visited = new Set<string>([`${start.row}-${start.col}`]);
  const reachable: Position[] = [];
  const dirs = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  let head = 0;
  while (head < queue.length) {
    const current = queue[head];
    head += 1;

    if (grid[current.row][current.col] === 0) {
      reachable.push(current);
    }

    for (const d of dirs) {
      const nr = current.row + d.row;
      const nc = current.col + d.col;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (grid[nr][nc] === 1) continue;
      const key = `${nr}-${nc}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ row: nr, col: nc });
    }
  }

  return reachable;
};

const placeCollectiblesForGrid = (
  grid: number[][],
  start: Position,
  count: number
): Position[] => {
  const reachable = shuffleArray(getReachableWalkableCells(grid, start));
  if (reachable.length <= count) {
    return reachable;
  }

  const selected: Position[] = [];
  const remaining = [...reachable];

  // Pilih posisi item misi yang tersebar rapi (tidak menumpuk berdekatan)
  while (selected.length < count && remaining.length > 0) {
    if (selected.length === 0) {
      // Mulai dari sel yang berjarak >= 1 dari titik start agar terasa eksploratif
      const awayIdx = remaining.findIndex(
        (p) => Math.abs(p.row - start.row) + Math.abs(p.col - start.col) >= 2
      );
      const pickIdx = awayIdx !== -1 ? awayIdx : 0;
      selected.push(remaining.splice(pickIdx, 1)[0]);
      continue;
    }

    let bestIdx = 0;
    let bestMinDist = -1;
    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i];
      let minDist = Infinity;
      for (const s of selected) {
        const d = Math.abs(candidate.row - s.row) + Math.abs(candidate.col - s.col);
        if (d < minDist) minDist = d;
      }
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestIdx = i;
      }
    }
    selected.push(remaining.splice(bestIdx, 1)[0]);
  }

  return selected;
};

type MissionPathSolution = {
  totalSteps: number;
  hintPath: Set<string>;
  nextStepDirLabel?: string;
};

const solveMissionPath = (
  grid: number[][],
  start: Position,
  collectibles: Position[],
  initialMask = 0
): MissionPathSolution | null => {
  const rows = grid.length;
  const cols = grid[0].length;
  const fullMask = (1 << collectibles.length) - 1;
  const itemBitMap = new Map<string, number>();
  collectibles.forEach((pos, idx) => {
    itemBitMap.set(`${pos.row}-${pos.col}`, 1 << idx);
  });

  const startBit = itemBitMap.get(`${start.row}-${start.col}`) ?? 0;
  const startMask = initialMask | startBit;
  const startKey = `${start.row}-${start.col}-${startMask}`;

  type StateNode = {
    row: number;
    col: number;
    mask: number;
    key: string;
  };

  const queue: StateNode[] = [
    { row: start.row, col: start.col, mask: startMask, key: startKey },
  ];
  const visited = new Set<string>([startKey]);
  const parent = new Map<
    string,
    { prevKey: string | null; row: number; col: number; mask: number }
  >();
  parent.set(startKey, {
    prevKey: null,
    row: start.row,
    col: start.col,
    mask: startMask,
  });

  const dirs = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  let goalKey: string | null = null;
  let head = 0;

  while (head < queue.length) {
    const cur = queue[head];
    head += 1;

    if (grid[cur.row][cur.col] === 3 && cur.mask === fullMask) {
      goalKey = cur.key;
      break;
    }

    for (const d of dirs) {
      const nr = cur.row + d.row;
      const nc = cur.col + d.col;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (grid[nr][nc] === 1) continue;

      const pickedBit = itemBitMap.get(`${nr}-${nc}`) ?? 0;
      const nextMask = cur.mask | pickedBit;
      const nextKey = `${nr}-${nc}-${nextMask}`;
      if (visited.has(nextKey)) continue;

      visited.add(nextKey);
      parent.set(nextKey, {
        prevKey: cur.key,
        row: nr,
        col: nc,
        mask: nextMask,
      });
      queue.push({ row: nr, col: nc, mask: nextMask, key: nextKey });
    }
  }

  if (!goalKey) return null;

  const states: Array<{ row: number; col: number; mask: number }> = [];
  let cursor: string | null = goalKey;
  while (cursor) {
    const node = parent.get(cursor);
    if (!node) break;
    states.push({ row: node.row, col: node.col, mask: node.mask });
    cursor = node.prevKey;
  }
  states.reverse();

  // Untuk Hint agar jelas bagi anak: sorot jalur optimal menuju item berikutnya, atau langsung ke tujuan jika semua sudah terkumpul
  const hintPath = new Set<string>();
  for (let i = 0; i < states.length; i += 1) {
    const st = states[i];
    hintPath.add(`${st.row}-${st.col}`);
    if (startMask < fullMask && i > 0 && st.mask !== startMask) {
      break;
    }
  }

  let nextStepDirLabel: string | undefined;
  if (states.length >= 2) {
    const dr = states[1].row - states[0].row;
    const dc = states[1].col - states[0].col;
    if (dr < 0) nextStepDirLabel = 'ke atas';
    else if (dr > 0) nextStepDirLabel = 'ke bawah';
    else if (dc < 0) nextStepDirLabel = 'ke kiri';
    else if (dc > 0) nextStepDirLabel = 'ke kanan';
  }

  return {
    totalSteps: Math.max(1, states.length - 1),
    hintPath,
    nextStepDirLabel,
  };
};

const generateRandomMaze = (
  config: LevelConfig,
  previousSignature?: string
): GeneratedMaze => {
  const SIZE = config.gridSize;
  const maxCoord = SIZE - 1;
  const midCoord = Math.floor(SIZE / 2);
  const dirs = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  const cornerPairs: Array<{ start: Position; goal: Position }> = [
    { start: { row: 0, col: 0 }, goal: { row: maxCoord, col: maxCoord } },
    { start: { row: maxCoord, col: 0 }, goal: { row: 0, col: maxCoord } },
    { start: { row: 0, col: maxCoord }, goal: { row: maxCoord, col: 0 } },
    { start: { row: maxCoord, col: maxCoord }, goal: { row: 0, col: 0 } },
  ];

  const isInside = (r: number, c: number) =>
    r >= 0 && r < SIZE && c >= 0 && c < SIZE;

  const countOpenNeighbors = (grid: number[][], r: number, c: number) => {
    let count = 0;
    for (const d of dirs) {
      const nr = r + d.row;
      const nc = c + d.col;
      if (isInside(nr, nc) && grid[nr][nc] !== 1) {
        count += 1;
      }
    }
    return count;
  };

  let bestCandidate: GeneratedMaze | null = null;
  let bestScore = Infinity;

  for (let attempt = 0; attempt < 220; attempt += 1) {
    const pair = cornerPairs[Math.floor(Math.random() * cornerPairs.length)];
    const start = pair.start;
    const goal =
      config.level >= 3 && Math.random() < 0.38
        ? { row: midCoord, col: midCoord }
        : pair.goal;

    const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(1));
    const path: Position[] = [start];
    grid[start.row][start.col] = 0;
    let carveCalls = 0;

    // Ukir jalur utama acak dari start menuju goal tanpa membuat blok terbuka 2x2
    const carvePath = (r: number, c: number): boolean => {
      carveCalls += 1;
      if (carveCalls > 3200) return false;

      if (r === goal.row && c === goal.col) {
        return true;
      }

      const candidates = shuffleArray(dirs).filter((d) => {
        const nr = r + d.row;
        const nc = c + d.col;
        if (!isInside(nr, nc) || grid[nr][nc] !== 1) return false;
        return countOpenNeighbors(grid, nr, nc) <= 1;
      });

      // Pada level lebih tinggi, variasi belokan lebih sering menjauh dulu agar jalur berkelok
      const windingChance = Math.min(0.65, 0.2 + config.level * 0.045);
      if (config.level >= 2 && candidates.length > 1 && Math.random() < windingChance) {
        candidates.sort((a, b) => {
          const distA =
            Math.abs(r + a.row - goal.row) + Math.abs(c + a.col - goal.col);
          const distB =
            Math.abs(r + b.row - goal.row) + Math.abs(c + b.col - goal.col);
          return distB - distA;
        });
      }

      for (const d of candidates) {
        const nr = r + d.row;
        const nc = c + d.col;
        grid[nr][nc] = 0;
        path.push({ row: nr, col: nc });
        if (carvePath(nr, nc)) return true;
        path.pop();
        grid[nr][nc] = 1;
      }
      return false;
    };

    const carved = carvePath(start.row, start.col);
    if (!carved) continue;

    // Tandai titik awal (2) & tujuan hutan (3)
    grid[start.row][start.col] = 2;
    grid[goal.row][goal.col] = 3;

    // Tambahkan cabang buntu acak sesuai tingkat rintangan level
    const branchSeeds = shuffleArray(
      path.filter(
        (pos) => !(pos.row === goal.row && pos.col === goal.col)
      )
    );

    let addedDeadEnds = 0;
    const maxBranchLen = SIZE >= 7 ? 4 : 3;
    for (const seed of branchSeeds) {
      if (addedDeadEnds >= config.deadEnds) break;
      let curR = seed.row;
      let curC = seed.col;
      const branchLen = 1 + Math.floor(Math.random() * maxBranchLen);
      let grew = false;

      for (let step = 0; step < branchLen; step += 1) {
        const nextDirs = shuffleArray(dirs).filter((d) => {
          const nr = curR + d.row;
          const nc = curC + d.col;
          return (
            isInside(nr, nc) &&
            grid[nr][nc] === 1 &&
            countOpenNeighbors(grid, nr, nc) === 1
          );
        });
        if (nextDirs.length === 0) break;
        const chosen = nextDirs[0];
        curR += chosen.row;
        curC += chosen.col;
        grid[curR][curC] = 0;
        grew = true;
      }

      if (grew) {
        addedDeadEnds += 1;
      }
    }

    const sig = gridSignature(grid);
    if (previousSignature && sig === previousSignature) continue;

    const shortestPath = findSafePathToGoal(grid, start);
    if (shortestPath.size === 0) continue;

    const collectibles = placeCollectiblesForGrid(
      grid,
      start,
      config.collectibleCount
    );
    const missionSolution = solveMissionPath(grid, start, collectibles, 0);
    if (!missionSolution) continue;

    const stepCount = shortestPath.size - 1;
    const candidate: GeneratedMaze = {
      grid,
      startPos: start,
      initialFacing: start.col >= midCoord ? 'LEFT' : 'RIGHT',
      collectibles,
      optimalSteps: missionSolution.totalSteps,
    };

    if (stepCount >= config.minSteps && stepCount <= config.maxSteps) {
      return candidate;
    }

    const targetMid = (config.minSteps + config.maxSteps) / 2;
    const score = Math.abs(stepCount - targetMid);
    if (score < bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  if (bestCandidate) {
    return bestCandidate;
  }

  const fallbackGrid = cloneGrid(config.fallbackGrid);
  const fallbackCollectibles = placeCollectiblesForGrid(
    fallbackGrid,
    config.fallbackStart,
    config.collectibleCount
  );
  const fallbackSolution = solveMissionPath(
    fallbackGrid,
    config.fallbackStart,
    fallbackCollectibles,
    0
  );
  return {
    grid: fallbackGrid,
    startPos: config.fallbackStart,
    initialFacing: config.fallbackStart.col >= midCoord ? 'LEFT' : 'RIGHT',
    collectibles: fallbackCollectibles,
    optimalSteps: fallbackSolution?.totalSteps ?? config.minSteps,
  };
};

const calculateLevelResult = ({
  won,
  stepsTaken,
  optimalSteps,
  timeLeft,
  timeLimit,
}: {
  won: boolean;
  stepsTaken: number;
  optimalSteps: number;
  timeLeft: number;
  timeLimit: number;
}): LevelResult => {
  if (!won) {
    return {
      won: false,
      stepsTaken,
      optimalSteps,
      efficiencyPct: 0,
      stepScore: 0,
      timeLeft: 0,
      timeLimit,
      timeScore: 0,
      totalScore: 0,
      stars: 0,
    };
  }

  const safeSteps = Math.max(1, stepsTaken);
  const extraSteps = Math.max(0, safeSteps - optimalSteps);
  const efficiencyPct = Math.min(
    100,
    Math.round((optimalSteps / safeSteps) * 100)
  );
  const stepScore = Math.max(150, 500 - extraSteps * 35);
  const timeScore = Math.max(0, timeLeft) * 10;
  const totalScore = stepScore + timeScore;

  let stars = 1;
  if (timeLeft >= timeLimit * 0.42 && extraSteps <= 2) {
    stars = 3;
  } else if (timeLeft >= timeLimit * 0.22 || extraSteps <= 5) {
    stars = 2;
  }

  return {
    won: true,
    stepsTaken: safeSteps,
    optimalSteps,
    efficiencyPct,
    stepScore,
    timeLeft,
    timeLimit,
    timeScore,
    totalScore,
    stars,
  };
};

type TrailParticle = {
  id: number;
  row: number;
  col: number;
  offsetX: number;
  offsetY: number;
  driftX: number;
  driftY: number;
  rotate: number;
  scale: number;
  kind: 'star' | 'leaf';
  color: string;
};

type CollectedPopup = {
  id: number;
  row: number;
  col: number;
  kind: CollectibleKind;
};

const LEVEL_SWIPE_VARIANTS = {
  enter: (dir: 'LEFT' | 'RIGHT') => ({
    x: dir === 'RIGHT' ? '100%' : '-100%',
    opacity: 0.25,
    scale: 0.97,
  }),
  center: {
    x: '0%',
    opacity: 1,
    scale: 1,
  },
  exit: (dir: 'LEFT' | 'RIGHT') => ({
    x: dir === 'RIGHT' ? '-100%' : '100%',
    opacity: 0.15,
    scale: 0.97,
  }),
};

const LEVEL_SWIPE_REDUCED_VARIANTS = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

const STAR_RATING_CONTAINER_VARIANTS = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.16,
      staggerChildren: 0.22,
    },
  },
};

const STAR_SLOT_STAGGER_VARIANTS = {
  hidden: {},
  visible: {},
};

const STAR_EARNED_POP_VARIANTS = {
  hidden: {
    scale: 0,
    opacity: 0,
    y: 14,
    rotate: -38,
  },
  visible: {
    scale: 1,
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 410,
      damping: 10,
      mass: 0.82,
      opacity: { duration: 0.14, ease: 'easeOut' as const },
    },
  },
};

const STAR_SPARKLE_RING_VARIANTS = {
  hidden: {
    scale: 0.35,
    opacity: 0,
  },
  visible: {
    scale: [0.4, 1.55],
    opacity: [0.95, 0],
    transition: {
      duration: 0.48,
      ease: 'easeOut' as const,
    },
  },
};

const STAR_SPARKLE_DOT_VARIANTS = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: (pos: { x: number; y: number }) => ({
    x: [0, pos.x],
    y: [0, pos.y],
    scale: [0, 1.15, 0],
    opacity: [0, 1, 0],
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  }),
};

const STAR_SPARKLE_OFFSETS = [
  { x: -16, y: -15 },
  { x: 16, y: -15 },
  { x: -18, y: 12 },
  { x: 18, y: 12 },
];

export default function App() {
  const [level, setLevel] = useState<number>(1);
  const currentLevelConfig = LEVELS[level - 1];

  const [initialSetup] = useState<GeneratedMaze>(() =>
    generateRandomMaze(LEVELS[0])
  );

  const [maze, setMaze] = useState<number[][]>(initialSetup.grid);
  const [deerPos, setDeerPos] = useState<Position>(initialSetup.startPos);
  const [collectibles, setCollectibles] = useState<Position[]>(
    initialSetup.collectibles
  );
  const [collectedIndices, setCollectedIndices] = useState<Set<number>>(
    () => new Set()
  );
  const [visitedCells, setVisitedCells] = useState<Set<string>>(
    () => new Set([`${initialSetup.startPos.row}-${initialSetup.startPos.col}`])
  );
  const [steps, setSteps] = useState<number>(0);
  const [optimalSteps, setOptimalSteps] = useState<number>(
    initialSetup.optimalSteps
  );
  const [timeLeft, setTimeLeft] = useState<number>(
    LEVELS[0].timeLimitSeconds
  );
  const [lives, setLives] = useState<number>(MAX_LIVES);
  const [bumpCount, setBumpCount] = useState<number>(0);
  const [bumpAnimTick, setBumpAnimTick] = useState<number>(0);
  const [isDizzyPenalty, setIsDizzyPenalty] = useState<boolean>(false);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);
  const [hasWon, setHasWon] = useState<boolean>(false);
  const [goalFireworkBurst, setGoalFireworkBurst] =
    useState<GoalFireworkBurst | null>(null);
  const [levelResult, setLevelResult] = useState<LevelResult | null>(null);
  const [levelBestScores, setLevelBestScores] = useState<Record<number, number>>(
    {}
  );
  const [levelBestStars, setLevelBestStars] = useState<Record<number, number>>(
    {}
  );
  const [isEndingOpen, setIsEndingOpen] = useState<boolean>(false);
  const [isBumping, setIsBumping] = useState<boolean>(false);
  const [feedbackText, setFeedbackText] = useState<string>(
    LEVELS[0].missionText
  );
  const [facing, setFacing] = useState<'LEFT' | 'RIGHT'>(
    initialSetup.initialFacing
  );
  const [levelSwipeDir, setLevelSwipeDir] = useState<'LEFT' | 'RIGHT'>(
    initialSetup.initialFacing
  );
  const [trailParticles, setTrailParticles] = useState<TrailParticle[]>([]);
  const [collectedPopups, setCollectedPopups] = useState<CollectedPopup[]>([]);
  const [hintsLeft, setHintsLeft] = useState<number>(MAX_SESSION_HINTS);
  const [hintCells, setHintCells] = useState<Set<string>>(() => new Set());
  const [lastMoveTick, setLastMoveTick] = useState<number>(0);
  const [boardVersion, setBoardVersion] = useState<number>(1);
  const [shareStatus, setShareStatus] = useState<
    'idle' | 'shared' | 'copied' | 'error'
  >('idle');
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [screenState, setScreenState] = useState<ScreenState>('SCREEN_COVER');
  const [gameMode, setGameMode] = useState<GameMode>('solo');
  const [playerName, setPlayerName] = useState<string>('Rusa Kecil');
  const [companionName, setCompanionName] = useState<string>('Ibu Guru');
  const [groupName, setGroupName] = useState<string>('Bintang Hutan');
  const [groupPlayers, setGroupPlayers] = useState<string[]>([
    'Anak 1',
    'Anak 2',
  ]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [groupTurnResults, setGroupTurnResults] = useState<GroupTurnResult[]>(
    []
  );
  const [previousTurnResult, setPreviousTurnResult] =
    useState<GroupTurnResult | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<
    LeaderboardEntry[]
  >(() => INITIAL_LEADERBOARD_MOCK);
  const [latestWinSummary, setLatestWinSummary] = useState<{
    level: number;
    score: number;
    timeUsedSeconds: number;
    stars: number;
  } | null>(null);
  const [weatherOverride, setWeatherOverride] = useState<'auto' | WeatherKind>(
    'auto'
  );
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [dpadPulse, setDpadPulse] = useState<{ dir: Direction; tick: number }>({
    dir: 'UP',
    tick: 0,
  });
  const [activeDpadDir, setActiveDpadDir] = useState<Direction | null>(null);
  const [lifeLostAnim, setLifeLostAnim] = useState<{
    lostIndex: number;
    tick: number;
  } | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState<boolean>(false);
  const [isGameSettingsOpen, setIsGameSettingsOpen] = useState<boolean>(false);
  const [isBonusPromptOpen, setIsBonusPromptOpen] = useState<boolean>(false);
  const [isBonusLevelActive, setIsBonusLevelActive] = useState<boolean>(false);
  const [hasDeclinedBonusPromptInLevel, setHasDeclinedBonusPromptInLevel] =
    useState<boolean>(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    try {
      const saved = window.localStorage.getItem('forest_maze_display_mode_v1');
      if (saved === 'landscape' || saved === 'portrait') {
        return saved;
      }
    } catch {
      // Abaikan jika localStorage tidak tersedia
    }
    return 'portrait';
  });
  const [isAppreciationOpen, setIsAppreciationOpen] = useState<boolean>(false);
  const [isDidYouKnowOpen, setIsDidYouKnowOpen] = useState<boolean>(false);
  const [didYouKnowFact, setDidYouKnowFact] =
    useState<AnimalDidYouKnowFact | null>(null);
  const seenDidYouKnowIdsRef = useRef<Set<string>>(new Set());
  const [licenseSession, setLicenseSession] =
    useState<StoredLicenseSession | null>(() => {
      getOrCreateDeviceId();
      return loadStoredLicenseSession();
    });
  const [licenseClockTick, setLicenseClockTick] = useState<number>(() =>
    Date.now()
  );
  const isLicenseActive = isLicenseSessionValid(
    licenseSession,
    licenseClockTick
  );
  const licenseBadgeLabel = formatLicenseStatusBadge(
    licenseSession,
    licenseClockTick
  );
  const licenseDetailText = formatLicenseCountdownDetail(
    licenseSession,
    licenseClockTick
  );
  const [isLicensePopupOpen, setIsLicensePopupOpen] = useState<boolean>(false);
  const pendingLevelTransitionRef = useRef<(() => void) | null>(null);
  const [keyBindings, setKeyBindings] = useState<KeyBindingsMap>(() =>
    loadKeyBindings()
  );
  const [showShortcutLabels, setShowShortcutLabels] = useState<boolean>(() =>
    loadShowShortcutLabels()
  );
  const [inGameSettingsTab, setInGameSettingsTab] = useState<
    'general' | 'keyboard'
  >('general');
  const [isRecordingInGameKey, setIsRecordingInGameKey] =
    useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() =>
    sfxEngine.isEnabled()
  );
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(() =>
    bgmEngine.isEnabled()
  );
  const [narratorEnabled, setNarratorEnabled] = useState<boolean>(() =>
    narrator.isEnabled()
  );
  const [ambientEnabled, setAmbientEnabled] = useState<boolean>(() =>
    ambientEngine.isEnabled()
  );
  const [isNarrating, setIsNarrating] = useState<boolean>(false);
  const narratorRef = useRef<HTMLAudioElement | null>(null);
  const narratedLevelKeyRef = useRef<string>('');
  const prevScreenForNarratorRef = useRef<ScreenState>('SCREEN_COVER');

  const gameSettingsRef = useRef<HTMLDivElement | null>(null);
  const bonusPromptRef = useRef<HTMLDivElement | null>(null);
  const exitConfirmRef = useRef<HTMLDivElement | null>(null);
  const pauseModalRef = useRef<HTMLDivElement | null>(null);
  const endLevelRef = useRef<HTMLElement | null>(null);
  const openedSettingsViaShutterRef = useRef<boolean>(false);
  const prevTimeLeftRef = useRef<number>(LEVELS[0].timeLimitSeconds);
  const prevModalStatesRef = useRef<{
    isGameSettingsOpen: boolean;
    isPaused: boolean;
    isExitConfirmOpen: boolean;
    isTutorialOpen: boolean;
    isLicensePopupOpen: boolean;
    isBonusPromptOpen: boolean;
    isLeaderboardOpen: boolean;
    isAppreciationOpen: boolean;
    isDidYouKnowOpen: boolean;
  }>({
    isGameSettingsOpen: false,
    isPaused: false,
    isExitConfirmOpen: false,
    isTutorialOpen: false,
    isLicensePopupOpen: false,
    isBonusPromptOpen: false,
    isLeaderboardOpen: false,
    isAppreciationOpen: false,
    isDidYouKnowOpen: false,
  });

  const [levelTip, setLevelTip] = useState<string>(() =>
    pickLevelAnimalTip(LEVELS[0].characterKey)
  );
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isGameSettingsOpen) {
      setInGameSettingsTab('general');
      setIsRecordingInGameKey(false);
    }
  }, [isGameSettingsOpen]);

  const handleUpdateKeyBinding = useCallback(
    (action: KeyActionId, newCode: string) => {
      setKeyBindings((prev) => {
        const previousPrimary = prev[action]?.[0];
        const next: KeyBindingsMap = { ...prev };
        (Object.keys(next) as KeyActionId[]).forEach((id) => {
          if (id === action) {
            next[id] = [newCode];
          } else if (next[id].includes(newCode)) {
            const filtered = next[id].filter((code) => code !== newCode);
            if (filtered.length > 0) {
              next[id] = filtered;
            } else if (previousPrimary && previousPrimary !== newCode) {
              next[id] = [previousPrimary];
            } else {
              next[id] = [];
            }
          }
        });
        saveKeyBindings(next);
        return next;
      });
    },
    []
  );

  const handleResetKeyBindings = useCallback(() => {
    const defaults = cloneDefaultKeyBindings();
    setKeyBindings(defaults);
    saveKeyBindings(defaults);
  }, []);

  const handleToggleShowShortcutLabels = useCallback(() => {
    const next = !showShortcutLabels;
    setShowShortcutLabels(next);
    saveShowShortcutLabels(next);
    sfxEngine.playSwitch(next);
  }, [showShortcutLabels]);

  const handleToggleSound = useCallback(() => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sfxEngine.setEnabled(next);
    bgmEngine.setMasterMuted(!next);
    narrator.setMasterMuted(!next);
    ambientEngine.setMasterMuted(!next);
    if (next) {
      bgmEngine.unlock();
      ambientEngine.unlock();
      narrator.unlock();
    }
    sfxEngine.playSwitch(next, true);
  }, [soundEnabled]);

  const handleToggleBgm = useCallback(() => {
    const next = !bgmEnabled;
    setBgmEnabled(next);
    bgmEngine.setEnabled(next);
    if (next && soundEnabled) {
      bgmEngine.unlock();
    }
    sfxEngine.playSwitch(next);
  }, [bgmEnabled, soundEnabled]);

  const handleToggleNarrator = useCallback(() => {
    const next = !narratorEnabled;
    setNarratorEnabled(next);
    narrator.setEnabled(next);
    if (next && soundEnabled) {
      narrator.unlock();
    }
    sfxEngine.playSwitch(next);
  }, [narratorEnabled, soundEnabled]);

  const handleToggleAmbient = useCallback(() => {
    const next = !ambientEnabled;
    setAmbientEnabled(next);
    ambientEngine.setEnabled(next);
    if (next && soundEnabled) {
      ambientEngine.unlock();
    }
    sfxEngine.playSwitch(next);
  }, [ambientEnabled, soundEnabled]);

  const handleToggleWeather = useCallback(() => {
    sfxEngine.playWeather();
    setWeatherOverride((prev) => {
      const currentActive =
        prev === 'auto'
          ? level === 3 || level === 6 || level === 9 || level === 10
            ? 'fireflies'
            : 'leaves'
          : prev;
      return currentActive === 'leaves' ? 'fireflies' : 'leaves';
    });
  }, [level]);

  // Sinkronkan referensi HTML5 Audio terpusat (narratorRef), listener status, & mute utama pada Narator Suara
  useEffect(() => {
    narrator.bindNarratorRef(narratorRef);
    return narrator.subscribe(setIsNarrating);
  }, []);

  useEffect(() => {
    narrator.setMasterMuted(!soundEnabled);
  }, [soundEnabled]);

  // Hentikan narasi otomatis saat pengguna berpindah layar, serta putar voice-pilih-mode.mp3 / voice-kenalan.mp3 / voice-prolog-naedie.mp3 / voice-level-{nomorLevel}.mp3 sesuai layar
  useEffect(() => {
    if (prevScreenForNarratorRef.current !== screenState) {
      prevScreenForNarratorRef.current = screenState;
      if (screenState === 'SELECT_MODE') {
        if (narrator.getActiveSrc() !== './assets/voice/voice-pilih-mode.mp3') {
          narrator.playSelectModeVoice();
        }
      } else if (screenState === 'SETUP') {
        if (narrator.getActiveSrc() !== './assets/voice/voice-kenalan.mp3') {
          narrator.playSetupVoice();
        }
      } else if (screenState === 'PROLOGUE') {
        if (
          narrator.getActiveSrc() !== './assets/voice/voice-prolog-naedie.mp3'
        ) {
          narrator.playPrologueNaedieVoice();
        }
      } else if (screenState === 'PLAYING') {
        if (!narrator.isPlayingLevelIntro(level)) {
          narrator.playLevelIntroVoice(level);
        }
      } else if (screenState === 'TRANSITION') {
        narrator.stop();
        narrator.preloadLevelIntroVoice(level);
      } else {
        narrator.stop();
      }
    }
  }, [level, screenState]);

  // Smart Next-Audio Preloading ringan selama pemain berada di papan permainan
  useEffect(() => {
    if (screenState !== 'PLAYING' || isEndingOpen) return;
    if (level < LEVELS.length) {
      narrator.preloadLevelIntroVoice(level + 1);
    } else {
      narrator.preloadTrack('epilogGuru');
    }
  }, [isEndingOpen, level, screenState, hasWon]);

  // Sinkronkan arsitektur BGM & Ambient Hutan terhadap status mute utama
  useEffect(() => {
    bgmEngine.setMasterMuted(!soundEnabled);
    ambientEngine.setMasterMuted(!soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    bgmEngine.syncGameState({
      screenState: isEndingOpen ? 'PROLOGUE' : screenState,
      isBonusLevelActive,
      hasWon: isEndingOpen ? false : hasWon,
      isTimeUp,
    });
  }, [screenState, isBonusLevelActive, hasWon, isTimeUp, isEndingOpen]);

  // Aktivasi otomatis AudioContext pada interaksi pertama + suara klik pop lembut global untuk tombol umum
  useEffect(() => {
    const handleUnlock = () => {
      sfxEngine.unlock();
      bgmEngine.unlock();
      ambientEngine.unlock();
      narrator.unlock();
    };

    const handleGlobalButtonClick = (event: MouseEvent) => {
      sfxEngine.unlock();
      bgmEngine.unlock();
      ambientEngine.unlock();
      narrator.unlock();
      const target = event.target as HTMLElement | null;
      const btn = target?.closest('button, [role="button"]') as HTMLElement | null;
      if (!btn) return;
      if (
        btn.hasAttribute('disabled') ||
        btn.getAttribute('aria-disabled') === 'true'
      ) {
        return;
      }
      if (btn.closest('[data-sfx="custom"]')) {
        return;
      }

      window.setTimeout(() => {
        if (!sfxEngine.wasCustomSfxJustTriggered(90)) {
          sfxEngine.playButtonPop();
        }
      }, 0);
    };

    window.addEventListener('pointerdown', handleUnlock, {
      passive: true,
      capture: true,
    });
    window.addEventListener('touchstart', handleUnlock, {
      passive: true,
      capture: true,
    });
    window.addEventListener('keydown', handleUnlock, {
      passive: true,
      capture: true,
    });
    document.addEventListener('click', handleGlobalButtonClick, true);

    return () => {
      window.removeEventListener('pointerdown', handleUnlock, true);
      window.removeEventListener('touchstart', handleUnlock, true);
      window.removeEventListener('keydown', handleUnlock, true);
      document.removeEventListener('click', handleGlobalButtonClick, true);
    };
  }, []);

  // Efek suara whoosh buka/tutup jendela modal secara konsisten
  useEffect(() => {
    const prev = prevModalStatesRef.current;

    if (isGameSettingsOpen !== prev.isGameSettingsOpen) {
      if (isGameSettingsOpen) {
        if (screenState === 'PLAYING') {
          narrator.stop();
        }
        if (openedSettingsViaShutterRef.current) {
          openedSettingsViaShutterRef.current = false;
        } else {
          sfxEngine.playModalOpen();
        }
      } else {
        sfxEngine.playModalClose();
      }
    }

    if (isPaused !== prev.isPaused) {
      if (isPaused) {
        narrator.stop();
        sfxEngine.playModalOpen();
      } else if (!hasWon && !isTimeUp && !isDizzyPenalty && screenState === 'PLAYING') {
        sfxEngine.playModalClose();
      }
    }

    if (isExitConfirmOpen !== prev.isExitConfirmOpen) {
      if (isExitConfirmOpen) {
        narrator.stop();
        sfxEngine.playModalOpen();
      } else {
        sfxEngine.playModalClose();
      }
    }

    if (isTutorialOpen !== prev.isTutorialOpen) {
      if (isTutorialOpen) {
        narrator.stop();
        sfxEngine.playModalOpen();
      } else {
        sfxEngine.playModalClose();
      }
    }

    if (isLicensePopupOpen !== prev.isLicensePopupOpen) {
      if (isLicensePopupOpen) {
        narrator.stop();
        sfxEngine.playModalOpen();
      } else {
        sfxEngine.playModalClose();
      }
    }

    if (isBonusPromptOpen !== prev.isBonusPromptOpen) {
      if (isBonusPromptOpen) {
        sfxEngine.playModalOpen();
        if (!isBonusLevelActive) {
          narrator.playBonusPrologVoice();
        }
      } else {
        narrator.stop();
        if (!isBonusLevelActive) {
          sfxEngine.playModalClose();
        }
      }
    }

    if (isLeaderboardOpen !== prev.isLeaderboardOpen) {
      if (isLeaderboardOpen) {
        if (!hasWon) {
          narrator.stop();
          sfxEngine.playModalOpen();
        }
      } else {
        sfxEngine.playModalClose();
      }
    }

    if (isAppreciationOpen !== prev.isAppreciationOpen) {
      if (isAppreciationOpen) {
        bgmEngine.duckForNarration(3500);
      } else {
        bgmEngine.setDucked(false);
        if (!hasWon && screenState === 'PLAYING') {
          sfxEngine.playModalClose();
        }
      }
    }

    if (isDidYouKnowOpen !== prev.isDidYouKnowOpen) {
      if (isDidYouKnowOpen) {
        bgmEngine.duckForNarration(3200);
      } else {
        bgmEngine.setDucked(false);
        if (!hasWon && screenState === 'PLAYING') {
          sfxEngine.playModalClose();
        }
      }
    }

    prevModalStatesRef.current = {
      isGameSettingsOpen,
      isPaused,
      isExitConfirmOpen,
      isTutorialOpen,
      isLicensePopupOpen,
      isBonusPromptOpen,
      isLeaderboardOpen,
      isAppreciationOpen,
      isDidYouKnowOpen,
    };
  }, [
    hasWon,
    isAppreciationOpen,
    isBonusLevelActive,
    isBonusPromptOpen,
    isDidYouKnowOpen,
    isDizzyPenalty,
    isExitConfirmOpen,
    isGameSettingsOpen,
    isLeaderboardOpen,
    isLicensePopupOpen,
    isPaused,
    isTimeUp,
    isTutorialOpen,
    screenState,
  ]);

  // Dengarkan custom event 'open-license-popup' untuk membuka pop-up verifikasi lisensi
  useEffect(() => {
    const handleOpenLicenseEvent = () => {
      setIsLicensePopupOpen(true);
    };
    window.addEventListener('open-license-popup', handleOpenLicenseEvent);
    return () => {
      window.removeEventListener('open-license-popup', handleOpenLicenseEvent);
    };
  }, []);

  const handleChangeDisplayMode = useCallback((nextMode: DisplayMode) => {
    setDisplayMode(nextMode);
    try {
      window.localStorage.setItem('forest_maze_display_mode_v1', nextMode);
    } catch {
      // Abaikan jika localStorage tidak tersedia
    }
  }, []);

  const isOverlayFlowActive = screenState !== 'PLAYING' || isEndingOpen;
  const bumpTimeoutRef = useRef<number | null>(null);
  const confettiTimeoutRef = useRef<number | null>(null);
  const hintTimeoutRef = useRef<number | null>(null);
  const shareTimeoutRef = useRef<number | null>(null);
  const dpadTimeoutRef = useRef<number | null>(null);
  const lifeBounceTimeoutRef = useRef<number | null>(null);
  const particleIdRef = useRef<number>(0);
  const particleTimeoutsRef = useRef<Set<number>>(new Set());
  const collectedPopupIdRef = useRef<number>(0);
  const collectedPopupTimeoutsRef = useRef<Set<number>>(new Set());
  const goalCellRef = useRef<HTMLDivElement | null>(null);
  const fireworkTickRef = useRef<number>(0);

  const triggerBumpFeedback = useCallback((message: string) => {
    setFeedbackText(message);
    setIsBumping(true);
    setBumpAnimTick((prev) => prev + 1);
    if (bumpTimeoutRef.current !== null) {
      window.clearTimeout(bumpTimeoutRef.current);
    }
    bumpTimeoutRef.current = window.setTimeout(() => {
      setIsBumping(false);
    }, 680);
  }, []);

  const fireVictoryConfetti = useCallback(() => {
    if (shouldReduceMotion) return;
    try {
      const colors = [
        '#34D399',
        '#FBBF24',
        '#38BDF8',
        '#FB7185',
        '#A7F3D0',
        '#FDE68A',
      ];

      const isLowEndOrMobile =
        typeof window !== 'undefined' &&
        (window.matchMedia?.('(pointer: coarse)').matches ||
          (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4));
      const mainCount = isLowEndOrMobile ? 24 : 36;
      const sideCount = isLowEndOrMobile ? 14 : 20;

      void confetti({
        particleCount: mainCount,
        spread: 72,
        ticks: 150,
        origin: { y: 0.6 },
        colors,
        disableForReducedMotion: true,
        zIndex: 60,
      });

      if (confettiTimeoutRef.current !== null) {
        window.clearTimeout(confettiTimeoutRef.current);
      }
      confettiTimeoutRef.current = window.setTimeout(() => {
        void confetti({
          particleCount: sideCount,
          angle: 60,
          spread: 55,
          ticks: 150,
          origin: { x: 0.1, y: 0.65 },
          colors,
          disableForReducedMotion: true,
          zIndex: 60,
        });
        void confetti({
          particleCount: sideCount,
          angle: 120,
          spread: 55,
          ticks: 150,
          origin: { x: 0.9, y: 0.65 },
          colors,
          disableForReducedMotion: true,
          zIndex: 60,
        });
      }, 180);
    } catch {
      // Abaikan jika canvas confetti tidak didukung di lingkungan browser
    }
  }, [shouldReduceMotion]);

  const clearTrailParticles = useCallback(() => {
    particleTimeoutsRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    particleTimeoutsRef.current.clear();
    setTrailParticles([]);
  }, []);

  const spawnTrailParticles = useCallback(
    (fromPos: Position, direction: Direction) => {
      if (shouldReduceMotion) return;

      const palette = ['#FBBF24', '#34D399', '#FDE047', '#38BDF8', '#6EE7B7'];
      const dirBias = {
        UP: { x: 0, y: 10 },
        DOWN: { x: 0, y: -10 },
        LEFT: { x: 10, y: 0 },
        RIGHT: { x: -10, y: 0 },
      }[direction];

      const batch: TrailParticle[] = Array.from({ length: 3 }, (_, idx) => {
        particleIdRef.current += 1;
        const spreadX = (Math.random() - 0.5) * 26;
        const spreadY = (Math.random() - 0.5) * 22;
        return {
          id: particleIdRef.current,
          row: fromPos.row,
          col: fromPos.col,
          offsetX: spreadX * 0.45,
          offsetY: spreadY * 0.45,
          driftX: dirBias.x + spreadX * 0.75,
          driftY: dirBias.y - 12 + spreadY * 0.6,
          rotate: (Math.random() - 0.5) * 140,
          scale: 0.85 + Math.random() * 0.4,
          kind: idx % 2 === 0 ? 'star' : 'leaf',
          color: palette[(particleIdRef.current + idx) % palette.length],
        };
      });

      const batchIds = new Set(batch.map((p) => p.id));
      setTrailParticles((prev) => [...prev.slice(-9), ...batch]);

      const timerId = window.setTimeout(() => {
        particleTimeoutsRef.current.delete(timerId);
        setTrailParticles((prev) => prev.filter((p) => !batchIds.has(p.id)));
      }, 760);
      particleTimeoutsRef.current.add(timerId);
    },
    [shouldReduceMotion]
  );

  const clearCollectedPopups = useCallback(() => {
    collectedPopupTimeoutsRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    collectedPopupTimeoutsRef.current.clear();
    setCollectedPopups([]);
  }, []);

  const spawnCollectedPopup = useCallback(
    (pos: Position, kind: CollectibleKind) => {
      if (shouldReduceMotion) return;
      collectedPopupIdRef.current += 1;
      const popupId = collectedPopupIdRef.current;
      const newPopup: CollectedPopup = {
        id: popupId,
        row: pos.row,
        col: pos.col,
        kind,
      };
      setCollectedPopups((prev) => [...prev.slice(-6), newPopup]);

      const timerId = window.setTimeout(() => {
        collectedPopupTimeoutsRef.current.delete(timerId);
        setCollectedPopups((prev) => prev.filter((p) => p.id !== popupId));
      }, 680);
      collectedPopupTimeoutsRef.current.add(timerId);
    },
    [shouldReduceMotion]
  );

  const loadLevel = useCallback(
    (targetLevel: number) => {
      if (confettiTimeoutRef.current !== null) {
        window.clearTimeout(confettiTimeoutRef.current);
        confettiTimeoutRef.current = null;
      }
      narrator.stop();
      narrator.resetCollisionCooldown();
      if (hintTimeoutRef.current !== null) {
        window.clearTimeout(hintTimeoutRef.current);
        hintTimeoutRef.current = null;
      }
      if (shareTimeoutRef.current !== null) {
        window.clearTimeout(shareTimeoutRef.current);
        shareTimeoutRef.current = null;
      }
      clearTrailParticles();
      clearCollectedPopups();
      try {
        confetti.reset();
      } catch {
        // Abaikan jika canvas belum diinisialisasi
      }

      const config = LEVELS[targetLevel - 1] ?? LEVELS[0];
      const nextMaze = generateRandomMaze(config, gridSignature(maze));

      setLevel(config.level);
      setMaze(nextMaze.grid);
      setDeerPos(nextMaze.startPos);
      setCollectibles(nextMaze.collectibles);
      setCollectedIndices(new Set());
      setVisitedCells(
        new Set([`${nextMaze.startPos.row}-${nextMaze.startPos.col}`])
      );
      setSteps(0);
      setOptimalSteps(nextMaze.optimalSteps);
      setTimeLeft(config.timeLimitSeconds);
      setBumpCount(0);
      setIsDizzyPenalty(false);
      setIsTimeUp(false);
      setHasWon(false);
      setGoalFireworkBurst(null);
      setLevelResult(null);
      setIsBumping(false);
      // Kuota hint bersifat kumulatif sepanjang sesi permainan; tidak di-reset saat berganti/naik level
      setHintCells(new Set());
      setShareStatus('idle');
      setIsPaused(false);
      setIsBonusPromptOpen(false);
      setIsBonusLevelActive(false);
      setHasDeclinedBonusPromptInLevel(false);
      setIsAppreciationOpen(false);
      setIsDidYouKnowOpen(false);
      setIsLeaderboardOpen(false);
      setLatestWinSummary(null);
      setFacing(nextMaze.initialFacing);
      setLevelSwipeDir(nextMaze.initialFacing);
      if (config.level !== level) {
        setWeatherOverride('auto');
      }
      setLevelTip((prev) => pickLevelAnimalTip(config.characterKey, prev));
      setBoardVersion((prev) => prev + 1);
      setLastMoveTick((prev) => prev + 1);
      setFeedbackText(config.missionText);
    },
    [clearCollectedPopups, clearTrailParticles, level, maze]
  );

  const advanceGroupTurn = useCallback(
    (turnResult: GroupTurnResult) => {
      narrator.stop();
      setGroupTurnResults((prev) => [...prev, turnResult]);
      setPreviousTurnResult(turnResult);
      setIsAppreciationOpen(false);
      setHintCells(new Set());

      setLeaderboardEntries((prev) => {
        const entryId = `group-player-${turnResult.playerIndex}`;
        const withoutThis = prev.filter((item) => item.id !== entryId);
        const newEntry: LeaderboardEntry = {
          id: entryId,
          name: `${turnResult.playerName} (${groupName})`,
          score: turnResult.score,
          timeSeconds: turnResult.timeUsedSeconds,
          level: turnResult.level,
          stars: turnResult.stars,
          isCurrentPlayer: true,
          createdAt: new Date().toISOString(),
        };
        return [...withoutThis, newEntry];
      });

      const nextIndex = currentPlayerIndex + 1;
      if (nextIndex < groupPlayers.length) {
        setCurrentPlayerIndex(nextIndex);
        setPlayerName(groupPlayers[nextIndex] || `Anak ${nextIndex + 1}`);
        setScreenState('TRANSITION');
      } else {
        setScreenState('LEADERBOARD');
        fireVictoryConfetti();
      }
    },
    [
      currentPlayerIndex,
      fireVictoryConfetti,
      groupName,
      groupPlayers,
    ]
  );

  // Hitung mundur batas waktu per level (jeda saat dijeda, konfirmasi keluar, dialog/level bonus, prolog, apresiasi, transisi, papan skor, lisensi, atau tutorial terbuka)
  useEffect(() => {
    if (
      hasWon ||
      isTimeUp ||
      isDizzyPenalty ||
      isPaused ||
      isExitConfirmOpen ||
      isGameSettingsOpen ||
      isBonusPromptOpen ||
      isBonusLevelActive ||
      isAppreciationOpen ||
      isDidYouKnowOpen ||
      isLeaderboardOpen ||
      isTutorialOpen ||
      isLicensePopupOpen ||
      isOverlayFlowActive
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    hasWon,
    isAppreciationOpen,
    isBonusLevelActive,
    isBonusPromptOpen,
    isDidYouKnowOpen,
    isTimeUp,
    isDizzyPenalty,
    isExitConfirmOpen,
    isGameSettingsOpen,
    isPaused,
    isLeaderboardOpen,
    isLicensePopupOpen,
    isOverlayFlowActive,
    isTutorialOpen,
    boardVersion,
  ]);

  // Ketukan woodblock lembut pada 5 detik terakhir permainan
  useEffect(() => {
    const isTimerRunning =
      !hasWon &&
      !isTimeUp &&
      !isDizzyPenalty &&
      !isPaused &&
      !isExitConfirmOpen &&
      !isGameSettingsOpen &&
      !isBonusPromptOpen &&
      !isBonusLevelActive &&
      !isAppreciationOpen &&
      !isDidYouKnowOpen &&
      !isLeaderboardOpen &&
      !isTutorialOpen &&
      !isLicensePopupOpen &&
      !isOverlayFlowActive;

    if (
      isTimerRunning &&
      prevTimeLeftRef.current - timeLeft === 1 &&
      timeLeft >= 1 &&
      timeLeft <= 5
    ) {
      sfxEngine.playCountdownTick(timeLeft);
    }
    prevTimeLeftRef.current = timeLeft;
  }, [
    hasWon,
    isAppreciationOpen,
    isBonusLevelActive,
    isBonusPromptOpen,
    isDidYouKnowOpen,
    isDizzyPenalty,
    isExitConfirmOpen,
    isGameSettingsOpen,
    isLeaderboardOpen,
    isLicensePopupOpen,
    isOverlayFlowActive,
    isPaused,
    isTimeUp,
    isTutorialOpen,
    timeLeft,
  ]);

  useEffect(() => {
    if (
      hasWon ||
      isTimeUp ||
      isDizzyPenalty ||
      isOverlayFlowActive ||
      timeLeft > 0
    ) {
      return;
    }

    sfxEngine.playTimeout();

    if (gameMode === 'group') {
      // Mode Kelompok: Waktu habis tidak langsung Game Over, simpan skor usaha & lanjut ke giliran anak berikutnya
      const effortScore = Math.max(
        120,
        collectedIndices.size * 150 + Math.max(0, 160 - steps * 4)
      );
      const activeChildName =
        groupPlayers[currentPlayerIndex] ||
        playerName.trim() ||
        `Anak ${currentPlayerIndex + 1}`;
      advanceGroupTurn({
        playerIndex: currentPlayerIndex,
        playerName: activeChildName,
        score: effortScore,
        steps,
        optimalSteps,
        timeUsedSeconds: currentLevelConfig.timeLimitSeconds,
        itemsCollected: collectedIndices.size,
        totalItems: collectibles.length,
        completed: false,
        stars: collectedIndices.size > 0 ? 2 : 1,
        level,
        characterKey: currentLevelConfig.characterKey,
        characterName: currentLevelConfig.characterName,
        outcomeReason: 'timeout',
      });
      return;
    }

    narrator.stop();
    setIsTimeUp(true);
    setHintCells(new Set());
    setFeedbackText('Waktu habis! Ayo coba lagi lebih cepat.');
    setLevelResult(
      calculateLevelResult({
        won: false,
        stepsTaken: steps,
        optimalSteps,
        timeLeft: 0,
        timeLimit: currentLevelConfig.timeLimitSeconds,
      })
    );
  }, [
    advanceGroupTurn,
    collectedIndices.size,
    collectibles.length,
    currentLevelConfig.characterKey,
    currentLevelConfig.characterName,
    currentLevelConfig.timeLimitSeconds,
    currentPlayerIndex,
    gameMode,
    groupPlayers,
    hasWon,
    isDizzyPenalty,
    isOverlayFlowActive,
    isTimeUp,
    level,
    optimalSteps,
    playerName,
    steps,
    timeLeft,
  ]);

  const triggerHintPath = useCallback(
    (isAuto: boolean) => {
      if (
        hasWon ||
        isTimeUp ||
        isDizzyPenalty ||
        isPaused ||
        isExitConfirmOpen ||
        isGameSettingsOpen ||
        isBonusPromptOpen ||
        isBonusLevelActive ||
        isAppreciationOpen ||
        isDidYouKnowOpen ||
        isLeaderboardOpen ||
        isTutorialOpen ||
        isLicensePopupOpen ||
        isOverlayFlowActive ||
        hintCells.size > 0
      ) {
        return;
      }

      // Jika kuota hint habis (0), hentikan sementara timer level utama & tampilkan dialog Pak Naedie
      if (hintsLeft <= 0) {
        if (!isAuto || !hasDeclinedBonusPromptInLevel) {
          setIsBonusPromptOpen(true);
        }
        return;
      }

      let currentMask = 0;
      collectedIndices.forEach((idx) => {
        currentMask |= 1 << idx;
      });

      const solution = solveMissionPath(maze, deerPos, collectibles, currentMask);
      if (!solution || solution.hintPath.size === 0) return;

      const allDone = collectedIndices.size >= collectibles.length;
      sfxEngine.playHint();
      setHintsLeft((prev) => Math.max(0, prev - 1));
      setHintCells(solution.hintPath);
      setFeedbackText(
        isAuto
          ? allDone
            ? `Bantuan otomatis: ikuti jalan kuning menuju ${currentLevelConfig.destinationName}!`
            : `Bantuan otomatis: ikuti jalan kuning untuk mengambil ${currentLevelConfig.collectibleName}!`
          : allDone
          ? `Ikuti jalan kuning menuju ${currentLevelConfig.destinationName}!`
          : `Ikuti jalan kuning untuk mengambil ${currentLevelConfig.collectibleName}!`
      );

      if (isAuto) {
        const dirPhrase = solution.nextStepDirLabel
          ? `Ayo melangkah ${solution.nextStepDirLabel}`
          : 'Ayo ikuti jalan kuning';
        const hintSpeech = allDone
          ? `Petunjuk! ${dirPhrase} menuju ${currentLevelConfig.destinationName}!`
          : `Petunjuk! ${dirPhrase} untuk mengambil ${currentLevelConfig.collectibleName}!`;
        narrator.speak(hintSpeech, 'guru');
      }

      if (hintTimeoutRef.current !== null) {
        window.clearTimeout(hintTimeoutRef.current);
      }
      hintTimeoutRef.current = window.setTimeout(() => {
        hintTimeoutRef.current = null;
        setHintCells(new Set());
      }, 2000);
    },
    [
      collectedIndices,
      collectibles,
      currentLevelConfig.collectibleName,
      currentLevelConfig.destinationName,
      deerPos,
      hasDeclinedBonusPromptInLevel,
      hasWon,
      hintCells.size,
      hintsLeft,
      isAppreciationOpen,
      isBonusLevelActive,
      isBonusPromptOpen,
      isDidYouKnowOpen,
      isDizzyPenalty,
      isExitConfirmOpen,
      isGameSettingsOpen,
      isLeaderboardOpen,
      isLicensePopupOpen,
      isOverlayFlowActive,
      isPaused,
      isTimeUp,
      isTutorialOpen,
      maze,
    ]
  );

  const handleUseHint = useCallback(() => {
    triggerHintPath(false);
  }, [triggerHintPath]);

  const handleDeclineBonusPrompt = useCallback(() => {
    narrator.stop();
    setIsBonusPromptOpen(false);
    setHasDeclinedBonusPromptInLevel(true);
    setLastMoveTick((prev) => prev + 1);
  }, []);

  const handleAcceptBonusLevel = useCallback(() => {
    narrator.stop();
    setIsBonusPromptOpen(false);
    setHasDeclinedBonusPromptInLevel(false);
    setIsBonusLevelActive(true);
  }, []);

  const handleCollectBonusFirefly = useCallback(() => {
    setHintsLeft((prev) => Math.min(MAX_SESSION_HINTS, prev + 1));
  }, []);

  const handleFinishBonusLevel = useCallback(() => {
    narrator.stop();
    const nextTimeLeft = Math.max(5, timeLeft - 10);
    setTimeLeft((prev) => Math.max(5, prev - 10));
    setIsBonusLevelActive(false);
    setHasDeclinedBonusPromptInLevel(hintsLeft <= 0);
    setLastMoveTick((prev) => prev + 1);
    setFeedbackText(
      `Lentera petunjuk terisi! Sisa waktu level dikurangi 10 detik (tersisa ${nextTimeLeft} detik). Ayo lanjutkan!`
    );
  }, [hintsLeft, timeLeft]);

  // Bantuan otomatis / Pemicu Level Bonus: jika pemain tidak bergerak selama 10 detik
  useEffect(() => {
    if (
      hasWon ||
      isTimeUp ||
      isDizzyPenalty ||
      isPaused ||
      isExitConfirmOpen ||
      isGameSettingsOpen ||
      isBonusPromptOpen ||
      isBonusLevelActive ||
      isAppreciationOpen ||
      isDidYouKnowOpen ||
      isLeaderboardOpen ||
      isTutorialOpen ||
      isLicensePopupOpen ||
      isOverlayFlowActive ||
      hintCells.size > 0 ||
      (hintsLeft <= 0 && hasDeclinedBonusPromptInLevel)
    ) {
      return;
    }

    const idleTimer = window.setTimeout(() => {
      triggerHintPath(true);
    }, 10000);

    return () => window.clearTimeout(idleTimer);
  }, [
    boardVersion,
    hasDeclinedBonusPromptInLevel,
    hasWon,
    hintCells.size,
    hintsLeft,
    isAppreciationOpen,
    isBonusLevelActive,
    isBonusPromptOpen,
    isDidYouKnowOpen,
    isDizzyPenalty,
    isExitConfirmOpen,
    isGameSettingsOpen,
    isLeaderboardOpen,
    isLicensePopupOpen,
    isOverlayFlowActive,
    isPaused,
    isTimeUp,
    isTutorialOpen,
    lastMoveTick,
    level,
    triggerHintPath,
  ]);

  const resetGame = useCallback(() => {
    narrator.stop();
    if (lives <= 0) {
      setLives(MAX_LIVES);
      setLevelBestScores({});
      setLevelBestStars({});
      setHintsLeft(MAX_SESSION_HINTS);
      loadLevel(1);
      if (screenState === 'PLAYING') {
        narrator.playLevelIntroVoice(1);
      }
      return;
    }
    loadLevel(level);
    if (screenState === 'PLAYING') {
      narrator.playLevelIntroVoice(level);
    }
  }, [level, lives, loadLevel, screenState]);

  const maybeShowDidYouKnowBetweenLevels = useCallback((targetLevel: number) => {
    const config = LEVELS[targetLevel - 1] ?? LEVELS[0];
    if (Math.random() >= 0.55) {
      return;
    }
    const picked = pickDidYouKnowFact(
      config.characterKey,
      seenDidYouKnowIdsRef.current
    );
    seenDidYouKnowIdsRef.current.add(picked.id);
    setDidYouKnowFact(picked);
    setIsDidYouKnowOpen(true);
  }, []);

  const executeLevelTransition = useCallback(
    (targetLevel: number, mode: GameMode) => {
      if (mode === 'group') {
        loadLevel(targetLevel);
        setLives(MAX_LIVES);
        setCurrentPlayerIndex(0);
        setGroupTurnResults([]);
        setPreviousTurnResult(null);
        setPlayerName(groupPlayers[0] || 'Anak 1');
        setScreenState('TRANSITION');
      } else {
        if (targetLevel === 1 && level >= LEVELS.length) {
          setLives(MAX_LIVES);
          setLevelBestScores({});
          setLevelBestStars({});
          setHintsLeft(MAX_SESSION_HINTS);
        }
        loadLevel(targetLevel);
        setScreenState('PLAYING');
        narrator.playLevelIntroVoice(targetLevel);
        if (targetLevel > 1) {
          maybeShowDidYouKnowBetweenLevels(targetLevel);
        }
      }
    },
    [groupPlayers, level, loadLevel, maybeShowDidYouKnowBetweenLevels]
  );

  const handleNextLevel = useCallback(() => {
    narrator.stop();
    if (level >= LEVELS.length) {
      setIsLeaderboardOpen(false);
      setIsAppreciationOpen(false);
      setIsDidYouKnowOpen(false);
      setHasWon(false);
      setGoalFireworkBurst(null);
      setIsEndingOpen(true);
      return;
    }

    const nextLevel = level + 1;
    const freeLimit = FREE_LEVEL_LIMIT_BY_MODE[gameMode];
    const isExceedingFreeLimit = !isLicenseActive && nextLevel > freeLimit;

    // Jika melewati batas gratis berdasarkan nomor level & mode game, picu event untuk membuka LicensePopup
    if (isExceedingFreeLimit) {
      pendingLevelTransitionRef.current = () => {
        executeLevelTransition(nextLevel, gameMode);
      };
      window.dispatchEvent(
        new CustomEvent('open-license-popup', {
          detail: {
            currentLevel: level,
            nextLevel,
            gameMode,
            freeLimit,
          },
        })
      );
      setIsLicensePopupOpen(true);
      return;
    }

    executeLevelTransition(nextLevel, gameMode);
  }, [executeLevelTransition, gameMode, isLicenseActive, level]);

  const handleFinishEndingToHome = useCallback(() => {
    narrator.stop();
    if (hintTimeoutRef.current !== null) {
      window.clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = null;
    }
    setIsEndingOpen(false);
    setIsExitConfirmOpen(false);
    setIsPaused(false);
    setIsBonusPromptOpen(false);
    setIsBonusLevelActive(false);
    setHasDeclinedBonusPromptInLevel(false);
    setIsLeaderboardOpen(false);
    setIsAppreciationOpen(false);
    setIsDidYouKnowOpen(false);
    setIsGameSettingsOpen(false);
    setIsTutorialOpen(false);
    setHasWon(false);
    setGoalFireworkBurst(null);
    setIsTimeUp(false);
    setIsDizzyPenalty(false);
    setHintCells(new Set());
    clearTrailParticles();
    clearCollectedPopups();
    setLives(MAX_LIVES);
    setLevelBestScores({});
    setLevelBestStars({});
    setHintsLeft(MAX_SESSION_HINTS);
    loadLevel(1);
    setScreenState('SCREEN_COVER');
  }, [clearCollectedPopups, clearTrailParticles, loadLevel]);

  const licenseSessionRef = useRef<StoredLicenseSession | null>(licenseSession);
  useEffect(() => {
    licenseSessionRef.current = licenseSession;
  }, [licenseSession]);

  const lockPaidLevelIfNeeded = useCallback(() => {
    const freeLimit = FREE_LEVEL_LIMIT_BY_MODE[gameMode];
    if (level > freeLimit) {
      narrator.stop();
      loadLevel(freeLimit);
      if (
        screenState === 'PLAYING' ||
        screenState === 'TRANSITION' ||
        screenState === 'LEADERBOARD'
      ) {
        setIsLicensePopupOpen(true);
      }
    }
  }, [gameMode, level, loadLevel, screenState]);

  // Pemantauan Masa Berlaku Lisensi (setiap 30 detik, saat aplikasi dibuka/kembali dari latar belakang, & sinkronisasi server bila online)
  useEffect(() => {
    getOrCreateDeviceId();

    const checkAndSyncLicense = async (syncServer: boolean) => {
      const now = Date.now();
      setLicenseClockTick(now);

      const currentStored = loadStoredLicenseSession(now);
      if (!currentStored || !isLicenseSessionValid(currentStored, now)) {
        if (licenseSessionRef.current !== null) {
          clearStoredLicenseSession();
          setLicenseSession(null);
          lockPaidLevelIfNeeded();
        }
        return;
      }

      if (
        syncServer &&
        typeof navigator !== 'undefined' &&
        navigator.onLine
      ) {
        const result = await verifyAndActivateLicenseRpc(
          currentStored.license_key,
          { isBackgroundSync: true }
        );
        if (!result.isNetworkError) {
          if (result.valid && result.session) {
            const prev = licenseSessionRef.current;
            const next = result.session;
            if (
              !prev ||
              prev.license_key !== next.license_key ||
              prev.plan_label !== next.plan_label ||
              prev.is_lifetime !== next.is_lifetime ||
              prev.expires_at !== next.expires_at
            ) {
              setLicenseSession(next);
            }
            setLicenseClockTick(Date.now());
          } else {
            clearStoredLicenseSession();
            setLicenseSession(null);
            lockPaidLevelIfNeeded();
          }
        }
      }
    };

    void checkAndSyncLicense(true);

    const intervalId = window.setInterval(() => {
      void checkAndSyncLicense(true);
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkAndSyncLicense(true);
      }
    };

    const handleWindowFocus = () => {
      void checkAndSyncLicense(true);
    };

    const handleOnline = () => {
      void checkAndSyncLicense(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [lockPaidLevelIfNeeded]);

  const handleActivateLicense = useCallback(
    (activatedSession: StoredLicenseSession) => {
      saveStoredLicenseSession(activatedSession);
      setLicenseSession(activatedSession);
      setLicenseClockTick(Date.now());
      setIsLicensePopupOpen(false);

      if (pendingLevelTransitionRef.current) {
        const proceed = pendingLevelTransitionRef.current;
        pendingLevelTransitionRef.current = null;
        proceed();
      }
    },
    []
  );

  const handleCloseLicensePopup = useCallback(() => {
    narrator.stop();
    pendingLevelTransitionRef.current = null;
    setIsLicensePopupOpen(false);
    setIsGameSettingsOpen(false);
    setHasWon(false);
    setGoalFireworkBurst(null);
    setIsTimeUp(false);
    setIsDizzyPenalty(false);
    setIsPaused(false);
    setIsExitConfirmOpen(false);
    setIsBonusPromptOpen(false);
    setIsBonusLevelActive(false);
    setHasDeclinedBonusPromptInLevel(false);
    setIsLeaderboardOpen(false);
    setIsAppreciationOpen(false);
    setIsDidYouKnowOpen(false);
    setScreenState('SCREEN_COVER');
    window.dispatchEvent(new CustomEvent('close-license-popup'));
  }, []);

  const handleCancelExitToCover = useCallback(() => {
    setIsExitConfirmOpen(false);
  }, []);

  const handleConfirmExitToCover = useCallback(() => {
    narrator.stop();
    if (hintTimeoutRef.current !== null) {
      window.clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = null;
    }
    setIsExitConfirmOpen(false);
    setIsPaused(false);
    setIsBonusPromptOpen(false);
    setIsBonusLevelActive(false);
    setHasDeclinedBonusPromptInLevel(false);
    setIsLeaderboardOpen(false);
    setIsAppreciationOpen(false);
    setIsDidYouKnowOpen(false);
    setIsEndingOpen(false);
    setIsGameSettingsOpen(false);
    setIsTutorialOpen(false);
    setHasWon(false);
    setGoalFireworkBurst(null);
    setIsTimeUp(false);
    setIsDizzyPenalty(false);
    setHintCells(new Set());
    clearTrailParticles();
    clearCollectedPopups();
    setScreenState('SCREEN_COVER');
  }, [clearCollectedPopups, clearTrailParticles]);

  const handleToggleLicenseStatus = useCallback(() => {
    if (isLicenseActive) {
      sfxEngine.playSwitch(false);
      clearStoredLicenseSession();
      setLicenseSession(null);
      setLicenseClockTick(Date.now());
      const freeLimit = FREE_LEVEL_LIMIT_BY_MODE[gameMode];
      if (level > freeLimit) {
        loadLevel(freeLimit);
      }
      return;
    }

    pendingLevelTransitionRef.current = null;
    window.dispatchEvent(
      new CustomEvent('open-license-popup', {
        detail: {
          source: 'settings',
          currentLevel: level,
          gameMode,
        },
      })
    );
    setIsLicensePopupOpen(true);
  }, [gameMode, isLicenseActive, level, loadLevel]);

  const handleShareResult = useCallback(async () => {
    const shareTitle = `Game Labirin: ${currentLevelConfig.characterName} ke ${currentLevelConfig.destinationName}`;
    const earnedStars = levelResult?.stars ?? 1;
    const earnedScore = levelResult?.totalScore ?? 0;
    const shareText = `Hore! Aku mengantar ${currentLevelConfig.characterName} mengumpulkan ${collectibles.length} ${currentLevelConfig.collectibleName} dan sampai di ${currentLevelConfig.destinationName} (Level ${level}/${LEVELS.length} · ${currentLevelConfig.gridSize}×${currentLevelConfig.gridSize}) dalam ${steps} langkah dengan ${earnedStars}/3 Bintang dan Skor ${earnedScore} poin!`;
    const shareUrl = window.location.href;

    const setTemporaryShareStatus = (
      status: 'shared' | 'copied' | 'error'
    ) => {
      setShareStatus(status);
      if (shareTimeoutRef.current !== null) {
        window.clearTimeout(shareTimeoutRef.current);
      }
      shareTimeoutRef.current = window.setTimeout(() => {
        shareTimeoutRef.current = null;
        setShareStatus('idle');
      }, 2600);
    };

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        setTemporaryShareStatus('shared');
        return;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
    }

    const combinedText = `${shareText} ${shareUrl}`;
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        await navigator.clipboard.writeText(combinedText);
        setTemporaryShareStatus('copied');
        return;
      }
    } catch {
      // Lanjut ke fallback textarea
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = combinedText;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      setTemporaryShareStatus(copied ? 'copied' : 'error');
    } catch {
      setTemporaryShareStatus('error');
    }
  }, [
    collectibles.length,
    currentLevelConfig.characterName,
    currentLevelConfig.collectibleName,
    currentLevelConfig.destinationName,
    currentLevelConfig.gridSize,
    level,
    levelResult?.stars,
    levelResult?.totalScore,
    steps,
  ]);

  const handleCollisionPenalty = useCallback(
    (baseMessage: string) => {
      sfxEngine.playBump();
      const nextBumps = bumpCount + 1;
      setBumpCount(nextBumps);

      if (nextBumps > MAX_WALL_BUMPS) {
        narrator.stop();
        if (gameMode === 'group') {
          // Mode Kelompok: Simpan skor usaha anak & panggil giliran anak berikutnya tanpa Game Over
          const effortScore = Math.max(
            110,
            collectedIndices.size * 140 + Math.max(0, 140 - steps * 3)
          );
          const elapsed = Math.max(
            1,
            currentLevelConfig.timeLimitSeconds - timeLeft
          );
          const activeChildName =
            groupPlayers[currentPlayerIndex] ||
            playerName.trim() ||
            `Anak ${currentPlayerIndex + 1}`;
          advanceGroupTurn({
            playerIndex: currentPlayerIndex,
            playerName: activeChildName,
            score: effortScore,
            steps,
            optimalSteps,
            timeUsedSeconds: elapsed,
            itemsCollected: collectedIndices.size,
            totalItems: collectibles.length,
            completed: false,
            stars: collectedIndices.size > 0 ? 2 : 1,
            level,
            characterKey: currentLevelConfig.characterKey,
            characterName: currentLevelConfig.characterName,
            outcomeReason: 'dizzy',
          });
          return;
        }

        const nextLives = Math.max(0, lives - 1);
        setLives(nextLives);
        if (nextLives < lives) {
          setLifeLostAnim((prev) => ({
            lostIndex: nextLives,
            tick: (prev?.tick ?? 0) + 1,
          }));
          if (lifeBounceTimeoutRef.current !== null) {
            window.clearTimeout(lifeBounceTimeoutRef.current);
          }
          lifeBounceTimeoutRef.current = window.setTimeout(() => {
            lifeBounceTimeoutRef.current = null;
            setLifeLostAnim(null);
          }, 850);
        }
        setIsDizzyPenalty(true);
        setHintCells(new Set());
        triggerBumpFeedback(
          nextLives > 0
            ? `Aduh, ${currentLevelConfig.characterName} pusing! Nyawa berkurang 1, level harus diulang.`
            : `Nyawa habis! ${currentLevelConfig.characterName} lemas, ayo mulai lagi!`
        );
        setLevelResult(
          calculateLevelResult({
            won: false,
            stepsTaken: steps,
            optimalSteps,
            timeLeft,
            timeLimit: currentLevelConfig.timeLimitSeconds,
          })
        );
        return;
      }

      narrator.playCollisionVoice();

      if (nextBumps === MAX_WALL_BUMPS) {
        triggerBumpFeedback(
          `Awas! Benturan ${nextBumps}/${MAX_WALL_BUMPS} — 1 kali lagi nyawa berkurang!`
        );
      } else {
        triggerBumpFeedback(
          `${baseMessage} (Benturan ${nextBumps}/${MAX_WALL_BUMPS})`
        );
      }
    },
    [
      advanceGroupTurn,
      bumpCount,
      collectedIndices.size,
      collectibles.length,
      currentLevelConfig.characterKey,
      currentLevelConfig.characterName,
      currentLevelConfig.timeLimitSeconds,
      currentPlayerIndex,
      gameMode,
      groupPlayers,
      level,
      lives,
      optimalSteps,
      playerName,
      steps,
      timeLeft,
      triggerBumpFeedback,
    ]
  );

  const handlePlayerNameChange = useCallback((nextName: string) => {
    setPlayerName(nextName);
    setLeaderboardEntries((prev) =>
      prev.map((entry) =>
        entry.isCurrentPlayer
          ? { ...entry, name: nextName.trim() || 'Rusa Kecil' }
          : entry
      )
    );
  }, []);

  const handleSelectMode = useCallback((selectedMode: GameMode) => {
    setGameMode(selectedMode);
    setScreenState('SETUP');
    narrator.playSetupVoice();
  }, []);

  const handleSetupSubmit = useCallback((payload: SetupSubmitPayload) => {
    narrator.stop();
    setGameMode(payload.mode);
    setPlayerName(payload.playerName);
    setCompanionName(payload.companionName);
    setGroupName(payload.groupName);
    setGroupPlayers(payload.groupPlayers);
    setCurrentPlayerIndex(0);
    setGroupTurnResults([]);
    setPreviousTurnResult(null);
    setLevelBestScores({});
    setLevelBestStars({});
    setIsEndingOpen(false);
    setHintsLeft(MAX_SESSION_HINTS);
    setHasDeclinedBonusPromptInLevel(false);

    setLeaderboardEntries((prev) =>
      prev.map((entry) =>
        entry.isCurrentPlayer ? { ...entry, name: payload.playerName } : entry
      )
    );

    setScreenState('PROLOGUE');
    narrator.playPrologueNaedieVoice();
  }, []);

  const handleStartAdventureFromPrologue = useCallback(() => {
    narrator.stop();
    setIsPaused(false);
    loadLevel(1);
    setLives(MAX_LIVES);

    if (gameMode === 'group') {
      setCurrentPlayerIndex(0);
      setGroupTurnResults([]);
      setPreviousTurnResult(null);
      setPlayerName(groupPlayers[0] || 'Anak 1');
      setScreenState('TRANSITION');
    } else {
      setScreenState('PLAYING');
      narrator.playLevelIntroVoice(1);
    }
  }, [gameMode, groupPlayers, loadLevel]);

  const handleStartGroupTurn = useCallback(() => {
    const activeChildName =
      groupPlayers[currentPlayerIndex] || `Anak ${currentPlayerIndex + 1}`;
    setPlayerName(activeChildName);
    setLives(MAX_LIVES);
    loadLevel(level);
    setScreenState('PLAYING');
    narrator.playLevelIntroVoice(level);
    if (currentPlayerIndex === 0 && level > 1) {
      maybeShowDidYouKnowBetweenLevels(level);
    }
  }, [
    currentPlayerIndex,
    groupPlayers,
    level,
    loadLevel,
    maybeShowDidYouKnowBetweenLevels,
  ]);

  const moveDeer = useCallback(
    (direction: Direction) => {
      if (
        hasWon ||
        isTimeUp ||
        isDizzyPenalty ||
        isPaused ||
        isExitConfirmOpen ||
        isGameSettingsOpen ||
        isBonusPromptOpen ||
        isBonusLevelActive ||
        isAppreciationOpen ||
        isDidYouKnowOpen ||
        isLeaderboardOpen ||
        isTutorialOpen ||
        isOverlayFlowActive
      ) {
        return;
      }

      setLastMoveTick((prev) => prev + 1);
      setDpadPulse((prev) => ({ dir: direction, tick: prev.tick + 1 }));
      setActiveDpadDir(direction);
      if (dpadTimeoutRef.current !== null) {
        window.clearTimeout(dpadTimeoutRef.current);
      }
      dpadTimeoutRef.current = window.setTimeout(() => {
        dpadTimeoutRef.current = null;
        setActiveDpadDir(null);
      }, 220);

      const deltaMap: Record<Direction, Position> = {
        UP: { row: -1, col: 0 },
        DOWN: { row: 1, col: 0 },
        LEFT: { row: 0, col: -1 },
        RIGHT: { row: 0, col: 1 },
      };

      const delta = deltaMap[direction];
      const nextRow = deerPos.row + delta.row;
      const nextCol = deerPos.col + delta.col;

      // Deteksi batas luar grid
      const outOfBounds =
        nextRow < 0 ||
        nextRow >= maze.length ||
        nextCol < 0 ||
        nextCol >= maze[0].length;

      if (outOfBounds) {
        handleCollisionPenalty('Ups! Itu batas tepi arena.');
        return;
      }

      const targetCell = maze[nextRow][nextCol];

      // Deteksi tabrakan dengan rintangan spesifik level (1)
      if (targetCell === 1) {
        handleCollisionPenalty(
          `Ups, ada ${currentLevelConfig.obstacleName} di situ!`
        );
        return;
      }

      // Perbarui arah hadap, jejak partikel magis & posisi Karakter
      if (direction === 'LEFT' || direction === 'RIGHT') {
        setFacing(direction);
      }
      spawnTrailParticles(deerPos, direction);
      setDeerPos({ row: nextRow, col: nextCol });
      const nextStepCount = steps + 1;
      setSteps(nextStepCount);
      setVisitedCells((prev) => {
        const next = new Set(prev);
        next.add(`${nextRow}-${nextCol}`);
        return next;
      });

      // Cek apakah karakter mengambil item misi di kotak tujuan langkah
      const foundCollectibleIdx = collectibles.findIndex(
        (pos, idx) =>
          !collectedIndices.has(idx) &&
          pos.row === nextRow &&
          pos.col === nextCol
      );
      let nextCollectedCount = collectedIndices.size;
      if (foundCollectibleIdx !== -1) {
        nextCollectedCount += 1;
        setCollectedIndices((prev) => {
          const next = new Set(prev);
          next.add(foundCollectibleIdx);
          return next;
        });
        spawnCollectedPopup(
          { row: nextRow, col: nextCol },
          currentLevelConfig.collectibleKind
        );
      }

      const allItemsCollected = nextCollectedCount >= collectibles.length;

      // Cek kondisi mencapai tujuan akhir (angka 3)
      if (targetCell === 3) {
        if (!allItemsCollected) {
          sfxEngine.playBump();
          narrator.playCollisionVoice();
          const remaining = collectibles.length - nextCollectedCount;
          setFeedbackText(
            `Kumpulkan ${remaining} ${currentLevelConfig.collectibleName} lagi sebelum masuk ke ${currentLevelConfig.destinationName}!`
          );
          return;
        }

        const result = calculateLevelResult({
          won: true,
          stepsTaken: nextStepCount,
          optimalSteps,
          timeLeft,
          timeLimit: currentLevelConfig.timeLimitSeconds,
        });
        const elapsedSeconds = Math.max(
          1,
          currentLevelConfig.timeLimitSeconds - timeLeft
        );
        const displayPlayerName = playerName.trim() || 'Rusa Kecil';

        narrator.stop();
        sfxEngine.playVictory();

        if (gameMode === 'group') {
          const activeChildName =
            groupPlayers[currentPlayerIndex] ||
            displayPlayerName ||
            `Anak ${currentPlayerIndex + 1}`;
          setLevelBestScores((prev) => ({
            ...prev,
            [level]: Math.max(prev[level] ?? 0, result.totalScore),
          }));
          setLevelBestStars((prev) => ({
            ...prev,
            [level]: Math.max(prev[level] ?? 0, result.stars),
          }));
          advanceGroupTurn({
            playerIndex: currentPlayerIndex,
            playerName: activeChildName,
            score: result.totalScore,
            steps: nextStepCount,
            optimalSteps,
            timeUsedSeconds: elapsedSeconds,
            itemsCollected: nextCollectedCount,
            totalItems: collectibles.length,
            completed: true,
            stars: result.stars,
            level,
            characterKey: currentLevelConfig.characterKey,
            characterName: currentLevelConfig.characterName,
            outcomeReason: 'won',
          });
          return;
        }

        const goalRect = goalCellRef.current?.getBoundingClientRect();
        const originX = goalRect
          ? goalRect.left + goalRect.width / 2
          : typeof window !== 'undefined'
          ? window.innerWidth / 2
          : 300;
        const originY = goalRect
          ? goalRect.top + goalRect.height / 2
          : typeof window !== 'undefined'
          ? window.innerHeight * 0.45
          : 300;
        fireworkTickRef.current += 1;
        setGoalFireworkBurst({
          tick: fireworkTickRef.current,
          x: originX,
          y: originY,
        });
        setHasWon(true);
        setLevelResult(result);
        setLevelBestScores((prev) => ({
          ...prev,
          [level]: Math.max(prev[level] ?? 0, result.totalScore),
        }));
        setLevelBestStars((prev) => ({
          ...prev,
          [level]: Math.max(prev[level] ?? 0, result.stars),
        }));
        setLatestWinSummary({
          level,
          score: result.totalScore,
          timeUsedSeconds: elapsedSeconds,
          stars: result.stars,
        });
        setLeaderboardEntries((prev) => {
          const withoutCurrent = prev.filter((item) => !item.isCurrentPlayer);
          const previousBest = prev.find((item) => item.isCurrentPlayer);
          const shouldKeepPrev =
            previousBest && previousBest.score > result.totalScore;
          const playerEntry: LeaderboardEntry = shouldKeepPrev
            ? { ...previousBest, name: displayPlayerName }
            : {
                id: 'current-player',
                name: displayPlayerName,
                score: result.totalScore,
                timeSeconds: elapsedSeconds,
                level,
                stars: result.stars,
                isCurrentPlayer: true,
                createdAt: new Date().toISOString(),
              };
          return [...withoutCurrent, playerEntry];
        });
        setIsLeaderboardOpen(true);
        narrator.playLevelCompleteStage1Voice();
        setFeedbackText(
          `Hore! ${currentLevelConfig.characterName} sampai di ${currentLevelConfig.destinationName}!`
        );
        fireVictoryConfetti();
      } else if (foundCollectibleIdx !== -1) {
        sfxEngine.playCollectItem(nextCollectedCount - 1);
        if (allItemsCollected) {
          sfxEngine.playGateUnlock(0.18);
          narrator.playAllCollectedVoice();
          setIsAppreciationOpen(true);
          setFeedbackText(
            `Semua ${currentLevelConfig.collectibleName} terkumpul! Ayo menuju ${currentLevelConfig.destinationName}!`
          );
        } else {
          setFeedbackText(
            `${currentLevelConfig.collectibleName} terkumpul (${nextCollectedCount}/${collectibles.length})! Cari ${collectibles.length - nextCollectedCount} lagi.`
          );
        }
      } else {
        sfxEngine.playStep();
        if (allItemsCollected) {
          setFeedbackText(
            `Bagus! Sekarang masuk ke ${currentLevelConfig.destinationName}!`
          );
        } else {
          setFeedbackText(
            `Bagus! Cari ${collectibles.length - nextCollectedCount} ${currentLevelConfig.collectibleName} lagi.`
          );
        }
      }
    },
    [
      advanceGroupTurn,
      collectedIndices,
      collectibles,
      currentLevelConfig.characterKey,
      currentLevelConfig.characterName,
      currentLevelConfig.collectibleName,
      currentLevelConfig.destinationName,
      currentLevelConfig.obstacleName,
      currentLevelConfig.timeLimitSeconds,
      currentPlayerIndex,
      deerPos,
      fireVictoryConfetti,
      gameMode,
      groupPlayers,
      handleCollisionPenalty,
      hasWon,
      isAppreciationOpen,
      isBonusLevelActive,
      isBonusPromptOpen,
      isDidYouKnowOpen,
      isDizzyPenalty,
      isExitConfirmOpen,
      isGameSettingsOpen,
      isLeaderboardOpen,
      isOverlayFlowActive,
      isPaused,
      isTimeUp,
      isTutorialOpen,
      level,
      maze,
      optimalSteps,
      playerName,
      spawnCollectedPopup,
      spawnTrailParticles,
      steps,
      timeLeft,
    ]
  );

  // Dukungan penuh Keyboard & Numpad (OTG/USB) di seluruh layar gameplay dan dialog
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        isOverlayFlowActive ||
        isTutorialOpen ||
        isLicensePopupOpen ||
        isBonusLevelActive ||
        isRecordingInGameKey
      ) {
        return;
      }

      if (isTextEntryTarget(event.target)) {
        return;
      }

      if (isGameSettingsOpen) {
        if (matchesKeyAction(event, 'back', keyBindings)) {
          event.preventDefault();
          setIsGameSettingsOpen(false);
        } else if (matchesKeyAction(event, 'moveUp', keyBindings)) {
          event.preventDefault();
          navigateContainerFocus(gameSettingsRef.current, 'UP');
        } else if (matchesKeyAction(event, 'moveDown', keyBindings)) {
          event.preventDefault();
          navigateContainerFocus(gameSettingsRef.current, 'DOWN');
        } else if (matchesKeyAction(event, 'moveLeft', keyBindings)) {
          event.preventDefault();
          navigateContainerFocus(gameSettingsRef.current, 'LEFT');
        } else if (matchesKeyAction(event, 'moveRight', keyBindings)) {
          event.preventDefault();
          navigateContainerFocus(gameSettingsRef.current, 'RIGHT');
        } else if (matchesKeyAction(event, 'confirm', keyBindings)) {
          event.preventDefault();
          activateFocusedOrDefault(gameSettingsRef.current);
        }
        return;
      }

      if (isBonusPromptOpen) {
        if (matchesKeyAction(event, 'back', keyBindings)) {
          event.preventDefault();
          handleDeclineBonusPrompt();
        } else if (matchesKeyAction(event, 'moveUp', keyBindings)) {
          event.preventDefault();
          navigateContainerFocus(bonusPromptRef.current, 'UP');
        } else if (matchesKeyAction(event, 'moveDown', keyBindings)) {
          event.preventDefault();
          navigateContainerFocus(bonusPromptRef.current, 'DOWN');
        } else if (matchesKeyAction(event, 'moveLeft', keyBindings)) {
          event.preventDefault();
          navigateContainerFocus(bonusPromptRef.current, 'LEFT');
        } else if (matchesKeyAction(event, 'moveRight', keyBindings)) {
          event.preventDefault();
          navigateContainerFocus(bonusPromptRef.current, 'RIGHT');
        } else if (matchesKeyAction(event, 'confirm', keyBindings)) {
          event.preventDefault();
          activateFocusedOrDefault(bonusPromptRef.current);
        }
        return;
      }

      if (isExitConfirmOpen) {
        if (matchesKeyAction(event, 'back', keyBindings)) {
          event.preventDefault();
          setIsExitConfirmOpen(false);
        } else if (matchesKeyAction(event, 'moveUp', keyBindings)) {
          event.preventDefault();
          navigateContainerFocus(exitConfirmRef.current, 'UP');
        } else if (matchesKeyAction(event, 'moveDown', keyBindings)) {
          event.preventDefault();
          navigateContainerFocus(exitConfirmRef.current, 'DOWN');
        } else if (matchesKeyAction(event, 'moveLeft', keyBindings)) {
          event.preventDefault();
          navigateContainerFocus(exitConfirmRef.current, 'LEFT');
        } else if (matchesKeyAction(event, 'moveRight', keyBindings)) {
          event.preventDefault();
          navigateContainerFocus(exitConfirmRef.current, 'RIGHT');
        } else if (matchesKeyAction(event, 'confirm', keyBindings)) {
          event.preventDefault();
          activateFocusedOrDefault(exitConfirmRef.current);
        }
        return;
      }

      if (isAppreciationOpen) {
        if (
          matchesKeyAction(event, 'confirm', keyBindings) ||
          matchesKeyAction(event, 'back', keyBindings) ||
          event.key === ' '
        ) {
          event.preventDefault();
          setIsAppreciationOpen(false);
        }
        return;
      }

      if (isDidYouKnowOpen) {
        if (
          matchesKeyAction(event, 'confirm', keyBindings) ||
          matchesKeyAction(event, 'back', keyBindings) ||
          event.key === ' '
        ) {
          event.preventDefault();
          setIsDidYouKnowOpen(false);
        }
        return;
      }

      if (isLeaderboardOpen) {
        return;
      }

      if (hasWon || isTimeUp || isDizzyPenalty) {
        if (matchesKeyAction(event, 'back', keyBindings)) {
          event.preventDefault();
          setIsExitConfirmOpen(true);
        } else if (matchesKeyAction(event, 'restart', keyBindings)) {
          event.preventDefault();
          resetGame();
        } else if (matchesKeyAction(event, 'moveUp', keyBindings)) {
          event.preventDefault();
          navigateContainerFocus(endLevelRef.current, 'UP');
        } else if (matchesKeyAction(event, 'moveDown', keyBindings)) {
          event.preventDefault();
          navigateContainerFocus(endLevelRef.current, 'DOWN');
        } else if (matchesKeyAction(event, 'moveLeft', keyBindings)) {
          event.preventDefault();
          navigateContainerFocus(endLevelRef.current, 'LEFT');
        } else if (matchesKeyAction(event, 'moveRight', keyBindings)) {
          event.preventDefault();
          navigateContainerFocus(endLevelRef.current, 'RIGHT');
        } else if (
          matchesKeyAction(event, 'confirm', keyBindings) ||
          event.key === ' '
        ) {
          event.preventDefault();
          if (!activateFocusedOrDefault(endLevelRef.current)) {
            if (hasWon) {
              handleNextLevel();
            } else {
              resetGame();
            }
          }
        }
        return;
      }

      if (isPaused) {
        if (
          matchesKeyAction(event, 'pause', keyBindings) ||
          matchesKeyAction(event, 'back', keyBindings) ||
          event.key === 'p' ||
          event.key === 'P'
        ) {
          event.preventDefault();
          setIsPaused(false);
        } else if (matchesKeyAction(event, 'restart', keyBindings)) {
          event.preventDefault();
          resetGame();
        } else if (matchesKeyAction(event, 'moveUp', keyBindings)) {
          event.preventDefault();
          navigateContainerFocus(pauseModalRef.current, 'UP');
        } else if (matchesKeyAction(event, 'moveDown', keyBindings)) {
          event.preventDefault();
          navigateContainerFocus(pauseModalRef.current, 'DOWN');
        } else if (matchesKeyAction(event, 'moveLeft', keyBindings)) {
          event.preventDefault();
          navigateContainerFocus(pauseModalRef.current, 'LEFT');
        } else if (matchesKeyAction(event, 'moveRight', keyBindings)) {
          event.preventDefault();
          navigateContainerFocus(pauseModalRef.current, 'RIGHT');
        } else if (
          matchesKeyAction(event, 'confirm', keyBindings) ||
          event.key === ' '
        ) {
          event.preventDefault();
          activateFocusedOrDefault(pauseModalRef.current);
        }
        return;
      }

      // Layar Gameplay Utama Aktif
      if (matchesKeyAction(event, 'back', keyBindings)) {
        event.preventDefault();
        setIsExitConfirmOpen(true);
        return;
      }

      if (
        matchesKeyAction(event, 'pause', keyBindings) ||
        event.key === 'p' ||
        event.key === 'P'
      ) {
        event.preventDefault();
        setIsPaused((prev) => !prev);
        return;
      }

      if (matchesKeyAction(event, 'hint', keyBindings)) {
        event.preventDefault();
        handleUseHint();
        return;
      }

      if (matchesKeyAction(event, 'weather', keyBindings)) {
        event.preventDefault();
        handleToggleWeather();
        return;
      }

      if (matchesKeyAction(event, 'restart', keyBindings)) {
        event.preventDefault();
        resetGame();
        return;
      }

      if (
        matchesKeyAction(event, 'moveUp', keyBindings) ||
        event.key === 'w' ||
        event.key === 'W'
      ) {
        event.preventDefault();
        moveDeer('UP');
      } else if (
        matchesKeyAction(event, 'moveDown', keyBindings) ||
        event.key === 's' ||
        event.key === 'S'
      ) {
        event.preventDefault();
        moveDeer('DOWN');
      } else if (
        matchesKeyAction(event, 'moveLeft', keyBindings) ||
        event.key === 'a' ||
        event.key === 'A'
      ) {
        event.preventDefault();
        moveDeer('LEFT');
      } else if (
        matchesKeyAction(event, 'moveRight', keyBindings) ||
        event.key === 'd' ||
        event.key === 'D'
      ) {
        event.preventDefault();
        moveDeer('RIGHT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleDeclineBonusPrompt,
    handleNextLevel,
    handleToggleWeather,
    handleUseHint,
    hasWon,
    isAppreciationOpen,
    isBonusLevelActive,
    isBonusPromptOpen,
    isDidYouKnowOpen,
    isDizzyPenalty,
    isExitConfirmOpen,
    isGameSettingsOpen,
    isLeaderboardOpen,
    isLicensePopupOpen,
    isOverlayFlowActive,
    isPaused,
    isRecordingInGameKey,
    isTimeUp,
    isTutorialOpen,
    keyBindings,
    moveDeer,
    resetGame,
  ]);

  useEffect(() => {
    return () => {
      if (bumpTimeoutRef.current !== null) {
        window.clearTimeout(bumpTimeoutRef.current);
      }
      if (confettiTimeoutRef.current !== null) {
        window.clearTimeout(confettiTimeoutRef.current);
      }
      if (hintTimeoutRef.current !== null) {
        window.clearTimeout(hintTimeoutRef.current);
      }
      if (shareTimeoutRef.current !== null) {
        window.clearTimeout(shareTimeoutRef.current);
      }
      if (dpadTimeoutRef.current !== null) {
        window.clearTimeout(dpadTimeoutRef.current);
      }
      if (lifeBounceTimeoutRef.current !== null) {
        window.clearTimeout(lifeBounceTimeoutRef.current);
      }
      clearTrailParticles();
      clearCollectedPopups();
      try {
        confetti.reset();
      } catch {
        // Abaikan
      }
      narrator.stop();
    };
  }, [clearCollectedPopups, clearTrailParticles]);

  const handleReplayVictoryNarration = useCallback(() => {
    if (hasWon) {
      narrator.playLevelCompleteStage2Voice();
      return;
    }
    if (isTimeUp || isDizzyPenalty) {
      narrator.playGameOverVoice();
    }
  }, [hasWon, isDizzyPenalty, isTimeUp]);

  // Narasi Pengantar Level 1–10 (/assets/voice/voice-level-{nomorLevel}.mp3) saat papan permainan level dimulai / diulang
  useEffect(() => {
    if (
      screenState !== 'PLAYING' ||
      hasWon ||
      isTimeUp ||
      isDizzyPenalty ||
      isPaused ||
      isTutorialOpen ||
      isLicensePopupOpen ||
      isBonusPromptOpen ||
      isBonusLevelActive ||
      isAppreciationOpen ||
      isOverlayFlowActive
    ) {
      return;
    }

    const levelSpeakKey = `${screenState}-${level}-${boardVersion}-${currentPlayerIndex}`;
    if (narratedLevelKeyRef.current === levelSpeakKey) {
      return;
    }

    narratedLevelKeyRef.current = levelSpeakKey;
    if (!narrator.isPlayingLevelIntro(level)) {
      narrator.playLevelIntroVoice(level);
    }
  }, [
    boardVersion,
    currentPlayerIndex,
    hasWon,
    isAppreciationOpen,
    isBonusLevelActive,
    isBonusPromptOpen,
    isDizzyPenalty,
    isLicensePopupOpen,
    isOverlayFlowActive,
    isPaused,
    isTimeUp,
    isTutorialOpen,
    level,
    screenState,
  ]);

  // Hentikan seluruh narasi suara lain & putar /assets/voice/voice-gameover.mp3 dari awal saat layar Gagal / Game Over muncul
  useEffect(() => {
    if ((isTimeUp || isDizzyPenalty) && !hasWon && screenState === 'PLAYING') {
      narrator.playGameOverVoice();
    }
  }, [hasWon, isDizzyPenalty, isTimeUp, screenState]);

  const totalSessionScore = Object.values(levelBestScores).reduce(
    (sum, val) => sum + val,
    0
  );
  const totalSessionStars = Math.max(
    Object.values(levelBestStars).reduce((sum, val) => sum + val, 0),
    levelResult?.stars ?? 0
  );
  const timeProgressPct = Math.max(
    0,
    Math.min(100, (timeLeft / currentLevelConfig.timeLimitSeconds) * 100)
  );
  const isTimeUrgent = timeLeft <= 10 && !hasWon;
  const gridSize = currentLevelConfig.gridSize;
  const activeCharacterKey = currentLevelConfig.characterKey;
  const activeWeather: WeatherKind =
    weatherOverride === 'auto'
      ? level === 3 || level === 6 || level === 9 || level === 10
        ? 'fireflies'
        : 'leaves'
      : weatherOverride;
  const isNightWeather = activeWeather === 'fireflies';

  // Sinkronkan suasana suara alam hutan (kicau burung tipis siang vs jangkrik lembut malam/bonus)
  useEffect(() => {
    ambientEngine.setMood(isNightWeather || isBonusLevelActive ? 'night' : 'day');
  }, [isNightWeather, isBonusLevelActive]);
  const collectedCount = collectedIndices.size;
  const totalCollectibles = collectibles.length;
  const allCollected = collectedCount >= totalCollectibles;
  const isLandscapeMode = displayMode === 'landscape';

  // Elemen Identitas Pemain & Nyawa (Digunakan di Mode Potret maupun Sisi Kiri Lanskap)
  const playerIdentityBarElement = (
    <div className="w-full flex flex-col gap-0.5 px-1">
      {/* Baris Pertama Sejajar: Judul Utama di Kiri + Tombol Ikon Tutorial & Tombol Ikon 'X' Keluar di Kanan */}
      <div className="w-full flex items-center justify-between gap-2">
        <h1
          className={`min-w-0 flex-1 font-display text-base sm:text-xl font-bold leading-tight truncate transition-colors duration-500 ${
            isNightWeather ? 'text-emerald-50' : 'text-emerald-900'
          }`}
        >
          {currentLevelConfig.characterName} ke {currentLevelConfig.destinationName}
        </h1>

        <div
          role="toolbar"
          aria-label="Tutorial dan keluar ke halaman sampul"
          className="shrink-0 flex items-center gap-1.5"
        >
          {/* Tombol Dengarkan Ulang Narasi Pengantar Level (Level 1–10) di Header Permainan */}
          {level >= 1 && level <= 10 && (
            <button
              type="button"
              data-sfx="custom"
              onClick={() => {
                narrator.playLevelIntroVoice(level);
              }}
              aria-label={`Dengarkan ulang panduan Level ${level}`}
              title="Dengarkan Ulang"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-extrabold shadow-2xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                isNarrating && narrator.isPlayingLevelIntro(level)
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                  : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
              }`}
            >
              <Volume2
                className={`w-3.5 h-3.5 shrink-0 ${
                  isNarrating && narrator.isPlayingLevelIntro(level)
                    ? 'animate-pulse text-emerald-700'
                    : ''
                }`}
                aria-hidden="true"
              />
              <span>Dengarkan Ulang</span>
            </button>
          )}

          {/* Tombol Ikon Tutorial (Pengganti Teks 'Ganti Nama') */}
          <motion.button
            type="button"
            data-sfx="custom"
            onClick={() => {
              setIsTutorialOpen(true);
            }}
            aria-label="Buka Tutorial"
            title="Tutorial"
            whileHover={
              shouldReduceMotion
                ? undefined
                : {
                    scale: 1.07,
                    y: -1,
                    transition: { type: 'spring', stiffness: 420, damping: 18 },
                  }
            }
            whileTap={
              shouldReduceMotion
                ? undefined
                : {
                    scale: 0.93,
                    transition: { type: 'spring', stiffness: 550, damping: 22 },
                  }
            }
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
              isNightWeather
                ? 'bg-emerald-800/80 hover:bg-emerald-700 border-emerald-500/70 text-amber-200 focus-visible:ring-amber-300'
                : 'bg-white/90 hover:bg-purple-50 border-purple-300 text-purple-700 focus-visible:ring-purple-500'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0"
              aria-hidden="true"
            >
              <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 4h2v5l-1-.75L9 9V4zm9 16H6V4h1v9l3-2.25L13 13V4h5v16z" />
            </svg>
          </motion.button>

          {/* Tombol Ikon 'X' Keluar ke Halaman Sampul (Memunculkan Peringatan Konfirmasi Terlebih Dahulu) */}
          <motion.button
            key={
              screenState === 'PLAYING'
                ? `exit-btn-play-${level}-${boardVersion}`
                : 'exit-btn-idle'
            }
            type="button"
            data-sfx="custom"
            onClick={() => {
              setIsExitConfirmOpen(true);
            }}
            aria-label="Keluar ke halaman sampul"
            title="Keluar ke halaman sampul"
            initial={{ x: 0, rotate: 0, scale: 1 }}
            animate={
              !shouldReduceMotion && screenState === 'PLAYING'
                ? {
                    x: [0, -3, 3, -2.5, 2.5, -1.5, 1.5, 0],
                    rotate: [0, -10, 10, -7, 7, -3, 3, 0],
                    scale: [1, 1.1, 1.08, 1.05, 1],
                    transition: {
                      delay: 0.25,
                      duration: 0.7,
                      ease: 'easeInOut',
                    },
                  }
                : { x: 0, rotate: 0, scale: 1 }
            }
            whileHover={
              shouldReduceMotion
                ? undefined
                : {
                    scale: 1.07,
                    y: -1,
                    transition: { type: 'spring', stiffness: 420, damping: 18 },
                  }
            }
            whileTap={
              shouldReduceMotion
                ? undefined
                : {
                    scale: 0.93,
                    transition: { type: 'spring', stiffness: 550, damping: 22 },
                  }
            }
            className={`relative overflow-visible w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
              isNightWeather
                ? 'bg-rose-900/80 hover:bg-rose-800 border-rose-500/70 text-rose-100 focus-visible:ring-rose-300'
                : 'bg-white/90 hover:bg-rose-50 border-rose-300 text-rose-600 focus-visible:ring-rose-500'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            {showShortcutLabels && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-1.5 -right-1 px-1 rounded bg-rose-600 text-white border border-white text-[8px] font-black font-mono leading-tight shadow-xs"
              >
                {getActionBadgeLabel('back', keyBindings)}
              </span>
            )}
          </motion.button>
        </div>
      </div>

      {/* Baris Kedua: Identitas Pemain, Skor, & Sisa Nyawa */}
      <div
        className={`flex items-center gap-1.5 text-xs font-bold tabular-nums transition-colors duration-500 ${
          isNightWeather ? 'text-emerald-200/90' : 'text-emerald-700/85'
        }`}
      >
        <span className="truncate">
          {gameMode === 'group'
            ? `${playerName.trim() || 'Petualang Cilik'} (${groupName} · ${currentPlayerIndex + 1}/${groupPlayers.length})`
            : `${playerName.trim() || 'Petualang Cilik'} · Skor: ${totalSessionScore}`}
        </span>
        <span
          aria-label={`Sisa nyawa ${lives} dari ${MAX_LIVES}`}
          className="inline-flex items-center gap-0.5 shrink-0"
        >
          {Array.from({ length: MAX_LIVES }, (_, idx) => {
            const active = idx < lives;
            const isBouncing = lifeLostAnim !== null && !shouldReduceMotion;
            const isJustLost =
              isBouncing && lifeLostAnim.lostIndex === idx;

            return (
              <span
                key={idx}
                className="relative inline-flex items-center justify-center"
              >
                {isJustLost && (
                  <motion.span
                    key={`life-ring-${idx}-${lifeLostAnim.tick}`}
                    aria-hidden="true"
                    initial={{ opacity: 0.85, scale: 0.7 }}
                    animate={{ opacity: 0, scale: 1.9 }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                    className="pointer-events-none absolute inset-0 rounded-full border-2 border-rose-400"
                  />
                )}
                <motion.svg
                  key={
                    isBouncing
                      ? `heart-${idx}-${lifeLostAnim.tick}`
                      : `heart-${idx}`
                  }
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                  initial={false}
                  animate={
                    isJustLost
                      ? {
                          y: [0, -8, 0, -4, 0],
                          scale: [1.3, 0.76, 1.12, 0.9],
                          rotate: [0, -14, 12, -6, 0],
                        }
                      : isBouncing && active
                      ? {
                          y: [0, -5, 0, -2, 0],
                          scale: [1, 1.16, 0.96, 1],
                        }
                      : {
                          y: 0,
                          scale: active ? 1 : 0.9,
                          rotate: 0,
                        }
                  }
                  transition={
                    isBouncing
                      ? {
                          duration: 0.62,
                          delay: isJustLost ? 0 : idx * 0.05,
                          ease: 'easeOut',
                        }
                      : { duration: 0.2 }
                  }
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors duration-200 ${
                    active
                      ? 'text-rose-500'
                      : isNightWeather
                      ? 'text-slate-600'
                      : 'text-stone-300'
                  }`}
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </motion.svg>
              </span>
            );
          })}
        </span>
      </div>
    </div>
  );

  // Baris Tombol Aksi Cepat (Skor, Audio, Jeda, Ulang, Pengaturan Mode Tampilan)
  const quickActionToolbarElement = (
    <div className="w-full grid grid-cols-5 gap-1.5 sm:gap-2">
      {/* 1. Leaderboard */}
      <motion.button
        type="button"
        data-sfx="custom"
        onClick={() => setIsLeaderboardOpen(true)}
        aria-label="Buka Papan Skor"
        title="Papan Skor"
        whileHover={
          shouldReduceMotion
            ? undefined
            : {
                scale: 1.05,
                y: -1.5,
                transition: { type: 'spring', stiffness: 420, damping: 18 },
              }
        }
        whileTap={
          shouldReduceMotion
            ? undefined
            : {
                scale: 0.94,
                y: 1,
                transition: { type: 'spring', stiffness: 550, damping: 22 },
              }
        }
        className="min-h-[40px] px-1 rounded-2xl bg-white/85 hover:bg-white backdrop-blur-xl border-b-3 border-amber-300/90 text-amber-900 shadow-sm hover:shadow-md flex items-center justify-center gap-1 font-extrabold text-[10px] sm:text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
      >
        <span role="img" aria-hidden="true" className="text-sm sm:text-base leading-none">
          🏆
        </span>
        <span className="truncate">Skor</span>
      </motion.button>

      {/* 2. Audio (Suara / Bisu) dengan Transisi Geser Interaktif */}
      <motion.button
        type="button"
        data-sfx="custom"
        onClick={handleToggleSound}
        aria-pressed={soundEnabled}
        aria-label={
          soundEnabled
            ? 'Matikan seluruh suara dan musik latar'
            : 'Aktifkan suara dan musik latar'
        }
        title={
          soundEnabled
            ? 'Audio Aktif (Ketuk untuk bisukan suara & musik)'
            : 'Audio Dibisukan (Ketuk untuk aktifkan kembali)'
        }
        whileHover={
          shouldReduceMotion
            ? undefined
            : {
                scale: 1.05,
                y: -1.5,
                transition: { type: 'spring', stiffness: 420, damping: 18 },
              }
        }
        whileTap={
          shouldReduceMotion
            ? undefined
            : {
                scale: 0.94,
                y: 1,
                transition: { type: 'spring', stiffness: 550, damping: 22 },
              }
        }
        className={`relative overflow-hidden min-h-[40px] px-1 rounded-2xl border-b-3 shadow-sm hover:shadow-md flex flex-col items-center justify-center gap-0.5 font-extrabold text-[10px] sm:text-xs transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 cursor-pointer ${
          soundEnabled
            ? 'bg-stone-100/90 hover:bg-white border-emerald-400/90 text-emerald-800 focus-visible:ring-emerald-500'
            : 'bg-stone-200/95 hover:bg-stone-100 border-stone-400 text-stone-600 focus-visible:ring-stone-500'
        }`}
      >
        {/* Lapisan latar belakang yang bergeser halus saat status suara berubah */}
        <motion.span
          aria-hidden="true"
          initial={false}
          animate={
            shouldReduceMotion
              ? { opacity: soundEnabled ? 1 : 0 }
              : {
                  x: soundEnabled ? '0%' : '-100%',
                  opacity: soundEnabled ? 1 : 0.35,
                }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0.14 }
              : { type: 'spring', stiffness: 360, damping: 28 }
          }
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-100 via-emerald-50 to-teal-100/95"
        />

        {/* Baris Ikon & Label yang bergeser horizontal sesuai arah toggle */}
        <div className="relative z-10 w-full flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={soundEnabled ? 'sound-on' : 'sound-off'}
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : {
                      x: soundEnabled ? -14 : 14,
                      opacity: 0,
                      scale: 0.86,
                    }
              }
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : {
                      x: soundEnabled ? 14 : -14,
                      opacity: 0,
                      scale: 0.86,
                    }
              }
              transition={
                shouldReduceMotion
                  ? { duration: 0.12 }
                  : { type: 'spring', stiffness: 460, damping: 26 }
              }
              className="flex items-center justify-center gap-1"
            >
              {soundEnabled ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
                  aria-hidden="true"
                >
                  <polygon
                    points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"
                    fill="currentColor"
                  />
                  <motion.path
                    d="M15.54 8.46a5 5 0 0 1 0 7.07"
                    initial={shouldReduceMotion ? false : { opacity: 0, x: -2 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                  />
                  <motion.path
                    d="M19.07 4.93a10 10 0 0 1 0 14.14"
                    initial={shouldReduceMotion ? false : { opacity: 0, x: -3 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.24, delay: 0.1 }}
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
                  aria-hidden="true"
                >
                  <polygon
                    points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"
                    fill="currentColor"
                  />
                  <line x1="22" y1="9" x2="16" y2="15" />
                  <line x1="16" y1="9" x2="22" y2="15" />
                </svg>
              )}
              <span className="truncate leading-none">
                {soundEnabled ? 'Suara' : 'Bisu'}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Trek mini indikator geser kiri-kanan */}
        <span
          aria-hidden="true"
          className={`relative z-10 w-8 h-1.5 rounded-full p-[1px] flex items-center transition-colors duration-200 ${
            soundEnabled
              ? 'justify-end bg-emerald-200/95'
              : 'justify-start bg-stone-300/90'
          }`}
        >
          <motion.span
            layout={!shouldReduceMotion}
            transition={{ type: 'spring', stiffness: 520, damping: 28 }}
            className={`w-4 h-full rounded-full shadow-2xs transition-colors duration-200 ${
              soundEnabled ? 'bg-emerald-600' : 'bg-stone-500'
            }`}
          />
        </span>
      </motion.button>

      {/* 3. Jeda */}
      <motion.button
        type="button"
        data-sfx="custom"
        onClick={() => {
          if (hasWon || isTimeUp || isDizzyPenalty) return;
          setIsPaused((prev) => !prev);
        }}
        disabled={hasWon || isTimeUp || isDizzyPenalty}
        aria-label={isPaused ? 'Lanjutkan permainan' : 'Jeda permainan'}
        title={isPaused ? 'Lanjutkan (P)' : 'Jeda (P)'}
        whileHover={
          hasWon || isTimeUp || isDizzyPenalty || shouldReduceMotion
            ? undefined
            : {
                scale: 1.05,
                y: -1.5,
                transition: { type: 'spring', stiffness: 420, damping: 18 },
              }
        }
        whileTap={
          hasWon || isTimeUp || isDizzyPenalty || shouldReduceMotion
            ? undefined
            : {
                scale: 0.94,
                y: 1,
                transition: { type: 'spring', stiffness: 550, damping: 22 },
              }
        }
        className={`min-h-[40px] px-1 rounded-2xl border-b-3 shadow-sm hover:shadow-md flex items-center justify-center gap-1 font-extrabold text-[10px] sm:text-xs transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer ${
          isPaused
            ? 'bg-sky-500 hover:bg-sky-600 border-sky-700 text-white'
            : 'bg-white/85 hover:bg-white border-sky-300/90 text-sky-800'
        }`}
      >
        {isPaused ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
            aria-hidden="true"
          >
            <polygon points="7 4 20 12 7 20 7 4" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"
            aria-hidden="true"
          >
            <rect x="6" y="5" width="4.5" height="14" rx="1.5" />
            <rect x="13.5" y="5" width="4.5" height="14" rx="1.5" />
          </svg>
        )}
        <span className="truncate">{isPaused ? 'Lanjut' : 'Jeda'}</span>
        {showShortcutLabels && (
          <span
            aria-hidden="true"
            className={`px-1 rounded text-[8px] font-black font-mono leading-tight shrink-0 ${
              isPaused
                ? 'bg-sky-700/75 text-white'
                : 'bg-sky-100 text-sky-900 border border-sky-200'
            }`}
          >
            {getActionBadgeLabel('pause', keyBindings)}
          </span>
        )}
      </motion.button>

      {/* 4. Ulang */}
      <motion.button
        type="button"
        onClick={resetGame}
        whileHover={
          shouldReduceMotion
            ? undefined
            : {
                scale: 1.05,
                y: -1.5,
                transition: { type: 'spring', stiffness: 420, damping: 18 },
              }
        }
        whileTap={
          shouldReduceMotion
            ? undefined
            : {
                scale: 0.94,
                y: 1,
                transition: { type: 'spring', stiffness: 550, damping: 22 },
              }
        }
        className="min-h-[40px] px-1 rounded-2xl bg-amber-200 hover:bg-amber-300 border-b-3 border-amber-400 text-amber-950 font-extrabold text-[10px] sm:text-xs whitespace-nowrap shadow-sm hover:shadow-md flex items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3.5 h-3.5 shrink-0"
          aria-hidden="true"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        <span className="truncate">Ulang</span>
        {showShortcutLabels && (
          <span
            aria-hidden="true"
            className="px-1 rounded bg-amber-300/90 border border-amber-500/70 text-[8px] font-black font-mono text-amber-950 leading-tight shrink-0"
          >
            {getActionBadgeLabel('restart', keyBindings)}
          </span>
        )}
      </motion.button>

      {/* 5. Pengaturan Mode Tampilan (Potret / Lanskap) */}
      <motion.button
        type="button"
        data-sfx="custom"
        onClick={() => {
          openedSettingsViaShutterRef.current = true;
          sfxEngine.playShutter();
          setIsGameSettingsOpen(true);
        }}
        aria-label="Buka Pengaturan Permainan"
        title="Pengaturan (Mode Tampilan Potret / Lanskap)"
        whileHover={
          shouldReduceMotion
            ? undefined
            : {
                scale: 1.05,
                y: -1.5,
                transition: { type: 'spring', stiffness: 420, damping: 18 },
              }
        }
        whileTap={
          shouldReduceMotion
            ? undefined
            : {
                scale: 0.94,
                y: 1,
                transition: { type: 'spring', stiffness: 550, damping: 22 },
              }
        }
        className="min-h-[40px] px-1 rounded-2xl bg-purple-600 hover:bg-purple-700 border-b-3 border-purple-800 text-white shadow-sm hover:shadow-md flex items-center justify-center gap-1 font-extrabold text-[10px] sm:text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 cursor-pointer"
      >
        <span role="img" aria-hidden="true" className="text-sm leading-none">
          ⚙️
        </span>
        <span className="truncate">
          {isLandscapeMode ? 'Lanskap' : 'Potret'}
        </span>
      </motion.button>
    </div>
  );

  // Gabungan Informasi Level & Target Misi (Format 2 Kolom Berdampingan) + Indikator Perolehan Skor Tepat di Sampingnya
  const combinedInfoAndScoreRowElement = (
    <div className="w-full grid grid-cols-12 gap-1.5 sm:gap-2 items-stretch">
      {/* Blok Informasi: Satukan Informasi Level & Target Misi dalam 2 Kolom Berdampingan */}
      <div className="col-span-8 sm:col-span-8 rounded-2xl bg-white/85 backdrop-blur-xl border-2 border-white/95 shadow-sm p-1.5 sm:p-2 grid grid-cols-2 gap-1.5 sm:gap-2 items-stretch text-stone-800">
        {/* Kolom 1: Informasi Level, Grid, Langkah, Tabrak, & Waktu */}
        <div
          role="status"
          aria-label={`Level ${String(level).padStart(2, '0')} terkunci berurutan`}
          className="rounded-xl bg-emerald-50/90 border border-emerald-200/90 px-2 py-1.5 flex flex-col justify-between gap-1 min-w-0"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-emerald-600 text-white font-display text-[11px] sm:text-xs font-black tracking-tight shrink-0">
              <span aria-hidden="true">🔒</span>
              <span>Level {String(level).padStart(2, '0')}</span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-800 truncate">
              Grid {gridSize}×{gridSize} · {currentLevelConfig.difficulty}
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] font-extrabold tabular-nums">
            <span className="text-emerald-950 truncate">
              Langkah: {steps}/{optimalSteps}
            </span>
            <span
              className={`shrink-0 ${
                bumpCount >= MAX_WALL_BUMPS
                  ? 'text-rose-600'
                  : bumpCount > 0
                  ? 'text-amber-700'
                  : 'text-emerald-800/80'
              }`}
            >
              Tabrak: {Math.min(bumpCount, MAX_WALL_BUMPS)}/{MAX_WALL_BUMPS}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 shrink-0 ${
                isTimeUrgent
                  ? 'text-rose-600 animate-pulse'
                  : timeLeft <= 20
                  ? 'text-amber-700'
                  : 'text-emerald-800'
              }`}
            >
              ⏱️ {timeLeft}d
            </span>
          </div>

          <div
            aria-label="Sisa waktu level"
            className="w-full h-1.5 rounded-full bg-emerald-200/80 overflow-hidden"
          >
            <div
              style={{ width: `${timeProgressPct}%` }}
              className={`h-full rounded-full transition-all duration-500 ${
                isTimeUrgent
                  ? 'bg-rose-500'
                  : timeLeft <= 20
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
            />
          </div>
        </div>

        {/* Kolom 2: Target Misi & Status Tujuan */}
        <div className="rounded-xl bg-amber-50/85 border border-amber-200/90 px-2 py-1.5 flex flex-col justify-between gap-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 min-w-0">
              <motion.div
                key={`hud-collect-${level}-${collectedCount}`}
                initial={
                  collectedCount > 0 && !shouldReduceMotion
                    ? { scale: 1.3, y: -2 }
                    : false
                }
                animate={{ scale: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 460,
                  damping: 14,
                }}
                className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 rounded-lg bg-white border border-amber-200 flex items-center justify-center p-0.5"
              >
                <CollectibleIcon kind={currentLevelConfig.collectibleKind} />
              </motion.div>
              <span className="text-[10px] sm:text-xs font-extrabold text-emerald-950 truncate">
                {currentLevelConfig.collectibleName}:{' '}
                <span className="tabular-nums text-amber-700">
                  {collectedCount}/{totalCollectibles}
                </span>
              </span>
            </div>

            <div
              aria-label={
                allCollected
                  ? `${currentLevelConfig.destinationName} terbuka`
                  : `${currentLevelConfig.destinationName} terkunci`
              }
              className={`relative w-5 h-5 sm:w-6 sm:h-6 shrink-0 rounded-lg border flex items-center justify-center p-0.5 ${
                allCollected
                  ? 'bg-emerald-100 border-emerald-300'
                  : 'bg-white border-stone-200 opacity-80'
              }`}
            >
              <DestinationIcon
                kind={currentLevelConfig.destinationKind}
                alt={currentLevelConfig.destinationName}
                className="w-full h-full"
              />
              {!allCollected && (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 -right-1 text-[8px] leading-none bg-white rounded px-0.5 shadow-2xs"
                >
                  🔒
                </span>
              )}
            </div>
          </div>

          <p className="text-[10px] font-bold text-stone-600 leading-tight line-clamp-2">
            {allCollected
              ? `${currentLevelConfig.destinationName} Terbuka! Ayo masuk!`
              : currentLevelConfig.missionText}
          </p>
        </div>
      </div>

      {/* Indikator Perolehan Skor Tepat di Samping Blok Informasi */}
      <div className="col-span-4 sm:col-span-4 rounded-2xl bg-white/85 backdrop-blur-xl border-2 border-white/95 shadow-sm px-2 sm:px-2.5 py-1.5 flex items-center justify-between gap-1.5 text-stone-800">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-100/90 border border-amber-300 flex items-center justify-center p-0.5 shrink-0 shadow-2xs">
            <KawaiiCharacterIcon
              character={activeCharacterKey}
              mood={
                hasWon
                  ? 'cheer'
                  : isBumping || isDizzyPenalty
                  ? 'dizzy'
                  : 'happy'
              }
              className="w-full h-full"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-amber-800 truncate">
              Perolehan Skor
            </p>
            <p className="font-display text-xs sm:text-base font-black text-emerald-950 tabular-nums leading-tight truncate">
              {totalSessionScore}{' '}
              <span className="text-[10px] font-bold text-emerald-700">
                poin
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsLeaderboardOpen(true)}
          aria-label="Buka Papan Skor"
          title="Lihat Papan Skor"
          className="px-2 py-1.5 rounded-xl bg-amber-300 hover:bg-amber-400 border-b-2 border-amber-500 text-amber-950 font-extrabold text-[10px] sm:text-xs flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
        >
          <span aria-hidden="true">🏆</span>
          <span className="hidden md:inline">Skor</span>
        </button>
      </div>
    </div>
  );

  // Data Fakta Karakter Terformat (Beberapa Paragraf Terpisah) & Label 'Tips Semangat:' Tersendiri
  const characterTipPool =
    ANIMAL_TIPS_BY_CHARACTER[activeCharacterKey] ??
    ANIMAL_TIPS_BY_CHARACTER.deer;
  const primaryCharacterFact = levelTip.startsWith('Fakta ')
    ? levelTip
    : characterTipPool[0] ?? levelTip;
  const secondaryRawFact =
    characterTipPool[2] && characterTipPool[2] !== primaryCharacterFact
      ? characterTipPool[2]
      : characterTipPool[0] ?? '';
  const secondaryCharacterFact = secondaryRawFact.replace(
    /^Fakta\s+[^:]+:\s*/i,
    ''
  );
  const rawSemangatTip = characterTipPool[1] ?? '';
  const encouragementTipBody = rawSemangatTip.replace(
    /^Tips?\s+Semangat:\s*/i,
    ''
  );

  // Bagian Fakta Karakter & Tips Semangat Khusus Mode Potret (Tanpa Informasi Misi Setelah Labirin & Tanpa Latar Belakang Warna)
  const portraitCharacterFactElement = (
    <motion.div
      key={`portrait-tip-${boardVersion}-${activeCharacterKey}`}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`w-full bg-transparent px-4 sm:px-6 py-0.5 flex flex-col items-center text-center gap-0.5 ${
        isNightWeather ? 'text-amber-100' : 'text-emerald-950'
      }`}
    >
      <p className="text-[10px] sm:text-[11px] font-bold leading-snug">
        <span aria-hidden="true" className="mr-1">
          💡
        </span>
        {primaryCharacterFact}
      </p>
      {secondaryCharacterFact && (
        <p className="text-[10px] sm:text-[11px] font-semibold leading-snug opacity-90">
          {secondaryCharacterFact}
        </p>
      )}
      <p
        className={`text-[10px] sm:text-[11px] font-bold leading-snug mt-0.5 ${
          isNightWeather ? 'text-amber-300' : 'text-amber-900'
        }`}
      >
        <span className="font-black">Tips Semangat:</span>{' '}
        {encouragementTipBody}
      </p>
    </motion.div>
  );

  // Kotak Dialog Status / Apresiasi Pendamping & Baris Teks Tip Kustom (Mode Lanskap)
  const companionAndTipElement = (
    <div className="w-full flex flex-col items-center gap-1">
      <p
        role="status"
        aria-live="polite"
        className={`w-full text-center text-[11px] sm:text-xs font-extrabold px-2.5 py-1 rounded-xl transition-colors duration-200 line-clamp-2 ${
          isBumping || isTimeUp || isDizzyPenalty
            ? 'text-rose-700 bg-rose-100/90'
            : hasWon || allCollected
            ? 'text-emerald-800 bg-emerald-100/90 border border-emerald-300/80'
            : 'text-amber-900 bg-white/80'
        }`}
      >
        {allCollected && !hasWon && !isTimeUp && !isDizzyPenalty
          ? `${companionName.trim() || 'Ibu Guru'}: "Hebat ${playerName.trim() || 'Petualang Cilik'}! Semua ${currentLevelConfig.collectibleName} terkumpul, ayo masuk ke ${currentLevelConfig.destinationName}!"`
          : feedbackText}
      </p>

      <motion.div
        key={`tip-${boardVersion}`}
        initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={`w-full px-2.5 py-1 rounded-xl border transition-colors duration-300 flex items-center justify-center gap-2 ${
          isNightWeather
            ? 'bg-slate-900/65 border-emerald-700/60 text-amber-200/95'
            : 'bg-amber-50/90 border-amber-200/90 text-amber-950/90'
        }`}
      >
        <p className="text-center text-[10px] sm:text-[11px] font-bold line-clamp-2">
          <span aria-hidden="true" className="mr-1">
            💡
          </span>
          {levelTip}
        </p>
      </motion.div>
    </div>
  );

  // Papan Grid Labirin Utama (Diperbesar sebagai Elemen Paling Dominan di Mode Potret)
  const mazeBoardElement = (
    <div
      aria-label={`Papan labirin ${gridSize} kali ${gridSize}`}
      className={`w-full aspect-square bg-[#FDF2DA] border-4 border-[#E8D2A6] rounded-3xl p-2 shadow-[0_12px_26px_rgba(120,88,42,0.12)] ${
        isLandscapeMode
          ? 'max-w-[270px] sm:max-w-[295px] md:max-w-[320px] mx-auto'
          : 'max-w-[355px] sm:max-w-[395px] mx-auto'
      }`}
    >
      <div className="relative w-full h-full">
              <div
                style={{
                  gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
                }}
                className={`grid w-full h-full ${
                  gridSize >= 7 ? 'gap-1.5' : 'gap-2'
                }`}
              >
                {maze.map((row, rowIndex) =>
                  row.map((cell, colIndex) => {
                    const cellKey = `${rowIndex}-${colIndex}`;
                    const isDeerHere =
                      deerPos.row === rowIndex && deerPos.col === colIndex;
                    const isGoal = cell === 3;
                    const isWall = cell === 1;
                    const isVisited = visitedCells.has(cellKey);
                    const isHinted = hintCells.has(cellKey) && !isWall;
                    const collectibleIdx = collectibles.findIndex(
                      (c) => c.row === rowIndex && c.col === colIndex
                    );
                    const hasUncollectedItem =
                      collectibleIdx !== -1 &&
                      !collectedIndices.has(collectibleIdx);

                    let tileStyle =
                      'bg-[#FFF6E5] border-2 border-[#EBD1A0] shadow-inner';
                    if (isWall) {
                      tileStyle =
                        OBSTACLE_TILE_STYLES[currentLevelConfig.obstacleIcon];
                    } else if (isHinted && !isGoal) {
                      tileStyle =
                        'bg-amber-200/95 border-2 border-amber-400 ring-2 ring-yellow-300/90 shadow-md';
                    } else if (isGoal) {
                      tileStyle = isHinted
                        ? 'bg-amber-100 border-2 border-amber-400 ring-2 ring-yellow-300/90 shadow-md'
                        : allCollected
                        ? 'bg-[#DCFCE7] border-2 border-[#34D399] ring-2 ring-emerald-300/70 shadow-sm'
                        : 'bg-[#F3F4F6] border-2 border-[#CBD5E1] shadow-sm';
                    } else if (hasUncollectedItem) {
                      tileStyle =
                        'bg-[#FEF9C3]/85 border-2 border-[#FDE047] shadow-sm';
                    } else if (isVisited && !isDeerHere) {
                      tileStyle =
                        'bg-[#F7E5C0] border-2 border-[#E2C287]';
                    }

                    return (
                      <motion.div
                        key={cellKey}
                        initial={
                          shouldReduceMotion
                            ? false
                            : { opacity: 0, scale: 0.72 }
                        }
                        animate={{ opacity: 1, scale: 1 }}
                        transition={
                          shouldReduceMotion
                            ? { duration: 0 }
                            : {
                                type: 'spring',
                                stiffness: 440,
                                damping: 24,
                                delay: (rowIndex + colIndex) * 0.015,
                              }
                        }
                        className={`relative flex items-center justify-center transition-colors duration-200 ${
                          gridSize >= 7
                            ? 'rounded-xl p-0.5'
                            : 'rounded-2xl p-1'
                        } ${tileStyle}`}
                      >
                      {/* Rintangan Dinamis Sesuai Karakter Level (1) */}
                      {isWall && (
                        <ObstacleIcon
                          kind={currentLevelConfig.obstacleIcon}
                          alt={`Rintangan ${currentLevelConfig.obstacleName}`}
                          className="w-full h-full drop-shadow-sm pointer-events-none select-none"
                        />
                      )}

                      {/* Item Misi yang Harus Dikumpulkan */}
                      {!isWall && !isGoal && hasUncollectedItem && !isDeerHere && (
                        <motion.div
                          aria-label={currentLevelConfig.collectibleName}
                          animate={
                            shouldReduceMotion
                              ? undefined
                              : { y: [0, -3, 0], scale: [1, 1.06, 1] }
                          }
                          transition={{
                            repeat: Infinity,
                            duration: 1.9,
                            ease: 'easeInOut',
                            delay: collectibleIdx * 0.2,
                          }}
                          className="w-[78%] h-[78%] flex items-center justify-center drop-shadow-sm pointer-events-none"
                        >
                          <CollectibleIcon
                            kind={currentLevelConfig.collectibleKind}
                          />
                        </motion.div>
                      )}

                      {/* Sorotan Petunjuk (Hint) Jalur Aman */}
                      {isHinted &&
                        !isGoal &&
                        !hasUncollectedItem &&
                        !isDeerHere && (
                          <svg
                            viewBox="0 0 24 24"
                            fill="#D97706"
                            aria-hidden="true"
                            className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse pointer-events-none"
                          >
                            <path d="M12 2L14.6 9.4L22 12L14.6 14.6L12 22L9.4 14.6L2 12L9.4 9.4L12 2Z" />
                          </svg>
                        )}

                      {/* Jejak kaki kecil pada jalan yang sudah dilewati */}
                      {!isWall &&
                        !isGoal &&
                        !hasUncollectedItem &&
                        !isHinted &&
                        isVisited &&
                        !isDeerHere && (
                          <span
                            aria-hidden="true"
                            className="w-2.5 h-2.5 rounded-full bg-amber-600/25"
                          />
                        )}

                      {/* Titik Finis Spesifik Karakter (3) */}
                      {isGoal && (
                        <div
                          ref={goalCellRef}
                          className="relative w-full h-full flex items-center justify-center"
                        >
                          <DestinationIcon
                            kind={currentLevelConfig.destinationKind}
                            alt={currentLevelConfig.destinationName}
                            className={`w-full h-full drop-shadow-sm pointer-events-none select-none transition-opacity duration-200 ${
                              isDeerHere
                                ? 'opacity-45'
                                : allCollected
                                ? 'opacity-100'
                                : 'opacity-70'
                            }`}
                          />
                          {!allCollected && !isDeerHere && (
                            <span
                              aria-label="Terkunci sebelum item terkumpul"
                              className="absolute -bottom-0.5 -right-0.5 text-[11px] leading-none bg-white/95 rounded-md px-0.5 shadow-sm"
                            >
                              🔒
                            </span>
                          )}
                        </div>
                      )}
                      </motion.div>
                    );
                  })
                )}
              </div>

            {/* Layer Jejak Partikel Magis (Bintang & Daun Kecil) */}
            <div
              aria-hidden="true"
              style={{
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
              }}
              className={`pointer-events-none absolute inset-0 grid ${
                gridSize >= 7 ? 'gap-1.5' : 'gap-2'
              }`}
            >
              <AnimatePresence>
                {trailParticles.map((particle) => (
                  <div
                    key={particle.id}
                    style={{
                      gridRowStart: particle.row + 1,
                      gridColumnStart: particle.col + 1,
                    }}
                    className="relative z-[5] flex items-center justify-center"
                  >
                    <motion.div
                      initial={{
                        opacity: 0.95,
                        scale: 0.4,
                        x: particle.offsetX,
                        y: particle.offsetY,
                        rotate: 0,
                      }}
                      animate={{
                        opacity: 0,
                        scale: particle.scale,
                        x: particle.offsetX + particle.driftX,
                        y: particle.offsetY + particle.driftY,
                        rotate: particle.rotate,
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.68, ease: 'easeOut' }}
                      className="will-change-transform"
                    >
                      {particle.kind === 'star' ? (
                        <svg
                          viewBox="0 0 24 24"
                          fill={particle.color}
                          className="w-4 h-4 sm:w-5 sm:h-5"
                        >
                          <path d="M12 2L14.6 9.4L22 12L14.6 14.6L12 22L9.4 14.6L2 12L9.4 9.4L12 2Z" />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          fill={particle.color}
                          className="w-4 h-4 sm:w-5 sm:h-5"
                        >
                          <path d="M19 4C12 4 6 8.5 5 16C9.5 17 15.5 14 19 4ZM5 16C4.5 18 4.5 19.5 4.5 19.5" />
                        </svg>
                      )}
                    </motion.div>
                  </div>
                ))}
              </AnimatePresence>
            </div>

            {/* Layer Pop-Up Item Misi saat Berhasil Dikumpulkan */}
            <div
              aria-hidden="true"
              style={{
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
              }}
              className={`pointer-events-none absolute inset-0 z-20 grid ${
                gridSize >= 7 ? 'gap-1.5' : 'gap-2'
              }`}
            >
              <AnimatePresence>
                {collectedPopups.map((popup) => (
                  <div
                    key={popup.id}
                    style={{
                      gridRowStart: popup.row + 1,
                      gridColumnStart: popup.col + 1,
                    }}
                    className="relative flex items-center justify-center"
                  >
                    {/* Cincin kilau lembut saat item terambil */}
                    <motion.span
                      initial={{ scale: 0.45, opacity: 0.85 }}
                      animate={{ scale: 1.45, opacity: 0 }}
                      transition={{ duration: 0.44, ease: 'easeOut' }}
                      className="absolute w-[78%] h-[78%] rounded-full border-2 border-amber-300/90 bg-amber-200/25"
                    />

                    {/* Empat percikan bintang kecil di sekitar item */}
                    {[
                      { x: -16, y: -18, color: '#FBBF24' },
                      { x: 16, y: -16, color: '#34D399' },
                      { x: -14, y: 10, color: '#FDE047' },
                      { x: 15, y: 12, color: '#38BDF8' },
                    ].map((spark, sparkIdx) => (
                      <motion.span
                        key={sparkIdx}
                        initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                        animate={{
                          x: spark.x,
                          y: spark.y - 8,
                          scale: [0, 1.15, 0],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 0.48,
                          ease: 'easeOut',
                          delay: sparkIdx * 0.025,
                        }}
                        style={{ backgroundColor: spark.color }}
                        className="absolute w-1.5 h-1.5 rounded-full shadow-xs"
                      />
                    ))}

                    {/* Ikon item memantul naik lalu memudar lembut */}
                    <motion.div
                      initial={{ opacity: 1, scale: 0.85, y: 0, rotate: 0 }}
                      animate={{
                        opacity: [1, 1, 0],
                        scale: [0.85, 1.42, 0.9],
                        y: [0, -24, -36],
                        rotate: [0, -12, 8],
                      }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.56,
                        times: [0, 0.42, 1],
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="w-[74%] h-[74%] flex items-center justify-center drop-shadow-[0_4px_8px_rgba(245,158,11,0.35)]"
                    >
                      <CollectibleIcon kind={popup.kind} />
                    </motion.div>

                    {/* Penanda +1 ringan mengapung */}
                    <motion.span
                      initial={{ opacity: 0, y: 2, scale: 0.7 }}
                      animate={{
                        opacity: [0, 1, 0],
                        y: [2, -18, -28],
                        scale: [0.7, 1.15, 0.95],
                      }}
                      transition={{
                        duration: 0.56,
                        times: [0, 0.28, 1],
                        ease: 'easeOut',
                      }}
                      className="absolute -top-1 -right-0.5 font-display text-xs sm:text-sm font-black text-amber-500 drop-shadow-[0_1.5px_2px_rgba(255,255,255,0.95)]"
                    >
                      +1
                    </motion.span>
                  </div>
                ))}
              </AnimatePresence>
            </div>

            {/* Layer Overlay Animasi Halus Karakter Hewan */}
            <div
              aria-hidden="false"
              style={{
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
              }}
              className={`pointer-events-none absolute inset-0 grid ${
                gridSize >= 7 ? 'gap-1.5' : 'gap-2'
              }`}
            >
              <motion.div
                layout={!shouldReduceMotion}
                style={{
                  gridRowStart: deerPos.row + 1,
                  gridColumnStart: deerPos.col + 1,
                }}
                animate={
                  (isBumping || isDizzyPenalty) && !shouldReduceMotion
                    ? {
                        x: [0, -8, 8, -6, 5, -3, 0],
                        y: [0, 2, 5, 4, 2, 0],
                        rotate: [0, -14, 14, -10, 8, -4, 0],
                        scaleX: [1, 1.09, 0.95, 1.05, 0.98, 1],
                        scaleY: [1, 0.85, 0.92, 0.88, 0.94, 1],
                      }
                    : { x: 0, y: 0, rotate: 0, scaleX: 1, scaleY: 1 }
                }
                transition={{
                  layout: {
                    type: 'spring',
                    stiffness: 420,
                    damping: 26,
                    mass: 0.75,
                  },
                  duration: 0.62,
                  ease: 'easeInOut',
                }}
                className="relative z-10 flex items-center justify-center p-1"
              >
                {/* Bintang Berputar Pusing di Atas Kepala Rusa saat Membentur Semak */}
                <AnimatePresence>
                  {(isBumping || isDizzyPenalty) && !shouldReduceMotion && (
                    <motion.div
                      key={`dizzy-${bumpAnimTick}`}
                      aria-hidden="true"
                      initial={{ opacity: 0, scale: 0.5, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: -4 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.2 }}
                      className="pointer-events-none absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.85,
                          ease: 'linear',
                        }}
                        className="relative w-10 h-5 flex items-center justify-between"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="#FBBF24"
                          className="w-3.5 h-3.5 drop-shadow-sm"
                        >
                          <path d="M12 2L14.6 9.4L22 12L14.6 14.6L12 22L9.4 14.6L2 12L9.4 9.4L12 2Z" />
                        </svg>
                        <svg
                          viewBox="0 0 24 24"
                          fill="#FB7185"
                          className="w-3 h-3 -mt-2 drop-shadow-sm"
                        >
                          <path d="M12 2L14.6 9.4L22 12L14.6 14.6L12 22L9.4 14.6L2 12L9.4 9.4L12 2Z" />
                        </svg>
                        <svg
                          viewBox="0 0 24 24"
                          fill="#FDE047"
                          className="w-3.5 h-3.5 drop-shadow-sm"
                        >
                          <path d="M12 2L14.6 9.4L22 12L14.6 14.6L12 22L9.4 14.6L2 12L9.4 9.4L12 2Z" />
                        </svg>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div
                  initial={false}
                  animate={
                    shouldReduceMotion
                      ? { scale: hasWon ? 1.08 : 1 }
                      : hasWon
                      ? {
                          y: [0, -10, 0, -6, 0],
                          scale: [1, 1.15, 1.08],
                        }
                      : isBumping || isDizzyPenalty
                      ? {
                          y: [0, 3, 2, 0],
                          scale: [1, 0.9, 0.95, 1],
                        }
                      : { y: 0, scale: 1 }
                  }
                  transition={{
                    duration: hasWon ? 0.55 : isBumping ? 0.45 : 0.22,
                    ease: 'easeOut',
                  }}
                  className={`w-full h-full flex items-center justify-center transition-all duration-200 ${
                    isBumping || isDizzyPenalty
                      ? 'opacity-85 saturate-75'
                      : 'opacity-100'
                  }`}
                >
                  <div
                    style={{
                      transform:
                        facing === 'LEFT' ? 'scaleX(-1)' : 'scaleX(1)',
                    }}
                    className="w-full h-full flex items-center justify-center transition-transform duration-150 pointer-events-none select-none"
                  >
                    <KawaiiCharacterIcon
                      character={activeCharacterKey}
                      mood={
                        hasWon
                          ? 'cheer'
                          : isBumping || isDizzyPenalty
                          ? 'dizzy'
                          : 'happy'
                      }
                      moveTick={steps}
                      reduceMotion={shouldReduceMotion}
                      alt={`${currentLevelConfig.characterName} kecil kawaii`}
                      className="w-full h-full drop-shadow-sm"
                    />
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
  );

  // Area Kontrol Arah (Cuaca, D-Pad, dan Tombol Bantu)
  const dpadAndControlsElement = (
    <nav
      aria-label={`Kontrol arah ${currentLevelConfig.characterName}, cuaca, dan bantuan`}
      className={`relative z-10 w-full px-1 py-0.5 flex items-end justify-between gap-1.5 sm:gap-2 ${
        isLandscapeMode ? 'max-w-full' : 'max-w-[366px] sm:max-w-[396px]'
      }`}
    >
        {/* Kiri Bawah Dekat Kursor: Tombol Cuaca */}
        <motion.button
          type="button"
          data-sfx="custom"
          onClick={handleToggleWeather}
          aria-label={
            activeWeather === 'leaves'
              ? 'Cuaca Daun Gugur aktif. Ketuk untuk ganti ke Kunang-Kunang Malam'
              : 'Cuaca Kunang-Kunang Malam aktif. Ketuk untuk ganti ke Daun Gugur'
          }
          title={
            activeWeather === 'leaves'
              ? 'Ganti ke Malam Kunang-Kunang'
              : 'Ganti ke Hujan Daun'
          }
          whileHover={
            shouldReduceMotion
              ? undefined
              : {
                  scale: 1.07,
                  y: -2,
                  rotate: isNightWeather ? -6 : 6,
                  transition: { type: 'spring', stiffness: 420, damping: 18 },
                }
          }
          whileTap={
            shouldReduceMotion
              ? undefined
              : {
                  scale: 0.93,
                  y: 2,
                  transition: { type: 'spring', stiffness: 550, damping: 22 },
                }
          }
          className={`relative min-h-[48px] min-w-[66px] sm:min-w-[74px] px-2.5 py-1.5 rounded-2xl border-b-4 shadow-md hover:shadow-lg flex flex-col items-center justify-center gap-0.5 shrink-0 active:border-b-0 transition-colors focus-visible:outline-none focus-visible:ring-2 ${
            isNightWeather
              ? 'bg-indigo-900/95 hover:bg-indigo-800 border-indigo-950 text-amber-300 focus-visible:ring-amber-300'
              : 'bg-emerald-100/95 hover:bg-emerald-200 border-emerald-300 text-emerald-800 focus-visible:ring-emerald-500'
          }`}
        >
          {showShortcutLabels && (
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute -top-1.5 -right-1 px-1 rounded border text-[8px] font-black font-mono leading-tight shadow-2xs ${
                isNightWeather
                  ? 'bg-indigo-950 border-amber-300/70 text-amber-200'
                  : 'bg-white border-emerald-400 text-emerald-900'
              }`}
            >
              {getActionBadgeLabel('weather', keyBindings)}
            </span>
          )}
          {isNightWeather ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5 shrink-0"
              aria-hidden="true"
            >
              <path d="M12 2L13.9 7.6L19.5 9.5L13.9 11.4L12 17L10.1 11.4L4.5 9.5L10.1 7.6L12 2Z" />
              <circle cx="18.5" cy="17.5" r="2" />
              <circle cx="5.5" cy="16.5" r="1.5" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 shrink-0"
              aria-hidden="true"
            >
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
          )}
          <span className="text-[10px] sm:text-[11px] font-extrabold leading-none">
            Cuaca
          </span>
        </motion.button>

        {/* Tengah Layar: Kluster Kontrol Panah Melingkar Kompak */}
        <div className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border-2 border-white/95 shadow-[0_10px_25px_rgba(15,23,42,0.12)]">
          {/* Tombol Kiri */}
          <motion.button
            type="button"
            data-sfx="custom"
            onClick={() => moveDeer('LEFT')}
            disabled={hasWon || isTimeUp || isDizzyPenalty || isPaused}
            aria-label="Gerak ke Kiri"
            whileHover={
              hasWon || isTimeUp || isDizzyPenalty || isPaused || shouldReduceMotion
                ? undefined
                : {
                    scale: 1.06,
                    y: -1,
                    transition: { type: 'spring', stiffness: 450, damping: 18 },
                  }
            }
            whileTap={
              hasWon || isTimeUp || isDizzyPenalty || isPaused || shouldReduceMotion
                ? undefined
                : {
                    scale: 0.88,
                    y: 2,
                    transition: { type: 'spring', stiffness: 600, damping: 22 },
                  }
            }
            animate={
              activeDpadDir === 'LEFT' && !shouldReduceMotion
                ? {
                    scale: [0.9, 1.13, 1],
                    rotate: [0, -5, 5, 0],
                  }
                : { scale: 1, rotate: 0 }
            }
            transition={{
              duration: 0.24,
              ease: 'easeOut',
            }}
            className="relative overflow-visible w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-amber-400 hover:bg-amber-500 border-b-4 border-amber-600 text-amber-950 shadow-md flex items-center justify-center active:border-b-0 transition-colors duration-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
          >
            {dpadPulse.dir === 'LEFT' && dpadPulse.tick > 0 && !shouldReduceMotion && (
              <motion.span
                key={`ring-left-${dpadPulse.tick}`}
                aria-hidden="true"
                initial={{ opacity: 0.78, scale: 0.76 }}
                animate={{ opacity: 0, scale: 1.36 }}
                transition={{ duration: 0.34, ease: 'easeOut' }}
                className="pointer-events-none absolute inset-0 rounded-full border-3 border-white/90"
              />
            )}
            <motion.span
              key={
                dpadPulse.dir === 'LEFT'
                  ? `icon-left-${dpadPulse.tick}`
                  : 'icon-left'
              }
              initial={false}
              animate={
                dpadPulse.dir === 'LEFT' &&
                dpadPulse.tick > 0 &&
                !shouldReduceMotion
                  ? {
                      scale: [0.85, 1.24, 0.96, 1],
                      x: [0, -4, 1, 0],
                      rotate: [0, -6, 6, 0],
                    }
                  : { scale: 1, x: 0, rotate: 0 }
              }
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="flex items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
                aria-hidden="true"
              >
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
            </motion.span>
            {showShortcutLabels && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-1.5 -left-1 px-1 rounded bg-white/95 border border-amber-600/70 text-[8px] font-black text-amber-950 font-mono leading-tight shadow-2xs"
              >
                {getActionBadgeLabel('moveLeft', keyBindings)}
              </span>
            )}
          </motion.button>

          {/* Kolom Tengah Kompak: Tombol Atas & Bawah Bersusun Rapat */}
          <div className="flex flex-col items-center gap-1.5">
            {/* Tombol Atas */}
            <motion.button
              type="button"
              data-sfx="custom"
              onClick={() => moveDeer('UP')}
              disabled={hasWon || isTimeUp || isDizzyPenalty || isPaused}
              aria-label="Gerak ke Atas"
              whileHover={
                hasWon || isTimeUp || isDizzyPenalty || isPaused || shouldReduceMotion
                  ? undefined
                  : {
                      scale: 1.06,
                      y: -1,
                      transition: { type: 'spring', stiffness: 450, damping: 18 },
                    }
              }
              whileTap={
                hasWon || isTimeUp || isDizzyPenalty || isPaused || shouldReduceMotion
                  ? undefined
                  : {
                      scale: 0.88,
                      y: 2,
                      transition: { type: 'spring', stiffness: 600, damping: 22 },
                    }
              }
              animate={
                activeDpadDir === 'UP' && !shouldReduceMotion
                  ? {
                      scale: [0.9, 1.13, 1],
                      rotate: [0, -5, 5, 0],
                    }
                  : { scale: 1, rotate: 0 }
              }
              transition={{
                duration: 0.24,
                ease: 'easeOut',
              }}
              className="relative overflow-visible w-13 h-9 sm:w-14 sm:h-10 rounded-full bg-sky-400 hover:bg-sky-500 border-b-4 border-sky-600 text-white shadow-md flex items-center justify-center active:border-b-0 transition-colors duration-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
            >
              {dpadPulse.dir === 'UP' && dpadPulse.tick > 0 && !shouldReduceMotion && (
                <motion.span
                  key={`ring-up-${dpadPulse.tick}`}
                  aria-hidden="true"
                  initial={{ opacity: 0.78, scale: 0.76 }}
                  animate={{ opacity: 0, scale: 1.36 }}
                  transition={{ duration: 0.34, ease: 'easeOut' }}
                  className="pointer-events-none absolute inset-0 rounded-full border-3 border-white/90"
                />
              )}
              <motion.span
                key={dpadPulse.dir === 'UP' ? `icon-up-${dpadPulse.tick}` : 'icon-up'}
                initial={false}
                animate={
                  dpadPulse.dir === 'UP' && dpadPulse.tick > 0 && !shouldReduceMotion
                    ? {
                        scale: [0.85, 1.24, 0.96, 1],
                        y: [0, -4, 1, 0],
                        rotate: [0, -6, 6, 0],
                      }
                    : { scale: 1, y: 0, rotate: 0 }
                }
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6"
                  aria-hidden="true"
                >
                  <path d="M12 19V5" />
                  <path d="m5 12 7-7 7 7" />
                </svg>
              </motion.span>
              {showShortcutLabels && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-1.5 -right-1 px-1 rounded bg-white/95 border border-sky-600/70 text-[8px] font-black text-sky-900 font-mono leading-tight shadow-2xs"
                >
                  {getActionBadgeLabel('moveUp', keyBindings)}
                </span>
              )}
            </motion.button>

            {/* Tombol Bawah */}
            <motion.button
              type="button"
              data-sfx="custom"
              onClick={() => moveDeer('DOWN')}
              disabled={hasWon || isTimeUp || isDizzyPenalty || isPaused}
              aria-label="Gerak ke Bawah"
              whileHover={
                hasWon || isTimeUp || isDizzyPenalty || isPaused || shouldReduceMotion
                  ? undefined
                  : {
                      scale: 1.06,
                      y: -1,
                      transition: { type: 'spring', stiffness: 450, damping: 18 },
                    }
              }
              whileTap={
                hasWon || isTimeUp || isDizzyPenalty || isPaused || shouldReduceMotion
                  ? undefined
                  : {
                      scale: 0.88,
                      y: 2,
                      transition: { type: 'spring', stiffness: 600, damping: 22 },
                    }
              }
              animate={
                activeDpadDir === 'DOWN' && !shouldReduceMotion
                  ? {
                      scale: [0.9, 1.13, 1],
                      rotate: [0, -5, 5, 0],
                    }
                  : { scale: 1, rotate: 0 }
              }
              transition={{
                duration: 0.24,
                ease: 'easeOut',
              }}
              className="relative overflow-visible w-13 h-9 sm:w-14 sm:h-10 rounded-full bg-rose-400 hover:bg-rose-500 border-b-4 border-rose-600 text-white shadow-md flex items-center justify-center active:border-b-0 transition-colors duration-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
            >
              {dpadPulse.dir === 'DOWN' && dpadPulse.tick > 0 && !shouldReduceMotion && (
                <motion.span
                  key={`ring-down-${dpadPulse.tick}`}
                  aria-hidden="true"
                  initial={{ opacity: 0.78, scale: 0.76 }}
                  animate={{ opacity: 0, scale: 1.36 }}
                  transition={{ duration: 0.34, ease: 'easeOut' }}
                  className="pointer-events-none absolute inset-0 rounded-full border-3 border-white/90"
                />
              )}
              <motion.span
                key={
                  dpadPulse.dir === 'DOWN'
                    ? `icon-down-${dpadPulse.tick}`
                    : 'icon-down'
                }
                initial={false}
                animate={
                  dpadPulse.dir === 'DOWN' &&
                  dpadPulse.tick > 0 &&
                  !shouldReduceMotion
                    ? {
                        scale: [0.85, 1.24, 0.96, 1],
                        y: [0, 4, -1, 0],
                        rotate: [0, -6, 6, 0],
                      }
                    : { scale: 1, y: 0, rotate: 0 }
                }
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6"
                  aria-hidden="true"
                >
                  <path d="M12 5v14" />
                  <path d="m19 12-7 7-7-7" />
                </svg>
              </motion.span>
              {showShortcutLabels && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-1.5 -right-1 px-1 rounded bg-white/95 border border-rose-600/70 text-[8px] font-black text-rose-900 font-mono leading-tight shadow-2xs"
                >
                  {getActionBadgeLabel('moveDown', keyBindings)}
                </span>
              )}
            </motion.button>
          </div>

          {/* Tombol Kanan */}
          <motion.button
            type="button"
            data-sfx="custom"
            onClick={() => moveDeer('RIGHT')}
            disabled={hasWon || isTimeUp || isDizzyPenalty || isPaused}
            aria-label="Gerak ke Kanan"
            whileHover={
              hasWon || isTimeUp || isDizzyPenalty || isPaused || shouldReduceMotion
                ? undefined
                : {
                    scale: 1.06,
                    y: -1,
                    transition: { type: 'spring', stiffness: 450, damping: 18 },
                  }
            }
            whileTap={
              hasWon || isTimeUp || isDizzyPenalty || isPaused || shouldReduceMotion
                ? undefined
                : {
                    scale: 0.88,
                    y: 2,
                    transition: { type: 'spring', stiffness: 600, damping: 22 },
                  }
            }
            animate={
              activeDpadDir === 'RIGHT' && !shouldReduceMotion
                ? {
                    scale: [0.9, 1.13, 1],
                    rotate: [0, -5, 5, 0],
                  }
                : { scale: 1, rotate: 0 }
            }
            transition={{
              duration: 0.24,
              ease: 'easeOut',
            }}
            className="relative overflow-visible w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-400 hover:bg-emerald-500 border-b-4 border-emerald-600 text-white shadow-md flex items-center justify-center active:border-b-0 transition-colors duration-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            {dpadPulse.dir === 'RIGHT' &&
              dpadPulse.tick > 0 &&
              !shouldReduceMotion && (
                <motion.span
                  key={`ring-right-${dpadPulse.tick}`}
                  aria-hidden="true"
                  initial={{ opacity: 0.78, scale: 0.76 }}
                  animate={{ opacity: 0, scale: 1.36 }}
                  transition={{ duration: 0.34, ease: 'easeOut' }}
                  className="pointer-events-none absolute inset-0 rounded-full border-3 border-white/90"
                />
              )}
            <motion.span
              key={
                dpadPulse.dir === 'RIGHT'
                  ? `icon-right-${dpadPulse.tick}`
                  : 'icon-right'
              }
              initial={false}
              animate={
                dpadPulse.dir === 'RIGHT' &&
                dpadPulse.tick > 0 &&
                !shouldReduceMotion
                  ? {
                      scale: [0.85, 1.24, 0.96, 1],
                      x: [0, 4, -1, 0],
                      rotate: [0, -6, 6, 0],
                    }
                  : { scale: 1, x: 0, rotate: 0 }
              }
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="flex items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </motion.span>
            {showShortcutLabels && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-1.5 -right-1 px-1 rounded bg-white/95 border border-emerald-600/70 text-[8px] font-black text-emerald-900 font-mono leading-tight shadow-2xs"
              >
                {getActionBadgeLabel('moveRight', keyBindings)}
              </span>
            )}
          </motion.button>
        </div>

        {/* Kanan Bawah Dekat Kursor: Tombol 'Bantu' (Tetap dapat ditekan saat 0 untuk memicu Level Bonus) */}
        <motion.button
          type="button"
          data-sfx="custom"
          onClick={handleUseHint}
          disabled={
            hasWon ||
            isTimeUp ||
            isDizzyPenalty ||
            isPaused ||
            hintCells.size > 0
          }
          aria-label={
            hintsLeft > 0
              ? `Bantu petunjuk jalan aman, sisa ${hintsLeft} kali`
              : 'Kuota Bantu habis, ketuk untuk main Level Bonus isi ulang lentera'
          }
          title={
            hintsLeft > 0
              ? `Bantu petunjuk jalan (${hintsLeft} tersisa)`
              : 'Kuota Bantu habis — ketuk untuk Level Bonus!'
          }
          whileHover={
            hasWon ||
            isTimeUp ||
            isDizzyPenalty ||
            isPaused ||
            hintCells.size > 0 ||
            shouldReduceMotion
              ? undefined
              : {
                  scale: 1.07,
                  y: -2,
                  transition: { type: 'spring', stiffness: 420, damping: 18 },
                }
          }
          whileTap={
            hasWon ||
            isTimeUp ||
            isDizzyPenalty ||
            isPaused ||
            hintCells.size > 0 ||
            shouldReduceMotion
              ? undefined
              : {
                  scale: 0.93,
                  y: 2,
                  transition: { type: 'spring', stiffness: 550, damping: 22 },
                }
          }
          className={`relative min-h-[48px] min-w-[66px] sm:min-w-[74px] px-2.5 py-1.5 rounded-2xl border-b-4 font-extrabold shadow-md hover:shadow-lg flex flex-col items-center justify-center gap-0.5 shrink-0 active:border-b-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 cursor-pointer ${
            hintsLeft <= 0
              ? 'bg-amber-200 hover:bg-amber-300 border-amber-500 text-amber-950 ring-2 ring-amber-300/70 focus-visible:ring-amber-500'
              : 'bg-yellow-300 hover:bg-yellow-400 border-amber-500 text-amber-950 focus-visible:ring-amber-500'
          }`}
        >
          {showShortcutLabels && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-1.5 -right-1 px-1 rounded bg-white border border-amber-600 text-[8px] font-black text-amber-950 font-mono leading-tight shadow-2xs"
            >
              {getActionBadgeLabel('hint', keyBindings)}
            </span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 shrink-0"
            aria-hidden="true"
          >
            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
            <path d="M9 18h6" />
            <path d="M10 22h4" />
          </svg>
          <span className="text-[10px] sm:text-[11px] font-extrabold leading-none tabular-nums">
            Bantu ({hintsLeft})
          </span>
        </motion.button>
      </nav>
  );

  return (
    <div
      className={`relative h-[100dvh] max-h-[100dvh] w-full transition-colors duration-700 flex flex-col items-center justify-between px-2.5 sm:px-4 py-2 select-none overflow-hidden ${
        isNightWeather
          ? 'bg-gradient-to-b from-slate-900 via-emerald-950 to-teal-950 text-stone-100'
          : 'bg-gradient-to-b from-sky-100 via-emerald-50 to-amber-100 text-stone-800'
      }`}
    >
      {/* Efek Cuaca Dinamis Hutan (Daun Gugur & Kunang-Kunang) di Latar Belakang */}
      <ForestWeatherOverlay
        weather={activeWeather}
        shouldReduceMotion={Boolean(shouldReduceMotion)}
      />

      <div className="relative z-10 w-full flex-1 min-h-0 flex flex-col items-center">
        <AnimatePresence mode="popLayout" initial={false} custom={levelSwipeDir}>
          <motion.div
            key={`level-screen-${level}-${boardVersion}`}
            custom={levelSwipeDir}
            variants={
              shouldReduceMotion
                ? LEVEL_SWIPE_REDUCED_VARIANTS
                : LEVEL_SWIPE_VARIANTS
            }
            initial="enter"
            animate="center"
            exit="exit"
            transition={
              shouldReduceMotion
                ? { duration: 0.16 }
                : {
                    x: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                    opacity: { duration: 0.35, ease: 'easeOut' },
                    scale: { duration: 0.46, ease: [0.22, 1, 0.36, 1] },
                  }
            }
            className="w-full h-full flex flex-col items-center justify-between will-change-transform"
          >
            {isLandscapeMode ? (
              /* ============================================================================
               * MODE TAMPILAN LANSKAP SATU LAYAR PADAT (Tanpa Perlu Menggulir):
               * 1. Sesi Pertama: Identitas Pemain & Toolbar Navigasi Cepat
               * 2. Sesi Kedua: Gabungan Informasi Level & Target Misi (2 Kolom Berdampingan) + Indikator Perolehan Skor di Sampingnya
               * 3. Area Utama Sejajar: Labirin di Tengah/Kiri & Kartu Kontrol Kendali Petualang Dinaikkan ke Bagian Atas di Kanan
               * ============================================================================ */
              <div className="relative z-10 w-full max-w-[1160px] h-full flex flex-col justify-between gap-2">
                {/* Baris Atas: Sesi 1 (Identitas & Toolbar) & Sesi 2 (Blok Informasi 2 Kolom + Skor di Sampingnya) */}
                <div className="w-full flex flex-col gap-1.5 shrink-0">
                  <div className="rounded-2xl bg-white/80 backdrop-blur-xl border-2 border-white/95 shadow-xs px-3 py-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                    <div className="min-w-0 flex-1">{playerIdentityBarElement}</div>
                    <div className="w-full sm:w-[390px] shrink-0">
                      {quickActionToolbarElement}
                    </div>
                  </div>

                  {combinedInfoAndScoreRowElement}
                </div>

                {/* Baris Utama: Labirin Proporsional & Kartu Kontrol Kendali Petualang Dinaikkan ke Atas */}
                <div className="w-full flex-1 min-h-0 grid grid-cols-12 gap-2.5 items-start my-auto">
                  {/* Area Labirin Utama */}
                  <main
                    aria-label="Area Labirin Utama"
                    className="col-span-6 sm:col-span-6 h-full flex items-center justify-center rounded-3xl bg-white/45 backdrop-blur-md border-2 border-white/75 shadow-xs p-2"
                  >
                    {mazeBoardElement}
                  </main>

                  {/* Kolom Samping: Kartu Kontrol Kendali Petualang Dinaikkan ke Bagian Atas */}
                  <aside
                    aria-label="Kontrol Kendali Petualang dan Pesan Pendamping"
                    className="col-span-6 sm:col-span-6 flex flex-col justify-start gap-2"
                  >
                    {/* Kartu Kontrol Kendali Petualang & Bantuan Jalur di Bagian Atas */}
                    <div className="w-full rounded-3xl bg-white/85 backdrop-blur-xl border-2 border-white/95 shadow-sm p-2.5 flex flex-col items-center justify-center gap-1.5">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600">
                        🎮 Kendali Petualang &amp; Bantuan Jalur
                      </p>
                      {dpadAndControlsElement}
                    </div>

                    {/* Pesan Pendamping & Tip Satwa */}
                    <div className="w-full rounded-2xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-xs p-2">
                      {companionAndTipElement}
                    </div>
                  </aside>
                </div>
              </div>
            ) : (
              /* ============================================================================
               * MODE TAMPILAN POTRET SATU LAYAR PADAT (Labirin Dominan & Fakta Multi-Paragraf):
               * ============================================================================ */
              <div className="relative z-10 w-full max-w-md h-full flex flex-col justify-between gap-1">
                <header className="w-full flex flex-col gap-1 shrink-0">
                  {playerIdentityBarElement}
                  {quickActionToolbarElement}
                  {combinedInfoAndScoreRowElement}
                </header>

                <main className="w-full flex-1 min-h-0 flex flex-col items-center justify-center gap-1">
                  {mazeBoardElement}
                  {portraitCharacterFactElement}
                </main>

                <div className="w-full rounded-2xl bg-white/80 backdrop-blur-xl border border-white/95 shadow-xs px-2 py-1 flex flex-col items-center shrink-0">
                  {dpadAndControlsElement}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Layar Akhir Level: Papan Skor Ganda, Penalti Pusing & Animasi Rusa Menari */}
      <AnimatePresence>
        {(hasWon || isTimeUp || isDizzyPenalty) && levelResult && (
          <motion.section
            ref={endLevelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="win-modal-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.12 : 0.2 }}
            className={`fixed inset-0 z-50 min-h-[100dvh] w-full flex flex-col items-center justify-between px-5 pt-6 pb-6 overflow-y-auto ${
              hasWon
                ? 'bg-gradient-to-b from-sky-100 via-emerald-100 to-amber-100'
                : 'bg-gradient-to-b from-amber-50 via-rose-50 to-amber-100'
            }`}
          >
            {/* Bintang Berkilau Lembut di Latar Langit (Saat Menang) */}
            {hasWon && !shouldReduceMotion && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden"
              >
                {[
                  { top: '8%', left: '12%', delay: 0, color: '#FBBF24' },
                  { top: '14%', right: '14%', delay: 0.35, color: '#38BDF8' },
                  { top: '30%', left: '8%', delay: 0.7, color: '#34D399' },
                  { top: '28%', right: '9%', delay: 0.5, color: '#FB7185' },
                ].map((star, index) => (
                  <motion.div
                    key={index}
                    style={{
                      top: star.top,
                      left: star.left,
                      right: star.right,
                    }}
                    animate={{
                      scale: [0.8, 1.25, 0.8],
                      rotate: [0, 20, -20, 0],
                      opacity: [0.55, 1, 0.55],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2.4,
                      delay: star.delay,
                      ease: 'easeInOut',
                    }}
                    className="absolute"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill={star.color}
                      className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-sm"
                    >
                      <path d="M12 2L14.6 9.4L22 12L14.6 14.6L12 22L9.4 14.6L2 12L9.4 9.4L12 2Z" />
                    </svg>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Judul Akhir Level */}
            <motion.div
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -16, scale: 0.94 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              className="relative z-10 text-center max-w-sm"
            >
              <p
                className={`text-xs sm:text-sm font-extrabold mb-0.5 tabular-nums ${
                  hasWon ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                Level {level} dari {LEVELS.length} · {currentLevelConfig.characterName} ·{' '}
                {currentLevelConfig.title}
              </p>
              <h2
                id="win-modal-title"
                className={`font-display text-2xl sm:text-3xl font-bold leading-tight text-balance ${
                  hasWon ? 'text-emerald-900' : 'text-rose-900'
                }`}
              >
                {isDizzyPenalty
                  ? lives > 0
                    ? `Aduh, ${currentLevelConfig.characterName} Pusing!`
                    : 'Yah, Nyawa Habis!'
                  : !hasWon
                  ? 'Yah, Waktu Habis!'
                  : level < LEVELS.length
                  ? `Hore! Level ${level} Selesai!`
                  : 'Hebat! Semua 10 Level Tamat!'}
              </h2>
              {isDizzyPenalty && (
                <p className="text-xs sm:text-sm font-bold text-rose-800/85 mt-1">
                  Menabrak {currentLevelConfig.obstacleName} lebih dari{' '}
                  {MAX_WALL_BUMPS} kali · Sisa nyawa: {lives}/{MAX_LIVES}
                </p>
              )}
              {(hasWon || isTimeUp || isDizzyPenalty) && (
                <button
                  type="button"
                  data-sfx="custom"
                  onClick={handleReplayVictoryNarration}
                  aria-label={
                    hasWon
                      ? 'Dengarkan ulang ucapan selamat'
                      : 'Dengarkan ulang pesan semangat'
                  }
                  title="Dengarkan Ulang"
                  className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-extrabold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
                    hasWon
                      ? isNarrating
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-900 focus-visible:ring-emerald-500'
                        : 'bg-white/85 hover:bg-white border-emerald-300 text-emerald-900 shadow-xs focus-visible:ring-emerald-500'
                      : isNarrating
                      ? 'bg-rose-100 border-rose-400 text-rose-900 focus-visible:ring-rose-500'
                      : 'bg-white/85 hover:bg-white border-rose-300 text-rose-900 shadow-xs focus-visible:ring-rose-500'
                  }`}
                >
                  <Volume2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isNarrating
                        ? hasWon
                          ? 'animate-pulse text-emerald-700'
                          : 'animate-pulse text-rose-700'
                        : ''
                    }`}
                    aria-hidden="true"
                  />
                  <span>Dengarkan Ulang</span>
                </button>
              )}
            </motion.div>

            {/* Panggung Rusa Menari di Hutan / Pusing saat Penalti */}
            <div className="relative z-10 flex flex-col items-center justify-center my-1">
              <div className="relative flex items-end justify-center w-56 h-40 sm:w-64 sm:h-48">
                {/* Tujuan Akhir Karakter Bergoyang Lembut di Belakang */}
                <motion.div
                  animate={
                    shouldReduceMotion || !hasWon
                      ? undefined
                      : { rotate: [-1.5, 1.5, -1.5] }
                  }
                  transition={{
                    repeat: Infinity,
                    duration: 3.2,
                    ease: 'easeInOut',
                  }}
                  className="absolute bottom-2 right-1 sm:right-2 w-28 h-28 sm:w-36 sm:h-36 opacity-95 origin-bottom"
                >
                  <DestinationIcon
                    kind={currentLevelConfig.destinationKind}
                    alt={currentLevelConfig.destinationName}
                    className="w-full h-full drop-shadow-md pointer-events-none select-none"
                  />
                </motion.div>

                {/* Bayangan Tanah Mengikuti Lompatan Rusa */}
                <motion.div
                  aria-hidden="true"
                  animate={
                    shouldReduceMotion || !hasWon
                      ? undefined
                      : {
                          scaleX: [1, 0.72, 1, 0.8, 1],
                          opacity: [0.3, 0.16, 0.3, 0.2, 0.3],
                        }
                  }
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: 'easeInOut',
                  }}
                  className="absolute bottom-1 left-8 sm:left-10 w-24 h-4 rounded-full bg-emerald-900/25 blur-[2px]"
                />

                {/* Karakter Rusa Menari / Pusing Lemas */}
                <motion.div
                  initial={
                    shouldReduceMotion ? false : { scale: 0.6, y: 16 }
                  }
                  animate={
                    shouldReduceMotion
                      ? { scale: 1 }
                      : hasWon
                      ? {
                          y: [0, -20, 0, -14, 0],
                          rotate: [0, -9, 9, -6, 6, 0],
                          scaleX: [1, 0.94, 1.06, 0.96, 1.04, 1],
                          scaleY: [1, 1.08, 0.9, 1.05, 0.93, 1],
                        }
                      : isDizzyPenalty
                      ? {
                          y: [0, 4, 2, 4, 0],
                          rotate: [0, -10, 10, -8, 8, 0],
                          scaleX: [1, 1.04, 0.98, 1.04, 1],
                          scaleY: [1, 0.9, 0.94, 0.9, 1],
                        }
                      : {
                          y: [0, -4, 0],
                          rotate: [0, -3, 3, 0],
                        }
                  }
                  transition={
                    shouldReduceMotion
                      ? { duration: 0.2 }
                      : {
                          repeat: Infinity,
                          duration: hasWon ? 1.5 : isDizzyPenalty ? 1.8 : 2.2,
                          ease: 'easeInOut',
                        }
                  }
                  className={`relative z-10 mr-12 mb-2 w-28 h-28 sm:w-36 sm:h-36 origin-bottom ${
                    isDizzyPenalty ? 'opacity-90 saturate-75' : ''
                  }`}
                >
                  {/* Bintang Pusing Berputar saat Penalti */}
                  {isDizzyPenalty && !shouldReduceMotion && (
                    <motion.div
                      aria-hidden="true"
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.3,
                        ease: 'linear',
                      }}
                      className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 flex items-center justify-between"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="#FBBF24"
                        className="w-5 h-5 drop-shadow-sm"
                      >
                        <path d="M12 2L14.6 9.4L22 12L14.6 14.6L12 22L9.4 14.6L2 12L9.4 9.4L12 2Z" />
                      </svg>
                      <svg
                        viewBox="0 0 24 24"
                        fill="#FB7185"
                        className="w-4 h-4 -mt-3 drop-shadow-sm"
                      >
                        <path d="M12 2L14.6 9.4L22 12L14.6 14.6L12 22L9.4 14.6L2 12L9.4 9.4L12 2Z" />
                      </svg>
                      <svg
                        viewBox="0 0 24 24"
                        fill="#FDE047"
                        className="w-5 h-5 drop-shadow-sm"
                      >
                        <path d="M12 2L14.6 9.4L22 12L14.6 14.6L12 22L9.4 14.6L2 12L9.4 9.4L12 2Z" />
                      </svg>
                    </motion.div>
                  )}

                  <KawaiiCharacterIcon
                    character={activeCharacterKey}
                    mood={
                      hasWon
                        ? 'cheer'
                        : isDizzyPenalty
                        ? 'dizzy'
                        : 'happy'
                    }
                    alt={
                      hasWon
                        ? `${currentLevelConfig.characterName} kawaii menari gembira`
                        : isDizzyPenalty
                        ? `${currentLevelConfig.characterName} kawaii pusing setelah menabrak ${currentLevelConfig.obstacleName}`
                        : `${currentLevelConfig.characterName} kawaii menyemangati untuk mencoba lagi`
                    }
                    className="w-full h-full drop-shadow-md pointer-events-none select-none"
                  />
                </motion.div>
              </div>
            </div>

            {/* Papan Skor Akhir Level (Penilaian Ganda: Efisiensi Langkah + Kecepatan Waktu) */}
            <motion.div
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 14, scale: 0.96 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.08, duration: 0.28 }}
              className="relative z-10 w-full max-w-sm rounded-3xl bg-white/85 backdrop-blur-md border-2 border-white shadow-[0_12px_30px_rgba(16,185,129,0.14)] px-4 py-3.5"
            >
              {/* Bintang Penilaian */}
              <motion.div
                key={`star-rating-${level}-${boardVersion}-${levelResult.stars}`}
                aria-label={`Bintang yang diraih: ${levelResult.stars} dari 3`}
                variants={
                  shouldReduceMotion
                    ? undefined
                    : STAR_RATING_CONTAINER_VARIANTS
                }
                initial={shouldReduceMotion ? false : 'hidden'}
                animate="visible"
                className="flex items-center justify-center gap-3 mb-2.5 pt-1"
              >
                {[1, 2, 3].map((starIndex) => {
                  const earned = starIndex <= levelResult.stars;
                  const isCenterStar = starIndex === 2;
                  const sizeClasses = isCenterStar
                    ? 'w-11 h-11 sm:w-12 sm:h-12'
                    : 'w-9 h-9 sm:w-10 sm:h-10';
                  return (
                    <motion.div
                      key={starIndex}
                      variants={
                        shouldReduceMotion
                          ? undefined
                          : STAR_SLOT_STAGGER_VARIANTS
                      }
                      className={`relative flex items-center justify-center ${sizeClasses} ${
                        isCenterStar ? '-translate-y-1' : ''
                      }`}
                    >
                      {/* Soket bintang latar yang selalu terlihat sebagai penanda slot */}
                      <svg
                        viewBox="0 0 24 24"
                        className="w-full h-full text-stone-300/85"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M12 2.5l2.92 5.91 6.53.95-4.72 4.6 1.11 6.5L12 17.39l-5.84 3.07 1.11-6.5-4.72-4.6 6.53-.95L12 2.5z" />
                      </svg>

                      {/* Bintang emas muncul berurutan satu per satu dengan efek pegas memantul */}
                      {earned && (
                        <>
                          {!shouldReduceMotion && (
                            <>
                              <motion.span
                                aria-hidden="true"
                                variants={STAR_SPARKLE_RING_VARIANTS}
                                className="pointer-events-none absolute inset-0 rounded-full border-2 border-amber-300/90"
                              />
                              {STAR_SPARKLE_OFFSETS.map((offset, dotIdx) => (
                                <motion.span
                                  key={dotIdx}
                                  aria-hidden="true"
                                  custom={offset}
                                  variants={STAR_SPARKLE_DOT_VARIANTS}
                                  className="pointer-events-none absolute w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_4px_rgba(251,191,36,0.9)]"
                                />
                              ))}
                            </>
                          )}
                          <motion.div
                            variants={
                              shouldReduceMotion
                                ? undefined
                                : STAR_EARNED_POP_VARIANTS
                            }
                            className="absolute inset-0 flex items-center justify-center will-change-transform"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="w-full h-full text-amber-400 drop-shadow-[0_3px_8px_rgba(245,158,11,0.5)]"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path d="M12 2.5l2.92 5.91 6.53.95-4.72 4.6 1.11 6.5L12 17.39l-5.84 3.07 1.11-6.5-4.72-4.6 6.53-.95L12 2.5z" />
                            </svg>
                          </motion.div>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Rincian Penilaian Ganda */}
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <div className="rounded-2xl bg-emerald-50/90 border border-emerald-200/80 px-3 py-2 text-center">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-emerald-700">
                    Efisiensi Langkah
                  </p>
                  <p className="font-display text-lg sm:text-xl font-bold text-emerald-950 tabular-nums leading-tight mt-0.5">
                    +{levelResult.stepScore}
                  </p>
                  <p className="text-[11px] font-bold text-emerald-800/80 tabular-nums">
                    {levelResult.stepsTaken}/{levelResult.optimalSteps} langkah
                    {hasWon ? ` (${levelResult.efficiencyPct}%)` : ''}
                  </p>
                </div>

                <div className="rounded-2xl bg-sky-50/90 border border-sky-200/80 px-3 py-2 text-center">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-sky-700">
                    Poin Waktu
                  </p>
                  <p className="font-display text-lg sm:text-xl font-bold text-sky-950 tabular-nums leading-tight mt-0.5">
                    +{levelResult.timeScore}
                  </p>
                  <p className="text-[11px] font-bold text-sky-800/80 tabular-nums">
                    Sisa {levelResult.timeLeft}d dari {levelResult.timeLimit}d
                  </p>
                </div>
              </div>

              {/* Total Skor Level & Akumulasi Permainan */}
              <div className="flex items-center justify-between rounded-2xl bg-amber-100/80 border border-amber-200 px-3.5 py-2 tabular-nums">
                <div>
                  <p className="text-[11px] font-extrabold text-amber-900/75 uppercase tracking-wide">
                    Skor Level {level}
                  </p>
                  <p className="font-display text-xl font-bold text-amber-950 leading-none mt-0.5">
                    {levelResult.totalScore} poin
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-extrabold text-amber-900/75 uppercase tracking-wide">
                    Total Skor
                  </p>
                  <p className="font-display text-lg font-bold text-emerald-800 leading-none mt-0.5">
                    {totalSessionScore} poin
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Tombol Aksi Akhir Level */}
            <motion.div
              initial={
                shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.25 }}
              className="relative z-10 w-full max-w-sm flex flex-col gap-2.5 mt-2"
            >
              {hasWon ? (
                <>
                  <motion.button
                    type="button"
                    data-kb-default="true"
                    onClick={handleNextLevel}
                    whileHover={
                      shouldReduceMotion
                        ? undefined
                        : {
                            scale: 1.03,
                            y: -2,
                            transition: {
                              type: 'spring',
                              stiffness: 420,
                              damping: 18,
                            },
                          }
                    }
                    whileTap={
                      shouldReduceMotion
                        ? undefined
                        : {
                            scale: 0.97,
                            y: 2,
                            transition: {
                              type: 'spring',
                              stiffness: 550,
                              damping: 22,
                            },
                          }
                    }
                    className="w-full min-h-[50px] px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-xl font-bold shadow-lg active:border-b-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 flex items-center justify-center gap-2"
                  >
                    <span>
                      {level < LEVELS.length
                        ? `Lanjut Level ${level + 1}`
                        : 'Terima Piagam Penjaga Alam 🏅'}
                    </span>
                    {showShortcutLabels && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-700/70 text-[10px] font-black font-mono">
                        {getActionBadgeLabel('confirm', keyBindings)}
                      </span>
                    )}
                  </motion.button>

                  <div className="grid grid-cols-2 gap-2.5">
                    <motion.button
                      type="button"
                      onClick={() => void handleShareResult()}
                      whileHover={
                        shouldReduceMotion
                          ? undefined
                          : {
                              scale: 1.04,
                              y: -2,
                              transition: {
                                type: 'spring',
                                stiffness: 420,
                                damping: 18,
                              },
                            }
                      }
                      whileTap={
                        shouldReduceMotion
                          ? undefined
                          : {
                              scale: 0.96,
                              y: 2,
                              transition: {
                                type: 'spring',
                                stiffness: 550,
                                damping: 22,
                              },
                            }
                      }
                      className="min-h-[46px] px-4 py-2 rounded-2xl bg-sky-400 hover:bg-sky-500 border-b-4 border-sky-600 text-white font-extrabold text-sm whitespace-nowrap flex items-center justify-center gap-2 shadow-md active:border-b-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4 shrink-0"
                        aria-hidden="true"
                      >
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                      <span>
                        {shareStatus === 'copied'
                          ? 'Tersalin!'
                          : shareStatus === 'shared'
                          ? 'Dibagikan!'
                          : shareStatus === 'error'
                          ? 'Coba Lagi'
                          : 'Bagikan Hasil'}
                      </span>
                    </motion.button>

                    <motion.button
                      type="button"
                      onClick={resetGame}
                      whileHover={
                        shouldReduceMotion
                          ? undefined
                          : {
                              scale: 1.04,
                              y: -2,
                              transition: {
                                type: 'spring',
                                stiffness: 420,
                                damping: 18,
                              },
                            }
                      }
                      whileTap={
                        shouldReduceMotion
                          ? undefined
                          : {
                              scale: 0.96,
                              y: 2,
                              transition: {
                                type: 'spring',
                                stiffness: 550,
                                damping: 22,
                              },
                            }
                      }
                      className="min-h-[46px] px-4 py-2 rounded-2xl bg-amber-300 hover:bg-amber-400 border-b-4 border-amber-500 text-amber-950 font-extrabold text-sm whitespace-nowrap shadow-md active:border-b-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      Ulangi Level {level}
                    </motion.button>
                  </div>
                </>
              ) : (
                <>
                  <motion.button
                    type="button"
                    data-kb-default="true"
                    onClick={resetGame}
                    whileHover={
                      shouldReduceMotion
                        ? undefined
                        : {
                            scale: 1.03,
                            y: -2,
                            transition: {
                              type: 'spring',
                              stiffness: 420,
                              damping: 18,
                            },
                          }
                    }
                    whileTap={
                      shouldReduceMotion
                        ? undefined
                        : {
                            scale: 0.97,
                            y: 2,
                            transition: {
                              type: 'spring',
                              stiffness: 550,
                              damping: 22,
                            },
                          }
                    }
                    className="w-full min-h-[52px] px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 border-b-4 border-amber-600 text-amber-950 font-display text-xl font-bold shadow-lg active:border-b-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 flex items-center justify-center gap-2"
                  >
                    <span>
                      {lives > 0
                        ? `Coba Lagi · Ulangi Level ${level}`
                        : 'Coba Lagi · Mulai (3 Nyawa)'}
                    </span>
                    {showShortcutLabels && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-600/25 text-[10px] font-black font-mono">
                        {getActionBadgeLabel('confirm', keyBindings)}
                      </span>
                    )}
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={handleConfirmExitToCover}
                    whileHover={
                      shouldReduceMotion
                        ? undefined
                        : {
                            scale: 1.02,
                            y: -1.5,
                            transition: {
                              type: 'spring',
                              stiffness: 420,
                              damping: 18,
                            },
                          }
                    }
                    whileTap={
                      shouldReduceMotion
                        ? undefined
                        : {
                            scale: 0.97,
                            y: 1.5,
                            transition: {
                              type: 'spring',
                              stiffness: 550,
                              damping: 22,
                            },
                          }
                    }
                    className="w-full min-h-[44px] px-4 py-2 rounded-2xl bg-white/90 hover:bg-white border-b-4 border-rose-300 text-rose-900 font-extrabold text-sm shadow-sm active:border-b-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 flex items-center justify-center gap-2"
                  >
                    <span>Kembali ke Menu</span>
                    {showShortcutLabels && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-[10px] font-black font-mono text-rose-800">
                        {getActionBadgeLabel('back', keyBindings)}
                      </span>
                    )}
                  </motion.button>
                </>
              )}
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Canvas Tambahan Efek Kembang Api Dinamis dari Titik Tujuan (3) saat Menang */}
      <GoalFireworksCanvas
        active={hasWon}
        burst={goalFireworkBurst}
        reduceMotion={shouldReduceMotion}
      />

      {/* Overlay Jeda Permainan (Pause) Ramah Anak */}
      <AnimatePresence>
        {isPaused &&
          !hasWon &&
          !isTimeUp &&
          !isDizzyPenalty &&
          !isOverlayFlowActive &&
          !isTutorialOpen && (
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="pause-modal-title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-emerald-950/35 backdrop-blur-md"
            >
              <motion.div
                ref={pauseModalRef}
                initial={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.92, y: 16 }
                }
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.94, y: 10 }
                }
                transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                className="w-full max-w-sm rounded-3xl bg-white/92 backdrop-blur-2xl border-2 border-white shadow-[0_24px_60px_rgba(15,23,42,0.28)] p-5 sm:p-6 text-center text-stone-800"
              >
                <motion.div
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : { y: [0, -5, 0], rotate: [0, -2, 2, 0] }
                  }
                  transition={{
                    repeat: Infinity,
                    duration: 2.6,
                    ease: 'easeInOut',
                  }}
                  className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-100 border-2 border-white shadow-md flex items-center justify-center p-1.5 mb-3"
                >
                  <KawaiiCharacterIcon
                    character={activeCharacterKey}
                    mood="happy"
                    alt={`${currentLevelConfig.characterName} beristirahat sejenak`}
                    className="w-full h-full drop-shadow-sm pointer-events-none select-none"
                  />
                </motion.div>

                <p className="text-xs font-extrabold text-sky-700 mb-0.5 tabular-nums">
                  Level {level} · {currentLevelConfig.characterName} · Sisa waktu{' '}
                  {timeLeft} detik
                </p>
                <h2
                  id="pause-modal-title"
                  className="font-display text-2xl font-bold text-emerald-950 leading-tight text-balance"
                >
                  Istirahat Sebentar!
                </h2>
                <p className="text-xs sm:text-sm font-bold text-stone-600 mt-1 mb-4 leading-snug">
                  Waktu permainan dijeda. Ketuk Lanjutkan kalau kamu sudah siap jalan lagi ya!
                </p>

                <div className="flex flex-col gap-2.5">
                  <motion.button
                    type="button"
                    data-sfx="custom"
                    data-kb-default="true"
                    onClick={() => {
                      setIsPaused(false);
                    }}
                    whileHover={
                      shouldReduceMotion
                        ? undefined
                        : {
                            scale: 1.03,
                            y: -2,
                            transition: {
                              type: 'spring',
                              stiffness: 420,
                              damping: 18,
                            },
                          }
                    }
                    whileTap={
                      shouldReduceMotion
                        ? undefined
                        : {
                            scale: 0.97,
                            y: 2,
                            transition: {
                              type: 'spring',
                              stiffness: 550,
                              damping: 22,
                            },
                          }
                    }
                    className="w-full min-h-[52px] px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-xl font-bold shadow-lg active:border-b-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 flex items-center justify-center gap-2"
                  >
                    <span>Lanjutkan Bermain</span>
                    {showShortcutLabels && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-700/70 text-[10px] font-black font-mono">
                        {getActionBadgeLabel('confirm', keyBindings)}
                      </span>
                    )}
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={resetGame}
                    whileHover={
                      shouldReduceMotion
                        ? undefined
                        : {
                            scale: 1.03,
                            y: -1.5,
                            transition: {
                              type: 'spring',
                              stiffness: 420,
                              damping: 18,
                            },
                          }
                    }
                    whileTap={
                      shouldReduceMotion
                        ? undefined
                        : {
                            scale: 0.97,
                            y: 2,
                            transition: {
                              type: 'spring',
                              stiffness: 550,
                              damping: 22,
                            },
                          }
                    }
                    className="w-full min-h-[46px] px-5 py-2 rounded-2xl bg-amber-200 hover:bg-amber-300 border-b-4 border-amber-400 text-amber-950 font-extrabold text-sm shadow-sm active:border-b-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    Ulangi Level {level}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Modal Peringatan Konfirmasi Keluar ke Halaman Sampul saat Tombol (X) Ditekan */}
      <AnimatePresence>
        {isExitConfirmOpen && (
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="exit-confirm-title"
            aria-describedby="exit-confirm-desc"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleCancelExitToCover}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-emerald-950/45 backdrop-blur-md"
          >
            <motion.div
              ref={exitConfirmRef}
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
              className="w-full max-w-sm rounded-3xl bg-white/95 backdrop-blur-2xl border-2 border-white shadow-[0_24px_60px_rgba(15,23,42,0.3)] p-5 sm:p-6 text-center text-stone-800"
            >
              <motion.div
                animate={
                  shouldReduceMotion
                    ? undefined
                    : { y: [0, -4, 0], rotate: [0, -3, 3, 0] }
                }
                transition={{
                  repeat: Infinity,
                  duration: 2.4,
                  ease: 'easeInOut',
                }}
                className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-100 via-amber-50 to-orange-100 border-2 border-rose-200 shadow-md flex items-center justify-center p-1.5 mb-3 relative"
              >
                <KawaiiCharacterIcon
                  character={activeCharacterKey}
                  mood="happy"
                  alt={`${currentLevelConfig.characterName} bertanya apakah kamu yakin ingin keluar`}
                  className="w-full h-full drop-shadow-sm pointer-events-none select-none"
                />
                <span
                  aria-hidden="true"
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-rose-500 border-2 border-white text-white text-xs font-black flex items-center justify-center shadow-sm"
                >
                  !
                </span>
              </motion.div>

              <p className="text-xs font-extrabold text-rose-600 mb-0.5 tabular-nums">
                Level {level} · {currentLevelConfig.characterName}
              </p>
              <h2
                id="exit-confirm-title"
                className="font-display text-2xl font-bold text-emerald-950 leading-tight text-balance"
              >
                Yakin Ingin Keluar?
              </h2>
              <p
                id="exit-confirm-desc"
                className="text-xs sm:text-sm font-bold text-stone-600 mt-1.5 mb-5 leading-relaxed"
              >
                Jika keluar ke halaman sampul sekarang, permainan di Level {level}{' '}
                akan dihentikan dan progres langkah di level ini belum tersimpan.
              </p>

              <div className="flex flex-col gap-2.5">
                <motion.button
                  type="button"
                  data-sfx="custom"
                  data-kb-default="true"
                  onClick={handleCancelExitToCover}
                  whileHover={
                    shouldReduceMotion
                      ? undefined
                      : {
                          scale: 1.03,
                          y: -2,
                          transition: {
                            type: 'spring',
                            stiffness: 420,
                            damping: 18,
                          },
                        }
                  }
                  whileTap={
                    shouldReduceMotion
                      ? undefined
                      : {
                          scale: 0.97,
                          y: 2,
                          transition: {
                            type: 'spring',
                            stiffness: 550,
                            damping: 22,
                          },
                        }
                  }
                  className="w-full min-h-[50px] px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-lg font-bold shadow-lg active:border-b-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 flex items-center justify-center gap-2"
                >
                  <span>Lanjut Bermain</span>
                  {showShortcutLabels && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-700/70 text-[10px] font-black font-mono">
                      {getActionBadgeLabel('back', keyBindings)}
                    </span>
                  )}
                </motion.button>

                <motion.button
                  type="button"
                  onClick={handleConfirmExitToCover}
                  whileHover={
                    shouldReduceMotion
                      ? undefined
                      : {
                          scale: 1.02,
                          y: -1,
                          transition: {
                            type: 'spring',
                            stiffness: 420,
                            damping: 18,
                          },
                        }
                  }
                  whileTap={
                    shouldReduceMotion
                      ? undefined
                      : {
                          scale: 0.97,
                          y: 2,
                          transition: {
                            type: 'spring',
                            stiffness: 550,
                            damping: 22,
                          },
                        }
                  }
                  className="w-full min-h-[46px] px-5 py-2 rounded-2xl bg-rose-500 hover:bg-rose-600 border-b-4 border-rose-700 text-white font-extrabold text-sm shadow-md active:border-b-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  Ya, Keluar ke Sampul
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Pengaturan Permainan di Dalam Game (Mode Tampilan Potret/Lanskap & Suara) */}
      <AnimatePresence>
        {isGameSettingsOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ingame-settings-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsGameSettingsOpen(false)}
            className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-emerald-950/45 backdrop-blur-md"
          >
            <motion.div
              ref={gameSettingsRef}
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
                id="ingame-settings-title"
                className="font-display text-xl font-bold text-emerald-950"
              >
                Pengaturan Permainan
              </h2>
              <p className="text-xs font-bold text-stone-600 mt-1 mb-3">
                Ubah mode tampilan, label tombol, lisensi, atau tombol Keyboard / Numpad tanpa kehilangan progres!
              </p>

              {/* Tab Pengaturan Dalam Game */}
              <div
                role="tablist"
                aria-label="Kategori pengaturan dalam game"
                className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-stone-100 border border-stone-200 mb-3.5"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={inGameSettingsTab === 'general'}
                  onClick={() => {
                    setInGameSettingsTab('general');
                  }}
                  className={`px-2.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    inGameSettingsTab === 'general'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  ⚙️ Umum &amp; Lisensi
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={inGameSettingsTab === 'keyboard'}
                  onClick={() => {
                    setInGameSettingsTab('keyboard');
                  }}
                  className={`px-2.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    inGameSettingsTab === 'keyboard'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  ⌨️ Keyboard / Numpad
                </button>
              </div>

              {inGameSettingsTab === 'general' ? (
                <>
                  {/* Opsi Mode Tampilan (Potret / Lanskap) */}
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
                          handleChangeDisplayMode('portrait');
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
                          handleChangeDisplayMode('landscape');
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
                        ? 'Papan Skor di sisi kiri, Labirin di tengah, dan Informasi Misi di sisi kanan.'
                        : 'Susunan vertikal ringkas untuk layar ponsel tegak.'}
                    </p>
                  </div>

                  {/* Toggle Efek Suara (SFX) */}
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
                          : 'Semua efek suara permainan sedang dibisukan.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      data-sfx="custom"
                      role="switch"
                      aria-checked={soundEnabled}
                      aria-label={
                        soundEnabled
                          ? 'Matikan efek suara permainan'
                          : 'Aktifkan efek suara permainan'
                      }
                      onClick={handleToggleSound}
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

                  {/* Toggle Musik Latar (BGM) Terpisah */}
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
                          ? 'Audio utama sedang Bisu — aktifkan Suara di header untuk mendengar.'
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
                          ? 'Matikan musik latar permainan'
                          : 'Aktifkan musik latar permainan'
                      }
                      onClick={handleToggleBgm}
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

                  {/* Toggle Suara Narator */}
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
                      onClick={handleToggleNarrator}
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

                  {/* Toggle Suara Alam Hutan (Ambient SFX) */}
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
                      onClick={handleToggleAmbient}
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

                  {/* Toggle Tampilkan Label Tombol */}
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
                        handleToggleShowShortcutLabels();
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

                  {/* Toggle Status Lisensi Game Penuh */}
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
                          {licenseBadgeLabel}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-amber-900/80 leading-snug mt-0.5">
                        {licenseDetailText}
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
                      onClick={handleToggleLicenseStatus}
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
                </>
              ) : (
                <div className="mb-4">
                  <KeyboardSettingsPanel
                    keyBindings={keyBindings}
                    showShortcutLabels={showShortcutLabels}
                    onUpdateBinding={handleUpdateKeyBinding}
                    onResetBindings={handleResetKeyBindings}
                    onToggleShowShortcutLabels={handleToggleShowShortcutLabels}
                    onRecordingChange={setIsRecordingInGameKey}
                  />
                </div>
              )}

              <button
                type="button"
                data-sfx="custom"
                data-kb-default="true"
                onClick={() => setIsGameSettingsOpen(false)}
                className="w-full min-h-[44px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-base font-bold shadow-md active:border-b-0 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Simpan &amp; Lanjutkan</span>
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

      {/* Modal Papan Skor Melayang (iOS Frosted Glassmorphism) */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => {
          setIsLeaderboardOpen(false);
          if (hasWon && screenState === 'PLAYING') {
            narrator.playLevelCompleteStage2Voice();
          }
        }}
        entries={leaderboardEntries}
        playerName={playerName}
        onPlayerNameChange={handlePlayerNameChange}
        latestWinSummary={latestWinSummary}
        shouldReduceMotion={Boolean(shouldReduceMotion)}
        keyBindings={keyBindings}
        showShortcutLabels={showShortcutLabels}
      />

      {/* 0. Halaman Cover Utama (SCREEN_COVER): Orientasi Responsif Hutan Ajaib */}
      <CoverScreen
        isOpen={screenState === 'SCREEN_COVER'}
        shouldReduceMotion={Boolean(shouldReduceMotion)}
        displayMode={displayMode}
        onChangeDisplayMode={handleChangeDisplayMode}
        soundEnabled={soundEnabled}
        bgmEnabled={bgmEnabled}
        narratorEnabled={narratorEnabled}
        ambientEnabled={ambientEnabled}
        onToggleSound={handleToggleSound}
        onToggleBgm={handleToggleBgm}
        onToggleNarrator={handleToggleNarrator}
        onToggleAmbient={handleToggleAmbient}
        isLicenseActive={isLicenseActive}
        licenseBadgeLabel={licenseBadgeLabel}
        licenseDetailText={licenseDetailText}
        onToggleLicense={handleToggleLicenseStatus}
        keyBindings={keyBindings}
        showShortcutLabels={showShortcutLabels}
        isOtherModalOpen={isLeaderboardOpen || isTutorialOpen || isLicensePopupOpen}
        onUpdateKeyBinding={handleUpdateKeyBinding}
        onResetKeyBindings={handleResetKeyBindings}
        onToggleShowShortcutLabels={handleToggleShowShortcutLabels}
        onStart={() => {
          setScreenState('SELECT_MODE');
          narrator.playSelectModeVoice();
        }}
        onOpenLeaderboard={() => {
          setIsLeaderboardOpen(true);
        }}
        onOpenHelp={() => {
          setIsTutorialOpen(true);
        }}
      />

      {/* 1. Layar Pemilihan Mode (SELECT_MODE): Petualang Solo vs Estafet Kelompok */}
      <ModeSelectScreen
        isOpen={screenState === 'SELECT_MODE'}
        shouldReduceMotion={Boolean(shouldReduceMotion)}
        keyBindings={keyBindings}
        showShortcutLabels={showShortcutLabels}
        onSelectMode={handleSelectMode}
        onBackToCover={() => {
          narrator.stop();
          setScreenState('SCREEN_COVER');
        }}
      />

      {/* 2. Layar Pengaturan (SETUP): Form Dinamis Solo / Kelompok (2-4 Anak) */}
      <SetupScreen
        isOpen={screenState === 'SETUP'}
        mode={gameMode}
        initialPlayerName={playerName}
        initialCompanionName={companionName}
        initialGroupName={groupName}
        initialGroupPlayers={groupPlayers}
        shouldReduceMotion={Boolean(shouldReduceMotion)}
        keyBindings={keyBindings}
        showShortcutLabels={showShortcutLabels}
        onBackToModeSelect={() => {
          setScreenState('SELECT_MODE');
          narrator.playSelectModeVoice();
        }}
        onSubmitSetup={handleSetupSubmit}
      />

      {/* 3. Layar Prolog Dinamis (PROLOGUE): Teks Solo / Kelompok dari Pak Naedie */}
      <PrologueScreen
        isOpen={screenState === 'PROLOGUE'}
        displayMode={displayMode}
        mode={gameMode}
        playerName={playerName}
        groupName={groupName}
        groupPlayers={groupPlayers}
        companionName={companionName}
        shouldReduceMotion={Boolean(shouldReduceMotion)}
        keyBindings={keyBindings}
        showShortcutLabels={showShortcutLabels}
        onStartAdventure={handleStartAdventureFromPrologue}
        onBackToSetup={() => {
          setScreenState('SETUP');
          narrator.playSetupVoice();
        }}
      />

      {/* 4. Layar Transisi Giliran (TRANSITION - Khusus Mode Kelompok) */}
      <GroupTransitionScreen
        isOpen={screenState === 'TRANSITION'}
        groupName={groupName}
        companionName={companionName}
        currentPlayerIndex={currentPlayerIndex}
        totalPlayers={groupPlayers.length}
        currentPlayerName={
          groupPlayers[currentPlayerIndex] || `Anak ${currentPlayerIndex + 1}`
        }
        level={level}
        characterKey={activeCharacterKey}
        characterName={currentLevelConfig.characterName}
        previousTurnResult={previousTurnResult}
        shouldReduceMotion={Boolean(shouldReduceMotion)}
        keyBindings={keyBindings}
        showShortcutLabels={showShortcutLabels}
        onStartTurn={handleStartGroupTurn}
      />

      {/* 5. Layar Leaderboard Apresiatif (LEADERBOARD - Akhir Giliran Mode Kelompok) */}
      <GroupAppreciativeLeaderboardScreen
        isOpen={screenState === 'LEADERBOARD'}
        groupName={groupName}
        companionName={companionName}
        level={level}
        results={groupTurnResults}
        shouldReduceMotion={Boolean(shouldReduceMotion)}
        keyBindings={keyBindings}
        showShortcutLabels={showShortcutLabels}
        onPlayNextRound={handleNextLevel}
        onReplaySameRound={() => {
          loadLevel(level);
          setLives(MAX_LIVES);
          setCurrentPlayerIndex(0);
          setGroupTurnResults([]);
          setPreviousTurnResult(null);
          setPlayerName(groupPlayers[0] || 'Anak 1');
          setScreenState('TRANSITION');
        }}
        onChangeMode={() => {
          setScreenState('SELECT_MODE');
        }}
      />

      {/* Modul Tutorial Interaktif Ramah Balita (Akses kapan saja dari tautan bantuan) */}
      <InteractiveTutorialModal
        isOpen={isTutorialOpen}
        onComplete={() => setIsTutorialOpen(false)}
        shouldReduceMotion={Boolean(shouldReduceMotion)}
        keyBindings={keyBindings}
        showShortcutLabels={showShortcutLabels}
      />

      {/* Modul Dialog Apresiasi dari Karakter Pendamping saat Semua Item Terkumpul */}
      <AppreciationDialogModal
        isOpen={
          isAppreciationOpen &&
          !hasWon &&
          !isTimeUp &&
          !isDizzyPenalty &&
          !isOverlayFlowActive
        }
        level={level}
        playerName={playerName}
        companionName={companionName}
        characterKey={activeCharacterKey}
        characterName={currentLevelConfig.characterName}
        collectibleKind={currentLevelConfig.collectibleKind}
        collectibleName={currentLevelConfig.collectibleName}
        totalCollectibles={totalCollectibles}
        destinationKind={currentLevelConfig.destinationKind}
        destinationName={currentLevelConfig.destinationName}
        levelTip={levelTip}
        shouldReduceMotion={Boolean(shouldReduceMotion)}
        keyBindings={keyBindings}
        showShortcutLabels={showShortcutLabels}
        onContinue={() => {
          setIsAppreciationOpen(false);
        }}
      />

      {/* Modal Edukatif Acak "Tahukah Kamu?" di Antara Level */}
      <DidYouKnowModal
        isOpen={
          isDidYouKnowOpen &&
          !hasWon &&
          !isTimeUp &&
          !isDizzyPenalty &&
          !isOverlayFlowActive
        }
        level={level}
        characterKey={activeCharacterKey}
        characterName={currentLevelConfig.characterName}
        fact={didYouKnowFact}
        shouldReduceMotion={Boolean(shouldReduceMotion)}
        keyBindings={keyBindings}
        showShortcutLabels={showShortcutLabels}
        onClose={() => {
          setIsDidYouKnowOpen(false);
        }}
      />

      {/* Pop-up Verifikasi Kunci Lisensi untuk Membuka Level di Atas Batas Gratis */}
      <LicensePopup
        isOpen={isLicensePopupOpen}
        keyBindings={keyBindings}
        showShortcutLabels={showShortcutLabels}
        onActivate={handleActivateLicense}
        onClose={handleCloseLicensePopup}
      />

      {/* Dialog Penawaran Level Bonus dari Pak Naedie saat Kuota Hint Habis (0) */}
      <AnimatePresence>
        {isBonusPromptOpen && !isBonusLevelActive && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bonus-prompt-title"
            aria-describedby="bonus-prompt-desc"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[116] flex items-center justify-center p-4 bg-indigo-950/55 backdrop-blur-md"
          >
            <motion.div
              ref={bonusPromptRef}
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
              className="w-full max-w-sm rounded-3xl bg-white/95 backdrop-blur-2xl border-2 border-amber-200 shadow-[0_24px_60px_rgba(15,23,42,0.35)] p-5 sm:p-6 text-center text-stone-800"
            >
              <motion.div
                animate={
                  shouldReduceMotion
                    ? undefined
                    : { y: [0, -4, 0], rotate: [0, -2, 2, 0] }
                }
                transition={{
                  repeat: Infinity,
                  duration: 2.5,
                  ease: 'easeInOut',
                }}
                className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 via-yellow-50 to-indigo-100 border-2 border-amber-300 shadow-md flex items-center justify-center p-1 mb-3 relative"
              >
                <ZookeeperNaedieAvatar className="w-full h-full drop-shadow-sm pointer-events-none select-none" />
                <span
                  aria-hidden="true"
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-400 border-2 border-white text-amber-950 text-xs font-black flex items-center justify-center shadow-sm"
                >
                  ✨
                </span>
              </motion.div>

              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-[11px] font-extrabold text-amber-900 mb-1.5">
                <span>Pesan Pak Naedie · Sisa Bantu: 0</span>
              </span>
              <h2
                id="bonus-prompt-title"
                className="font-display text-xl sm:text-2xl font-bold text-emerald-950 leading-tight"
              >
                Lembah Kunang-Kunang Ajaib
              </h2>
              <p
                id="bonus-prompt-desc"
                className="text-xs sm:text-sm font-bold text-stone-700 mt-2 mb-3 leading-relaxed"
              >
                “Wah, cahaya Lentera Petunjuk kita baru saja habis dipakai! Tapi
                jangan khawatir, di balik bukit sana ada Lembah Kunang-Kunang
                Ajaib. Yuk, bantu Pak Naedie mengumpulkan 3 Kunang-Kunang Cahaya
                agar lentera kita menyala penuh lagi!”
              </p>

              <div className="rounded-2xl bg-amber-50 border border-amber-300/80 px-3.5 py-2.5 mb-4 text-left">
                <p className="text-[11px] sm:text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                  <span aria-hidden="true">⏱️</span>
                  Konsekuensi Waktu Level Utama
                </p>
                <p className="text-[11px] font-bold text-amber-800/90 mt-0.5 leading-snug">
                  Mengambil misi Level Bonus akan mengurangi sisa waktu level
                  utama sebesar{' '}
                  <span className="font-extrabold text-rose-700">10 detik</span>{' '}
                  (minimal disisakan 5 detik: sisa saat ini{' '}
                  <span className="tabular-nums font-extrabold">
                    {timeLeft}d
                  </span>{' '}
                  →{' '}
                  <span className="tabular-nums font-extrabold text-emerald-800">
                    {Math.max(5, timeLeft - 10)}d
                  </span>
                  ).
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                <motion.button
                  type="button"
                  data-kb-default="true"
                  onClick={handleAcceptBonusLevel}
                  whileHover={
                    shouldReduceMotion ? undefined : { scale: 1.03, y: -1.5 }
                  }
                  whileTap={
                    shouldReduceMotion ? undefined : { scale: 0.97, y: 1.5 }
                  }
                  className="w-full min-h-[50px] px-6 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-500 border-b-4 border-amber-600 text-amber-950 font-display text-lg font-bold shadow-lg active:border-b-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 flex items-center justify-center gap-2"
                >
                  <span>Mainkan Level Bonus</span>
                  {showShortcutLabels && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-600/25 text-[10px] font-black font-mono">
                      {getActionBadgeLabel('confirm', keyBindings)}
                    </span>
                  )}
                </motion.button>

                <motion.button
                  type="button"
                  data-sfx="custom"
                  onClick={handleDeclineBonusPrompt}
                  whileHover={
                    shouldReduceMotion ? undefined : { scale: 1.02, y: -1 }
                  }
                  whileTap={
                    shouldReduceMotion ? undefined : { scale: 0.97, y: 1.5 }
                  }
                  className="w-full min-h-[44px] px-5 py-2 rounded-2xl bg-stone-100 hover:bg-stone-200 border-b-4 border-stone-300 text-stone-700 font-extrabold text-sm shadow-sm active:border-b-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 flex items-center justify-center gap-2"
                >
                  <span>Lanjut Main Saja</span>
                  {showShortcutLabels && (
                    <span className="px-1.5 py-0.5 rounded bg-stone-200 text-[10px] font-black font-mono">
                      {getActionBadgeLabel('back', keyBindings)}
                    </span>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Layar Permainan Level Bonus: Lembah Kunang-Kunang Ajaib */}
      <BonusFireflyValleyModal
        isOpen={isBonusLevelActive}
        hintsLeft={hintsLeft}
        maxHints={MAX_SESSION_HINTS}
        shouldReduceMotion={Boolean(shouldReduceMotion)}
        keyBindings={keyBindings}
        showShortcutLabels={showShortcutLabels}
        onCollectFirefly={handleCollectBonusFirefly}
        onFinishBonus={handleFinishBonusLevel}
      />

      {/* Alur Halaman Penutup (Ending Screen) 2 Tahap setelah menyelesaikan Level 10 */}
      <EndingScreen
        isOpen={isEndingOpen}
        mode={gameMode}
        playerName={playerName}
        groupName={groupName}
        companionName={companionName}
        totalScore={Math.max(totalSessionScore, levelResult?.totalScore ?? 0)}
        totalStars={totalSessionStars}
        shouldReduceMotion={Boolean(shouldReduceMotion)}
        keyBindings={keyBindings}
        showShortcutLabels={showShortcutLabels}
        onFinishToHome={handleFinishEndingToHome}
      />
    </div>
  );
}
