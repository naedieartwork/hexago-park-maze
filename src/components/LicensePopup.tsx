import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ShoppingBag,
  Check,
  ExternalLink,
} from 'lucide-react';
import {
  DEFAULT_KEY_BINDINGS,
  activateFocusedOrDefault,
  getActionBadgeLabel,
  isTextEntryTarget,
  matchesKeyAction,
  navigateContainerFocus,
  type KeyBindingsMap,
} from '../utils/keyboardConfig';
import {
  getOrCreateDeviceId,
  verifyAndActivateLicenseRpc,
  formatLicenseCountdownDetail,
  type StoredLicenseSession,
} from '../utils/licenseManager';

export type LicensePopupProps = {
  isOpen: boolean;
  keyBindings?: KeyBindingsMap;
  showShortcutLabels?: boolean;
  onActivate: (session: StoredLicenseSession) => void;
  onClose: () => void;
};

const FALLBACK_PURCHASE_URL = 'https://wa.me/62882001234606';
const envPurchaseUrl = (import.meta.env.VITE_LICENSE_PURCHASE_URL ?? '').trim();
const rawPurchaseUrl =
  envPurchaseUrl && !envPurchaseUrl.toUpperCase().includes('TEMPEL_')
    ? envPurchaseUrl
    : FALLBACK_PURCHASE_URL.trim();
const PURCHASE_BASE_URL = (
  /^https?:\/\//i.test(rawPurchaseUrl) &&
  !rawPurchaseUrl.toUpperCase().includes('TEMPEL_') &&
  !rawPurchaseUrl.includes('[')
    ? rawPurchaseUrl
    : FALLBACK_PURCHASE_URL
).split('?')[0];

const LICENSE_PACKAGES = [
  'Paket 3 Jam',
  'Paket 8 Jam',
  'Paket 1 Hari',
  'Paket 30 Hari',
  'Lisensi Penuh (Selamanya)',
] as const;

type LicensePackageOption = (typeof LICENSE_PACKAGES)[number];

const LicensePopup: React.FC<LicensePopupProps> = ({
  isOpen,
  keyBindings = DEFAULT_KEY_BINDINGS,
  showShortcutLabels = false,
  onActivate,
  onClose,
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activatedSession, setActivatedSession] =
    useState<StoredLicenseSession | null>(null);
  const [showPurchaseInfo, setShowPurchaseInfo] = useState(false);
  const [selectedPackage, setSelectedPackage] =
    useState<LicensePackageOption>('Paket 1 Hari');
  const [deviceId, setDeviceId] = useState('');

  const popupRef = useRef<HTMLDivElement | null>(null);
  const activateTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setDeviceId(getOrCreateDeviceId());
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (activateTimerRef.current !== null) {
        window.clearTimeout(activateTimerRef.current);
      }
    };
  }, []);

  const handleLaterClick = useCallback(() => {
    if (isLoading) return;
    if (activateTimerRef.current !== null) {
      window.clearTimeout(activateTimerRef.current);
      activateTimerRef.current = null;
    }
    setErrorMessage('');
    setKeyInput('');
    setActivatedSession(null);
    setShowPurchaseInfo(false);
    onClose();
  }, [isLoading, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextEntryTarget(event.target)) {
        if (event.key === 'Escape') {
          event.preventDefault();
          handleLaterClick();
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          navigateContainerFocus(popupRef.current, 'DOWN');
        }
        return;
      }

      if (matchesKeyAction(event, 'back', keyBindings)) {
        event.preventDefault();
        handleLaterClick();
        return;
      }
      if (matchesKeyAction(event, 'moveUp', keyBindings)) {
        event.preventDefault();
        navigateContainerFocus(popupRef.current, 'UP');
        return;
      }
      if (matchesKeyAction(event, 'moveDown', keyBindings)) {
        event.preventDefault();
        navigateContainerFocus(popupRef.current, 'DOWN');
        return;
      }
      if (matchesKeyAction(event, 'moveLeft', keyBindings)) {
        event.preventDefault();
        navigateContainerFocus(popupRef.current, 'LEFT');
        return;
      }
      if (matchesKeyAction(event, 'moveRight', keyBindings)) {
        event.preventDefault();
        navigateContainerFocus(popupRef.current, 'RIGHT');
        return;
      }
      if (matchesKeyAction(event, 'confirm', keyBindings)) {
        event.preventDefault();
        activateFocusedOrDefault(popupRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleLaterClick, isOpen, keyBindings]);

  if (!isOpen) return null;

  const activeDeviceId = deviceId || getOrCreateDeviceId();
  const whatsappMessage = `Halo Admin Hexago Media, saya ingin membeli lisensi Game Labirin Hexago Park:\n- Paket: ${selectedPackage}\n- ID Perangkat: ${activeDeviceId}\n\nMohon info pembayaran dan kode lisensinya ya.`;
  const whatsappOrderUrl = `${PURCHASE_BASE_URL}?text=${encodeURIComponent(
    whatsappMessage
  )}`;

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage('');
    const trimmedKey = keyInput.trim();
    if (!trimmedKey) {
      setErrorMessage('Harap masukkan kode lisensi terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    const result = await verifyAndActivateLicenseRpc(trimmedKey);
    setIsLoading(false);

    if (result.valid && result.session) {
      setActivatedSession(result.session);
      const validSession = result.session;
      activateTimerRef.current = window.setTimeout(() => {
        activateTimerRef.current = null;
        setActivatedSession(null);
        setKeyInput('');
        setShowPurchaseInfo(false);
        onActivate(validSession);
      }, 1600);
      return;
    }

    setErrorMessage(
      result.message || 'Kunci lisensi tidak terdaftar atau telah kedaluwarsa.'
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="license-modal-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto"
    >
      <div
        ref={popupRef}
        className="w-full max-w-md rounded-3xl bg-white border-4 border-amber-300 shadow-[0_24px_60px_rgba(0,0,0,0.45)] p-5 sm:p-6 text-slate-800 text-center my-auto"
      >
        <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-700 shadow-xs">
          <KeyRound className="w-6 h-6" aria-hidden="true" />
        </div>

        <h2
          id="license-modal-title"
          className="font-display text-2xl font-bold text-slate-900 mb-1"
        >
          Akses Game Penuh
        </h2>
        <p className="text-xs sm:text-sm font-bold text-slate-600 mb-4 leading-relaxed">
          Masukkan kode lisensi Anda untuk membuka Level 4–10 Mode Solo &amp;
          Level 2–10 Mode Kelompok.
        </p>

        {activatedSession ? (
          <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-4 text-emerald-950 space-y-1.5">
            <div className="flex items-center justify-center gap-2 font-display text-lg font-bold text-emerald-800">
              <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
              <span>Lisensi Berhasil Diaktifkan!</span>
            </div>
            <p className="text-xs sm:text-sm font-extrabold text-emerald-900">
              Paket Aktif: {activatedSession.plan_label}
            </p>
            <p className="text-[11px] font-bold text-emerald-800/85">
              {formatLicenseCountdownDetail(activatedSession)}
            </p>
          </div>
        ) : (
          <form onSubmit={(e) => void handleVerify(e)} className="flex flex-col">
            <input
              type="text"
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Masukkan Kode Lisensi..."
              maxLength={64}
              autoComplete="off"
              spellCheck={false}
              disabled={isLoading}
              className="w-full px-3.5 py-3 rounded-xl border-2 border-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-3 focus:ring-emerald-200/70 text-center font-mono text-sm sm:text-base font-bold text-slate-900 bg-white placeholder:text-slate-400 uppercase tracking-wider mb-3 disabled:opacity-60"
            />

            {errorMessage && (
              <div
                role="alert"
                className="mb-3 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 flex items-start gap-2 text-left text-xs font-bold text-rose-700"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex gap-2.5">
              <button
                type="submit"
                data-kb-default="true"
                disabled={isLoading}
                className="flex-1 min-h-[46px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 border-b-4 border-emerald-800 active:border-b-0 text-white font-extrabold text-sm shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <span>Aktifkan</span>
                    {showShortcutLabels && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-800/70 text-[10px] font-black font-mono">
                        {getActionBadgeLabel('confirm', keyBindings)}
                      </span>
                    )}
                  </>
                )}
              </button>

              <button
                type="button"
                data-sfx="custom"
                disabled={isLoading}
                onClick={handleLaterClick}
                className="flex-1 min-h-[46px] px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-60 border-b-4 border-rose-700 active:border-b-0 text-white font-extrabold text-sm shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Nanti Saja</span>
                {showShortcutLabels && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-800/60 text-[10px] font-black font-mono">
                    {getActionBadgeLabel('back', keyBindings)}
                  </span>
                )}
              </button>
            </div>

            {/* Tombol Kecil "Beli / Dapatkan Lisensi" di Bagian Bawah Modal */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col items-center">
              <button
                type="button"
                onClick={() => setShowPurchaseInfo((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-extrabold transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Beli / Dapatkan Lisensi</span>
              </button>

              {showPurchaseInfo && (
                <div className="mt-3 w-full rounded-2xl bg-slate-50 border border-slate-200 p-3 text-left space-y-3">
                  <p className="text-[11px] font-extrabold text-slate-800">
                    Pilih Paket Lisensi:
                  </p>
                  <div
                    role="radiogroup"
                    aria-label="Pilihan Paket Lisensi"
                    className="flex flex-wrap gap-1.5"
                  >
                    {LICENSE_PACKAGES.map((pkg) => {
                      const isSelected = selectedPackage === pkg;
                      return (
                        <button
                          key={pkg}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => setSelectedPackage(pkg)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-extrabold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                            isSelected
                              ? 'bg-amber-400 border-amber-600 text-amber-950 shadow-xs ring-2 ring-amber-300/70'
                              : 'bg-white hover:bg-amber-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          {isSelected && (
                            <Check
                              className="w-3 h-3 text-amber-950 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          <span>{pkg}</span>
                        </button>
                      );
                    })}
                  </div>

                  <a
                    href={whatsappOrderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-500 border-b-3 border-amber-600 active:border-b-0 text-amber-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    <span>Beli {selectedPackage} via WhatsApp</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export { LicensePopup };
export default LicensePopup;
