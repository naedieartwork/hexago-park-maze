import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CompanionKawaiiAvatar,
  KindergartenChildAvatar,
} from './KawaiiCharacters';

type PlayerNameModalProps = {
  isOpen: boolean;
  initialName: string;
  initialCompanionName: string;
  shouldReduceMotion: boolean;
  onSubmitNames: (names: { playerName: string; companionName: string }) => void;
};

export function PlayerNameModal({
  isOpen,
  initialName,
  initialCompanionName,
  shouldReduceMotion,
  onSubmitNames,
}: PlayerNameModalProps) {
  const [draftPlayerName, setDraftPlayerName] = useState<string>(initialName);
  const [draftCompanionName, setDraftCompanionName] =
    useState<string>(initialCompanionName);
  const [errorText, setErrorText] = useState<string>('');
  const playerInputRef = useRef<HTMLInputElement | null>(null);
  const companionInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDraftPlayerName(initialName === 'Rusa Kecil' ? '' : initialName);
    setDraftCompanionName(
      initialCompanionName === 'Ibu Guru' ? '' : initialCompanionName
    );
    setErrorText('');
    const focusTimer = window.setTimeout(() => {
      playerInputRef.current?.focus();
    }, 180);
    return () => window.clearTimeout(focusTimer);
  }, [initialCompanionName, initialName, isOpen]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanedPlayer = draftPlayerName.trim();
    const cleanedCompanion = draftCompanionName.trim();

    if (!cleanedPlayer) {
      setErrorText('Tulis nama adik dulu ya sebelum mulai bermain!');
      playerInputRef.current?.focus();
      return;
    }
    if (!cleanedCompanion) {
      setErrorText('Tulis nama Ibu atau Guru pendamping juga ya!');
      companionInputRef.current?.focus();
      return;
    }

    setErrorText('');
    onSubmitNames({
      playerName: cleanedPlayer,
      companionName: cleanedCompanion,
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="player-name-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-emerald-950/35 backdrop-blur-md"
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
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
            className="w-full max-w-sm rounded-3xl bg-white/92 backdrop-blur-2xl border-2 border-white shadow-[0_24px_60px_rgba(15,23,42,0.28)] p-5 sm:p-6 text-stone-800 max-h-[92dvh] overflow-y-auto"
          >
            {/* Header Judul Formulir Prolog */}
            <div className="flex flex-col items-center text-center mb-4">
              <p className="text-xs font-extrabold text-emerald-700 mb-0.5">
                Study Tour Kebun Binatang Kawaii
              </p>
              <h2
                id="player-name-modal-title"
                className="font-display text-2xl sm:text-[26px] font-bold text-emerald-950 leading-tight text-balance"
              >
                Halo! Siapa Namamu?
              </h2>
              <p className="text-xs sm:text-sm font-bold text-stone-600 mt-1 leading-snug">
                Isi nama anak dan nama Ibu atau Guru pendamping sebelum bertemu Pak Naedie!
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Baris Input Nama Anak dengan Avatar Anak TK Bertopi di Sebelah Kiri */}
              <div>
                <label
                  htmlFor="start-player-name-input"
                  className="block text-xs font-extrabold text-emerald-900 mb-1.5"
                >
                  Nama Anak
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 shrink-0 rounded-2xl bg-sky-50 border-2 border-sky-200 p-1 shadow-sm flex items-center justify-center">
                    <KindergartenChildAvatar
                      alt="Avatar anak TK memakai topi"
                      className="w-full h-full select-none pointer-events-none"
                    />
                  </div>
                  <input
                    ref={playerInputRef}
                    id="start-player-name-input"
                    type="text"
                    maxLength={18}
                    value={draftPlayerName}
                    onChange={(event) => {
                      setDraftPlayerName(event.target.value);
                      if (errorText) setErrorText('');
                    }}
                    placeholder="Tulis nama anak di sini..."
                    autoComplete="given-name"
                    className="flex-1 min-w-0 min-h-[50px] rounded-2xl bg-white border-2 border-emerald-200 px-3.5 py-2 text-base font-extrabold text-emerald-950 placeholder:text-stone-400 shadow-inner focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200/70 transition-all"
                  />
                </div>
              </div>

              {/* Baris Input Nama Guru/Pendamping dengan Avatar Pendamping di Sebelah Kiri */}
              <div>
                <label
                  htmlFor="start-companion-name-input"
                  className="block text-xs font-extrabold text-rose-900 mb-1.5"
                >
                  Nama Ibu / Guru
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 shrink-0 rounded-2xl bg-rose-50 border-2 border-rose-200 p-1 shadow-sm flex items-center justify-center">
                    <CompanionKawaiiAvatar
                      speaking={false}
                      alt="Avatar Ibu atau Guru pendamping"
                      className="w-full h-full select-none pointer-events-none"
                    />
                  </div>
                  <input
                    ref={companionInputRef}
                    id="start-companion-name-input"
                    type="text"
                    maxLength={22}
                    value={draftCompanionName}
                    onChange={(event) => {
                      setDraftCompanionName(event.target.value);
                      if (errorText) setErrorText('');
                    }}
                    placeholder="Contoh: Ibu Sari / Bu Guru..."
                    autoComplete="name"
                    className="flex-1 min-w-0 min-h-[50px] rounded-2xl bg-white border-2 border-rose-200 px-3.5 py-2 text-base font-extrabold text-emerald-950 placeholder:text-stone-400 shadow-inner focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-200/70 transition-all"
                  />
                </div>
              </div>

              {errorText && (
                <p
                  role="alert"
                  className="text-xs font-extrabold text-rose-600"
                >
                  {errorText}
                </p>
              )}

              <div className="pt-1 flex flex-col gap-2">
                <motion.button
                  type="submit"
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
                  className="w-full min-h-[54px] px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-xl font-bold shadow-lg active:border-b-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  Ayo Mulai!
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() =>
                    onSubmitNames({
                      playerName: 'Rusa Kecil',
                      companionName: 'Ibu Guru',
                    })
                  }
                  whileHover={
                    shouldReduceMotion
                      ? undefined
                      : {
                          scale: 1.03,
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
                          scale: 0.96,
                          transition: {
                            type: 'spring',
                            stiffness: 550,
                            damping: 22,
                          },
                        }
                  }
                  className="min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-extrabold text-stone-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  Lewati (Pakai &ldquo;Rusa Kecil&rdquo; &amp; &ldquo;Ibu Guru&rdquo;)
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
