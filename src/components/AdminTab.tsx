import React, { useMemo, useState } from 'react';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
  Check,
  CheckCircle2,
  Download,
  LocateFixed,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { OperationType, db, handleFirestoreError } from '../lib/firebase';
import {
  formatDateKeyLabel,
  formatDistance,
  formatDurationMinutes,
  formatTimestampTime,
  getJakartaDateKey,
} from '../lib/geo';
import {
  DIVISIONS,
  type AttendanceRecord,
  type EmployeeProfile,
  type LeaveRequest,
  type OfficeSettings,
} from '../types';
import { AttendanceDetailModal } from './AttendanceDetailModal';

interface AdminTabProps {
  profile: EmployeeProfile;
  office: OfficeSettings;
  allAttendance: AttendanceRecord[];
  allLeaveRequests: LeaveRequest[];
}

type AdminSection = 'monitor' | 'leave' | 'settings';

const STATUS_LABELS: Record<AttendanceRecord['status'], string> = {
  on_time: 'Tepat Waktu',
  late: 'Terlambat',
  field_duty: 'Dinas Luar',
};

const LEAVE_TYPE_LABELS: Record<LeaveRequest['type'], string> = {
  izin: 'Izin Pribadi',
  sakit: 'Sakit',
  cuti: 'Cuti Tahunan',
  dinas_luar: 'Surat Tugas / Dinas',
};

export const AdminTab: React.FC<AdminTabProps> = ({
  profile,
  office,
  allAttendance,
  allLeaveRequests,
}) => {
  const [section, setSection] = useState<AdminSection>('monitor');
  const [selectedDate, setSelectedDate] = useState<string>(() => getJakartaDateKey(new Date()));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [detailRecord, setDetailRecord] = useState<AttendanceRecord | null>(null);

  // Leave approval state
  const [leaveFilter, setLeaveFilter] = useState<'pending' | 'all'>('pending');
  const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Office settings state
  const [officeName, setOfficeName] = useState(office.officeName);
  const [address, setAddress] = useState(office.address);
  const [latitude, setLatitude] = useState(String(office.latitude));
  const [longitude, setLongitude] = useState(String(office.longitude));
  const [radiusMeters, setRadiusMeters] = useState(String(office.radiusMeters));
  const [workStartTime, setWorkStartTime] = useState(office.workStartTime);
  const [workEndTime, setWorkEndTime] = useState(office.workEndTime);
  const [lateTolerance, setLateTolerance] = useState(String(office.lateToleranceMinutes));
  const [strictGeofence, setStrictGeofence] = useState(office.strictGeofence);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const dailyRecords = useMemo(() => {
    return allAttendance.filter((rec) => {
      if (selectedDate && rec.dateKey !== selectedDate) return false;
      if (divisionFilter !== 'all' && rec.division !== divisionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          rec.employeeName.toLowerCase().includes(q) ||
          rec.employeeNip.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allAttendance, selectedDate, divisionFilter, searchQuery]);

  const dailyStats = useMemo(() => {
    const present = dailyRecords.length;
    const onTime = dailyRecords.filter((r) => r.status === 'on_time').length;
    const late = dailyRecords.filter((r) => r.status === 'late').length;
    const field = dailyRecords.filter((r) => r.status === 'field_duty').length;
    return { present, onTime, late, field };
  }, [dailyRecords]);

  const pendingLeavesCount = useMemo(
    () => allLeaveRequests.filter((r) => r.status === 'pending').length,
    [allLeaveRequests],
  );

  const visibleLeaves = useMemo(() => {
    if (leaveFilter === 'pending') {
      return allLeaveRequests.filter((r) => r.status === 'pending');
    }
    return allLeaveRequests;
  }, [allLeaveRequests, leaveFilter]);

  const handleExportCsv = () => {
    const headers = [
      'Tanggal',
      'NIP',
      'Nama Karyawan',
      'Bagian',
      'Status',
      'Jam Masuk',
      'Jam Pulang',
      'Durasi Kerja (Menit)',
      'Jarak Masuk (m)',
      'Mode Lokasi',
      'Catatan',
    ];
    const rows = dailyRecords.map((r) => [
      r.dateKey,
      r.employeeNip,
      `"${r.employeeName.replace(/"/g, '""')}"`,
      `"${r.division.replace(/"/g, '""')}"`,
      STATUS_LABELS[r.status],
      formatTimestampTime(r.checkInTime),
      r.checkOutTime ? formatTimestampTime(r.checkOutTime) : '-',
      r.workDurationMinutes ?? '',
      r.checkInDistanceMeters,
      r.checkInLocationType === 'office' ? 'Di Kantor' : 'Dinas Luar',
      `"${(r.checkInNote || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rekap-absensi-kertamanah-${selectedDate || 'semua'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleReviewLeave = async (reqId: string, decision: 'approved' | 'rejected') => {
    setProcessingId(reqId);
    const note = (reviewerNotes[reqId] ?? '').trim().slice(0, 300);
    const path = `leaveRequests/${reqId}`;
    try {
      await updateDoc(doc(db, 'leaveRequests', reqId), {
        status: decision,
        reviewerUid: profile.uid,
        reviewerNote: note,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCalibrateGps = () => {
    if (!navigator.geolocation) {
      setSettingsError('Perangkat tidak mendukung GPS.');
      return;
    }
    setSettingsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
      },
      () => {
        setSettingsError('Gagal membaca koordinat GPS saat ini.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError(null);
    setSettingsSaved(false);

    const lat = Number(latitude);
    const lng = Number(longitude);
    const rad = Number(radiusMeters);
    const tol = Number(lateTolerance);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setSettingsError('Latitude harus di antara -90 hingga 90.');
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setSettingsError('Longitude harus di antara -180 hingga 180.');
      return;
    }
    if (!Number.isFinite(rad) || rad < 20 || rad > 5000) {
      setSettingsError('Radius geofence harus di antara 20 hingga 5000 meter.');
      return;
    }
    if (!Number.isFinite(tol) || tol < 0 || tol > 120) {
      setSettingsError('Toleransi terlambat harus 0–120 menit.');
      return;
    }

    setSavingSettings(true);
    const path = 'settings/office';
    try {
      await setDoc(doc(db, 'settings', 'office'), {
        officeName: officeName.trim().slice(0, 120),
        address: address.trim().slice(0, 200),
        latitude: lat,
        longitude: lng,
        radiusMeters: Math.round(rad),
        workStartTime,
        workEndTime,
        lateToleranceMinutes: Math.round(tol),
        strictGeofence,
        updatedAt: serverTimestamp(),
        updatedBy: profile.uid,
      });
      setSettingsSaved(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Admin Section Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-stone-500">Panel HRD Kebun Kertamanah</p>
          <h2 className="text-xl font-bold text-stone-900">Administrasi Kehadiran</h2>
        </div>

        <div className="flex items-center gap-1 p-1 bg-stone-200/70 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setSection('monitor')}
            className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              section === 'monitor'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Monitor Harian
          </button>
          <button
            type="button"
            onClick={() => setSection('leave')}
            className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              section === 'leave'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Persetujuan Izin ({pendingLeavesCount})
          </button>
          <button
            type="button"
            onClick={() => setSection('settings')}
            className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              section === 'settings'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Pengaturan Kantor
          </button>
        </div>
      </div>

      {section === 'monitor' && (
        <div className="space-y-5">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5">
              <p className="text-xs text-stone-500">Hadir Tercatat</p>
              <p className="font-mono text-2xl font-bold text-stone-900 mt-1">
                {dailyStats.present}
              </p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5">
              <p className="text-xs text-stone-500">Tepat Waktu</p>
              <p className="font-mono text-2xl font-bold text-[#0F4C3A] mt-1">
                {dailyStats.onTime}
              </p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5">
              <p className="text-xs text-stone-500">Terlambat</p>
              <p className="font-mono text-2xl font-bold text-amber-800 mt-1">
                {dailyStats.late}
              </p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5">
              <p className="text-xs text-stone-500">Dinas Luar</p>
              <p className="font-mono text-2xl font-bold text-stone-800 mt-1">
                {dailyStats.field}
              </p>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-4 relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau NIP..."
                  className="w-full min-h-[44px] pl-10 pr-3.5 py-2 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30 focus:border-[#0F4C3A]"
                />
              </div>

              <div className="sm:col-span-3">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  aria-label="Filter tanggal"
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-stone-300 text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30 focus:border-[#0F4C3A]"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={divisionFilter}
                  onChange={(e) => setDivisionFilter(e.target.value)}
                  aria-label="Filter bagian"
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-stone-300 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30 focus:border-[#0F4C3A]"
                >
                  <option value="all">Semua Bagian</option>
                  {DIVISIONS.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={dailyRecords.length === 0}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Ekspor CSV</span>
                </button>
              </div>
            </div>

            {dailyRecords.length === 0 ? (
              <div className="py-12 text-center border-t border-stone-100 space-y-1">
                <p className="text-sm font-medium text-stone-700">
                  Belum ada data absensi untuk filter ini
                </p>
                <p className="text-xs text-stone-500">
                  Ubah tanggal atau kata kunci pencarian untuk melihat data lainnya.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border-t border-stone-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-xs font-semibold text-stone-500">
                      <th className="py-3 pr-4">Karyawan</th>
                      <th className="py-3 px-3">Bagian</th>
                      <th className="py-3 px-3">Masuk</th>
                      <th className="py-3 px-3">Pulang</th>
                      <th className="py-3 px-3">Jarak</th>
                      <th className="py-3 pl-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm">
                    {dailyRecords.map((rec) => (
                      <tr
                        key={rec.id}
                        onClick={() => setDetailRecord(rec)}
                        className="hover:bg-stone-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 pr-4">
                          <p className="font-semibold text-stone-900">{rec.employeeName}</p>
                          <p className="font-mono text-xs text-stone-500">{rec.employeeNip}</p>
                        </td>
                        <td className="py-3.5 px-3 text-xs text-stone-600 whitespace-nowrap">
                          {rec.division}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-xs font-semibold text-stone-900 whitespace-nowrap">
                          {formatTimestampTime(rec.checkInTime)}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-xs text-stone-600 whitespace-nowrap">
                          {rec.checkOutTime
                            ? `${formatTimestampTime(rec.checkOutTime)} (${formatDurationMinutes(rec.workDurationMinutes)})`
                            : 'Aktif'}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-xs text-stone-600 whitespace-nowrap">
                          {formatDistance(rec.checkInDistanceMeters)}
                        </td>
                        <td className="py-3.5 pl-3 text-xs font-semibold whitespace-nowrap">
                          <span
                            className={
                              rec.status === 'on_time'
                                ? 'text-[#0F4C3A]'
                                : rec.status === 'late'
                                  ? 'text-amber-800'
                                  : 'text-stone-700'
                            }
                          >
                            {STATUS_LABELS[rec.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {section === 'leave' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-stone-900">Pengajuan Izin & Cuti Karyawan</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Tinjau pengajuan karyawan dan berikan keputusan resmi.
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl self-start">
              <button
                type="button"
                onClick={() => setLeaveFilter('pending')}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  leaveFilter === 'pending'
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-600'
                }`}
              >
                Menunggu ({pendingLeavesCount})
              </button>
              <button
                type="button"
                onClick={() => setLeaveFilter('all')}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  leaveFilter === 'all' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                }`}
              >
                Semua ({allLeaveRequests.length})
              </button>
            </div>
          </div>

          {visibleLeaves.length === 0 ? (
            <div className="py-12 text-center border-t border-stone-100 text-sm text-stone-500">
              Tidak ada pengajuan izin pada kategori ini.
            </div>
          ) : (
            <div className="divide-y divide-stone-100 border-t border-stone-100">
              {visibleLeaves.map((req) => (
                <div key={req.id} className="py-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-stone-900">
                        {req.employeeName} · <span className="font-mono">{req.employeeNip}</span>
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {LEAVE_TYPE_LABELS[req.type]} · {req.division} ·{' '}
                        {formatDateKeyLabel(req.startDate)}
                        {req.endDate !== req.startDate
                          ? ` — ${formatDateKeyLabel(req.endDate)}`
                          : ''}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold shrink-0 ${
                        req.status === 'approved'
                          ? 'text-[#0F4C3A]'
                          : req.status === 'rejected'
                            ? 'text-red-700'
                            : 'text-amber-800'
                      }`}
                    >
                      {req.status === 'pending'
                        ? 'Menunggu Persetujuan'
                        : req.status === 'approved'
                          ? 'Disetujui'
                          : 'Ditolak'}
                    </span>
                  </div>

                  <p className="text-sm text-stone-700 bg-stone-50 rounded-xl p-3">{req.reason}</p>

                  {req.status === 'pending' ? (
                    <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                      <input
                        type="text"
                        maxLength={300}
                        value={reviewerNotes[req.id] ?? ''}
                        onChange={(e) =>
                          setReviewerNotes((prev) => ({ ...prev, [req.id]: e.target.value }))
                        }
                        placeholder="Catatan HRD (opsional)..."
                        className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30"
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={processingId === req.id}
                          onClick={() => void handleReviewLeave(req.id, 'approved')}
                          className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0F4C3A] text-white text-xs font-semibold hover:bg-[#0B3A2C] disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Setujui
                        </button>
                        <button
                          type="button"
                          disabled={processingId === req.id}
                          onClick={() => void handleReviewLeave(req.id, 'rejected')}
                          className="min-h-[42px] px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <X className="w-3.5 h-3.5" />
                          Tolak
                        </button>
                      </div>
                    </div>
                  ) : (
                    req.reviewerNote && (
                      <p className="text-xs text-stone-500">Catatan HRD: {req.reviewerNote}</p>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {section === 'settings' && (
        <form
          onSubmit={(e) => void handleSaveSettings(e)}
          className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-5 max-w-3xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-stone-900">
                Pengaturan Geofence & Jam Kerja
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Kalibrasi titik koordinat GPS Kantor Induk Kebun Kertamanah dan batas keterlambatan.
              </p>
            </div>
            <SlidersHorizontal className="w-5 h-5 text-stone-400 shrink-0" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="set-name" className="text-xs font-semibold text-stone-700 block">
                Nama Lokasi Kantor
              </label>
              <input
                id="set-name"
                type="text"
                required
                minLength={3}
                maxLength={120}
                value={officeName}
                onChange={(e) => setOfficeName(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="set-addr" className="text-xs font-semibold text-stone-700 block">
                Alamat Kantor
              </label>
              <input
                id="set-addr"
                type="text"
                required
                minLength={3}
                maxLength={200}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="set-lat" className="text-xs font-semibold text-stone-700 block">
                Latitude Kantor
              </label>
              <input
                id="set-lat"
                type="number"
                step="any"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="set-lng" className="text-xs font-semibold text-stone-700 block">
                Longitude Kantor
              </label>
              <input
                id="set-lng"
                type="number"
                step="any"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handleCalibrateGps}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-800 hover:bg-stone-100 flex items-center gap-2"
              >
                <LocateFixed className="w-4 h-4 text-[#0F4C3A]" />
                <span>Gunakan Koordinat GPS Saya Saat Ini</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="set-rad" className="text-xs font-semibold text-stone-700 block">
                Radius Geofence (Meter)
              </label>
              <input
                id="set-rad"
                type="number"
                min={20}
                max={5000}
                required
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="set-tol" className="text-xs font-semibold text-stone-700 block">
                Toleransi Terlambat (Menit)
              </label>
              <input
                id="set-tol"
                type="number"
                min={0}
                max={120}
                required
                value={lateTolerance}
                onChange={(e) => setLateTolerance(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="set-start" className="text-xs font-semibold text-stone-700 block">
                Jam Masuk (WIB)
              </label>
              <input
                id="set-start"
                type="time"
                required
                value={workStartTime}
                onChange={(e) => setWorkStartTime(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="set-end" className="text-xs font-semibold text-stone-700 block">
                Jam Pulang (WIB)
              </label>
              <input
                id="set-end"
                type="time"
                required
                value={workEndTime}
                onChange={(e) => setWorkEndTime(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer">
            <input
              type="checkbox"
              checked={strictGeofence}
              onChange={(e) => setStrictGeofence(e.target.checked)}
              className="mt-1 w-4 h-4 accent-[#0F4C3A]"
            />
            <span className="text-xs text-stone-700 leading-relaxed">
              <strong className="block text-stone-900">Wajibkan Radius untuk Absen Di Kantor</strong>
              Jika aktif, karyawan yang berada di luar radius tidak dapat absen mode Kantor dan harus memilih mode Dinas Luar.
            </span>
          </label>

          {settingsError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
              {settingsError}
            </div>
          )}

          {settingsSaved && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Pengaturan kantor berhasil diperbarui untuk semua karyawan.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={savingSettings}
            className="min-h-[48px] px-6 py-3 rounded-xl bg-[#0F4C3A] text-white text-sm font-semibold hover:bg-[#0B3A2C] disabled:opacity-60 transition-colors"
          >
            {savingSettings ? 'Menyimpan Pengaturan...' : 'Simpan Pengaturan Kantor'}
          </button>
        </form>
      )}

      <AttendanceDetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />
    </div>
  );
};
