import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Clock } from 'lucide-react';
import {
  formatDateKeyLabel,
  formatDistance,
  formatDurationMinutes,
  formatTimestampTime,
} from '../lib/geo';
import type { AttendanceRecord, AttendanceStatus } from '../types';
import { AttendanceDetailModal } from './AttendanceDetailModal';

interface HistoryTabProps {
  records: AttendanceRecord[];
}

type StatusFilter = 'all' | AttendanceStatus;

const STATUS_TEXT: Record<AttendanceStatus, string> = {
  on_time: 'Tepat Waktu',
  late: 'Terlambat',
  field_duty: 'Dinas Luar',
};

export const HistoryTab: React.FC<HistoryTabProps> = ({ records }) => {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  const stats = useMemo(() => {
    const total = records.length;
    const onTime = records.filter((r) => r.status === 'on_time').length;
    const late = records.filter((r) => r.status === 'late').length;
    const fieldDuty = records.filter((r) => r.status === 'field_duty').length;
    return { total, onTime, late, fieldDuty };
  }, [records]);

  const filtered = useMemo(() => {
    if (filter === 'all') return records;
    return records.filter((r) => r.status === filter);
  }, [records, filter]);

  return (
    <div className="space-y-5">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-stone-500">Total Kehadiran</p>
          <p className="font-mono text-2xl font-bold text-stone-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-stone-500">Tepat Waktu</p>
          <p className="font-mono text-2xl font-bold text-[#0F4C3A] mt-1">{stats.onTime}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-stone-500">Terlambat</p>
          <p className="font-mono text-2xl font-bold text-amber-800 mt-1">{stats.late}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-stone-500">Dinas Luar</p>
          <p className="font-mono text-2xl font-bold text-stone-800 mt-1">{stats.fieldDuty}</p>
        </div>
      </div>

      {/* Filter & List Container */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Riwayat Kehadiran</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Ketuk salah satu baris untuk melihat rincian koordinat GPS dan swafoto.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl overflow-x-auto">
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'on_time', label: 'Tepat Waktu' },
                { id: 'late', label: 'Terlambat' },
                { id: 'field_duty', label: 'Dinas Luar' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  filter === tab.id
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2 border-t border-stone-100">
            <CalendarDays className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-sm font-medium text-stone-700">Belum ada catatan kehadiran</p>
            <p className="text-xs text-stone-500">
              Data absensi yang tercatat akan muncul otomatis di daftar ini.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 border-t border-stone-100">
            {filtered.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => setSelectedRecord(record)}
                className="w-full min-h-[64px] py-3.5 px-2 -mx-2 rounded-xl hover:bg-stone-50 transition-colors flex items-center justify-between gap-4 text-left"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-900 truncate">
                      {formatDateKeyLabel(record.dateKey)}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5 truncate">
                      <span
                        className={
                          record.status === 'on_time'
                            ? 'font-semibold text-[#0F4C3A]'
                            : record.status === 'late'
                              ? 'font-semibold text-amber-800'
                              : 'font-semibold text-stone-700'
                        }
                      >
                        {STATUS_TEXT[record.status]}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span>Jarak {formatDistance(record.checkInDistanceMeters)}</span>
                      {record.workDurationMinutes !== undefined && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span>{formatDurationMinutes(record.workDurationMinutes)}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-mono text-xs font-semibold text-stone-900">
                      {formatTimestampTime(record.checkInTime)}
                    </p>
                    <p className="font-mono text-xs text-stone-500 mt-0.5">
                      {record.checkOutTime ? formatTimestampTime(record.checkOutTime) : 'Aktif'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <AttendanceDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </div>
  );
};
