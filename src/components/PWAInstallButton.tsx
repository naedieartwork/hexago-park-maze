import React, {useState} from 'react';
import {Download, Share, Smartphone, X} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const {isInstallable, isInstalled, isIOS, promptInstall} = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled || (!isInstallable && !isIOS)) {
    return null;
  }

  return (
    <>
      <div className="rounded-2xl bg-emerald-50/95 border border-emerald-200 p-3.5 mb-3 flex items-center justify-between gap-2.5 text-left">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Smartphone
              className="w-3.5 h-3.5 text-emerald-700 shrink-0"
              aria-hidden="true"
            />
            <p className="text-xs font-extrabold text-emerald-950">
              Pasang di Layar Utama
            </p>
          </div>
          <p className="text-[11px] font-bold text-emerald-900/80 leading-snug mt-0.5">
            Jalankan layar penuh tanpa bilah alamat browser.
          </p>
        </div>
        <button
          type="button"
          data-sfx="custom"
          onClick={() => {
            if (isInstallable) {
              void promptInstall();
            } else if (isIOS) {
              setShowIOSGuide(true);
            }
          }}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 border-b-2 border-emerald-800 text-white text-xs font-extrabold shadow-xs active:border-b-0 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Pasang</span>
        </button>
      </div>

      {showIOSGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-guide-title"
          onClick={() => setShowIOSGuide(false)}
          className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-emerald-950/60 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-3xl bg-white border-2 border-emerald-200 p-5 text-left text-stone-800 shadow-2xl relative"
          >
            <button
              type="button"
              aria-label="Tutup panduan instalasi"
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
            <h3
              id="ios-install-guide-title"
              className="font-display text-lg font-bold text-emerald-950 pr-8 mb-2"
            >
              Pasang di Layar Utama iPhone / iPad
            </h3>
            <ol className="space-y-2.5 text-xs font-bold text-stone-700">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  1
                </span>
                <span>
                  Ketuk tombol{' '}
                  <strong className="inline-flex items-center gap-1 text-emerald-800">
                    Bagikan <Share className="w-3.5 h-3.5 inline" />
                  </strong>{' '}
                  di bilah bawah Safari.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  2
                </span>
                <span>
                  Gulir ke bawah lalu pilih{' '}
                  <strong className="text-emerald-950">
                    &quot;Tambahkan ke Layar Utama&quot;
                  </strong>
                  .
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  3
                </span>
                <span>
                  Ketuk <strong className="text-emerald-950">Tambah</strong>{' '}
                  untuk membuka game secara layar penuh!
                </span>
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full min-h-[42px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-b-4 border-emerald-700 text-white font-display text-sm font-bold cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
