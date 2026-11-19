import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { CheckCircle2, LogOut, Smartphone } from 'lucide-react';
import { OperationType, auth, db, handleFirestoreError } from '../lib/firebase';
import { DIVISIONS, type Division, type EmployeeProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface ProfileTabProps {
  profile: EmployeeProfile;
  isAdmin: boolean;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ profile, isAdmin }) => {
  const [fullName, setFullName] = useState(profile.fullName);
  const [nip, setNip] = useState(profile.nip);
  const [division, setDivision] = useState<Division>(profile.division);
  const [position, setPosition] = useState(profile.position);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const cleanName = fullName.trim().slice(0, 100);
    const cleanNip = nip.trim().slice(0, 30);
    const cleanPos = position.trim().slice(0, 80);

    if (cleanName.length < 2) {
      setError('Nama lengkap minimal 2 karakter.');
      return;
    }
    if (!/^[a-zA-Z0-9.-]{3,30}$/.test(cleanNip)) {
      setError('NIP/NIK harus 3–30 karakter (huruf, angka, titik, atau tanda hubung).');
      return;
    }
    if (cleanPos.length < 2) {
      setError('Jabatan minimal 2 karakter.');
      return;
    }

    setSaving(true);
    const path = `employees/${profile.uid}`;
    try {
      await updateDoc(doc(db, 'employees', profile.uid), {
        fullName: cleanName,
        nip: cleanNip,
        division,
        position: cleanPos,
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <form
        onSubmit={(e) => void handleSave(e)}
        className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-stone-500">
              {isAdmin ? 'Administrator HRD' : 'Karyawan PTPN Kertamanah'} · {profile.email}
            </p>
            <h2 className="text-lg font-bold text-stone-900 mt-0.5">Profil Kepegawaian</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="prof-name" className="text-xs font-semibold text-stone-700 block">
              Nama Lengkap
            </label>
            <input
              id="prof-name"
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30 focus:border-[#0F4C3A]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="prof-nip" className="text-xs font-semibold text-stone-700 block">
              NIP / NIK
            </label>
            <input
              id="prof-nip"
              type="text"
              required
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9.\-]+"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30 focus:border-[#0F4C3A]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="prof-div" className="text-xs font-semibold text-stone-700 block">
              Bagian / Afdeling
            </label>
            <select
              id="prof-div"
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
            <label htmlFor="prof-pos" className="text-xs font-semibold text-stone-700 block">
              Jabatan
            </label>
            <input
              id="prof-pos"
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30 focus:border-[#0F4C3A]"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
            {error}
          </div>
        )}

        {saved && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Perubahan profil berhasil disimpan.</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0F4C3A] text-white text-sm font-semibold hover:bg-[#0B3A2C] disabled:opacity-60 transition-colors"
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>

          <button
            type="button"
            onClick={() => void signOut(auth)}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-stone-300 text-sm font-medium text-stone-700 hover:bg-stone-50 flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </form>

      {/* Android / PWA Install Card */}
      <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0F4C3A] shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">Pasang di Ponsel Android</h3>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              KertaHadir menggunakan teknologi PWA sehingga dapat dipasang langsung ke layar utama Android layaknya aplikasi APK resmi tanpa perlu instalasi manual berisiko.
            </p>
          </div>
        </div>

        <PWAInstallButton variant="card" showGuideFallback />
      </div>
    </div>
  );
};
