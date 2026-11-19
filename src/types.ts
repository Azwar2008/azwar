import type { Timestamp } from 'firebase/firestore';

export const DIVISIONS = [
  'Tata Usaha & SDM',
  'Tanaman & Lapangan',
  'Teknik & Pengolahan',
  'Keuangan & Akuntansi',
  'Keamanan',
  'Umum & Aset',
] as const;

export type Division = (typeof DIVISIONS)[number];

export type UserRole = 'employee' | 'admin';

export interface EmployeeProfile {
  uid: string;
  email: string;
  fullName: string;
  nip: string;
  division: Division;
  position: string;
  role: UserRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OfficeSettings {
  officeName: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  workStartTime: string;
  workEndTime: string;
  lateToleranceMinutes: number;
  strictGeofence: boolean;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

export const DEFAULT_OFFICE_SETTINGS: OfficeSettings = {
  officeName: 'Kantor Induk Kebun Kertamanah',
  address: 'Desa Margamukti, Kec. Pangalengan, Kab. Bandung, Jawa Barat',
  latitude: -7.1753,
  longitude: 107.6062,
  radiusMeters: 150,
  workStartTime: '07:00',
  workEndTime: '16:00',
  lateToleranceMinutes: 15,
  strictGeofence: false,
};

export type AttendanceLocationType = 'office' | 'field_duty';
export type AttendanceStatus = 'on_time' | 'late' | 'field_duty';

export interface AttendanceRecord {
  id: string;
  uid: string;
  employeeName: string;
  employeeNip: string;
  division: string;
  dateKey: string;
  checkInTime: Timestamp;
  checkInLat: number;
  checkInLng: number;
  checkInDistanceMeters: number;
  checkInPhoto: string;
  checkInLocationType: AttendanceLocationType;
  checkInNote: string;
  status: AttendanceStatus;
  checkOutTime?: Timestamp;
  checkOutLat?: number;
  checkOutLng?: number;
  checkOutDistanceMeters?: number;
  checkOutPhoto?: string;
  checkOutNote?: string;
  workDurationMinutes?: number;
  updatedAt: Timestamp;
}

export type LeaveType = 'izin' | 'sakit' | 'cuti' | 'dinas_luar';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  uid: string;
  employeeName: string;
  employeeNip: string;
  division: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  reviewerUid?: string;
  reviewerNote?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type NavTab = 'absen' | 'riwayat' | 'izin' | 'profil' | 'admin';
