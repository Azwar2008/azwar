import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, VideoOff } from 'lucide-react';

interface CameraCaptureProps {
  photoDataUrl: string;
  onCapture: (dataUrl: string) => void;
  label?: string;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  photoDataUrl,
  onCapture,
  label = 'Swafoto Verifikasi',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Kamera tidak tersedia pada peramban ini.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 480 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setCameraError('Izin kamera belum aktif. Anda tetap dapat absen tanpa foto.');
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    const size = 240;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const minDim = Math.min(video.videoWidth || size, video.videoHeight || size);
    const sx = ((video.videoWidth || size) - minDim) / 2;
    const sy = ((video.videoHeight || size) - minDim) / 2;

    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, size, size);

    const compressed = canvas.toDataURL('image/jpeg', 0.68);
    onCapture(compressed);
    stopStream();
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-stone-800">{label}</span>
        <span className="text-xs text-stone-500">Opsional · Kamera Depan</span>
      </div>

      {photoDataUrl ? (
        <div className="flex items-center gap-4 p-3 rounded-xl bg-stone-50 border border-stone-200">
          <img
            src={photoDataUrl}
            alt="Hasil swafoto verifikasi"
            className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-stone-900">Swafoto Siap Dikirim</p>
            <p className="text-xs text-stone-500 mt-0.5">
              Foto terkompresi otomatis untuk bukti kehadiran.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onCapture('');
              void startCamera();
            }}
            className="min-h-[40px] px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs font-medium text-stone-700 hover:bg-stone-100 flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Ulangi
          </button>
        </div>
      ) : cameraActive ? (
        <div className="space-y-2.5">
          <div className="relative aspect-square max-w-[240px] mx-auto rounded-2xl overflow-hidden bg-stone-900 border border-stone-200">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          </div>
          <div className="flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={captureFrame}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0F4C3A] text-white text-sm font-semibold hover:bg-[#0B3A2C] flex items-center gap-2 whitespace-nowrap"
            >
              <Camera className="w-4 h-4" />
              Ambil Foto
            </button>
            <button
              type="button"
              onClick={stopStream}
              className="min-h-[44px] px-4 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-700 text-sm font-medium hover:bg-stone-50 whitespace-nowrap"
            >
              Batal
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-600 shrink-0">
              {cameraError ? <VideoOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              {cameraError ?? 'Aktifkan kamera depan untuk melampirkan swafoto verifikasi lokasi.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void startCamera()}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-stone-800 hover:bg-stone-100 transition-colors whitespace-nowrap shrink-0"
          >
            Buka Kamera
          </button>
        </div>
      )}
    </div>
  );
};
