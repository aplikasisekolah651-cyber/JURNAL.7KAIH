import React, { useState, useMemo } from 'react';
import { 
  Heart, 
  CheckCircle2, 
  Star, 
  Calendar, 
  FileDown, 
  Send, 
  MessageSquare, 
  Award, 
  Clock, 
  Sparkles,
  ChevronRight,
  TrendingUp,
  BarChart3,
  CheckCheck,
  AlertCircle,
  BookOpen,
  Apple,
  Users,
  Moon,
  Sun,
  Dumbbell,
  HeartHandshake,
  ShieldCheck,
  Filter,
  Check,
  X,
  MessageCircle,
  Save,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useJournal } from '../../context/JournalContext';
import { useSchoolSettings } from '../../context/SchoolContext';
import { HABIT_LIST, KATEGORI_CONFIG } from '../../lib/constants';
import { HabitIcon } from '../common/HabitIcon';
import { E2EEBadge } from '../common/E2EEBadge';
import { PDFReportGenerator } from '../../lib/pdfGenerator';
import { audioNotifier } from '../../lib/audioNotifier';
import { getDateString } from '../../lib/mockData';
import { HabitId } from '../../types';
import { UserAvatar } from '../common/UserAvatar';

export const ParentDashboard: React.FC = () => {
  const { currentUser, allUsers } = useAuth();
  const { schoolSettings } = useSchoolSettings();
  const { 
    journals, 
    getStudentJournals, 
    getStudentStats,
    getStudentJournalByDate,
    verifyHabitByParent
  } = useJournal();

  // Active Tab: 'validation' (Daily 7 KAIH Review) vs 'progress' (Child Progress & Analytics) vs 'history' (Past Logs)
  const [activeTab, setActiveTab] = useState<'validation' | 'progress' | 'history'>('validation');

  // Find students linked to this parent
  const linkedStudents = allUsers.filter(u => 
    u.role === 'siswa' && (u.parentId === currentUser?.id || currentUser?.studentIds?.includes(u.id))
  );
  
  // Default to first student or first available student if unlinked demo
  const fallbackStudent = allUsers.find(u => u.role === 'siswa');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    linkedStudents[0]?.id || fallbackStudent?.id || ''
  );

  const currentStudent = allUsers.find(u => u.id === selectedStudentId) || fallbackStudent;
  const studentEntries = useMemo(() => {
    return currentStudent ? getStudentJournals(currentStudent.id) : [];
  }, [currentStudent, journals]);

  const stats = useMemo(() => {
    return currentStudent ? getStudentStats(currentStudent.id) : null;
  }, [currentStudent, journals]);

  // Selected date for daily review (default to today)
  const [selectedDate, setSelectedDate] = useState<string>(() => getDateString(0));
  const currentJournal = useMemo(() => {
    if (!currentStudent) return undefined;
    return getStudentJournalByDate(currentStudent.id, selectedDate) || 
      studentEntries.find(e => e.date === selectedDate);
  }, [currentStudent, selectedDate, studentEntries]);

  // Reason draft states per habit
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [activeReasonInput, setActiveReasonInput] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  // Quick preset reason options
  const presetReasons = [
    'Belum sempat dilakukan di rumah',
    'Terlalu larut malam / asyik bermain',
    'Bangun kesiangan / belum disiplin',
    'Lupa / perlu bimbingan mandiri',
    'Tidak sesuai dengan fakta di rumah'
  ];

  // Handler for single habit confirmation (Benar or Tidak)
  const handleConfirmHabit = async (habitId: HabitId, status: 'valid' | 'invalid') => {
    if (!currentJournal || !currentUser) return;
    setIsSaving(habitId);

    if (status === 'invalid') {
      setActiveReasonInput(habitId);
      const existingReason = reasonDrafts[habitId] || currentJournal.parentValidation?.habitVerifications?.[habitId]?.reason || '';
      await verifyHabitByParent(
        currentJournal.id,
        habitId,
        'invalid',
        currentUser,
        existingReason || 'Tidak dilaksanakan di rumah'
      );
      audioNotifier.playReminderChime();
    } else {
      setActiveReasonInput(null);
      await verifyHabitByParent(
        currentJournal.id,
        habitId,
        'valid',
        currentUser,
        ''
      );
      audioNotifier.playSuccessChime();
    }
    setIsSaving(null);
  };

  // Handler to save written reason for 'Tidak'
  const handleSaveReason = async (habitId: HabitId) => {
    if (!currentJournal || !currentUser) return;
    const reasonText = (reasonDrafts[habitId] || '').trim() || 'Tidak dilaksanakan di rumah';
    setIsSaving(habitId);
    await verifyHabitByParent(
      currentJournal.id,
      habitId,
      'invalid',
      currentUser,
      reasonText
    );
    audioNotifier.playSuccessChime();
    setIsSaving(null);
  };

  // Handler for preset chip click
  const handleSetReasonPreset = async (habitId: HabitId, presetText: string) => {
    setReasonDrafts(prev => ({ ...prev, [habitId]: presetText }));
    if (!currentJournal || !currentUser) return;
    setIsSaving(habitId);
    await verifyHabitByParent(
      currentJournal.id,
      habitId,
      'invalid',
      currentUser,
      presetText
    );
    audioNotifier.playSuccessChime();
    setIsSaving(null);
  };

  // Handler for marking ALL 7 habits as Benar in one click
  const handleConfirmAllBenar = async () => {
    if (!currentJournal || !currentUser) return;
    for (const habit of HABIT_LIST) {
      await verifyHabitByParent(
        currentJournal.id,
        habit.id,
        'valid',
        currentUser,
        ''
      );
    }
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    audioNotifier.playSuccessChime();
  };

  // Export PDF
  const handleExportPDF = () => {
    if (!currentStudent) return;
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const currentMonth = monthNames[new Date().getMonth()] + ' ' + new Date().getFullYear();

    const studentTeacher = PDFReportGenerator.getTeacherForClass(currentStudent.className, allUsers);

    PDFReportGenerator.generateStudentReport(
      currentStudent,
      studentEntries,
      currentMonth,
      undefined,
      schoolSettings,
      studentTeacher
    );
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Top Banner Greeting */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-52 h-52 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30">
                Dashboard Orang Tua / Wali Murid
              </span>
              <E2EEBadge />
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white">
              Selamat Datang, {currentUser?.name || 'Orang Tua'}! 👨‍👩‍👧
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              Pantau laporan 7 Kebiasaan Anak Indonesia Hebat (7 KAIH) ananda di rumah. Berikan konfirmasi <strong className="text-emerald-300">Benar</strong> atau <strong className="text-rose-300">Tidak</strong> pada setiap kebiasaan secara langsung.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {linkedStudents.length > 1 && (
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white/10 text-white text-xs sm:text-sm font-semibold border border-white/20 outline-none backdrop-blur-md cursor-pointer"
              >
                {linkedStudents.map(s => (
                  <option key={s.id} value={s.id} className="text-slate-900">
                    Ananda: {s.name}
                  </option>
                ))}
              </select>
            )}

            <button
              id="parent-export-pdf-btn"
              onClick={handleExportPDF}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold backdrop-blur-md border border-white/20 transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-rose-300" />
              <span>Cetak Laporan (PDF)</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Bar */}
        {currentStudent && stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10">
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center gap-3">
              <UserAvatar user={currentStudent} gender={currentStudent.gender} size="sm" className="w-10 h-10 rounded-xl shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-xs text-slate-300 font-medium">Ananda yang Dipantau</span>
                <p className="text-sm sm:text-base font-bold text-white mt-0.5 truncate">{currentStudent.name}</p>
                <p className="text-xs text-rose-200 mt-0.5 truncate">
                  Kelas {currentStudent.className} • NIS: {currentStudent.nis || currentStudent.nisn || '-'}
                </p>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
              <span className="text-xs text-slate-300 font-medium">Status Pembiasaan</span>
              <p className="text-sm sm:text-base font-bold text-emerald-300 mt-0.5">
                {KATEGORI_CONFIG[stats.kategoriLevel].label}
              </p>
              <p className="text-xs text-slate-300 mt-0.5">{stats.avgScore}% Kepatuhan Rata-rata</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
              <span className="text-xs text-slate-300 font-medium">Streak Kedisiplinan</span>
              <p className="text-base sm:text-lg font-bold text-amber-300 mt-0.5">
                {stats.streak} Hari Beruntun 🔥
              </p>
              <p className="text-xs text-slate-300 mt-0.5">Total {stats.completedEntries} jurnal terisi</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
              <span className="text-xs text-slate-300 font-medium">Total Jurnal Tersimpan</span>
              <p className="text-base sm:text-lg font-bold text-rose-300 mt-0.5">
                {studentEntries.length} Laporan
              </p>
              <p className="text-xs text-rose-200 mt-0.5">Tercatat di sistem</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('validation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'validation'
              ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400/30'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Konfirmasi 7 KAIH Harian</span>
        </button>

        <button
          onClick={() => setActiveTab('progress')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'progress'
              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400/30'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Perkembangan Karakter</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/30'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Riwayat Jurnal ({studentEntries.length})</span>
        </button>
      </div>

      {/* TAB 1: VALIDATION & DAILY 7 KAIH REVIEW */}
      {activeTab === 'validation' && (
        <div className="space-y-4">
          {/* Date Selector & Action Row */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                Pilih Tanggal Jurnal:
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="button"
                onClick={() => setSelectedDate(getDateString(0))}
                className="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(getDateString(-1))}
                className="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors cursor-pointer"
              >
                Kemarin
              </button>
            </div>

            {/* Quick jump to recent entries */}
            {studentEntries.length > 0 && (
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">
                  Jurnal Lainnya:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {studentEntries.slice(0, 3).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedDate(p.date)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedDate === p.date
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
                      }`}
                    >
                      {p.date}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!currentJournal ? (
            <div className="p-10 text-center bg-white dark:bg-[#1E293B] rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto opacity-80" />
              <h4 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                Belum Ada Jurnal pada Tanggal {selectedDate}
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Ananda <strong className="text-slate-700 dark:text-slate-300">{currentStudent?.name}</strong> belum menginput jurnal 7 KAIH pada tanggal ini. Silakan pilih tanggal lain atau ingatkan ananda untuk mengisi jurnal hariannya.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Journal Status Header with Quick Confirmation Button */}
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 dark:text-white">
                      Laporan 7 Kebiasaan ({currentJournal.date})
                    </h3>
                    <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {currentJournal.completedCount} / 7 Selesai
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Skor Pengisian: <span className="font-bold text-indigo-600 dark:text-indigo-400">{currentJournal.overallScore}%</span> • Kategori: <span className="font-bold text-slate-800 dark:text-slate-200">{KATEGORI_CONFIG[currentJournal.kategoriLevel].label}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleConfirmAllBenar}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                    title="Konfirmasi bahwa semua 7 kebiasaan di bawah ini BENAR dilaksanakan di rumah"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Konfirmasi Semua Benar ✓</span>
                  </button>
                </div>
              </div>

              {/* 7 Habits Execution Cards with Benar & Tidak Buttons */}
              <div className="space-y-3.5">
                {HABIT_LIST.map((habit) => {
                  const habitData = currentJournal.habits[habit.id] || { completed: false, values: {} };
                  const isDone = habitData.completed;
                  const vals = habitData.values || {};
                  const habitVerification = currentJournal.parentValidation?.habitVerifications?.[habit.id];
                  
                  // Check status:
                  // 1. If explicit verification exists:
                  //    - status === 'invalid' -> Tidak Dilaksanakan (Red)
                  //    - status === 'valid' -> Dilaksanakan (Green)
                  // 2. If no explicit verification yet:
                  //    - If student marked done -> Dilaksanakan (Green default)
                  //    - If student marked not done -> Belum Dilaksanakan (Slate default)
                  const isExplicitInvalid = habitVerification?.status === 'invalid' || currentJournal.parentValidation?.disputedHabits?.includes(habit.id);
                  const isExplicitValid = habitVerification?.status === 'valid';
                  
                  const isExecuted = !isExplicitInvalid && (isExplicitValid || isDone);
                  const isDisputed = isExplicitInvalid;

                  const isReasonActive = isDisputed || activeReasonInput === habit.id;
                  const currentReasonText = reasonDrafts[habit.id] !== undefined 
                    ? reasonDrafts[habit.id] 
                    : (habitVerification?.reason || '');

                  return (
                    <div
                      key={habit.id}
                      className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                        isDisputed
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 shadow-xs'
                          : isExecuted
                            ? 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-slate-800 shadow-xs'
                            : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-95'
                      }`}
                    >
                      {/* Habit Header: Title + Status + Benar/Tidak Action Buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-2xl ${habit.badgeBg} shrink-0`}>
                            <HabitIcon habitId={habit.id} size={22} />
                          </div>
                          <div>
                            <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                              {habit.title}
                            </h4>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                              {habit.tagline}
                            </p>
                          </div>
                        </div>

                        {/* Status Label & Confirmation Buttons: Benar vs Tidak */}
                        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-center">
                          {/* Execution Status Badge */}
                          {isExecuted ? (
                            <span className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5">
                              <Check className="w-4 h-4 text-emerald-600" />
                              <span>Dilaksanakan</span>
                            </span>
                          ) : isDisputed ? (
                            <span className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-rose-100 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700 flex items-center gap-1.5">
                              <X className="w-4 h-4 text-rose-600" />
                              <span>Tidak Dilaksanakan</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-slate-400" />
                              <span>Belum Dilaksanakan</span>
                            </span>
                          )}

                          {/* Action Button: BENAR */}
                          <button
                            type="button"
                            onClick={() => handleConfirmHabit(habit.id, 'valid')}
                            disabled={isSaving === habit.id}
                            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                              isExplicitValid
                                ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400/40 shadow-sm'
                                : 'bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-slate-300 dark:border-slate-700'
                            }`}
                            title="Klik jika kebiasaan ini BENAR telah dilaksanakan ananda di rumah"
                          >
                            <Check className="w-4 h-4" />
                            <span>Benar</span>
                          </button>

                          {/* Action Button: TIDAK */}
                          <button
                            type="button"
                            onClick={() => handleConfirmHabit(habit.id, 'invalid')}
                            disabled={isSaving === habit.id}
                            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                              isExplicitInvalid
                                ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-400/40 shadow-sm'
                                : 'bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-slate-300 dark:border-slate-700'
                            }`}
                            title="Klik jika kebiasaan ini TIDAK dilaksanakan / belum sesuai dan tuliskan alasan"
                          >
                            <X className="w-4 h-4" />
                            <span>Tidak</span>
                          </button>
                        </div>
                      </div>

                      {/* Detailed Execution Output per Habit (Enlarged Fonts) */}
                      <div className="pt-3.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-2">
                        {/* 1. Bangun Pagi */}
                        {habit.id === 'bangun_pagi' && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl text-xs sm:text-sm border border-slate-200/70 dark:border-slate-700/60">
                            <div>
                              <span className="text-slate-400 block text-xs font-medium">⏰ Jam Bangun Subuh:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">{vals.wakeTime || '04:45'} WIB</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-xs font-medium">🙏 Ibadah Pagi / Subuh:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">{vals.morningPrayer ? '✓ Dilakukan' : 'Tidak'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-xs font-medium">🛏️ Rapikan Tempat Tidur:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">{vals.tidyBed ? '✓ Rapi' : 'Belum'}</span>
                            </div>
                          </div>
                        )}

                        {/* 2. Beribadah */}
                        {habit.id === 'ibadah' && (
                          <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl text-xs sm:text-sm border border-slate-200/70 dark:border-slate-700/60">
                            <div>
                              <span className="text-slate-400 block text-xs font-medium mb-1.5">🕌 Sholat 5 Waktu:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  { key: 'prayerFajr', label: 'Subuh' },
                                  { key: 'prayerDhuhr', label: 'Dzuhur' },
                                  { key: 'prayerAsr', label: 'Ashar' },
                                  { key: 'prayerMaghrib', label: 'Maghrib' },
                                  { key: 'prayerIsha', label: 'Isya' }
                                ].map(p => (
                                  <span 
                                    key={p.key} 
                                    className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-bold ${
                                      vals[p.key] 
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                                    }`}
                                  >
                                    {vals[p.key] ? '✓ ' : ''}{p.label}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-700/60">
                              <div>
                                <span className="text-slate-400 block text-xs font-medium">🌙 Puasa / Sholat Sunnah:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-100">
                                  {vals.sunnahWorship ? (vals.sunnahDetail || 'Dilaksanakan') : 'Tidak ada'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-xs font-medium">📖 Baca Kitab Suci / Tadarus:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-100">
                                  {vals.holyBookReading ? (vals.holyBookDetail || 'Dibaca') : 'Tidak ada'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-xs font-medium">🤲 Sedekah / Berbagi:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-100">
                                  {vals.almsGiving ? (vals.almsDetail || 'Bersedekah') : 'Tidak ada'}
                                </span>
                              </div>
                            </div>

                            {vals.spiritualNote && (
                              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic pt-1">
                                "Doa / Syukur: {vals.spiritualNote}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* 3. Berolahraga */}
                        {habit.id === 'olahraga' && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl text-xs sm:text-sm border border-slate-200/70 dark:border-slate-700/60">
                            <div>
                              <span className="text-slate-400 block text-xs font-medium">🏃 Jenis Olahraga:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-100">{vals.exerciseType || 'Senam / Jalan Pagi'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-xs font-medium">⏱️ Durasi:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-100">{vals.durationMin || 15} Menit</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-xs font-medium">💧 Pemanasan & Air:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-100">
                                {vals.warmupDone ? '✓ Pemanasan' : '-'} • {vals.drinkWaterAfter ? '✓ Cukup Air' : '-'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* 4. Makan Sehat */}
                        {habit.id === 'makan_sehat' && (
                          <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl text-xs sm:text-sm border border-slate-200/70 dark:border-slate-700/60">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                <span className="text-xs font-bold text-green-700 dark:text-green-400 block">🌅 Sarapan:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-100">
                                  {vals.breakfastCustom || vals.breakfastMenu || (vals.breakfastEaten ? 'Sarapan Sehat' : 'Tidak Sarapan')}
                                </span>
                              </div>
                              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                <span className="text-xs font-bold text-green-700 dark:text-green-400 block">☀️ Makan Siang:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-100">
                                  {vals.lunchCustom || vals.lunchMenu || (vals.lunchEaten ? 'Makan Siang Sehat' : 'Belum')}
                                </span>
                              </div>
                              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                <span className="text-xs font-bold text-green-700 dark:text-green-400 block">🌙 Makan Malam:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-100">
                                  {vals.dinnerCustom || vals.dinnerMenu || (vals.dinnerEaten ? 'Makan Malam Sehat' : 'Belum')}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                              <span>🥦 Sayur: <strong className="text-slate-800 dark:text-slate-100">{vals.hasVegetables ? '✓ Ya' : 'Tidak'}</strong></span>
                              <span>🍎 Buah: <strong className="text-slate-800 dark:text-slate-100">{vals.hasFruits ? '✓ Ya' : 'Tidak'}</strong></span>
                              <span>💧 Air Putih: <strong className="text-slate-800 dark:text-slate-100">{vals.waterGlasses || 8} Gelas</strong></span>
                            </div>
                          </div>
                        )}

                        {/* 5. Gemar Belajar */}
                        {habit.id === 'membaca' && (
                          <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl text-xs sm:text-sm border border-slate-200/70 dark:border-slate-700/60">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div>
                                <span className="text-slate-400 block text-xs font-medium">📚 Materi / Buku:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-100">{vals.bookTitle || 'Pelajaran Sekolah'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-xs font-medium">⏱️ Jam Belajar:</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400">{vals.startTime || '16:00'} - {vals.endTime || '16:45'} WIB</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-xs font-medium">📄 Halaman / Bab:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-100">{vals.pageRange || 'Bab 1 - 2'}</span>
                              </div>
                            </div>
                            {vals.summaryInsight && (
                              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic pt-1 border-t border-slate-200/70 dark:border-slate-700/60">
                                "Intisari: {vals.summaryInsight}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* 6. Bermasyarakat */}
                        {habit.id === 'bermasyarakat' && (
                          <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl text-xs sm:text-sm border border-slate-200/70 dark:border-slate-700/60">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div>
                                <span className="text-slate-400 block text-xs font-medium">🤝 Kegiatan Sosial:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-100">{vals.activityName || 'Membantu di Rumah / Lingkungan'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-xs font-medium">👥 Dengan Siapa:</span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950">
                                  {vals.withWhom || 'Keluarga'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-xs font-medium">🌱 Manfaat Kegiatan:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-100">{vals.benefits || 'Mempererat hubungan & lingkungan bersih'}</span>
                              </div>
                            </div>
                            {vals.socialNotes && (
                              <p className="text-xs sm:text-sm text-slate-500 italic pt-1">
                                "Catatan Kebaikan: {vals.socialNotes}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* 7. Istirahat */}
                        {habit.id === 'istirahat' && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl text-xs sm:text-sm border border-slate-200/70 dark:border-slate-700/60">
                            <div>
                              <span className="text-slate-400 block text-xs font-medium">🌙 Jam Tidur Malam:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-100">{vals.targetSleepTime || '21:00'} WIB</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-xs font-medium">📵 Tanpa Gadget 30 Mnt:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-100">{vals.noScreenBeforeBed ? '✓ Patuh' : 'Tidak'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-xs font-medium">🙏 Berdoa Sebelum Tidur:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-100">{vals.sleepPrayerDone ? '✓ Berdoa' : 'Tidak'}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* REASON INPUT BOX IF "TIDAK" IS SELECTED */}
                      {isReasonActive && (
                        <div className="mt-3.5 p-3.5 sm:p-4 bg-rose-50/90 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              Alasan / Catatan Mengapa Tidak Dilaksanakan:
                            </span>
                            {habitVerification?.reason && (
                              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-md">
                                Tersimpan ✓
                              </span>
                            )}
                          </div>

                          {/* Quick Preset Chips */}
                          <div className="space-y-1">
                            <span className="text-[11px] sm:text-xs text-rose-700 dark:text-rose-300 font-medium">
                              Pilih Cepat Alasan:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {presetReasons.map((preset, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleSetReasonPreset(habit.id, preset)}
                                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-rose-100 dark:hover:bg-rose-900/70 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                                >
                                  + {preset}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Reason Input & Save Button */}
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                            <input
                              type="text"
                              value={currentReasonText}
                              onChange={(e) => setReasonDrafts(prev => ({ ...prev, [habit.id]: e.target.value }))}
                              placeholder="Tuliskan alasan mengapa kebiasaan ini tidak / belum dilaksanakan di rumah..."
                              className="flex-1 p-2.5 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder:text-slate-400"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveReason(habit.id)}
                              disabled={isSaving === habit.id}
                              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
                            >
                              <Save className="w-4 h-4" />
                              <span>Simpan Alasan</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Child Reflection Card */}
              {currentJournal.decryptedReflection && (
                <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1.5">
                  <span className="text-xs sm:text-sm font-bold text-indigo-700 dark:text-indigo-300 block flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Catatan Refleksi & Kejujuran Ananda:
                  </span>
                  <p className="italic text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed">
                    "{currentJournal.decryptedReflection}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROGRESS & ANALYTICS (PERKEMBANGAN ANAK) */}
      {activeTab === 'progress' && stats && (
        <div className="space-y-4">
          {/* Progress KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs sm:text-sm text-slate-400 font-medium">Rata-Rata Kepatuhan 7 KAIH</span>
              <p className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {stats.avgScore}%
              </p>
              <p className="text-xs text-emerald-600 font-semibold mt-1">
                Level: {KATEGORI_CONFIG[stats.kategoriLevel].label}
              </p>
            </div>

            <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs sm:text-sm text-slate-400 font-medium">Streak Kedisiplinan</span>
              <p className="text-2xl sm:text-3xl font-black text-amber-500 mt-1">
                {stats.streak} Hari 🔥
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Tanpa terputus berturut-turut
              </p>
            </div>

            <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs sm:text-sm text-slate-400 font-medium">Total Jurnal Terisi</span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {studentEntries.length} Jurnal
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Laporan tersimpan di sistem
              </p>
            </div>

            <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs sm:text-sm text-slate-400 font-medium">Apresiasi Guru & Sekolah</span>
              <p className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {studentEntries.filter(e => e.teacherFeedback).length} Catatan
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Bimbingan wali kelas aktif
              </p>
            </div>
          </div>

          {/* Charts Row: Weekly Trend Bar/Line + Radar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Weekly Trend Chart */}
            <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Tren Skor Perkembangan 7 Hari Terakhir
                  </h3>
                  <p className="text-xs text-slate-500">
                    Grafik persentase penyelesaian kebiasaan harian ananda
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Target: &gt;80%
                </span>
              </div>

              <div className="h-60 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#64748b" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#64748b" />
                    <Tooltip 
                      formatter={(value: any) => [`${value}%`, 'Skor Kepatuhan']}
                      labelFormatter={(label) => `Hari ${label}`}
                    />
                    <Bar dataKey="score" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Habit Balance Radar Chart */}
            <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Radar Keseimbangan 7 Pilar KAIH
                </h3>
                <p className="text-xs text-slate-500">
                  Konsistensi ananda pada masing-masing dimensi karakter
                </p>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.habitRadar}>
                    <PolarGrid stroke="#94a3b8" strokeDasharray="3 3" opacity={0.35} />
                    <PolarAngleAxis dataKey="habit" stroke="#64748b" fontSize={11} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" fontSize={9} />
                    <Radar
                      name="Konsistensi"
                      dataKey="score"
                      stroke="#e11d48"
                      fill="#e11d48"
                      fillOpacity={0.4}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Breakdown Table: Consistency per Habit */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Evaluasi Rinci Tiap Pilar Kebiasaan
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {HABIT_LIST.map((h) => {
                const habitStat = stats.habitRadar.find(r => r.habit === h.shortName);
                const score = habitStat?.score || 80;
                return (
                  <div 
                    key={h.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HabitIcon habitId={h.id} size={16} />
                        <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                          {h.title}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400">
                        {score}%
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                        }`} 
                        style={{ width: `${score}%` }} 
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {score >= 80 ? '🌟 Sangat konsisten dilakukan di rumah' : 'Memerlukan pendampingan orang tua'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Wali Kelas Periodic Guidance */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Bimbingan & Rekomendasi dari Wali Kelas
              </h3>
            </div>

            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 space-y-2">
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                "Ananda {currentStudent?.name} menunjukkan perkembangan karakter yang sangat membanggakan di sekolah. Kerjasama yang baik antara orang tua di rumah dan guru di sekolah menghasilkan pembiasaan positif yang konsisten."
              </p>
              <div className="flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-400 font-semibold pt-1 border-t border-indigo-100 dark:border-indigo-900/50">
                <span>Wali Kelas {currentStudent?.className}</span>
                <span>Evaluasi Karakter 7 KAIH</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HISTORICAL LOGS (RIWAYAT JURNAL) */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Arsip Seluruh Jurnal Ananda ({studentEntries.length} Jurnal)
            </h3>
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 text-xs sm:text-sm font-bold cursor-pointer"
            >
              <FileDown className="w-4 h-4" /> Unduh Laporan PDF
            </button>
          </div>

          <div className="space-y-2.5">
            {studentEntries.map((j) => (
              <div
                key={j.id}
                onClick={() => {
                  setSelectedDate(j.date);
                  setActiveTab('validation');
                }}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer transition-all flex items-start justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Tanggal {j.date}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      j.status === 'validated'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {j.status === 'validated' ? '✓ Dikonfirmasi' : '⏳ Belum Divalidasi'}
                    </span>
                  </div>

                  {/* Habit tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {HABIT_LIST.map((h) => {
                      const isDisputed = j.parentValidation?.habitVerifications?.[h.id]?.status === 'invalid' || j.parentValidation?.disputedHabits?.includes(h.id);
                      const done = !isDisputed && (j.habits[h.id]?.completed || j.parentValidation?.habitVerifications?.[h.id]?.status === 'valid');
                      return (
                        <span
                          key={h.id}
                          className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                            isDisputed
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : done
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-200/70 dark:bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isDisputed ? '✕ ' : done ? '✓ ' : ''}{h.shortName}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 block">
                    {j.overallScore}%
                  </span>
                  <span className="text-xs text-slate-400">
                    {j.completedCount}/7 Selesai
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
