import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DEFAULT_KEY_BINDINGS,
  getActionBadgeLabel,
  matchesKeyAction,
  type KeyBindingsMap,
} from '../utils/keyboardConfig';

export type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  timeSeconds: number;
  level: number;
  stars: number;
  isCurrentPlayer?: boolean;
  createdAt: string;
};

// Mock data awal agar siap diganti dengan query tabel `leaderboard` dari Supabase
export const INITIAL_LEADERBOARD_MOCK: LeaderboardEntry[] = [
  {
    id: 'mock-1',
    name: 'Nadia',
    score: 840,
    timeSeconds: 18,
    level: 3,
    stars: 3,
    createdAt: '2026-11-10T08:00:00Z',
  },
  {
    id: 'mock-2',
    name: 'Rafi',
    score: 790,
    timeSeconds: 21,
    level: 2,
    stars: 3,
    createdAt: '2026-11-10T09:15:00Z',
  },
  {
    id: 'mock-3',
    name: 'Kira',
    score: 720,
    timeSeconds: 26,
    level: 2,
    stars: 3,
    createdAt: '2026-11-11T10:30:00Z',
  },
  {
    id: 'mock-4',
    name: 'Bima',
    score: 650,
    timeSeconds: 31,
    level: 1,
    stars: 2,
    createdAt: '2026-11-11T14:20:00Z',
  },
  {
    id: 'mock-5',
    name: 'Tito',
    score: 540,
    timeSeconds: 39,
    level: 1,
    stars: 2,
    createdAt: '2026-11-12T16:45:00Z',
  },
];

type LeaderboardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  playerName?: string;
  onPlayerNameChange?: (name: string) => void;
  latestWinSummary?: {
    level: number;
    score: number;
    timeUsedSeconds: number;
    stars: number;
  } | null;
  shouldReduceMotion: boolean;
  keyBindings?: KeyBindingsMap;
  showShortcutLabels?: boolean;
};

export function LeaderboardModal({
  isOpen,
  onClose,
  entries,
  latestWinSummary,
  shouldReduceMotion,
  keyBindings = DEFAULT_KEY_BINDINGS,
  showShortcutLabels = false,
}: LeaderboardModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        matchesKeyAction(event, 'back', keyBindings) ||
        matchesKeyAction(event, 'confirm', keyBindings)
      ) {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, keyBindings, onClose]);

  const sortedEntries = [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.timeSeconds - b.timeSeconds;
  });

  const hasCurrentPlayerScore = sortedEntries.some(
    (entry) => entry.isCurrentPlayer
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="leaderboard-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-emerald-950/30 backdrop-blur-sm"
        >
          <motion.div
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.92, y: 18 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.94, y: 12 }
            }
            transition={{
              type: 'spring',
              stiffness: 360,
              damping: 26,
            }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white/80 backdrop-blur-2xl border-2 border-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.24)] p-4 sm:p-5 text-stone-800 max-h-[88dvh] flex flex-col"
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 border border-amber-200 shadow-md flex items-center justify-center shrink-0">
                  <span role="img" aria-hidden="true" className="text-2xl leading-none">
                    🏆
                  </span>
                </div>
                <div className="min-w-0">
                  <h2
                    id="leaderboard-modal-title"
                    className="font-display text-xl sm:text-2xl font-bold text-emerald-950 leading-tight truncate"
                  >
                    Papan Skor
                  </h2>
                  <p className="text-xs font-bold text-emerald-800/75 truncate">
                    Pemain tercepat &amp; paling efisien
                  </p>
                </div>
              </div>
            </div>

            {/* Ringkasan Kemenangan Baru Saja */}
            {latestWinSummary && (
              <div className="mb-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 px-3.5 py-2.5 flex items-center justify-between gap-2 tabular-nums">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-emerald-800">
                    Hasil Level {latestWinSummary.level}
                  </p>
                  <p className="font-display text-lg font-bold text-emerald-950 leading-tight">
                    +{latestWinSummary.score} poin
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-extrabold text-amber-600">
                    {'★'.repeat(latestWinSummary.stars)}
                    {'☆'.repeat(Math.max(0, 3 - latestWinSummary.stars))}
                  </p>
                  <p className="text-xs font-bold text-emerald-800/85">
                    Waktu {latestWinSummary.timeUsedSeconds} detik
                  </p>
                </div>
              </div>
            )}

            {/* Pesan Status Langsung saat Pemain Belum Memiliki Skor */}
            {!hasCurrentPlayerScore && (
              <div
                role="status"
                className="mb-3 flex items-center justify-between gap-2.5 rounded-2xl px-3.5 py-3 border-2 bg-amber-50/95 border-amber-300/90 shadow-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 bg-amber-400 text-amber-950 shadow-xs">
                    ★
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-extrabold text-amber-950 leading-snug">
                      Kamu belum memiliki skor
                    </p>
                    <p className="text-[11px] font-bold text-amber-900/85 leading-snug">
                      Selesaikan level untuk masuk peringkat!
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 tabular-nums">
                  <p className="font-display text-base font-bold text-amber-900 leading-none">
                    0
                  </p>
                  <p className="text-[10px] font-extrabold text-amber-800/80 uppercase">
                    poin
                  </p>
                </div>
              </div>
            )}

            {/* Daftar Peringkat Papan Skor */}
            <div className="flex-1 overflow-y-auto pr-0.5 space-y-2 mb-4">
              {sortedEntries.map((entry, index) => {
                const rank = index + 1;
                const badge =
                  rank === 1
                    ? '🥇'
                    : rank === 2
                    ? '🥈'
                    : rank === 3
                    ? '🥉'
                    : `${rank}`;

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between gap-2.5 rounded-2xl px-3 py-2.5 border transition-colors ${
                      entry.isCurrentPlayer
                        ? 'bg-emerald-100/85 border-emerald-400/80 shadow-sm'
                        : 'bg-white/65 border-white/85'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                          rank <= 3
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {badge}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-stone-800 truncate">
                          {entry.name || 'Pemain'}
                          {entry.isCurrentPlayer ? ' (Kamu)' : ''}
                        </p>
                        <p className="text-[11px] font-bold text-stone-500 tabular-nums">
                          Level {entry.level} · Waktu {entry.timeSeconds} dtk
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 tabular-nums">
                      <p className="font-display text-base font-bold text-emerald-800 leading-none">
                        {entry.score}
                      </p>
                      <p className="text-[10px] font-extrabold text-emerald-700/75 uppercase">
                        poin
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tombol Tutup Besar dan Jelas */}
            <motion.button
              type="button"
              data-sfx="custom"
              onClick={onClose}
              whileHover={
                shouldReduceMotion
                  ? undefined
                  : {
                      scale: 1.03,
                      y: -2,
                      transition: { type: 'spring', stiffness: 420, damping: 18 },
                    }
              }
              whileTap={
                shouldReduceMotion
                  ? undefined
                  : {
                      scale: 0.97,
                      y: 2,
                      transition: { type: 'spring', stiffness: 550, damping: 22 },
                    }
              }
              className="w-full min-h-[52px] px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-xl font-bold shadow-lg active:border-b-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 flex items-center justify-center gap-2"
            >
              <span>Tutup</span>
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
  );
}
