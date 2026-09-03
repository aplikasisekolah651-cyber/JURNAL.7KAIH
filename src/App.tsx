import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { SchoolProvider, useSchoolSettings } from './context/SchoolContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { JournalProvider, useJournal } from './context/JournalContext';
import { NavigationProvider, useNavigation, ADMIN_TAB_TO_PATH } from './context/NavigationContext';
import { Header } from './components/common/Header';
import { LoginScreen } from './components/auth/LoginScreen';
import { StudentDashboard } from './components/student/StudentDashboard';
import { ParentDashboard } from './components/parent/ParentDashboard';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { HABIT_LIST } from './lib/constants';
import { HabitIcon } from './components/common/HabitIcon';
import { BellRing, X, Check, ShieldCheck, Heart, Sparkles } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const { activeReminderHabit, dismissReminder } = useJournal();
  const { schoolSettings } = useSchoolSettings();
  const { routeInfo, navigate, intendedPath, clearIntendedPath } = useNavigation();
  const [selectedStudentDate, setSelectedStudentDate] = useState<string | undefined>(undefined);

  // Sync URL with User's Role & intended path upon authentication
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    // If user arrived with an intended path that matches their role:
    if (intendedPath) {
      const lower = intendedPath.toLowerCase();
      const isAdminPath = lower === '/admin' || lower.startsWith('/admin/');
      const isSiswaPath = lower === '/siswa' || lower.startsWith('/siswa/');
      const isParentPath = lower === '/orangtua' || lower.startsWith('/orangtua/');
      const isTeacherPath = lower === '/walikelas' || lower.startsWith('/walikelas/') || lower === '/guru' || lower.startsWith('/guru/');

      if (
        (currentUser.role === 'admin' && isAdminPath) ||
        (currentUser.role === 'siswa' && isSiswaPath) ||
        (currentUser.role === 'orangtua' && isParentPath) ||
        (currentUser.role === 'walikelas' && isTeacherPath)
      ) {
        navigate(intendedPath, { replace: true });
        clearIntendedPath();
        return;
      }
    }

    // Default route assignment if on root or login or unmatched path
    const currentLower = window.location.pathname.toLowerCase();
    if (currentLower === '/' || currentLower === '/login' || currentLower === '') {
      if (currentUser.role === 'siswa') navigate('/siswa', { replace: true });
      else if (currentUser.role === 'orangtua') navigate('/orangtua', { replace: true });
      else if (currentUser.role === 'walikelas') navigate('/walikelas', { replace: true });
      else if (currentUser.role === 'admin') navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, currentUser, intendedPath, navigate, clearIntendedPath]);

  // Document Title synchronization
  useEffect(() => {
    let title = `${schoolSettings.name || 'Jurnal 7 KAIH'} - Kebiasaan Anak Indonesia Hebat`;
    if (!isAuthenticated) {
      if (routeInfo.roleRoute === 'admin') {
        title = `Login Admin • ${schoolSettings.name}`;
      } else {
        title = `Login • ${schoolSettings.name}`;
      }
    } else if (currentUser) {
      if (currentUser.role === 'admin') {
        const tabNames: Record<string, string> = {
          overview: 'Ringkasan Sistem',
          students: 'Data Siswa',
          parents: 'Data Orang Tua',
          teachers: 'Data Guru & Wali Kelas',
          journals: 'Monitoring Jurnal',
          reports: 'Rekap & Laporan',
          import: 'Import Data Siswa',
          credentials: 'Kartu Akun & Sandi',
          settings: 'Pengaturan Sekolah',
          database: 'Database & Keamanan',
        };
        const currentTab = routeInfo.adminTab || 'overview';
        title = `${tabNames[currentTab] || 'Admin'} • ${schoolSettings.name}`;
      } else if (currentUser.role === 'siswa') {
        title = `Jurnal Siswa • ${currentUser.name}`;
      } else if (currentUser.role === 'orangtua') {
        title = `Portal Orang Tua • ${schoolSettings.name}`;
      } else if (currentUser.role === 'walikelas') {
        title = `Dashboard Wali Kelas • ${schoolSettings.name}`;
      }
    }
    document.title = title;
  }, [routeInfo, isAuthenticated, currentUser, schoolSettings]);

  if (!isAuthenticated || !currentUser) {
    return <LoginScreen />;
  }

  const activeHabitDef = activeReminderHabit 
    ? HABIT_LIST.find(h => h.id === activeReminderHabit) 
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Top Navigation Header */}
      <Header onSelectDate={(d) => setSelectedStudentDate(d)} />

      {/* Main Content Area */}
      <main className="flex-1 w-full mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 pt-4 pb-8">
        {currentUser.role === 'siswa' && (
          <StudentDashboard initialDate={selectedStudentDate} />
        )}
        {currentUser.role === 'orangtua' && (
          <ParentDashboard />
        )}
        {currentUser.role === 'walikelas' && (
          <TeacherDashboard />
        )}
        {currentUser.role === 'admin' && (
          <AdminDashboard />
        )}
      </main>

      {/* Active Alarm / Reminder Floating Alert */}
      {activeHabitDef && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full p-3 bg-white dark:bg-[#1E293B] border border-indigo-500 rounded-xl shadow-xl animate-in slide-in-from-bottom-5 duration-300 flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <div className={`p-2 rounded-lg ${activeHabitDef.badgeBg} shrink-0`}>
              <HabitIcon habitId={activeHabitDef.id} size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">
                <BellRing className="w-3 h-3 animate-bounce" />
                <span>Pengingat Otomatis 7 KAIH</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                Waktunya: {activeHabitDef.title}
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                {activeHabitDef.tagline}
              </p>
            </div>
          </div>
          <button
            onClick={dismissReminder}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-[#0F172A]/80 py-3.5 transition-colors">
        <div className="w-full mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-[9px]">
              7K
            </div>
            <span className="text-[11px]">
              <strong>Jurnal 7 KAIH</strong> • Kebiasaan Anak Indonesia Hebat
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3 h-3" /> Enkripsi End-to-End Aktif
            </span>
            <span>•</span>
            <span>{schoolSettings.name}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <SchoolProvider>
        <AuthProvider>
          <JournalProvider>
            <NavigationProvider>
              <MainLayout />
            </NavigationProvider>
          </JournalProvider>
        </AuthProvider>
      </SchoolProvider>
    </ThemeProvider>
  );
}

