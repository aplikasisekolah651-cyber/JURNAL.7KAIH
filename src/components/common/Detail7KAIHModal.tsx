import React from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Heart, 
  Activity, 
  Apple, 
  BookOpen, 
  Users, 
  Moon, 
  Sparkles, 
  ShieldCheck, 
  MessageCircle,
  FileText
} from 'lucide-react';
import { JournalEntry, User } from '../../types';
import { RELIGIONS_CONFIG, KATEGORI_CONFIG, getKategoriLevel, getWorshipStatusList, ReligionType, calculateJournalScore, formatDateDDMMYY } from '../../lib/constants';
import { PDFReportGenerator } from '../../lib/pdfGenerator';

interface Detail7KAIHModalProps {
  isOpen: boolean;
  onClose: () => void;
  journal: JournalEntry | null;
  student?: User | null;
  teacherInfo?: { name: string; nip: string };
}

export const Detail7KAIHModal: React.FC<Detail7KAIHModalProps> = ({
  isOpen,
  onClose,
  journal,
  student,
  teacherInfo
}) => {
  if (!isOpen || !journal) return null;

  const habits = journal.habits || {};
  const bp = habits.bangun_pagi;
  const ib = habits.ibadah;
  const ol = habits.olahraga;
  const ms = habits.makan_sehat;
  const mb = habits.membaca;
  const bm = habits.bermasyarakat;
  const ist = habits.istirahat;

  // Religion info for Ibadah
  const rel = (ib?.values?.religion || student?.religion || 'Islam') as ReligionType;
  const relConfig = RELIGIONS_CONFIG[rel] || RELIGIONS_CONFIG.Islam;
  const worshipList = getWorshipStatusList(rel, ib?.values);
  const executedWorshipCount = worshipList.filter(p => p.isExecuted).length;

  const scoreCalc = calculateJournalScore(habits, rel);
  const completedCount = scoreCalc.otherCompletedCount + (scoreCalc.worshipCount === scoreCalc.worshipTotal && scoreCalc.worshipTotal > 0 ? 1 : 0);
  const score = journal.overallScore || scoreCalc.overallScore;
  const kategoriLevel = (journal.kategoriLevel || getKategoriLevel(score)) as keyof typeof KATEGORI_CONFIG;
  const kategori = KATEGORI_CONFIG[kategoriLevel] || KATEGORI_CONFIG.mulai_terbiasa;

  // Handle PDF Export
  const handlePrint = () => {
    const studentData: User = student || {
      id: journal.userId || 'std-1',
      username: 'siswa',
      name: (journal as any).studentName || 'Siswa',
      role: 'siswa',
      className: (journal as any).className || '7A',
      religion: rel
    };
    PDFReportGenerator.generateSingleJournalDetailReport(
      studentData,
      journal,
      teacherInfo
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-200 dark:shadow-none">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Detail Rekap Pelaksanaan 7KAIH</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${kategori.badge}`}>
                  {kategori.label}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {student ? `${student.name} (${student.className || 'Siswa'}) • ` : ''}Tanggal: <strong>{formatDateDDMMYY(journal.date)}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800 cursor-pointer transition-colors"
              title="Cetak Lembar Detail PDF"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Cetak PDF (A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Top Score Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-center">
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold block">Skor KAIH</span>
              <span className="text-xl font-black text-purple-700 dark:text-purple-300">{score}%</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">Terlaksana</span>
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">{completedCount} / 7</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-center">
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block">Validasi Ortu</span>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 block mt-1">
                {journal.parentValidation?.validated || journal.parentValidation?.status === 'valid' 
                  ? `✓ Valid (${journal.parentValidation?.rating || 5}★)` 
                  : '⏳ Menunggu'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block">Status Catatan</span>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 block mt-1">
                {journal.decryptedReflection ? '✓ Terisi' : 'Belum Ada'}
              </span>
            </div>
          </div>

          {/* 7 Habits Detailed Recap Cards */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Rincian Rekap Data 7 Kebiasaan Anak Indonesia Hebat:</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 1. Bangun Pagi */}
              <div className={`p-3.5 rounded-xl border transition-all ${bp?.completed ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80'}`}>
                <div className="flex items-center justify-between pb-2 border-b border-amber-200/50 dark:border-amber-800/40 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⏰</span>
                    <h5 className="font-bold text-slate-900 dark:text-white">1. Bangun Pagi</h5>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${bp?.completed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                    {bp?.completed ? 'Terlaksana' : 'Belum'}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {!bp?.completed ? (
                    <p className="text-slate-400 italic">Kebiasaan ini tidak diisi oleh siswa.</p>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Jam Bangun:</span>
                        <strong className="text-slate-900 dark:text-white font-mono">{bp?.values?.wakeTime || bp?.values?.wake_time || bp?.time || '-'} {bp?.values?.wakeTime || bp?.values?.wake_time || bp?.time ? 'WIB' : ''}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Rapikan Kasur:</span>
                        <strong className={bp?.values?.bedMade ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}>
                          {bp?.values?.bedMade ? '✓ Ya, Rapikan Sendiri' : (bp?.values?.bedMade === false ? 'Tidak' : '-')}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Minum Air Hangat:</span>
                        <strong className={bp?.values?.drinkWater ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}>
                          {bp?.values?.drinkWater ? '✓ Ya, Minum Air Putih' : (bp?.values?.drinkWater === false ? 'Tidak' : '-')}
                        </strong>
                      </div>
                      {bp?.values?.morningMood && (
                        <div className="flex justify-between pt-1 border-t border-amber-100 dark:border-amber-900/40">
                          <span className="text-slate-500">Suasana Hati:</span>
                          <strong className="text-amber-800 dark:text-amber-300">{bp.values.morningMood}</strong>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* 2. Beribadah */}
              <div className={`p-4 rounded-xl border transition-all md:col-span-2 ${ib?.completed ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-90'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-emerald-200/60 dark:border-emerald-800/50 mb-3 gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl p-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60">{relConfig.icon}</span>
                    <div>
                      <h5 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">2. Beribadah ({relConfig.name})</h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{relConfig.mainTitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ib?.completed && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {executedWorshipCount} dari {worshipList.length} Ibadah Pokok
                      </span>
                    )}
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${ib?.completed ? 'bg-emerald-600 text-white' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                      {ib?.completed ? 'Terlaksana' : 'Belum'}
                    </span>
                  </div>
                </div>

                {!ib?.completed ? (
                  <p className="text-xs text-slate-400 italic">Kebiasaan ini tidak diisi oleh siswa.</p>
                ) : (
                  <div className="space-y-3">
                    {/* Daftar Ibadah Pokok dengan Keterangan Dilaksanakan / Tidak */}
                    <div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Rincian Pelaksanaan Ibadah Pokok:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        {worshipList.map(p => (
                          <div
                            key={p.key}
                            className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                              p.isExecuted
                                ? 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700/80 shadow-xs'
                                : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {p.label}
                                </span>
                                {p.timeHint && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {p.timeHint}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="mt-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.isExecuted
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                              }`}>
                                <span>{p.isExecuted ? '✓' : '✗'}</span>
                                <span>{p.isExecuted ? 'Dilaksanakan' : 'Tidak Dilaksanakan'}</span>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rincian Tambahan: Kitab Suci, Sunnah/Doa, Infaq/Sedekah */}
                    {(ib?.values?.holyBookDetail || ib?.values?.holyBookReading || ib?.values?.sunnahDetail || ib?.values?.sunnahWorship || ib?.values?.almsDetail || ib?.values?.almsGiving) && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-200/40 dark:border-emerald-900/40 text-xs">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                              <span>📖</span>
                              <span>Kitab Suci / Tadarus:</span>
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${ib?.values?.holyBookDetail || ib?.values?.holyBookReading ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                              {ib?.values?.holyBookDetail || ib?.values?.holyBookReading ? '✓ Dilaksanakan' : 'Belum'}
                            </span>
                          </div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {ib?.values?.holyBookDetail || (ib?.values?.holyBookReading ? 'Tadarus / Baca Kitab' : '-')}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                              <span>✨</span>
                              <span>Sunnah / Doa Khusus:</span>
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${ib?.values?.sunnahDetail || ib?.values?.sunnahWorship ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                              {ib?.values?.sunnahDetail || ib?.values?.sunnahWorship ? '✓ Dilaksanakan' : 'Belum'}
                            </span>
                          </div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {ib?.values?.sunnahDetail || (ib?.values?.sunnahWorship ? 'Ibadah Sunnah / Doa' : '-')}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                              <span>🤲</span>
                              <span>Infaq / Sedekah:</span>
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${ib?.values?.almsDetail || ib?.values?.almsGiving ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                              {ib?.values?.almsDetail || ib?.values?.almsGiving ? '✓ Dilaksanakan' : 'Belum'}
                            </span>
                          </div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {ib?.values?.almsDetail || (ib?.values?.almsGiving ? 'Infaq / Berbagi Kebaikan' : '-')}
                          </p>
                        </div>
                      </div>
                    )}

                    {ib?.values?.spiritualNote && (
                      <div className="p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/50 text-xs">
                        <span className="font-semibold text-emerald-800 dark:text-emerald-300 block text-[11px] mb-0.5">
                          💭 Catatan Doa & Rasa Syukur:
                        </span>
                        <p className="italic text-slate-700 dark:text-slate-300 text-[11px]">
                          "{ib.values.spiritualNote}"
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Berolahraga */}
              <div className={`p-3.5 rounded-xl border transition-all ${ol?.completed ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80'}`}>
                <div className="flex items-center justify-between pb-2 border-b border-rose-200/50 dark:border-rose-800/40 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏃</span>
                    <h5 className="font-bold text-slate-900 dark:text-white">3. Berolahraga</h5>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ol?.completed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                    {ol?.completed ? 'Terlaksana' : 'Belum'}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {!ol?.completed ? (
                    <p className="text-slate-400 italic">Kebiasaan ini tidak diisi oleh siswa.</p>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Jenis Olahraga:</span>
                        <strong className="text-rose-700 dark:text-rose-300 font-bold">{ol?.values?.exerciseType || ol?.values?.exercise_type || '-'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Durasi:</span>
                        <strong className="text-slate-900 dark:text-white">{ol?.values?.durationMin || ol?.values?.duration ? `${ol?.values?.durationMin || ol?.values?.duration} Menit` : '-'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Kondisi Tubuh:</span>
                        <strong className="text-slate-900 dark:text-white">{ol?.values?.bodyCondition || '-'}</strong>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 4. Makan Sehat */}
              <div className={`p-3.5 rounded-xl border transition-all ${ms?.completed ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80'}`}>
                <div className="flex items-center justify-between pb-2 border-b border-green-200/50 dark:border-green-800/40 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🥗</span>
                    <h5 className="font-bold text-slate-900 dark:text-white">4. Makan Sehat & Bergizi</h5>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ms?.completed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                    {ms?.completed ? 'Terlaksana' : 'Belum'}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {!ms?.completed ? (
                    <p className="text-slate-400 italic">Kebiasaan ini tidak diisi oleh siswa.</p>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">🌅 Sarapan:</span>
                        <strong className="text-slate-900 dark:text-white truncate max-w-[180px]">
                          {ms?.values?.breakfastCustom || ms?.values?.breakfastMenu || (ms?.values?.breakfastEaten ? 'Sarapan' : (ms?.values?.breakfastEaten === false ? 'Tidak Sarapan' : '-'))}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">☀️ Siang:</span>
                        <strong className="text-slate-900 dark:text-white truncate max-w-[180px]">
                          {ms?.values?.lunchCustom || ms?.values?.lunchMenu || (ms?.values?.lunchEaten ? 'Makan Siang' : (ms?.values?.lunchEaten === false ? 'Tidak Makan Siang' : '-'))}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">🌙 Malam:</span>
                        <strong className="text-slate-900 dark:text-white truncate max-w-[180px]">
                          {ms?.values?.dinnerCustom || ms?.values?.dinnerMenu || (ms?.values?.dinnerEaten ? 'Makan Malam' : (ms?.values?.dinnerEaten === false ? 'Tidak Makan Malam' : '-'))}
                        </strong>
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-green-200/40 text-[11px]">
                        <span className={ms?.values?.hasVegetables ? 'text-emerald-600 font-bold' : 'text-slate-400'}>🥦 Sayur {ms?.values?.hasVegetables ? '✓' : '-'}</span>
                        <span>•</span>
                        <span className={ms?.values?.hasFruits ? 'text-emerald-600 font-bold' : 'text-slate-400'}>🍎 Buah {ms?.values?.hasFruits ? '✓' : '-'}</span>
                        {ms?.values?.waterGlasses || ms?.values?.water_glasses ? (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">💧 {ms?.values?.waterGlasses || ms?.values?.water_glasses} Gelas Air</span>
                          </>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 5. Gemar Membaca */}
              <div className={`p-3.5 rounded-xl border transition-all ${mb?.completed ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80'}`}>
                <div className="flex items-center justify-between pb-2 border-b border-blue-200/50 dark:border-blue-800/40 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📖</span>
                    <h5 className="font-bold text-slate-900 dark:text-white">5. Gemar Membaca</h5>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${mb?.completed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                    {mb?.completed ? 'Terlaksana' : 'Belum'}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {!mb?.completed ? (
                    <p className="text-slate-400 italic">Kebiasaan ini tidak diisi oleh siswa.</p>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Judul Buku:</span>
                        <strong className="text-blue-700 dark:text-blue-300 font-bold truncate max-w-[180px]">{mb?.values?.bookTitle || mb?.values?.book_title || '-'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Halaman / Durasi:</span>
                        <strong className="text-slate-900 dark:text-white">{mb?.values?.pagesRead || mb?.values?.pages_read || 0} Halaman • {mb?.values?.readingDuration || 0} Menit</strong>
                      </div>
                      {mb?.values?.bookGenre && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Kategori / Genre:</span>
                          <strong className="text-slate-700 dark:text-slate-300">{mb.values.bookGenre}</strong>
                        </div>
                      )}
                      {mb?.values?.bookSummary && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 italic pt-1 border-t border-blue-100 dark:border-blue-900/40">
                          "{mb.values.bookSummary}"
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* 6. Bermasyarakat */}
              <div className={`p-3.5 rounded-xl border transition-all ${bm?.completed ? 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80'}`}>
                <div className="flex items-center justify-between pb-2 border-b border-orange-200/50 dark:border-orange-800/40 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🤝</span>
                    <h5 className="font-bold text-slate-900 dark:text-white">6. Bermasyarakat</h5>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${bm?.completed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                    {bm?.completed ? 'Terlaksana' : 'Belum'}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {!bm?.completed ? (
                    <p className="text-slate-400 italic">Kebiasaan ini tidak diisi oleh siswa.</p>
                  ) : (
                    <div>
                      <span className="text-slate-500 block mb-0.5">Kegiatan Sosial:</span>
                      <p className="font-semibold text-slate-900 dark:text-white leading-snug">
                        {bm?.values?.socialActivityCustom || (Array.isArray(bm?.values?.socialActivities) && bm.values.socialActivities.length > 0 ? bm.values.socialActivities.join(', ') : '') || [bm?.values?.helpParents ? 'Membantu Orang Tua' : '', bm?.values?.cleanEnvironment ? 'Membersihkan Lingkungan' : ''].filter(Boolean).join(', ') || bm?.values?.activity_type || '-'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 7. Istirahat Cepat */}
              <div className={`p-3.5 rounded-xl border transition-all md:col-span-2 ${ist?.completed ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80'}`}>
                <div className="flex items-center justify-between pb-2 border-b border-indigo-200/50 dark:border-indigo-800/40 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🌙</span>
                    <h5 className="font-bold text-slate-900 dark:text-white">7. Tidur / Istirahat Cepat & Teratur</h5>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ist?.completed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                    {ist?.completed ? 'Terlaksana' : 'Belum'}
                  </span>
                </div>
                {!ist?.completed ? (
                  <p className="text-xs text-slate-400 italic">Kebiasaan ini tidak diisi oleh siswa.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <div>
                      <span className="text-slate-500 block">Jam Tidur Malam:</span>
                      <strong className="text-indigo-900 dark:text-indigo-200 font-mono text-sm">{ist?.values?.sleepTime || ist?.values?.sleep_time || '-'} {ist?.values?.sleepTime || ist?.values?.sleep_time ? 'WIB' : ''}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Membaca Buku:</span>
                      <strong className={ist?.values?.readBeforeBed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}>
                        {ist?.values?.readBeforeBed ? '✓ Ya, Membaca Sebelum Tidur' : 'Tidak'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Bebas Gadget:</span>
                      <strong className={ist?.values?.noGadget ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}>
                        {ist?.values?.noGadget ? '✓ Ya, Bebas HP Sebelum Tidur' : 'Tidak'}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Refleksi Diri Siswa */}
          {journal.decryptedReflection && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                Catatan Refleksi Siswa:
              </span>
              <p className="text-xs text-slate-800 dark:text-slate-200 italic leading-relaxed">
                "{journal.decryptedReflection}"
              </p>
            </div>
          )}

          {/* Validasi Orang Tua & Catatan Wali Kelas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Validasi Ortu */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Paraf & Evaluasi Orang Tua:
              </span>
              {journal.parentValidation?.validated || journal.parentValidation?.status === 'valid' ? (
                <div className="text-xs space-y-0.5">
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <span>Divalidasi ({journal.parentValidation.rating || 5}★)</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 italic">
                    "{journal.parentValidation.notes || 'Ananda telah melaksanakan 7 kebiasaan dengan baik.'}"
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Belum divalidasi oleh orang tua.</p>
              )}
            </div>

            {/* Bimbingan Wali Kelas */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-indigo-500" />
                Masukan & Bimbingan Wali Kelas:
              </span>
              {journal.teacherFeedback?.note ? (
                <div className="text-xs space-y-0.5">
                  <p className="text-slate-800 dark:text-slate-200 italic">
                    "{journal.teacherFeedback.note}"
                  </p>
                  {journal.teacherFeedback.badge && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                      🎖️ {journal.teacherFeedback.badge}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Belum ada catatan wali kelas.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
          <span className="text-[11px] text-slate-400">
            SMP Negeri 2 Kasihan • 7 Kebiasaan Anak Indonesia Hebat
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold cursor-pointer transition-colors shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
