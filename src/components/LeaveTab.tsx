import React, { useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle2, FileText, Trash2 } from 'lucide-react';
import { OperationType, db, handleFirestoreError } from '../lib/firebase';
import { formatDateKeyLabel, getJakartaDateKey } from '../lib/geo';
import type { EmployeeProfile, LeaveRequest, LeaveStatus, LeaveType } from '../types';

interface LeaveTabProps {
  profile: EmployeeProfile;
  requests: LeaveRequest[];
}

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  izin: 'Izin Pribadi',
  sakit: 'Sakit',
  cuti: 'Cuti Tahunan',
  dinas_luar: 'Surat Tugas / Dinas',
};

const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: 'Menunggu Persetujuan',
  approved: 'Disetujui HRD',
  rejected: 'Ditolak',
};

export const LeaveTab: React.FC<LeaveTabProps> = ({ profile, requests }) => {
  const todayKey = getJakartaDateKey(new Date());
  const [type, setType] = useState<LeaveType>('izin');
  const [startDate, setStartDate] = useState<string>(todayKey);
  const [endDate, setEndDate] = useState<string>(todayKey);
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanReason = reason.trim().slice(0, 500);
    if (cleanReason.length < 5) {
      setError('Alasan pengajuan minimal 5 karakter.');
      return;
    }
    if (endDate < startDate) {
      setError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }

    setSubmitting(true);
    const path = 'leaveRequests';
    try {
      await addDoc(collection(db, path), {
        uid: profile.uid,
        employeeName: profile.fullName.slice(0, 100),
        employeeNip: profile.nip.slice(0, 30),
        division: profile.division.slice(0, 60),
        type,
        startDate,
        endDate,
        reason: cleanReason,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setReason('');
      setSuccess('Pengajuan izin berhasil dikirim ke HRD Kebun Kertamanah.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (requestId: string) => {
    const path = `leaveRequests/${requestId}`;
    try {
      await deleteDoc(doc(db, 'leaveRequests', requestId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Form Pengajuan */}
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4"
      >
        <div>
          <p className="text-xs font-medium text-stone-500">Formulir Administrasi</p>
          <h2 className="text-lg font-bold text-stone-900 mt-0.5">Ajukan Izin / Cuti</h2>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="leave-type" className="text-xs font-semibold text-stone-700 block">
            Jenis Pengajuan
          </label>
          <select
            id="leave-type"
            value={type}
            onChange={(e) => setType(e.target.value as LeaveType)}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30 focus:border-[#0F4C3A]"
          >
            {Object.entries(LEAVE_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="leave-start" className="text-xs font-semibold text-stone-700 block">
              Tanggal Mulai
            </label>
            <input
              id="leave-start"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-stone-300 text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30 focus:border-[#0F4C3A]"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="leave-end" className="text-xs font-semibold text-stone-700 block">
              Tanggal Selesai
            </label>
            <input
              id="leave-end"
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-stone-300 text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30 focus:border-[#0F4C3A]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="leave-reason" className="text-xs font-semibold text-stone-700 block">
            Alasan / Keterangan Lengkap
          </label>
          <textarea
            id="leave-reason"
            rows={3}
            required
            minLength={5}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Jelaskan keperluan izin, sakit, atau surat tugas Anda..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#0F4C3A]/30 focus:border-[#0F4C3A]"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#0F4C3A] text-white text-sm font-semibold hover:bg-[#0B3A2C] disabled:opacity-60 transition-colors"
        >
          {submitting ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan'}
        </button>
      </form>

      {/* Daftar Pengajuan */}
      <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Status Pengajuan Anda</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Pantau persetujuan dari HRD / Kepala Tata Usaha Kebun Kertamanah.
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="py-12 text-center space-y-2 border-t border-stone-100">
            <FileText className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-sm font-medium text-stone-700">Belum ada pengajuan izin</p>
            <p className="text-xs text-stone-500">
              Riwayat izin, sakit, dan cuti Anda akan tampil di sini.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 border-t border-stone-100">
            {requests.map((req) => (
              <div key={req.id} className="py-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-stone-900">
                      {LEAVE_TYPE_LABELS[req.type]}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {formatDateKeyLabel(req.startDate)}
                      {req.endDate !== req.startDate ? ` — ${formatDateKeyLabel(req.endDate)}` : ''}
                      <span aria-hidden="true"> · </span>
                      <span
                        className={
                          req.status === 'approved'
                            ? 'font-semibold text-[#0F4C3A]'
                            : req.status === 'rejected'
                              ? 'font-semibold text-red-700'
                              : 'font-semibold text-amber-800'
                        }
                      >
                        {LEAVE_STATUS_LABELS[req.status]}
                      </span>
                    </p>
                  </div>

                  {req.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => void handleCancel(req.id)}
                      className="min-h-[36px] px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 flex items-center gap-1 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Batalkan</span>
                    </button>
                  )}
                </div>

                <p className="text-xs text-stone-700 leading-relaxed">{req.reason}</p>

                {req.reviewerNote && (
                  <p className="text-xs text-stone-600 bg-stone-50 rounded-xl px-3 py-2">
                    Catatan HRD: {req.reviewerNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
