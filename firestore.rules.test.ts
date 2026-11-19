/**
 * Security Rules Specification Verification Suite (Dirty Dozen Payloads)
 * Intended for execution with @firebase/rules-unit-testing against a local Firestore emulator.
 */

export interface SecurityTestCase {
  id: string;
  title: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expected: 'PERMISSION_DENIED';
  payload: Record<string, unknown>;
}

export const dirtyDozenSecurityCases: SecurityTestCase[] = [
  {
    id: 'DD-01',
    title: 'Unverified admin email spoof attempting settings write',
    collection: 'settings/office',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: { email: 'frogica36@gmail.com', email_verified: false, radiusMeters: 5000 },
  },
  {
    id: 'DD-02',
    title: 'Employee self-assigning admin role on profile creation',
    collection: 'employees/emp_01',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { uid: 'emp_01', role: 'admin', fullName: 'Budi Santoso', nip: '19880101', division: 'Tata Usaha & SDM', position: 'Staf' },
  },
  {
    id: 'DD-03',
    title: 'Shadow field injection on attendance check-in',
    collection: 'attendance/emp_01_2026-11-19',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { uid: 'emp_01', dateKey: '2026-11-19', status: 'on_time', isVerifiedBypass: true },
  },
  {
    id: 'DD-04',
    title: 'Cross-user attendance forgery',
    collection: 'attendance/emp_02_2026-11-19',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { uid: 'emp_02', dateKey: '2026-11-19', status: 'on_time' },
  },
  {
    id: 'DD-05',
    title: 'Orphan attendance creation without registered employee profile',
    collection: 'attendance/orphan_01_2026-11-19',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { uid: 'orphan_01', dateKey: '2026-11-19', status: 'on_time' },
  },
  {
    id: 'DD-06',
    title: 'Client-side backdated timestamp forgery on checkInTime',
    collection: 'attendance/emp_01_2026-11-19',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { uid: 'emp_01', checkInTime: '2026-11-19T06:50:00Z' },
  },
  {
    id: 'DD-07',
    title: 'Modifying immutable checkInTime or double check-out',
    collection: 'attendance/emp_01_2026-11-19',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: { status: 'on_time', checkOutNote: 'Overwrite after checkout' },
  },
  {
    id: 'DD-08',
    title: 'Self-approved leave request on creation',
    collection: 'leaveRequests/req_01',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { uid: 'emp_01', type: 'cuti', status: 'approved', reason: 'Cuti tahunan' },
  },
  {
    id: 'DD-09',
    title: 'Mutating terminal rejected leave request back to pending',
    collection: 'leaveRequests/req_01',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: { status: 'pending', reason: 'Reopen rejected request' },
  },
  {
    id: 'DD-10',
    title: 'PII blanket read of another employee profile',
    collection: 'employees/emp_02',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    payload: {},
  },
  {
    id: 'DD-11',
    title: 'Oversized payload poisoning in checkInNote',
    collection: 'attendance/emp_01_2026-11-19',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { uid: 'emp_01', checkInNote: 'A'.repeat(2000) },
  },
  {
    id: 'DD-12',
    title: 'Non-admin modifying office geofence coordinates',
    collection: 'settings/office',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: { radiusMeters: 9999, strictGeofence: false },
  },
];
