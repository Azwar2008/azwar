import React from 'react';
import { Clock, MapPin, UserCheck, X } from 'lucide-react';
import {
  formatDateKeyLabel,
  formatDistance,
  formatDurationMinutes,
  formatTimestampTime,
} from '../lib/geo';
import type { AttendanceRecord } from '../types';

interface AttendanceDetailModalProps {
  record: AttendanceRecord | null;
  onClose: () => void;
}

const STATUS_LABELS: Record<AttendanceRecord['status'], string> = {
  on_time: 'Tepat Waktu',
  late: 'Terlambat',
  field_duty: 'Dinas Luar / Lapangan',
};

export const AttendanceDetailModal: React.FC<AttendanceDetailModalProps> = ({
  record,
  onClose,
}) => {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl border border-stone-200 p-6 max-h-[90vh] overflow-y-auto space-y-5">
        <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto sm:hidden" />

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-stone-500">
              {formatDateKeyLabel(record.dateKey)} · {STATUS_LABELS[record.status]}
            </p>
            <h3 className="text-lg font-bold text-stone-900 mt-0.5 truncate">
              {record.employeeName}
            </h3>
            <p className="text-xs text-stone-500 font-mono mt-0.5">
              NIP {record.employeeNip} · {record.division}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail absensi"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="divide-y divide-stone-100 border-t border-b border-stone-100">
          <div className="py-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0F4C3A]" />
                Absen Masuk
              </span>
              <span className="text-sm font-bold font-mono text-stone-900">
                {formatTimestampTime(record.checkInTime)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-stone-600">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Jarak Lokasi
              </span>
              <span className="font-mono">
                {formatDistance(record.checkInDistanceMeters)} ({record.checkInLat.toFixed(5)},{' '}
                {record.checkInLng.toFixed(5)})
              </span>
            </div>
            {record.checkInNote && (
              <p className="text-xs text-stone-700 bg-stone-50 rounded-xl p-3">
                Catatan Masuk: {record.checkInNote}
              </p>
            )}
            {record.checkInPhoto && (
              <img
                src={record.checkInPhoto}
                alt="Swafoto absen masuk"
                className="w-24 h-24 rounded-xl object-cover border border-stone-200"
              />
            )}
          </div>

          <div className="py-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-stone-700" />
                Absen Pulang
              </span>
              <span className="text-sm font-bold font-mono text-stone-900">
                {record.checkOutTime ? formatTimestampTime(record.checkOutTime) : 'Belum Absen Pulang'}
              </span>
            </div>
            {record.checkOutTime && (
              <>
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <span>Durasi Kerja</span>
                  <span className="font-mono font-semibold text-stone-900">
                    {formatDurationMinutes(record.workDurationMinutes)}
                  </span>
                </div>
                {record.checkOutDistanceMeters !== undefined && (
                  <div className="flex items-center justify-between text-xs text-stone-600">
                    <span>Jarak Pulang</span>
                    <span className="font-mono">
                      {formatDistance(record.checkOutDistanceMeters)}
                    </span>
                  </div>
                )}
                {record.checkOutNote && (
                  <p className="text-xs text-stone-700 bg-stone-50 rounded-xl p-3">
                    Catatan Pulang: {record.checkOutNote}
                  </p>
                )}
                {record.checkOutPhoto && (
                  <img
                    src={record.checkOutPhoto}
                    alt="Swafoto absen pulang"
                    className="w-24 h-24 rounded-xl object-cover border border-stone-200"
                  />
                )}
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
