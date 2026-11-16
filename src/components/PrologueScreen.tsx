import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2 } from 'lucide-react';
import type { DisplayMode, GameMode } from './PassAndPlayScreens';
import {
  CompanionTeacherFullBody,
  KindergartenChildAvatar,
  ZookeeperNaedieFullBody,
} from './KawaiiCharacters';
import {
  DEFAULT_KEY_BINDINGS,
  getActionBadgeLabel,
  matchesKeyAction,
  type KeyBindingsMap,
} from '../utils/keyboardConfig';
import {
  buildPrologueDialogues,
  type DialogueLine,
} from '../utils/prologueTexts';
import { narrator } from '../utils/narrator';

type PrologueScreenProps = {
  isOpen: boolean;
  displayMode?: DisplayMode;
  mode: GameMode;
  playerName: string;
  groupName?: string;
  groupPlayers?: string[];
  companionName: string;
  shouldReduceMotion: boolean;
  keyBindings?: KeyBindingsMap;
  showShortcutLabels?: boolean;
  onStartAdventure: () => void;
  onBackToSetup?: () => void;
};

export function PrologueScreen({
  isOpen,
  displayMode = 'portrait',
  mode,
  playerName,
  groupName = 'Bintang Hutan',
  groupPlayers = [],
  companionName,
  shouldReduceMotion,
  keyBindings = DEFAULT_KEY_BINDINGS,
  showShortcutLabels = false,
  onStartAdventure,
  onBackToSetup,
}: PrologueScreenProps) {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isNarrating, setIsNarrating] = useState<boolean>(false);
  const [mouthAmplitude, setMouthAmplitude] = useState<number>(0);

  const safePlayerName = playerName.trim() || 'Rusa Kecil';
  const safeGroupName = groupName.trim() || 'Bintang Hutan';
  const safeCompanionName = companionName.trim() || 'Ibu Guru';

  const dialogueLines: DialogueLine[] = useMemo(
    () =>
      buildPrologueDialogues({
        mode,
        playerName,
        groupName,
        groupPlayers,
        companionName,
      }),
    [mode, playerName, groupName, groupPlayers, companionName]
  );

  const currentLine = dialogueLines[stepIndex] ?? dialogueLines[0];
  const currentLineId = currentLine?.id ?? '';
  const currentLineText = currentLine?.text ?? '';
  const currentLineSpeaker = currentLine?.speaker ?? 'naedie';
  const isLastStep = stepIndex >= dialogueLines.length - 1;

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

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
      narrator.stop();
      return;
    }
    setStepIndex(0);
  }, [isOpen, mode, playerName, groupName, companionName]);

  // Putar ./assets/voice/voice-prolog-naedie.mp3 pada slide Pak Naedie, dan ./assets/voice/voice-prolog-guru.mp3 pada slide Bunda / Ibu Guru
  useEffect(() => {
    if (!isOpen || !currentLineText) return;
    if (currentLineSpeaker === 'naedie') {
      if (narrator.getActiveSrc() !== './assets/voice/voice-prolog-naedie.mp3') {
        narrator.playPrologueNaedieVoice();
      }
    } else {
      if (narrator.getActiveSrc() !== './assets/voice/voice-prolog-guru.mp3') {
        narrator.playPrologueGuruVoice();
      }
    }
  }, [isOpen, currentLineId, currentLineText, currentLineSpeaker]);

  useEffect(() => {
    return () => {
      narrator.stop();
    };
  }, []);

  const handleReplayNarration = useCallback(() => {
    if (currentLineSpeaker === 'naedie') {
      narrator.playPrologueNaedieVoice();
    } else {
      narrator.playPrologueGuruVoice();
    }
  }, [currentLineSpeaker]);

  const handleSkipOrStartAdventure = useCallback(() => {
    narrator.stop();
    onStartAdventure();
  }, [onStartAdventure]);

  const handleNext = useCallback(() => {
    narrator.stop();
    if (isLastStep) {
      onStartAdventure();
      return;
    }
    const nextIdx = Math.min(dialogueLines.length - 1, stepIndex + 1);
    const nextLine = dialogueLines[nextIdx];
    setStepIndex(nextIdx);
    if (nextLine?.speaker === 'naedie') {
      narrator.playPrologueNaedieVoice();
    } else {
      narrator.playPrologueGuruVoice();
    }
  }, [dialogueLines, isLastStep, onStartAdventure, stepIndex]);

  const handlePrev = useCallback(() => {
    narrator.stop();
    if (stepIndex <= 0) {
      onBackToSetup?.();
      return;
    }
    const prevIdx = Math.max(0, stepIndex - 1);
    const prevLine = dialogueLines[prevIdx];
    setStepIndex(prevIdx);
    if (prevLine?.speaker === 'naedie') {
      narrator.playPrologueNaedieVoice();
    } else {
      narrator.playPrologueGuruVoice();
    }
  }, [dialogueLines, onBackToSetup, stepIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (matchesKeyAction(event, 'back', keyBindings)) {
        event.preventDefault();
        handleSkipOrStartAdventure();
        return;
      }
      if (
        matchesKeyAction(event, 'confirm', keyBindings) ||
        matchesKeyAction(event, 'moveRight', keyBindings) ||
        matchesKeyAction(event, 'moveDown', keyBindings) ||
        event.key === ' '
      ) {
        event.preventDefault();
        handleNext();
        return;
      }
      if (
        matchesKeyAction(event, 'moveLeft', keyBindings) ||
        matchesKeyAction(event, 'moveUp', keyBindings)
      ) {
        event.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleNext,
    handlePrev,
    handleSkipOrStartAdventure,
    isOpen,
    keyBindings,
  ]);

  const isLandscape = displayMode === 'landscape';

  const skipPrologueButton = (
    <motion.button
      type="button"
      onClick={handleSkipOrStartAdventure}
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
              scale: 0.95,
              transition: { type: 'spring', stiffness: 550, damping: 22 },
            }
      }
      className="min-h-[38px] px-3 rounded-xl bg-white/85 hover:bg-white border border-emerald-200 text-emerald-800 font-extrabold text-xs whitespace-nowrap shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 inline-flex items-center gap-1.5 shrink-0"
    >
      <span>Lewati Prolog</span>
      {showShortcutLabels && (
        <span className="px-1 py-0.2 rounded bg-emerald-100 text-[9px] font-black font-mono text-emerald-800">
          {getActionBadgeLabel('back', keyBindings)}
        </span>
      )}
    </motion.button>
  );

  const playerIdentityBadge = (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl bg-sky-50 border-2 border-white shadow-sm p-0.5 flex items-center justify-center">
        <KindergartenChildAvatar
          alt={
            mode === 'group'
              ? `Kelompok ${safeGroupName}`
              : `Avatar ${safePlayerName}`
          }
          className="w-full h-full select-none pointer-events-none"
        />
      </div>
      <p className="text-[11px] sm:text-xs font-extrabold text-emerald-800 truncate">
        {mode === 'group'
          ? `Kelompok ${safeGroupName} (${groupPlayers.length} Anak) · ${safeCompanionName}`
          : `Petualang Solo · ${safePlayerName} & ${safeCompanionName}`}
      </p>
    </div>
  );

  const naedieCharacterStage = (
    <motion.div
      initial={
        shouldReduceMotion
          ? { opacity: 0 }
          : { opacity: 0, y: 14, scale: 0.92 }
      }
      animate={
        currentLineSpeaker === 'naedie'
          ? {
              opacity: 1,
              y: shouldReduceMotion ? 0 : -4,
              scale: shouldReduceMotion ? 1 : 1.05,
            }
          : {
              opacity: 0.78,
              y: shouldReduceMotion ? 0 : 4,
              scale: shouldReduceMotion ? 0.96 : 0.9,
            }
      }
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className={`relative h-full flex items-end justify-center ${
        isLandscape
          ? 'max-h-[250px] sm:max-h-[300px] lg:max-h-[360px]'
          : 'max-h-[225px] sm:max-h-[275px]'
      } ${currentLineSpeaker === 'naedie' ? 'z-20' : 'z-10 brightness-[0.94]'}`}
    >
      {/* Efek Sorotan Terang / Fokus saat Pak Naedie Aktif */}
      {currentLineSpeaker === 'naedie' && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-x-4 bottom-2 top-3 rounded-full bg-[radial-gradient(circle,rgba(253,230,138,0.72)_0%,rgba(167,243,208,0.48)_48%,transparent_74%)] blur-xl transition-opacity duration-300 ${
            isNarrating ? 'opacity-100' : 'opacity-70'
          }`}
        />
      )}
      <div
        className={`relative h-full flex items-end justify-center ${
          shouldReduceMotion ? '' : 'prologue-breathe'
        }`}
      >
        <ZookeeperNaedieFullBody
          alt="Pak Naedie berseragam penjaga hutan"
          animateLiving={true}
          isSpeaking={currentLineSpeaker === 'naedie' && isNarrating}
          mouthOpen={
            currentLineSpeaker === 'naedie' && isNarrating ? mouthAmplitude : 0
          }
          blinkDelaySec={0}
          reduceMotion={shouldReduceMotion}
          className={`h-full w-auto select-none pointer-events-none transition-[filter] duration-300 ${
            isLandscape
              ? 'max-h-[250px] sm:max-h-[300px] lg:max-h-[360px]'
              : 'max-h-[225px] sm:max-h-[275px]'
          } ${
            currentLineSpeaker === 'naedie'
              ? 'drop-shadow-[0_14px_26px_rgba(16,185,129,0.28)]'
              : 'drop-shadow-[0_8px_14px_rgba(15,23,42,0.12)]'
          }`}
        />
      </div>
    </motion.div>
  );

  const companionCharacterStage = (
    <motion.div
      initial={
        shouldReduceMotion
          ? { opacity: 0 }
          : { opacity: 0, y: 14, scale: 0.92 }
      }
      animate={
        currentLineSpeaker !== 'naedie'
          ? {
              opacity: 1,
              y: shouldReduceMotion ? 0 : -4,
              scale: shouldReduceMotion ? 1 : 1.05,
            }
          : {
              opacity: 0.78,
              y: shouldReduceMotion ? 0 : 4,
              scale: shouldReduceMotion ? 0.96 : 0.9,
            }
      }
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className={`relative h-full flex items-end justify-center ${
        isLandscape
          ? 'max-h-[250px] sm:max-h-[300px] lg:max-h-[360px]'
          : 'max-h-[225px] sm:max-h-[275px]'
      } ${currentLineSpeaker !== 'naedie' ? 'z-20' : 'z-10 brightness-[0.94]'}`}
    >
      {/* Efek Sorotan Terang / Fokus saat Bunda / Ibu Guru Aktif */}
      {currentLineSpeaker !== 'naedie' && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-x-4 bottom-2 top-3 rounded-full bg-[radial-gradient(circle,rgba(253,230,138,0.72)_0%,rgba(254,205,211,0.52)_48%,transparent_74%)] blur-xl transition-opacity duration-300 ${
            isNarrating ? 'opacity-100' : 'opacity-70'
          }`}
        />
      )}
      <div
        className={`relative h-full flex items-end justify-center ${
          shouldReduceMotion ? '' : 'prologue-breathe'
        }`}
        style={shouldReduceMotion ? undefined : { animationDelay: '-1.5s' }}
      >
        <CompanionTeacherFullBody
          alt={`${safeCompanionName}, guru pendamping bergaya kawaii`}
          animateLiving={true}
          isSpeaking={currentLineSpeaker !== 'naedie' && isNarrating}
          mouthOpen={
            currentLineSpeaker !== 'naedie' && isNarrating ? mouthAmplitude : 0
          }
          rightArmPose={currentLineSpeaker === 'naedie' ? 'down' : 'wave'}
          blinkDelaySec={-1.75}
          reduceMotion={shouldReduceMotion}
          className={`h-full w-auto select-none pointer-events-none transition-[filter] duration-300 ${
            isLandscape
              ? 'max-h-[250px] sm:max-h-[300px] lg:max-h-[360px]'
              : 'max-h-[225px] sm:max-h-[275px]'
          } ${
            currentLineSpeaker !== 'naedie'
              ? 'drop-shadow-[0_14px_26px_rgba(244,63,94,0.26)]'
              : 'drop-shadow-[0_8px_14px_rgba(15,23,42,0.12)]'
          }`}
        />
      </div>
    </motion.div>
  );

  const dialogueCard = (
    <motion.div
      initial={
        shouldReduceMotion
          ? { opacity: 0 }
          : { opacity: 0, y: 14, scale: 0.98 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
      className={`relative z-10 w-full rounded-3xl bg-white/95 backdrop-blur-2xl border-2 border-white shadow-[0_18px_45px_rgba(15,23,42,0.14)] ${
        isLandscape ? 'p-3.5 sm:p-4 md:p-5 flex flex-col min-h-0' : 'mt-1 p-4 sm:p-5'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 sm:mb-2.5 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={`font-display font-bold leading-tight truncate ${
                isLandscape ? 'text-base sm:text-lg md:text-xl' : 'text-lg sm:text-xl'
              } ${
                currentLine.speaker === 'naedie'
                  ? 'text-emerald-800'
                  : 'text-rose-700'
              }`}
            >
              {currentLine.speakerName}
            </p>
          </div>
          <p className="text-[11px] sm:text-xs font-bold text-stone-500">
            {currentLine.speakerRole}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-sfx="custom"
            onClick={handleReplayNarration}
            aria-label={
              currentLine.speaker === 'naedie'
                ? 'Dengarkan ulang dialog Pak Naedie'
                : `Dengarkan ulang dialog ${currentLine.speakerName}`
            }
            title="Dengarkan Ulang"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-extrabold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              isNarrating
                ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
            }`}
          >
            <Volume2
              className={`w-3.5 h-3.5 shrink-0 ${
                isNarrating ? 'animate-pulse text-emerald-700' : ''
              }`}
              aria-hidden="true"
            />
            <span>Dengarkan Ulang</span>
          </button>

          <div
            className="flex items-center gap-1.5 shrink-0"
            aria-label={`Dialog ${stepIndex + 1} dari ${dialogueLines.length}`}
          >
            {dialogueLines.map((line, idx) => (
              <span
                key={line.id}
                className={`h-2 rounded-full transition-all duration-200 ${
                  idx === stepIndex ? 'w-5 bg-emerald-500' : 'w-2 bg-stone-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        className={`rounded-2xl bg-amber-50/90 border border-amber-200/90 px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center ${
          isLandscape
            ? 'min-h-[84px] sm:min-h-[112px] max-h-[42dvh] overflow-y-auto'
            : 'min-h-[96px] sm:min-h-[108px]'
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={`${mode}-${currentLine.id}`}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="text-sm sm:text-base font-bold text-stone-800 leading-relaxed"
          >
            &ldquo;{currentLine.text}&rdquo;
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );

  const actionButtonsRow = (
    <div className="flex items-center gap-2.5 w-full">
      {(stepIndex > 0 || Boolean(onBackToSetup)) && (
        <motion.button
          type="button"
          onClick={handlePrev}
          whileHover={
            shouldReduceMotion
              ? undefined
              : {
                  scale: 1.04,
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
                  scale: 0.96,
                  y: 1.5,
                  transition: {
                    type: 'spring',
                    stiffness: 550,
                    damping: 22,
                  },
                }
          }
          className={`px-4 py-3 rounded-2xl bg-white hover:bg-stone-100 border-2 border-stone-200 border-b-4 border-b-stone-300 text-stone-700 font-extrabold text-sm whitespace-nowrap active:border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 ${
            isLandscape ? 'min-h-[48px] sm:min-h-[52px]' : 'min-h-[54px]'
          }`}
        >
          Kembali
        </motion.button>
      )}

      <motion.button
        type="button"
        onClick={handleNext}
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
        className={`flex-1 px-5 py-3 rounded-2xl border-b-4 text-white font-display font-bold shadow-lg active:border-b-0 transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 ${
          isLandscape
            ? 'min-h-[48px] sm:min-h-[54px] text-base sm:text-lg md:text-xl'
            : 'min-h-[56px] px-6 py-3.5 text-lg sm:text-xl'
        } ${
          isLastStep
            ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-700 focus-visible:ring-emerald-600'
            : 'bg-sky-500 hover:bg-sky-600 border-sky-700 focus-visible:ring-sky-600'
        }`}
      >
        <span>{isLastStep ? 'Mulai Petualangan!' : 'Lanjut'}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 shrink-0"
          aria-hidden="true"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
        {showShortcutLabels && (
          <span className="px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-black font-mono">
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
          role="dialog"
          aria-modal="true"
          aria-labelledby="prologue-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          className={`fixed inset-0 z-[85] h-[100dvh] w-full flex flex-col items-center bg-gradient-to-b from-sky-100 via-emerald-50 to-amber-100 text-stone-800 overflow-hidden ${
            isLandscape
              ? 'justify-center px-3 sm:px-6 py-3 sm:py-5'
              : 'px-4 pt-[max(1.75rem,env(safe-area-inset-top))] pb-4 sm:pt-10 sm:pb-6'
          }`}
        >
          {/* Dekorasi Latar Gerbang Hutan Ajaib Kawaii */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 overflow-hidden"
          >
            {/* Awan Pastel Melayang */}
            <motion.svg
              viewBox="0 0 180 72"
              animate={shouldReduceMotion ? undefined : { x: [-8, 12, -8] }}
              transition={{ repeat: Infinity, duration: 11, ease: 'easeInOut' }}
              className="absolute top-6 left-[6%] w-28 sm:w-36 opacity-80"
            >
              <circle cx="52" cy="40" r="22" fill="#FFFFFF" />
              <circle cx="88" cy="30" r="28" fill="#FFFFFF" />
              <circle cx="126" cy="40" r="20" fill="#FFFFFF" />
              <rect x="36" y="42" width="106" height="20" rx="10" fill="#FFFFFF" />
            </motion.svg>

            <motion.svg
              viewBox="0 0 180 72"
              animate={shouldReduceMotion ? undefined : { x: [10, -10, 10] }}
              transition={{ repeat: Infinity, duration: 13, ease: 'easeInOut' }}
              className="absolute top-12 right-[6%] w-24 sm:w-32 opacity-75"
            >
              <circle cx="52" cy="40" r="22" fill="#FFFFFF" />
              <circle cx="88" cy="30" r="28" fill="#FFFFFF" />
              <circle cx="126" cy="40" r="20" fill="#FFFFFF" />
              <rect x="36" y="42" width="106" height="20" rx="10" fill="#FFFFFF" />
            </motion.svg>

            {/* Bukit Rumput Pastel di Bagian Bawah */}
            <div className="absolute -bottom-16 -left-16 w-[65%] h-48 rounded-[100%] bg-emerald-200/65" />
            <div className="absolute -bottom-16 -right-16 w-[65%] h-52 rounded-[100%] bg-lime-200/65" />
          </div>

          {isLandscape ? (
            /* ============================================================================
             * MODE LANSKAP: Panggung 3 Kolom
             * Kiri: Judul Prolog + Pak Naedie | Tengah: Teks Prolog + Kembali/Lanjut | Kanan: Lewati Prolog + Guru Pendamping
             * ============================================================================ */
            <div className="relative z-10 w-full max-w-[1140px] h-full sm:max-h-[680px] grid grid-cols-1 min-[520px]:grid-cols-[0.82fr_1.36fr_0.82fr] gap-2 sm:gap-4 md:gap-5 items-stretch overflow-y-auto min-[520px]:overflow-hidden">
              {/* KOLOM KIRI: Judul Prolog di Atas + Karakter Pak Naedie di Bawah */}
              <div className="flex flex-col justify-between items-start h-full min-h-0 gap-1">
                <header className="shrink-0 w-full flex flex-col items-start text-left gap-1.5 pt-0.5">
                  <div>
                    <h1
                      id="prologue-title"
                      className="font-display text-[clamp(1.25rem,2.4vw,1.9rem)] font-bold text-emerald-950 leading-tight tracking-tight"
                    >
                      Hexago Park
                    </h1>
                    <p className="text-[11px] sm:text-xs font-bold text-emerald-700 leading-snug mt-0.5">
                      {mode === 'group'
                        ? `Prolog Kelompok ${safeGroupName} Bersama Pak Naedie`
                        : 'Taman Ajaib & 10 Area Satwa Bersama Pak Naedie'}
                    </p>
                  </div>
                  {playerIdentityBadge}
                </header>

                <div className="flex-1 min-h-0 w-full flex items-end justify-center pt-1">
                  {naedieCharacterStage}
                </div>
              </div>

              {/* KOLOM TENGAH: Kartu Teks Prolog + Tombol Kembali & Lanjut / Mulai Petualangan */}
              <main className="flex flex-col items-center justify-center gap-2.5 sm:gap-3.5 h-full min-h-0 py-1">
                {dialogueCard}
                <footer className="relative z-10 shrink-0 w-full">
                  {actionButtonsRow}
                </footer>
              </main>

              {/* KOLOM KANAN: Tombol Lewati Prolog di Kanan Atas + Guru Pendamping di Bawah */}
              <div className="flex flex-col justify-between items-end h-full min-h-0 gap-1">
                <div className="shrink-0 w-full flex items-center justify-end pt-0.5">
                  {skipPrologueButton}
                </div>

                <div className="flex-1 min-h-0 w-full flex items-end justify-center pt-1">
                  {companionCharacterStage}
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================================
             * MODE POTRET: Komposisi Vertikal Klasik
             * ============================================================================ */
            <>
              <header className="relative z-10 shrink-0 w-full max-w-md mt-2 sm:mt-3 flex flex-col gap-3 pb-2">
                <div className="flex items-center justify-between gap-2">
                  {playerIdentityBadge}
                  {skipPrologueButton}
                </div>

                <div className="text-center mt-2 sm:mt-3">
                  <h1
                    id="prologue-title"
                    className="font-display text-2xl sm:text-3xl font-bold text-emerald-950 leading-tight tracking-tight"
                  >
                    Hexago Park
                  </h1>
                  <p className="text-xs sm:text-sm font-bold text-emerald-700 mt-1">
                    {mode === 'group'
                      ? `Prolog Kelompok ${safeGroupName} Bersama Pak Naedie`
                      : 'Taman Ajaib & 10 Area Satwa Bersama Pak Naedie'}
                  </p>
                </div>
              </header>

              <main className="relative z-10 flex-1 min-h-0 w-full max-w-md overflow-y-auto py-1 flex flex-col justify-end">
                <div className="relative flex-1 min-h-[180px] sm:min-h-[225px] w-full flex items-end justify-center gap-1 sm:gap-3 px-1">
                  {naedieCharacterStage}
                  {companionCharacterStage}
                </div>
                {dialogueCard}
              </main>

              <footer className="relative z-10 shrink-0 w-full max-w-md pt-2 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
                {actionButtonsRow}
              </footer>
            </>
          )}
        </motion.section>
      )}
    </AnimatePresence>
  );
}
