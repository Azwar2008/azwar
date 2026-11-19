import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'card';
  showGuideFallback?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  showGuideFallback = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={
          variant === 'header'
            ? 'min-h-[40px] px-4 py-2 rounded-xl bg-[#0F4C3A] text-white text-xs font-semibold flex items-center gap-2 hover:bg-[#0B3A2C] transition-colors whitespace-nowrap shrink-0'
            : 'w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#0F4C3A] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#0B3A2C] transition-colors whitespace-nowrap'
        }
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Pasang Aplikasi</span>
      </button>
    );
  }

  if (isIOS || showGuideFallback) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className={
            variant === 'header'
              ? 'min-h-[40px] px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-stone-800 text-xs font-semibold flex items-center gap-2 hover:bg-stone-50 transition-colors whitespace-nowrap shrink-0'
              : 'w-full min-h-[48px] px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-800 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors whitespace-nowrap'
          }
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>{isIOS ? 'Pasang di iPhone' : 'Cara Pasang di HP'}</span>
        </button>

        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
            <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-stone-200 p-6 space-y-4">
              <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto sm:hidden" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    Pasang KertaHadir di Layar Utama
                  </h3>
                  <p className="text-sm text-stone-600 mt-1">
                    Gunakan langsung seperti aplikasi Android / iOS tanpa perlu mengunduh file eksternal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  aria-label="Tutup panduan"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isIOS ? (
                <ol className="space-y-2.5 text-sm text-stone-700 list-decimal list-inside">
                  <li>
                    Ketuk ikon <strong>Bagikan (Share)</strong> di bilah bawah Safari.
                  </li>
                  <li>
                    Gulir ke bawah lalu pilih <strong>Tambahkan ke Layar Utama</strong>.
                  </li>
                  <li>
                    Ketuk <strong>Tambah</strong> untuk menampilkan ikon KertaHadir di ponsel Anda.
                  </li>
                </ol>
              ) : (
                <ol className="space-y-2.5 text-sm text-stone-700 list-decimal list-inside">
                  <li>
                    Buka aplikasi ini melalui browser <strong>Google Chrome</strong> di HP Android Anda.
                  </li>
                  <li>
                    Ketuk menu titik tiga (<strong>⋮</strong>) di pojok kanan atas browser.
                  </li>
                  <li>
                    Pilih <strong>Tambahkan ke layar utama</strong> atau <strong>Instal aplikasi</strong>, lalu konfirmasi <strong>Instal</strong>.
                  </li>
                </ol>
              )}

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#0F4C3A] text-white text-sm font-semibold hover:bg-[#0B3A2C] transition-colors"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
