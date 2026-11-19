import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { signInWithPopup, signOut } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ArrowRight, Building2, CheckCircle2, LogOut, ShieldCheck } from 'lucide-react';
import {
  ADMIN_EMAIL,
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
} from '../lib/firebase';
import { DIVISIONS, type Division } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthOnboardingViewProps {
  user: User | null;
  onProfileCreated: () => void;
}

export const AuthOnboardingView: React.FC<AuthOnboardingViewProps> = ({
  user,
  onProfileCreated,
}) => {
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [iconImgFailed, setIconImgFailed] = useState(false);

  const [fullName, setFullName] = useState(user?.displayName ?? '');
  const [nip, setNip] = useState('');
  const [division, setDivision] = useState<Division>('Tata Usaha & SDM');
  const [position, setPosition] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk dengan akun Google.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError('Gagal masuk dengan akun Google. Silakan coba kembali.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    const cleanName = fullName.trim().slice(0, 100);
    const cleanNip = nip.trim().slice(0, 30);
    const cleanPos = position.trim().slice(0, 80);

    if (cleanName.length < 2) {
      setFormError('Nama lengkap minimal 2 karakter.');
      return;
    }
    if (!/^[a-zA-Z0-9.-]{3,30}$/.test(cleanNip)) {
      setFormError('NIP/NIK harus 3–30 karakter (huruf, angka, titik, atau tanda hubung).');
      return;
    }
    if (cleanPos.length < 2) {
      setFormError('Jabatan minimal 2 karakter.');
      return;
    }

    setFormError(null);
    setSaving(true);
    const role = user.email === ADMIN_EMAIL && user.emailVerified ? 'admin' : 'employee';
    const path = `employees/${user.uid}`;

    try {
      await setDoc(doc(db, 'employees', user.uid), {
        uid: user.uid,
        email: user.email.slice(0, 150),
        fullName: cleanName,
        nip: cleanNip,
        division,
        position: cleanPos,
        role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onProfileCreated();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7F5] flex flex-col lg:grid lg:grid-cols-12">
      {/* Left/Top Estate Showcase */}
      <div className="relative lg:col-span-7 min-h-[260px] lg:min-h-screen bg-[#0F3D2E] overflow-hidden flex flex-col justify-between p-6 sm:p-10 lg:p-14">
        {!heroImgFailed && (
          <img
            src="/src/assets/images/kertamanah_estate_hero_1795075300466.jpg"
            alt="Perkebunan Teh PTPN Kebun Kertamanah Pangalengan"
            referrerPolicy="no-referrer"
            onError={() => setHeroImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/30" />

        <div className="relative z-10 flex items-center gap-3.5">
          {!iconImgFailed ? (
            <img
              src="/src/assets/images/kertamanah_app_icon_1795075234085.jpg"
              alt="Logo KertaHadir"
              referrerPolicy="no-referrer"
              onError={() => setIconImgFailed(true)}
              className="w-11 h-11 rounded-xl object-cover border border-white/20 shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-white shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
          )}
          <div className="text-white">
            <span className="font-display text-lg font-bold tracking-tight block">KertaHadir</span>
            <span className="text-xs text-white/80 block">PTPN Kebun Kertamanah · Pangalengan</span>
          </div>
        </div>

        <div className="relative z-10 max-w-xl mt-10 lg:mt-0 space-y-4">
          <h1 className="font-display text-2xl sm:text-4xl lg:text-[42px] font-bold text-white leading-tight tracking-tight text-balance">
            Presensi Kantor & Lapangan Kebun Kertamanah
          </h1>
          <p className="text-sm sm:text-base text-white/85 leading-relaxed max-w-lg">
            Sistem absensi harian berbasis koordinat GPS geofence, verifikasi swafoto, serta pengajuan izin karyawan dalam satu aplikasi mobile yang dapat dipasang langsung di Android.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/80 pt-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              Geofence Kantor Induk
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              Sinkronisasi Real-Time
            </span>
          </div>
        </div>
      </div>

      {/* Right/Bottom Auth or Onboarding Panel */}
      <div className="lg:col-span-5 flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-[#F6F7F5]">
        <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-6">
          {!user ? (
            <>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-stone-500">Portal Karyawan & HRD</p>
                <h2 className="font-display text-2xl font-bold text-stone-900">
                  Masuk ke KertaHadir
                </h2>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Gunakan akun Google resmi Anda untuk mencatat kehadiran harian di lingkungan PTPN Kertamanah.
                </p>
              </div>

              {authError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                  {authError}
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => void handleGoogleLogin()}
                  disabled={authLoading}
                  className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#0F4C3A] text-white text-sm font-semibold hover:bg-[#0B3A2C] disabled:opacity-60 transition-colors flex items-center justify-center gap-2.5"
                >
                  <span>{authLoading ? 'Menghubungkan...' : 'Masuk dengan Google'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <PWAInstallButton variant="card" showGuideFallback />
              </div>

              <p className="text-xs text-stone-500 leading-relaxed pt-2 border-t border-stone-100">
                Untuk pengguna Android, Anda dapat memasang aplikasi ini ke layar utama agar berfungsi layaknya aplikasi APK native dengan dukungan akses cepat.
              </p>
            </>
          ) : (
            <form onSubmit={(e) => void handleCreateProfile(e)} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-stone-500">Pendaftaran Karyawan Baru</p>
                  <h2 className="font-display text-xl font-bold text-stone-900 mt-0.5">
                    Lengkapi Data Kepegawaian
                  </h2>
                  <p className="text-xs text-stone-500 mt-1 truncate">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void signOut(auth)}
                  title="Keluar akun"
                  className="min-h-[40px] px-3 py-2 rounded-xl border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 flex items-center gap-1.5 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="onb-fullname" className="text-xs font-semibold text-stone-700 block">
                  Nama Lengkap
                </label>
                <input
                  id="onb-fullname"
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Hendra Wijaya"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30 focus:border-[#0F4C3A]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="onb-nip" className="text-xs font-semibold text-stone-700 block">
                  NIP / NIK Karyawan
                </label>
                <input
                  id="onb-nip"
                  type="text"
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9.\-]+"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="Contoh: 19900412-0082"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30 focus:border-[#0F4C3A]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="onb-division" className="text-xs font-semibold text-stone-700 block">
                  Bagian / Afdeling
                </label>
                <select
                  id="onb-division"
                  value={division}
                  onChange={(e) => setDivision(e.target.value as Division)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30 focus:border-[#0F4C3A]"
                >
                  {DIVISIONS.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="onb-position" className="text-xs font-semibold text-stone-700 block">
                  Jabatan
                </label>
                <input
                  id="onb-position"
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Contoh: Staf Administrasi Kebun"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30 focus:border-[#0F4C3A]"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#0F4C3A] text-white text-sm font-semibold hover:bg-[#0B3A2C] disabled:opacity-60 transition-colors"
              >
                {saving ? 'Menyimpan Profil...' : 'Simpan & Mulai Absensi'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
