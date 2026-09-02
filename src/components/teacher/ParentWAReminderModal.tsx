import React, { useState, useMemo } from 'react';
import { 
  MessageCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  FileText, 
  AlertCircle, 
  Clock, 
  Phone, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  X, 
  Send, 
  Info,
  Calendar,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { User, JournalEntry } from '../../types';
import { audioNotifier } from '../../lib/audioNotifier';
import { UserAvatar } from '../common/UserAvatar';
import { SCHOOL_CONFIG } from '../../lib/constants';

interface ParentWAReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudent: User | null;
  onSelectStudent: (student: User | null) => void;
  allStudents: User[];
  allUsers: User[];
  getStudentJournals: (studentId: string) => JournalEntry[];
  currentTeacher: User;
  className: string;
}

export const ParentWAReminderModal: React.FC<ParentWAReminderModalProps> = ({
  isOpen,
  onClose,
  selectedStudent,
  onSelectStudent,
  allStudents,
  allUsers,
  getStudentJournals,
  currentTeacher,
  className
}) => {
  const [activeTab, setActiveTab] = useState<'personal' | 'broadcast' | 'sop'>('personal');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('standard');
  const [customPhone, setCustomPhone] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');

  // Find parents for all students
  const studentParentMap = useMemo(() => {
    const map = new Map<string, { parent?: User; latestJournal?: JournalEntry; isPendingParent: boolean }>();
    
    allStudents.forEach(student => {
      const parent = allUsers.find(u => 
        u.role === 'orangtua' && (u.studentIds?.includes(student.id) || u.id === student.parentId)
      );
      const journals = getStudentJournals(student.id);
      const latestJournal = journals[0]; // most recent
      
      // Is pending if there is a journal that is not yet validated by parent
      const isPendingParent = !!latestJournal && (!latestJournal.parentValidation?.validated || latestJournal.status !== 'validated');
      
      map.set(student.id, {
        parent,
        latestJournal,
        isPendingParent
      });
    });

    return map;
  }, [allStudents, allUsers, getStudentJournals]);

  // List of students who need parent confirmation
  const pendingStudents = useMemo(() => {
    return allStudents.filter(s => {
      const data = studentParentMap.get(s.id);
      return data?.isPendingParent;
    });
  }, [allStudents, studentParentMap]);

  // Current active student for reminder
  const activeStudent = selectedStudent || pendingStudents[0] || allStudents[0];
  const activeStudentData = activeStudent ? studentParentMap.get(activeStudent.id) : undefined;
  const activeParent = activeStudentData?.parent;
  const latestJournal = activeStudentData?.latestJournal;

  // Phone number resolution
  const targetPhone = useMemo(() => {
    if (customPhone) return customPhone;
    if (activeParent?.phone) return activeParent.phone;
    if (activeStudent?.phone) return activeStudent.phone;
    return '081234567890';
  }, [customPhone, activeParent, activeStudent]);

  // Format phone to international format without + for wa.me
  const formattedWaPhone = useMemo(() => {
    let cleaned = targetPhone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    } else if (cleaned.startsWith('8')) {
      cleaned = '62' + cleaned;
    }
    return cleaned;
  }, [targetPhone]);

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://smpn2kasihan.sch.id';
  const todayDateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Message templates
  const messageTemplates = useMemo(() => {
    const studentName = activeStudent?.name || 'Ananda';
    const parentName = activeParent?.name || `Bapak/Ibu Orang Tua ${studentName}`;
    const teacherName = currentTeacher?.name || 'Wali Kelas';
    const classLabel = className || activeStudent?.className || '7A';
    const journalDate = latestJournal?.date || todayDateStr;
    const score = latestJournal ? `${latestJournal.overallScore}% (${latestJournal.completedCount}/7 Kebiasaan)` : 'telah terisi';

    return [
      {
        id: 'standard',
        name: '⭐ Template Standar (Sopan & Apresiatif - Sesuai SOP)',
        desc: 'Format resmi sekolah untuk pengingat harian sore/malam hari.',
        text: `*PENGINGAT KONFIRMASI JURNAL 7 KAIH*\n*${SCHOOL_CONFIG.fullName}*\n\nYth. ${parentName},\nWali dari *${studentName}* (${classLabel})\n\n_Assalamu'alaikum Warahmatullahi Wabarakatuh / Selamat Malam._\n\nSemoga Bapak/Ibu senantiasa dalam keadaan sehat dan penuh berkah.\n\nKami menginformasikan bahwa ananda *${studentName}* telah mencatatkan Jurnal 7 Kebiasaan Anak Indonesia Hebat (7 KAIH) untuk tanggal *${journalDate}* dengan capaian *${score}*.\n\nSesuai SOP Pembiasaan Karakter SMP Negeri 2 Kasihan, mohon kesediaan Bapak/Ibu untuk meluangkan waktu 1-2 menit guna memvalidasi/mengonfirmasi jurnal ananda melalui tautan berikut:\n👉 *${appUrl}*\n\n_(Cukup klik tautan di atas, masuk ke akun Orang Tua, lalu periksa kebiasaan ananda)._\n\nPartisipasi dan pendampingan Bapak/Ibu di rumah sangat berarti bagi keteladanan serta pembentukan karakter ananda.\n\nTerima kasih atas kerjasama dan perhatian Bapak/Ibu.\n\n_Wassalamu'alaikum Warahmatullahi Wabarakatuh._\n\nSalam hormat,\n*${teacherName}*\nWali Kelas ${classLabel}\n${SCHOOL_CONFIG.name}`
      },
      {
        id: 'friendly',
        name: '💬 Template Ramah & Singkat (Quick Reminder)',
        desc: 'Format santai dan ringkas untuk pesan cepat.',
        text: `Selamat malam Bapak/Ibu ${parentName} 🙏\n\nAnanda *${studentName}* sudah mengisi Jurnal 7 KAIH hari ini (*${journalDate}*). Mohon bantuannya untuk klik konfirmasi di aplikasi ya Bapak/Ibu:\n👉 ${appUrl}\n\nTerima kasih banyak atas dukungannya selalu untuk pembiasaan baik ananda! ✨\n\nSalam hangat,\n*${teacherName}* (${classLabel})`
      },
      {
        id: 'followup',
        name: '⚠️ Template Tindak Lanjut (2-3 Hari Belum Validasi)',
        desc: 'Format tindak lanjut khusus untuk ananda yang beberapa hari belum dikonfirmasi.',
        text: `*PEMBERITAHUAN TAHAP II - EVALUASI PEMBIASAAN 7 KAIH*\n*${SCHOOL_CONFIG.fullName}*\n\nYth. Bapak/Ibu ${parentName},\nWali dari *${studentName}* (${classLabel})\n\nDengan hormat,\nBerdasarkan rekapitulasi sistem pemantauan karakter kelas ${classLabel}, kami mencatat jurnal ananda *${studentName}* belum mendapatkan konfirmasi orang tua dalam beberapa hari terakhir.\n\nMohon kesediaan Bapak/Ibu untuk memeriksa dan memberikan validasi melalui portal:\n👉 *${appUrl}*\n\nApabila Bapak/Ibu mengalami kendala teknis atau memerlukan bantuan, jangan ragu untuk menghubungi kami.\n\nTerima kasih atas perhatian dan kerjasamanya.\n\nSalam hormat,\n*${teacherName}*\nWali Kelas ${classLabel}`
      }
    ];
  }, [activeStudent, activeParent, currentTeacher, className, latestJournal, todayDateStr, appUrl]);

  // Selected message text
  const currentMessageText = useMemo(() => {
    if (customMessage) return customMessage;
    const tpl = messageTemplates.find(t => t.id === selectedTemplateId) || messageTemplates[0];
    return tpl.text;
  }, [customMessage, selectedTemplateId, messageTemplates]);

  // Broadcast text for class WhatsApp group
  const broadcastGroupText = useMemo(() => {
    const teacherName = currentTeacher?.name || 'Wali Kelas';
    const classLabel = className || '7A';
    const totalCount = allStudents.length;
    const validatedCount = allStudents.length - pendingStudents.length;

    let unconfirmedList = '';
    if (pendingStudents.length === 0) {
      unconfirmedList = '🎉 *Alhamdulillah! Seluruh orang tua telah memvalidasi jurnal ananda hari ini.*';
    } else {
      unconfirmedList = pendingStudents.map((s, idx) => {
        const pData = studentParentMap.get(s.id);
        const pName = pData?.parent?.name ? `(${pData.parent.name.split('(')[0].trim()})` : '';
        return `${idx + 1}. *${s.name}* ${pName}`;
      }).join('\n');
    }

    return `*REKAPITULASI JURNAL 7 KAIH KELAS ${classLabel}*\n*${SCHOOL_CONFIG.fullName}*\nTanggal: ${todayDateStr}\n\n_Assalamu'alaikum Warahmatullahi Wabarakatuh / Selamat Malam Bapak/Ibu Paguyuban Orang Tua Kelas ${classLabel}._\n\nBerikut kami sampaikan pembaruan status validasi Jurnal 7 Kebiasaan Anak Indonesia Hebat (7 KAIH) hari ini:\n\n📊 *Statistik Kelas:*\n• Total Siswa: ${totalCount} Siswa\n• Sudah Dikonfirmasi Ortu: ${validatedCount} Siswa (${totalCount > 0 ? Math.round((validatedCount/totalCount)*100) : 0}%)\n• Belum Dikonfirmasi Ortu: ${pendingStudents.length} Siswa\n\n📋 *Daftar Ananda yang Menunggu Konfirmasi Orang Tua:*\n${unconfirmedList}\n\nBagi Bapak/Ibu yang putera/puterinya tertera di atas, mohon kesediaannya meluangkan waktu 1-2 menit untuk membuka aplikasi dan memvalidasi kebiasaan ananda:\n👉 *${appUrl}*\n\nTerima kasih setulusnya atas bimbingan dan pendampingan tiada henti Bapak/Ibu di rumah.\n\nSalam hormat,\n*${teacherName}*\nWali Kelas ${classLabel}\n${SCHOOL_CONFIG.name}`;
  }, [allStudents, pendingStudents, studentParentMap, currentTeacher, className, todayDateStr, appUrl]);

  // Copy to clipboard helper
  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    audioNotifier.playSuccessChime();
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Open WhatsApp Link
  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(currentMessageText);
    const url = `https://wa.me/${formattedWaPhone}?text=${encoded}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white p-4 sm:p-5 flex items-center justify-between relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xs">
              <MessageCircle className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white border border-white/30">
                  SOP Komunikasi Wali Kelas
                </span>
                <span className="text-[11px] text-emerald-100 font-medium">
                  SMP Negeri 2 Kasihan
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Pengingat Konfirmasi Jurnal via WhatsApp
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4 pt-2 gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('personal')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'personal'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-[#1E293B] rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Kirim WA Personal (Japri)</span>
            {pendingStudents.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {pendingStudents.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'broadcast'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-[#1E293B] rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Rekap WA Grup Paguyuban Kelas</span>
          </button>

          <button
            onClick={() => setActiveTab('sop')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'sop'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-[#1E293B] rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Dokumen SOP Resmi Sekolah</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: PERSONAL WA REMINDER */}
          {activeTab === 'personal' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column: Student Selector */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    Pilih Siswa & Orang Tua
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    {pendingStudents.length} Belum Dikonfirmasi
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {allStudents.map(student => {
                    const sData = studentParentMap.get(student.id);
                    const isSelected = activeStudent?.id === student.id;
                    const isPending = sData?.isPendingParent;

                    return (
                      <div
                        key={student.id}
                        onClick={() => {
                          onSelectStudent(student);
                          setCustomMessage('');
                          setCustomPhone('');
                        }}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-xs ring-1 ring-emerald-500/20'
                            : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserAvatar
                            user={student}
                            gender={student.gender}
                            size="sm"
                            className="w-8 h-8 rounded-lg shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {student.name}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              Ortu: {sData?.parent?.name ? sData.parent.name.split('(')[0].trim() : 'Belum Terhubung'} • WA: {sData?.parent?.phone || student.phone || '-'}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 ml-2">
                          {isPending ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>Belum Konfirmasi</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Tervalidasi</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Info SOP Waktu Pengiriman */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 text-xs font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>SOP Waktu Pengingat WA</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
                    Disarankan mengirimkan pengingat antara pukul <strong>19.30 - 21.00 WIB</strong> saat orang tua telah selesai beristirahat atau berkumpul bersama keluarga di rumah.
                  </p>
                </div>
              </div>

              {/* Right Column: Message Composer & WA Trigger */}
              <div className="lg:col-span-7 space-y-3.5 bg-slate-50 dark:bg-slate-900/30 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                      <Send className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Kirim Pesan ke Ortu: {activeStudent?.name}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Target Nomor: <strong className="text-slate-800 dark:text-slate-200">{targetPhone}</strong> (WhatsApp)
                      </p>
                    </div>
                  </div>

                  {/* Template Picker */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-semibold hidden sm:inline">Template:</span>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => {
                        setSelectedTemplateId(e.target.value);
                        setCustomMessage('');
                      }}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                    >
                      {messageTemplates.map(t => (
                        <option key={t.id} value={t.id}>{t.name.split('(')[0]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Edit Phone if Needed */}
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 shrink-0 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    Nomor WhatsApp:
                  </label>
                  <input
                    type="text"
                    value={customPhone || targetPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Message Text Area */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Teks Pesan WhatsApp (Siap Kirim & Dapat Diedit):
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Format WhatsApp Markdown (*Tebal*, _Miring_)
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={currentMessageText}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 font-sans leading-relaxed resize-none shadow-inner"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2">
                  <button
                    onClick={() => handleCopyText(currentMessageText, 'personal-msg')}
                    className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedKey === 'personal-msg' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Berhasil Disalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Teks Pesan</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleOpenWhatsApp}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>Buka WhatsApp Langsung (Kirim Pesan)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BROADCAST REKAP GRUP WA KELAS */}
          {activeTab === 'broadcast' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5">
                  <Users className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                    Format Pesan Siaran Rekapitulasi Harian Grup Paguyuban Kelas
                  </h4>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
                    Gunakan teks siaran ini untuk dibagikan ke <strong>Grup WhatsApp Paguyuban Orang Tua Kelas {className}</strong> setiap sore/malam hari sebagai bentuk transparansi pembiasaan dan pengingat bersama yang santun.
                  </p>
                </div>
              </div>

              {/* Status Breakdown Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 font-semibold">Total Siswa Kelas</span>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {allStudents.length} Siswa
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">Sudah Divalidasi Orang Tua</span>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {allStudents.length - pendingStudents.length} Siswa
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                  <span className="text-[10px] text-rose-700 dark:text-rose-300 font-semibold">Menunggu Konfirmasi</span>
                  <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                    {pendingStudents.length} Siswa
                  </p>
                </div>
              </div>

              {/* Broadcast Preview Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Teks Rekapitulasi Grup WhatsApp:
                  </label>
                  <button
                    onClick={() => handleCopyText(broadcastGroupText, 'broadcast-text')}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    {copiedKey === 'broadcast-text' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Berhasil Disalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Teks Siaran Grup</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900 text-emerald-400 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[320px] overflow-y-auto">
                  {broadcastGroupText}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOKUMEN RESMI SOP SEKOLAH */}
          {activeTab === 'sop' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-4 rounded-xl flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                    Standar Operasional Prosedur (SOP) Pengingat Konfirmasi Jurnal Orang Tua
                  </h4>
                  <p className="text-[11px] text-indigo-800 dark:text-indigo-300/90">
                    Pedoman resmi komunikasi wali kelas dan orang tua murid dalam pengawalan program 7 Kebiasaan Anak Indonesia Hebat (7 KAIH) di {SCHOOL_CONFIG.fullName}.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* SOP 1 */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      Waktu & Frekuensi Pengingat
                    </h5>
                  </div>
                  <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside leading-relaxed pl-1">
                    <li>Pengingat harian disarankan dikirimkan pada <strong>pukul 19.30 - 21.00 WIB</strong>.</li>
                    <li>Hindari pengiriman di luar jam istirahat (di atas pukul 21.30 WIB) demi kenyamanan keluarga.</li>
                    <li>Pengingat dapat dilakukan melalui WhatsApp Personal (Japri) atau Rekap Siaran Grup Paguyuban.</li>
                  </ul>
                </div>

                {/* SOP 2 */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      Etika & Bahasa Komunikasi
                    </h5>
                  </div>
                  <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside leading-relaxed pl-1">
                    <li>Gunakan salam pembuka dan penutup resmi yang santun serta hangat.</li>
                    <li>Fokus pada <strong>apresiasi usaha ananda</strong>, bukan sekadar penagihan tugas.</li>
                    <li>Tekankan pentingnya pendampingan orang tua sebagai teladan pertama di rumah.</li>
                  </ul>
                </div>

                {/* SOP 3 */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      Eskalasi Jika Belum Konfirmasi 2-3 Hari
                    </h5>
                  </div>
                  <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside leading-relaxed pl-1">
                    <li><strong>Hari ke-1:</strong> Pengingat otomatis via WhatsApp menggunakan Template Standar.</li>
                    <li><strong>Hari ke-2:</strong> Pengingat khusus menggunakan Template Tindak Lanjut.</li>
                    <li><strong>Hari ke-3+:</strong> Wali kelas menghubungi orang tua secara langsung via panggilan telepon ramah tamah untuk menanyakan kemungkinan kendala gawai/akses.</li>
                  </ul>
                </div>

                {/* SOP 4 */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 text-xs font-bold flex items-center justify-center">
                      4
                    </span>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      Kerahasiaan & Keamanan Data (E2EE)
                    </h5>
                  </div>
                  <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside leading-relaxed pl-1">
                    <li>Catatan pribadi siswa dilindungi enkripsi standar E2EE.</li>
                    <li>Wali kelas menjaga privasi keluarga dan hanya mendiskusikan catatan kebiasaan dengan orang tua yang bersangkutan.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <Info className="w-4 h-4 text-emerald-600" />
            <span>Integrasi WhatsApp Web & Mobile • SOP Resmi {SCHOOL_CONFIG.name}</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs transition-all active:scale-98"
          >
            Tutup Jendela
          </button>
        </div>

      </div>
    </div>
  );
};
