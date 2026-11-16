export type GameDifficulty = 'easy' | 'medium' | 'hard';

export type DifficultyConfig = {
  id: GameDifficulty;
  label: string;
  stars: 1 | 2 | 3;
  lives: number;
  invulnerableMs: number;
  timerMultiplier: number;
  obstacleRatio: number;
  movingObstacleSpeedMultiplier: number;
  shortDesc: string;
};

export const DEFAULT_GAME_DIFFICULTY: GameDifficulty = 'easy';
export const DIFFICULTY_STORAGE_KEY = 'hexago_game_difficulty_v1';
export const INVULNERABILITY_DURATION_MS = 1500;

export const DIFFICULTY_CONFIGS: Record<GameDifficulty, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Mudah',
    stars: 1,
    lives: 5,
    invulnerableMs: INVULNERABILITY_DURATION_MS,
    timerMultiplier: 2.2,
    obstacleRatio: 0.35,
    movingObstacleSpeedMultiplier: 0.5,
    shortDesc: '5 Nyawa · Waktu 2.2x · Rintangan Tersebar',
  },
  medium: {
    id: 'medium',
    label: 'Sedang',
    stars: 2,
    lives: 3,
    invulnerableMs: INVULNERABILITY_DURATION_MS,
    timerMultiplier: 1.5,
    obstacleRatio: 0.65,
    movingObstacleSpeedMultiplier: 0.75,
    shortDesc: '3 Nyawa · Waktu 1.5x · Rintangan Sedang',
  },
  hard: {
    id: 'hard',
    label: 'Sulit',
    stars: 3,
    lives: 2,
    invulnerableMs: INVULNERABILITY_DURATION_MS,
    timerMultiplier: 1.0,
    obstacleRatio: 1.0,
    movingObstacleSpeedMultiplier: 1.0,
    shortDesc: '2 Nyawa · Waktu 1.0x · Rintangan Penuh',
  },
};

export const DIFFICULTY_OPTIONS: DifficultyConfig[] = [
  DIFFICULTY_CONFIGS.easy,
  DIFFICULTY_CONFIGS.medium,
  DIFFICULTY_CONFIGS.hard,
];

export const loadSavedDifficulty = (): GameDifficulty => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return DEFAULT_GAME_DIFFICULTY;
    }
    const raw = window.localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (raw === 'easy' || raw === 'medium' || raw === 'hard') {
      return raw;
    }
  } catch {
    // Abaikan jika localStorage tidak dapat diakses
  }
  return DEFAULT_GAME_DIFFICULTY;
};

export const saveDifficulty = (difficulty: GameDifficulty): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(DIFFICULTY_STORAGE_KEY, difficulty);
    }
  } catch {
    // Abaikan jika localStorage tidak dapat diakses
  }
};

export const getEffectiveTimeLimitSeconds = (
  baseTimeSeconds: number,
  difficulty: GameDifficulty
): number => {
  const config = DIFFICULTY_CONFIGS[difficulty] ?? DIFFICULTY_CONFIGS.easy;
  return Math.max(10, Math.round(baseTimeSeconds * config.timerMultiplier));
};

export const getMovingObstacleIntervalMs = (
  baseIntervalMs: number,
  difficulty: GameDifficulty
): number => {
  const config = DIFFICULTY_CONFIGS[difficulty] ?? DIFFICULTY_CONFIGS.easy;
  return Math.round(baseIntervalMs / config.movingObstacleSpeedMultiplier);
};
