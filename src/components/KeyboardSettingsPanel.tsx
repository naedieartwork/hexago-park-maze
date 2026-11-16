import React, { useState, useEffect } from 'react';
import {
  KEY_ACTION_META_LIST,
  formatKeyCodeLabel,
  getCanonicalKeyCode,
  type KeyActionId,
  type KeyBindingsMap,
} from '../utils/keyboardConfig';

type KeyboardSettingsPanelProps = {
  keyBindings: KeyBindingsMap;
  showShortcutLabels: boolean;
  onUpdateBinding: (action: KeyActionId, newCode: string) => void;
  onResetBindings: () => void;
  onToggleShowShortcutLabels: () => void;
  onRecordingChange?: (isRecording: boolean) => void;
  embedded?: boolean;
};

const IGNORED_MODIFIER_CODES = new Set([
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'NumLock',
  'CapsLock',
  'ScrollLock',
]);

export const KeyboardSettingsPanel: React.FC<KeyboardSettingsPanelProps> = ({
  keyBindings,
  showShortcutLabels,
  onUpdateBinding,
  onResetBindings,
  onToggleShowShortcutLabels,
  onRecordingChange,
  embedded = false,
}) => {
  const [recordingAction, setRecordingAction] = useState<KeyActionId | null>(
    null
  );
  const [lastUpdatedAction, setLastUpdatedAction] = useState<KeyActionId | null>(
    null
  );

  useEffect(() => {
    onRecordingChange?.(recordingAction !== null);
  }, [onRecordingChange, recordingAction]);

  useEffect(() => {
    if (!recordingAction) return;

    const handleRecordKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const code = getCanonicalKeyCode(event);
      if (!code || code === 'Unknown' || IGNORED_MODIFIER_CODES.has(code)) {
        return;
      }

      onUpdateBinding(recordingAction, code);
      setLastUpdatedAction(recordingAction);
      setRecordingAction(null);
    };

    window.addEventListener('keydown', handleRecordKey, true);
    return () => window.removeEventListener('keydown', handleRecordKey, true);
  }, [onUpdateBinding, recordingAction]);

  useEffect(() => {
    if (!lastUpdatedAction) return;
    const timer = window.setTimeout(() => setLastUpdatedAction(null), 1600);
    return () => window.clearTimeout(timer);
  }, [lastUpdatedAction]);

  return (
    <div className="space-y-2.5 text-left">
      {/* Toggle Label Pintasan di Layar */}
      <div className="rounded-xl bg-sky-50/90 border border-sky-200 p-2.5 flex items-center justify-between gap-2.5">
        <div className="min-w-0">
          <p className="text-xs font-extrabold text-sky-950">
            Tampilkan Label Tombol
          </p>
          <p className="text-[11px] font-bold text-sky-800/80 leading-snug mt-0.5">
            Tampilkan petunjuk pintasan pada tombol aksi.
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
            onToggleShowShortcutLabels();
          }}
          className={`relative inline-flex h-7 w-13 shrink-0 items-center rounded-full border-2 transition-colors cursor-pointer focus-visible:outline-none ${
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

      {/* Info & Tombol Reset ke Default */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-[11px] font-bold text-stone-600 leading-snug">
          Klik <strong>Ubah</strong> lalu tekan tombol Keyboard / Numpad OTG.
        </p>
        <button
          type="button"
          onClick={() => {
            setRecordingAction(null);
            onResetBindings();
          }}
          className="shrink-0 px-2.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 border border-rose-300 text-rose-800 text-[11px] font-extrabold transition-colors cursor-pointer"
        >
          Reset
        </button>
      </div>

      {/* Daftar Pemetaan Tombol */}
      <div
        className={`space-y-1.5 ${
          embedded ? '' : 'max-h-[250px] overflow-y-auto pr-1'
        }`}
      >
        {KEY_ACTION_META_LIST.map((meta) => {
          const isRecording = recordingAction === meta.id;
          const isJustUpdated = lastUpdatedAction === meta.id;
          const keys = keyBindings[meta.id] ?? [];

          return (
            <div
              key={meta.id}
              className={`rounded-2xl border px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                isRecording
                  ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300/60'
                  : isJustUpdated
                  ? 'bg-emerald-50 border-emerald-400'
                  : 'bg-stone-50/90 border-stone-200'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-stone-800 truncate">
                  {meta.label}
                </p>
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  {keys.map((code) => (
                    <span
                      key={code}
                      className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-white border border-stone-300 shadow-2xs text-[10px] font-black text-stone-700 font-mono"
                    >
                      {formatKeyCodeLabel(code)}
                    </span>
                  ))}
                </div>
              </div>

              {isRecording ? (
                <button
                  type="button"
                  onClick={() => {
                    setRecordingAction(null);
                  }}
                  className="shrink-0 px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 text-[11px] font-black animate-pulse cursor-pointer"
                >
                  Tekan Tombol… (Batal)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setRecordingAction(meta.id);
                  }}
                  className="shrink-0 px-2.5 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 border border-purple-300 text-purple-900 text-[11px] font-extrabold transition-colors cursor-pointer"
                >
                  Ubah
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KeyboardSettingsPanel;
