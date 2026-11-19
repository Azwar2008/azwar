import React, { useCallback, useEffect, useState } from 'react';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
  AlertCircle,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut as LogOutIcon,
} from 'lucide-react';
import { OperationType, db, handleFirestoreError } from '../lib/firebase';
import {
  computeCheckInStatus,
  formatDistance,
  formatDurationMinutes,
  formatTimestampTime,
  getJakartaClockString,
  getJakartaDateKey,
  getJakartaLongDate,
  haversineDistanceMeters,
} from '../lib/geo';
import type {
  AttendanceLocationType,
  AttendanceRecord,
  EmployeeProfile,
  OfficeSettings,
} from '../types';
import { CameraCapture } from './CameraCapture';
import { GeofenceRadar } from './GeofenceRadar';

interface CheckInTabProps {
  profile: EmployeeProfile;
  office: OfficeSettings;
  todayRecord: AttendanceRecord | null;
}

export const CheckInTab: React.FC<CheckInTabProps> = ({
  profile,
  office,
  todayRecord,
}) => {
  const [now, setNow] = useState<Date>(() => new Date());
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [locationType, setLocationType] = useState<AttendanceLocationType>('office');
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const fetchGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Perangkat ini tidak mendukung layanan GPS.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setAccuracy(pos.coords.accuracy);
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Izin lokasi ditolak. Aktifkan GPS browser untuk memverifikasi jarak kantor.');
        } else {
          setGpsError('Sinyal GPS tidak terbaca. Pastikan GPS aktif lalu ketuk Perbarui GPS.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 },
    );
  }, []);

  useEffect(() => {
    fetchGps();
  }, [fetchGps]);

  const distanceMeters =
    userLat !== null && userLng !== null
      ? haversineDistanceMeters(userLat, userLng, office.latitude, office.longitude)
      : null;

  const withinRadius = distanceMeters !== null && distanceMeters <= office.radiusMeters;
  const hasCheckedIn = !!todayRecord;
  const hasCheckedOut = !!todayRecord?.checkOutTime;

  const handleCheckIn = async () => {
    setActionError(null);
    setActionSuccess(null);

    if (userLat === null || userLng === null || distanceMeters === null) {
      setActionError('Lokasi GPS belum ditemukan. Ketuk "Perbarui GPS" terlebih dahulu.');
      return;
    }

    if (locationType === 'office' && office.strictGeofence && !withinRadius) {
      setActionError(
        `Anda berada ${formatDistance(distanceMeters)} dari kantor (batas ${office.radiusMeters} m). Masuk ke area kantor atau pilih mode Dinas Luar.`,
      );
      return;
    }

    const cleanNote = note.trim().slice(0, 300);
    if (locationType === 'field_duty' && cleanNote.length < 4) {
      setActionError('Mohon isi keterangan tugas/lokasi untuk absen Dinas Luar.');
      return;
    }

    const dateKey = getJakartaDateKey(new Date());
    const recordId = `${profile.uid}_${dateKey}`;
    const status = computeCheckInStatus(
      new Date(),
      office.workStartTime,
      office.lateToleranceMinutes,
      locationType,
    );

    setSubmitting(true);
    const path = `attendance/${recordId}`;
    try {
      await setDoc(doc(db, 'attendance', recordId), {
        uid: profile.uid,
        employeeName: profile.fullName.slice(0, 100),
        employeeNip: profile.nip.slice(0, 30),
        division: profile.division.slice(0, 60),
        dateKey,
        checkInTime: serverTimestamp(),
        checkInLat: userLat,
        checkInLng: userLng,
        checkInDistanceMeters: distanceMeters,
        checkInPhoto: photoDataUrl.slice(0, 80000),
        checkInLocationType: locationType,
        checkInNote: cleanNote,
        status,
        updatedAt: serverTimestamp(),
      });
      setPhotoDataUrl('');
      setNote('');
      setActionSuccess('Absen masuk berhasil dicatat.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!todayRecord) return;
    setActionError(null);
    setActionSuccess(null);

    if (userLat === null || userLng === null || distanceMeters === null) {
      setActionError('Lokasi GPS belum ditemukan. Ketuk "Perbarui GPS" terlebih dahulu.');
      return;
    }

    const cleanNote = note.trim().slice(0, 300);
    const checkInMs =
      todayRecord.checkInTime && typeof todayRecord.checkInTime.toMillis === 'function'
        ? todayRecord.checkInTime.toMillis()
        : Date.now();
    const durationMins = Math.max(0, Math.min(1440, Math.round((Date.now() - checkInMs) / 60000)));

    setSubmitting(true);
    const path = `attendance/${todayRecord.id}`;
    try {
      await updateDoc(doc(db, 'attendance', todayRecord.id), {
        checkOutTime: serverTimestamp(),
        checkOutLat: userLat,
        checkOutLng: userLng,
        checkOutDistanceMeters: distanceMeters,
        checkOutPhoto: photoDataUrl.slice(0, 80000),
        checkOutNote: cleanNote,
        workDurationMinutes: durationMins,
        updatedAt: serverTimestamp(),
      });
      setPhotoDataUrl('');
      setNote('');
      setActionSuccess('Absen pulang berhasil dicatat. Terima kasih atas kerja keras hari ini.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Hero Clock & Shift Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7 bg-[#0F4C3A] text-white rounded-2xl p-6 flex flex-col justify-between gap-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-emerald-100/80">{getJakartaLongDate(now)}</p>
              <p className="font-mono text-3xl sm:text-4xl font-bold tracking-tight mt-1">
                {getJakartaClockString(now)} <span className="text-base font-medium text-emerald-200">WIB</span>
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-emerald-100/80">Jam Kerja Kantor</p>
              <p className="font-mono text-sm font-semibold mt-0.5">
                {office.workStartTime} – {office.workEndTime} WIB
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <p className="text-emerald-100/80">Karyawan Terdaftar</p>
              <p className="text-sm font-semibold text-white">
                {profile.fullName} · <span className="font-mono">{profile.nip}</span>
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-emerald-100/80">Status Hari Ini</p>
              <p className="text-sm font-semibold text-white">
                {!hasCheckedIn
                  ? 'Belum Absen Masuk'
                  : !hasCheckedOut
                    ? `Masuk ${formatTimestampTime(todayRecord.checkInTime)}`
                    : `Selesai (${formatDurationMinutes(todayRecord.workDurationMinutes)})`}
              </p>
            </div>
          </div>
        </div>

        {/* Today's Shift Checkpoints */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900">Ringkasan Presensi Hari Ini</h2>
            <Clock className="w-4 h-4 text-stone-400" />
          </div>

          <div className="grid grid-cols-2 gap-4 py-2 border-y border-stone-100">
            <div>
              <p className="text-xs text-stone-500">Jam Masuk</p>
              <p className="font-mono text-lg font-bold text-stone-900 mt-0.5">
                {todayRecord ? formatTimestampTime(todayRecord.checkInTime) : '—'}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                {todayRecord
                  ? todayRecord.status === 'on_time'
                    ? 'Tepat Waktu'
                    : todayRecord.status === 'late'
                      ? 'Terlambat'
                      : 'Dinas Luar'
                  : `Batas ${office.workStartTime} (+${office.lateToleranceMinutes}m)`}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Jam Pulang</p>
              <p className="font-mono text-lg font-bold text-stone-900 mt-0.5">
                {todayRecord?.checkOutTime ? formatTimestampTime(todayRecord.checkOutTime) : '—'}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                {todayRecord?.checkOutTime
                  ? `Durasi ${formatDurationMinutes(todayRecord.workDurationMinutes)}`
                  : `Jadwal ${office.workEndTime} WIB`}
              </p>
            </div>
          </div>

          <p className="text-xs text-stone-500">
            Bagian: <span className="font-medium text-stone-800">{profile.division}</span> · {profile.position}
          </p>
        </div>
      </div>

      {/* Main Action & Geofence Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Geofence Radar */}
        <div className="lg:col-span-5">
          <GeofenceRadar
            office={office}
            userLat={userLat}
            userLng={userLng}
            accuracyMeters={accuracy}
            distanceMeters={distanceMeters}
            gpsLoading={gpsLoading}
            gpsError={gpsError}
            onRefreshGps={fetchGps}
          />
        </div>

        {/* Right: Attendance Action Panel */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-5">
          {hasCheckedOut ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#0F4C3A] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-stone-900">Presensi Hari Ini Selesai</h3>
                <p className="text-sm text-stone-600 max-w-md mx-auto">
                  Anda telah mencatat absen masuk pada{' '}
                  <span className="font-mono font-semibold">
                    {formatTimestampTime(todayRecord.checkInTime)}
                  </span>{' '}
                  dan pulang pada{' '}
                  <span className="font-mono font-semibold">
                    {formatTimestampTime(todayRecord.checkOutTime)}
                  </span>
                  .
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-stone-500">
                    {hasCheckedIn ? 'Sesi Kerja Berjalan' : 'Catat Kehadiran'}
                  </p>
                  <h3 className="text-lg font-bold text-stone-900 mt-0.5">
                    {hasCheckedIn ? 'Form Absen Pulang' : 'Form Absen Masuk'}
                  </h3>
                </div>
              </div>

              {!hasCheckedIn && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-stone-700 block">
                    Mode Lokasi Kehadiran
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setLocationType('office')}
                      className={`min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                        locationType === 'office'
                          ? 'bg-white text-stone-900 shadow-sm'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Building2 className="w-4 h-4 shrink-0" />
                      <span>Di Kantor</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationType('field_duty')}
                      className={`min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                        locationType === 'field_duty'
                          ? 'bg-white text-stone-900 shadow-sm'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Briefcase className="w-4 h-4 shrink-0" />
                      <span>Dinas Luar</span>
                    </button>
                  </div>
                  {locationType === 'office' && !withinRadius && distanceMeters !== null && (
                    <p className="text-xs text-amber-800">
                      Posisi Anda saat ini {formatDistance(distanceMeters)} dari Kantor Kertamanah.{' '}
                      {office.strictGeofence
                        ? 'Mode kantor mewajibkan Anda berada di dalam radius.'
                        : 'Jika sedang bertugas di afdeling/lapangan, pilih mode Dinas Luar.'}
                    </p>
                  )}
                </div>
              )}

              <CameraCapture
                photoDataUrl={photoDataUrl}
                onCapture={setPhotoDataUrl}
                label={hasCheckedIn ? 'Swafoto Pulang' : 'Swafoto Masuk'}
              />

              <div className="space-y-1.5">
                <label htmlFor="att-note" className="text-xs font-semibold text-stone-700 block">
                  {locationType === 'field_duty' && !hasCheckedIn
                    ? 'Keterangan Tugas / Lokasi Lapangan (Wajib)'
                    : 'Catatan Tambahan (Opsional)'}
                </label>
                <textarea
                  id="att-note"
                  rows={2}
                  maxLength={300}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    locationType === 'field_duty' && !hasCheckedIn
                      ? 'Contoh: Monitoring Afdeling II Blok C12'
                      : 'Contoh: Hadir piket pagi kantor induk'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30 focus:border-[#0F4C3A]"
                />
              </div>

              {actionError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}

              {actionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              <button
                type="button"
                disabled={submitting || gpsLoading}
                onClick={() => void (hasCheckedIn ? handleCheckOut() : handleCheckIn())}
                className={`w-full min-h-[50px] px-5 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${
                  hasCheckedIn
                    ? 'bg-stone-900 hover:bg-stone-800'
                    : 'bg-[#0F4C3A] hover:bg-[#0B3A2C]'
                }`}
              >
                {hasCheckedIn ? (
                  <>
                    <LogOutIcon className="w-4 h-4" />
                    <span>{submitting ? 'Menyimpan...' : 'Absen Pulang Sekarang'}</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{submitting ? 'Menyimpan...' : 'Absen Masuk Sekarang'}</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
