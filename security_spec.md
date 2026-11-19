# Security Specification & Payload-First TDD — KertaHadir (PTPN Kertamanah)

## 1. Data Invariants
1. **Identity Integrity**: Every employee profile (`/employees/{uid}`), attendance record (`/attendance/{recordId}`), and leave request (`/leaveRequests/{requestId}`) MUST store `uid == request.auth.uid` on creation, and `uid` is immutable thereafter.
2. **Email Verification & No Unauthenticated Access**: All reads and writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **Privilege Escalation Prevention**: Non-admin employees CANNOT self-assign `role: 'admin'` in `/employees/{uid}`, cannot write to `/admins/{uid}`, and cannot modify `/settings/office`.
4. **Master Gate Relational Integrity**: Creating an `/attendance/{recordId}` or `/leaveRequests/{requestId}` requires an existing `/employees/{request.auth.uid}` profile document.
5. **Terminal State Locking**:
   - An `/attendance/{recordId}` record cannot be checked out twice (`!('checkOutTime' in existing())`) by a non-admin employee, nor can `checkInTime`, `uid`, or `dateKey` be altered after creation.
   - A `/leaveRequests/{requestId}` record with `status != 'pending'` (`approved` or `rejected`) is locked against non-admin updates.
6. **Temporal Integrity**: All `createdAt`, `updatedAt`, `checkInTime`, and `checkOutTime` timestamps MUST equal `request.time`.
7. **PII Isolation & Query Enforcement**: Employee emails in `/employees/{uid}` are readable only by the owner (`uid == request.auth.uid`) or HRD admin. All `allow list` rules explicitly enforce `resource.data.uid == request.auth.uid` for non-admins without `get()`/`exists()` DB calls.
8. **Payload Size & Path Hardening**: Every document ID matches `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), and every string enforces strict `.size()` bounds.

## 2. The "Dirty Dozen" Attack Payloads
1. **Unverified Email Spoof**: Signed-in user with `email: 'frogica36@gmail.com'` but `email_verified: false` attempts to read `/employees` or write `/settings/office`. -> `PERMISSION_DENIED`.
2. **Self-Assigned Admin Role**: Employee creates `/employees/{uid}` with `role: 'admin'`. -> `PERMISSION_DENIED`.
3. **Shadow Field Injection (Ghost Field)**: Employee creates `/attendance/{recordId}` with an extra field `isAdminApproved: true`. -> `PERMISSION_DENIED`.
4. **Cross-User Attendance Forgery**: Employee A (`uid_A`) tries to create `/attendance/uid_B_2026-11-19` with `uid: 'uid_B'`. -> `PERMISSION_DENIED`.
5. **Orphan Attendance Write**: Authenticated user without `/employees/{uid}` profile tries to create `/attendance/{recordId}`. -> `PERMISSION_DENIED`.
6. **Client Timestamp Forgery**: Employee sends `checkInTime` backdated by 2 hours instead of `request.time`. -> `PERMISSION_DENIED`.
7. **Double Check-Out / Check-In Rewrite**: Employee updates an already checked-out `/attendance/{recordId}` or alters `checkInTime`/`status` during check-out. -> `PERMISSION_DENIED`.
8. **Self-Approved Leave Request**: Employee creates `/leaveRequests/{id}` with `status: 'approved'` instead of `'pending'`. -> `PERMISSION_DENIED`.
9. **Terminal Leave State Tampering**: Employee modifies a `'rejected'` leave request back to `'pending'`. -> `PERMISSION_DENIED`.
10. **PII Blanket Read / List Scraping**: Employee A attempts `get(/employees/uid_B)` or `list(/employees)`. -> `PERMISSION_DENIED`.
11. **Value Poisoning / 1MB String Exhaustion**: Employee submits a 200KB string in `checkInNote` or a 1.5KB junk `recordId`. -> `PERMISSION_DENIED`.
12. **Unauthorized Office Settings Tampering**: Non-admin employee attempts to update `/settings/office` radius to `999999` meters. -> `PERMISSION_DENIED`.
