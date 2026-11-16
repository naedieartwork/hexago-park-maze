import React, { useState, useEffect } from 'react';
import { Copy, Check, KeyRound } from 'lucide-react';
import { KeyboardSettingsPanel } from './KeyboardSettingsPanel';
import { PWAInstallButton } from './PWAInstallButton';
import {
  DEFAULT_GAME_DIFFICULTY,
  DIFFICULTY_OPTIONS,
  type GameDifficulty,
} from '../utils/difficultyConfig';
import { getOrCreateDeviceId } from '../utils/licenseManager';
import { sfxEngine } from '../utils/sfxEngine';
import type { KeyActionId, KeyBindingsMap } from '../utils/keyboardConfig';

export type DisplayModeOption = 'portrait' | 'landscape';

type GameSettingsModalContentProps = {
  difficulty?: GameDifficulty;
  onChangeDifficulty?: (difficulty: GameDifficulty) => void;
  soundEnabled: boolean;
  bgmEnabled: boolean;
  narratorEnabled: boolean;
  ambientEnabled: boolean;
  onToggleSound?: () => void;
  onToggleBgm?: () => void;
  onToggleNarrator?: () => void;
  onToggleAmbient?: () => void;
  displayMode: DisplayModeOption;
  onChangeDisplayMode: (mode: DisplayModeOption) => void;
  keyBindings: KeyBindingsMap;
  showShortcutLabels: boolean;
  onUpdateKeyBinding: (action: KeyActionId, newCode: string) => void;
  onResetKeyBindings: () => void;
  onToggleShowShortcutLabels: () => void;
  onRecordingChange?: (isRecording: boolean) => void;
  isLicenseActive: boolean;
  licenseBadgeLabel?: string;
  licenseDetailText?: string;
  onToggleLicense: () => void;
  onOpenLicenseModal?: () => void;
  showPwaInstall?: boolean;
};

type AudioControlRowProps = {
  label: string;
  checked: boolean;
  onToggle?: () => void;
  accentClass: string;
  ringClass: string;
};

const AudioControlRow: React.FC<AudioControlRowProps> = ({
  label,
  checked,
  onToggle,
  accentClass,
  ringClass,
}) => (
  <div className="flex items-center justify-between gap-3 px-3 py-2.5">
    <span className="text-xs font-extrabold text-stone-800">{label}</span>
    <button
      type="button"
      data-sfx="custom"
      role="switch"
      aria-checked={checked}
      aria-label={`${checked ? 'Matikan' : 'Aktifkan'} ${label}`}
      onClick={() => onToggle?.()}
      className={`relative inline-flex h-7 w-13 shrink-0 items-center rounded-full border-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${ringClass} ${
        checked ? accentClass : 'bg-stone-300 border-stone-400'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-0.5'
        }`}
      />
    </button>
  </div>
);

export const GameSettingsModalContent: React.FC<GameSettingsModalContentProps> = ({
  difficulty = DEFAULT_GAME_DIFFICULTY,
  onChangeDifficulty,
  soundEnabled,
  bgmEnabled,
  narratorEnabled,
  ambientEnabled,
  onToggleSound,
  onToggleBgm,
  onToggleNarrator,
  onToggleAmbient,
  displayMode,
  onChangeDisplayMode,
  keyBindings,
  showShortcutLabels,
  onUpdateKeyBinding,
  onResetKeyBindings,
  onToggleShowShortcutLabels,
  onRecordingChange,
  isLicenseActive,
  licenseBadgeLabel,
  licenseDetailText,
  onToggleLicense,
  onOpenLicenseModal,
  showPwaInstall = false,
}) => {
  const [deviceId, setDeviceId] = useState<string>('');
  const [copiedDeviceId, setCopiedDeviceId] = useState<boolean>(false);

  useEffect(() => {
    setDeviceId(getOrCreateDeviceId());
  }, []);

  const handleCopyDeviceId = async () => {
    const idToCopy = deviceId || getOrCreateDeviceId();
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(idToCopy);
        setCopiedDeviceId(true);
        window.setTimeout(() => setCopiedDeviceId(false), 1800);
      }
    } catch {
      // Abaikan jika clipboard diblokir browser
    }
  };

  return (
    <div className="space-y-3 text-left">
      {/* Kategori 1: Tingkat Kesulitan (Segmented Control Bersih: Mudah / Sedang / Sulit saja) */}
      <section
        aria-labelledby="settings-cat-difficulty"
        className="rounded-2xl bg-emerald-50/85 border border-emerald-200/90 p-3.5"
      >
        <h3
          id="settings-cat-difficulty"
          className="text-xs font-extrabold uppercase tracking-wider text-emerald-950 mb-2.5"
        >
          Tingkat Kesulitan
        </h3>

        <div
          role="radiogroup"
          aria-label="Tingkat Kesulitan"
          className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white border border-emerald-200/90 shadow-2xs"
        >
          {DIFFICULTY_OPTIONS.map((option) => {
            const isSelected = difficulty === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => {
                  sfxEngine.playSwitch(true);
                  onChangeDifficulty?.(option.id);
                }}
                className={`min-h-[40px] px-2 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-stone-700 hover:bg-emerald-50 hover:text-emerald-950'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Kategori 2: Musik & Suara (4 Kontrol Terpisah: Efek, Musik, Narrator, Suara Alam) */}
      <section
        aria-labelledby="settings-cat-audio"
        className="rounded-2xl bg-teal-50/85 border border-teal-200/90 p-3.5"
      >
        <h3
          id="settings-cat-audio"
          className="text-xs font-extrabold uppercase tracking-wider text-teal-950 mb-2.5"
        >
          Musik &amp; Suara
        </h3>

        <div className="rounded-xl bg-white border border-teal-200/80 divide-y divide-teal-100 overflow-hidden shadow-2xs">
          <AudioControlRow
            label="Efek"
            checked={soundEnabled}
            onToggle={onToggleSound}
            accentClass="bg-emerald-500 border-emerald-600"
            ringClass="focus-visible:ring-emerald-500"
          />
          <AudioControlRow
            label="Musik"
            checked={bgmEnabled}
            onToggle={onToggleBgm}
            accentClass="bg-teal-500 border-teal-600"
            ringClass="focus-visible:ring-teal-500"
          />
          <AudioControlRow
            label="Narrator"
            checked={narratorEnabled}
            onToggle={onToggleNarrator}
            accentClass="bg-amber-500 border-amber-600"
            ringClass="focus-visible:ring-amber-500"
          />
          <AudioControlRow
            label="Suara Alam"
            checked={ambientEnabled}
            onToggle={onToggleAmbient}
            accentClass="bg-emerald-500 border-emerald-600"
            ringClass="focus-visible:ring-emerald-500"
          />
        </div>
      </section>

      {/* Kategori 3: Mode Tampilan (Portrait / Landscape) */}
      <section
        aria-labelledby="settings-cat-display"
        className="rounded-2xl bg-purple-50/85 border border-purple-200/90 p-3.5"
      >
        <h3
          id="settings-cat-display"
          className="text-xs font-extrabold uppercase tracking-wider text-purple-950 mb-2.5"
        >
          Mode Tampilan
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChangeDisplayMode('portrait')}
            className={`px-3 py-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
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
              Portrait
            </span>
          </button>

          <button
            type="button"
            onClick={() => onChangeDisplayMode('landscape')}
            className={`px-3 py-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
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
              Landscape
            </span>
          </button>
        </div>
      </section>

      {/* Kategori 4: Atur Tombol (Keyboard) */}
      <section
        aria-labelledby="settings-cat-keyboard"
        className="rounded-2xl bg-sky-50/85 border border-sky-200/90 p-3.5"
      >
        <h3
          id="settings-cat-keyboard"
          className="text-xs font-extrabold uppercase tracking-wider text-sky-950 mb-2.5"
        >
          Atur Tombol (Keyboard)
        </h3>

        <KeyboardSettingsPanel
          embedded
          keyBindings={keyBindings}
          showShortcutLabels={showShortcutLabels}
          onUpdateBinding={onUpdateKeyBinding}
          onResetBindings={onResetKeyBindings}
          onToggleShowShortcutLabels={onToggleShowShortcutLabels}
          onRecordingChange={onRecordingChange}
        />
      </section>

      {/* Kategori 5: Lisensi Game (Paling Bawah: Status Lisensi, ID Perangkat, & Tombol Aktivasi/Input Kode) */}
      <section
        aria-labelledby="settings-cat-license"
        className="rounded-2xl bg-amber-50/90 border border-amber-200/90 p-3.5 space-y-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          <h3
            id="settings-cat-license"
            className="text-xs font-extrabold uppercase tracking-wider text-amber-950"
          >
            Lisensi Game
          </h3>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              isLicenseActive
                ? 'bg-emerald-200 text-emerald-900'
                : 'bg-stone-200 text-stone-700'
            }`}
          >
            {licenseBadgeLabel ?? (isLicenseActive ? 'Aktif' : 'Nonaktif')}
          </span>
        </div>

        <p className="text-[11px] font-bold text-amber-900/85 leading-snug">
          {licenseDetailText ??
            (isLicenseActive
              ? 'Lisensi aktif. Seluruh 10 level terbuka.'
              : 'Aktifkan kode lisensi untuk membuka seluruh level permainan.')}
        </p>

        {/* ID Perangkat */}
        <div className="rounded-xl bg-white border border-amber-200/90 px-2.5 py-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-stone-500">
              ID Perangkat
            </p>
            <p className="text-[11px] font-mono font-bold text-stone-800 truncate">
              {deviceId || 'Memuat...'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleCopyDeviceId()}
            aria-label="Salin ID Perangkat"
            title="Salin ID Perangkat"
            className="shrink-0 px-2 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 text-[10px] font-extrabold inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copiedDeviceId ? (
              <>
                <Check className="w-3 h-3 text-emerald-700" aria-hidden="true" />
                <span>Disalin</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" aria-hidden="true" />
                <span>Salin</span>
              </>
            )}
          </button>
        </div>

        {/* Tombol Aktivasi / Input Kode Lisensi */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            data-sfx="custom"
            onClick={() => {
              if (onOpenLicenseModal) {
                onOpenLicenseModal();
              } else {
                onToggleLicense();
              }
            }}
            className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 border-b-2 border-amber-600 text-amber-950 text-xs font-extrabold shadow-xs active:border-b-0 transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <KeyRound className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {isLicenseActive
                ? 'Masukkan Kode Lisensi Baru'
                : 'Aktivasi / Input Kode Lisensi'}
            </span>
          </button>

          {isLicenseActive && (
            <button
              type="button"
              data-sfx="custom"
              onClick={onToggleLicense}
              className="min-h-[42px] px-3 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 border border-rose-300 text-rose-800 text-xs font-extrabold transition-colors cursor-pointer"
            >
              Nonaktifkan
            </button>
          )}
        </div>
      </section>

      {showPwaInstall && <PWAInstallButton />}
    </div>
  );
};
