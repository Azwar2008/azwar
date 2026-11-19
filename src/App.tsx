import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import {
  CalendarCheck,
  Clock,
  FileText,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import {
  ADMIN_EMAIL,
  OperationType,
  auth,
  db,
  handleFirestoreError,
} from './lib/firebase';
import { getJakartaDateKey } from './lib/geo';
import {
  DEFAULT_OFFICE_SETTINGS,
  type AttendanceRecord,
  type EmployeeProfile,
  type LeaveRequest,
  type NavTab,
  type OfficeSettings,
} from './types';
import { AdminTab } from './components/AdminTab';
import { AuthOnboardingView } from './components/AuthOnboardingView';
import { CheckInTab } from './components/CheckInTab';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HistoryTab } from './components/HistoryTab';
import { LeaveTab } from './components/LeaveTab';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ProfileTab } from './components/ProfileTab';

function AppShell() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [office, setOffice] = useState<OfficeSettings>(DEFAULT_OFFICE_SETTINGS);

  const [myAttendance, setMyAttendance] = useState<AttendanceRecord[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);

  const [activeTab, setActiveTab] = useState<NavTab>('absen');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setProfile(null);
        setProfileLoading(false);
      } else {
        setProfileLoading(true);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to employee profile & office settings once authenticated
  useEffect(() => {
    if (!user) return;

    const empPath = `employees/${user.uid}`;
    const unsubEmp = onSnapshot(
      doc(db, 'employees', user.uid),
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as EmployeeProfile);
        } else {
          setProfile(null);
        }
        setProfileLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, empPath);
      },
    );

    const officePath = 'settings/office';
    const unsubOffice = onSnapshot(
      doc(db, 'settings', 'office'),
      (snap) => {
        if (snap.exists()) {
          setOffice(snap.data() as OfficeSettings);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, officePath);
      },
    );

    return () => {
      unsubEmp();
      unsubOffice();
    };
  }, [user]);

  const isBootstrappedAdmin = Boolean(
    user?.email === ADMIN_EMAIL && user?.emailVerified,
  );
  const isAdmin = isBootstrappedAdmin || profile?.role === 'admin';

  // Subscribe to personal attendance and leave requests once profile exists
  useEffect(() => {
    if (!user || !profile) {
      setMyAttendance([]);
      setMyLeaves([]);
      return;
    }

    const attPath = 'attendance';
    const attQuery = query(collection(db, attPath), where('uid', '==', user.uid));
    const unsubAtt = onSnapshot(
      attQuery,
      (snap) => {
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<AttendanceRecord, 'id'>) }))
          .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
        setMyAttendance(rows);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, attPath);
      },
    );

    const leavePath = 'leaveRequests';
    const leaveQuery = query(collection(db, leavePath), where('uid', '==', user.uid));
    const unsubLeave = onSnapshot(
      leaveQuery,
      (snap) => {
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<LeaveRequest, 'id'>) }))
          .sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() ?? 0;
            const tb = b.createdAt?.toMillis?.() ?? 0;
            return tb - ta;
          });
        setMyLeaves(rows);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, leavePath);
      },
    );

    return () => {
      unsubAtt();
      unsubLeave();
    };
  }, [user, profile]);

  // Subscribe to all attendance & leave requests for bootstrapped HRD admin
  useEffect(() => {
    if (!user || !profile || !isBootstrappedAdmin) {
      setAllAttendance([]);
      setAllLeaves([]);
      return;
    }

    const unsubAllAtt = onSnapshot(
      collection(db, 'attendance'),
      (snap) => {
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<AttendanceRecord, 'id'>) }))
          .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
        setAllAttendance(rows);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'attendance');
      },
    );

    const unsubAllLeave = onSnapshot(
      collection(db, 'leaveRequests'),
      (snap) => {
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<LeaveRequest, 'id'>) }))
          .sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() ?? 0;
            const tb = b.createdAt?.toMillis?.() ?? 0;
            return tb - ta;
          });
        setAllLeaves(rows);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'leaveRequests');
      },
    );

    return () => {
      unsubAllAtt();
      unsubAllLeave();
    };
  }, [user, profile, isBootstrappedAdmin]);

  const todayKey = getJakartaDateKey(new Date());
  const todayRecord = useMemo(
    () => myAttendance.find((r) => r.dateKey === todayKey) ?? null,
    [myAttendance, todayKey],
  );

  if (!authReady || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-[#F6F7F5] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="font-display text-lg font-bold text-[#0F4C3A]">KertaHadir</p>
          <p className="text-xs text-stone-500">Memuat data presensi PTPN Kertamanah...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <>
        <AuthOnboardingView user={user} onProfileCreated={() => {}} />
        <OfflineIndicator />
      </>
    );
  }

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'absen', label: 'Absen', icon: Clock },
    { id: 'riwayat', label: 'Riwayat', icon: CalendarCheck },
    { id: 'izin', label: 'Izin', icon: FileText },
    { id: 'profil', label: 'Profil', icon: UserIcon },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Admin HRD', icon: ShieldCheck });
  }

  return (
    <div className="min-h-screen bg-[#F6F7F5] flex flex-col">
      {/* Top Navigation Bar: 3-zone contract on desktop, compact 52px on mobile */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[52px] lg:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line brand wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('absen')}
            className="font-display text-lg font-extrabold tracking-tight text-[#0F4C3A] whitespace-nowrap shrink-0"
          >
            KertaHadir
          </button>

          {/* Zone 2: Desktop single-line nav links */}
          <nav className="hidden lg:flex items-center gap-7" aria-label="Navigasi utama">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-[#0F4C3A] text-stone-900 font-semibold'
                      : 'border-transparent text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single primary contextual action */}
          <div className="flex items-center shrink-0">
            <PWAInstallButton variant="header" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-24 lg:pb-10">
        {activeTab === 'absen' && (
          <CheckInTab profile={profile} office={office} todayRecord={todayRecord} />
        )}
        {activeTab === 'riwayat' && <HistoryTab records={myAttendance} />}
        {activeTab === 'izin' && <LeaveTab profile={profile} requests={myLeaves} />}
        {activeTab === 'profil' && <ProfileTab profile={profile} isAdmin={isAdmin} />}
        {activeTab === 'admin' && isAdmin && (
          <AdminTab
            profile={profile}
            office={office}
            allAttendance={isBootstrappedAdmin ? allAttendance : myAttendance}
            allLeaveRequests={isBootstrappedAdmin ? allLeaves : myLeaves}
          />
        )}
      </main>

      {/* Mobile Bottom Tab Bar (Thumb Zone, compact <= 60px + safe area) */}
      <nav
        aria-label="Navigasi seluler"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 pb-safe"
      >
        <div
          className={`grid h-[60px] items-center ${
            navItems.length === 5 ? 'grid-cols-5' : 'grid-cols-4'
          }`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
                  active ? 'text-[#0F4C3A]' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
