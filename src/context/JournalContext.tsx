import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  JournalEntry, 
  HabitId, 
  ReminderSetting, 
  AppNotification, 
  ClassAnalysisSummary, 
  HabitKategoriLevel,
  User
} from '../types';
import { DEFAULT_REMINDERS, HABIT_LIST, isJournalParentValidated, calculateJournalScore } from '../lib/constants';
import { getDateString } from '../lib/mockData';
import { audioNotifier } from '../lib/audioNotifier';
import { E2EEService } from '../lib/crypto';
import { db, cleanForFirestore } from '../lib/firebase';
import { collection, setDoc, doc, onSnapshot, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { getDeletedUserIds } from './AuthContext';

interface JournalContextType {
  journals: JournalEntry[];
  reminders: ReminderSetting[];
  notifications: AppNotification[];
  unreadNotificationCount: number;
  activeReminderHabit: HabitId | null;
  
  // Journal Operations
  saveJournalEntry: (entry: Partial<JournalEntry> & { studentId: string; date: string }) => Promise<JournalEntry>;
  validateByParent: (
    journalId: string, 
    parentUser: User, 
    notes: string, 
    rating: number, 
    status?: 'valid' | 'invalid', 
    disputedHabits?: HabitId[]
  ) => Promise<void>;
  verifyHabitByParent: (
    journalId: string,
    habitId: HabitId,
    status: 'valid' | 'invalid',
    parentUser: User,
    reason?: string
  ) => Promise<void>;
  batchVerifyHabitsByParent: (
    journalId: string,
    verifications: Record<HabitId, { status: 'valid' | 'invalid'; reason?: string }>,
    parentUser: User,
    notes?: string
  ) => Promise<void>;
  giveTeacherFeedback: (journalId: string, teacherUser: User, notes: string, recommendation?: string, badge?: string) => Promise<void>;
  getStudentJournalByDate: (studentId: string, date: string) => JournalEntry | undefined;
  getStudentJournals: (studentId: string) => JournalEntry[];
  deleteJournal: (journalId: string) => Promise<void>;
  deleteJournalsBulk: (journalIds: string[]) => Promise<void>;
  deleteJournalsByStudentIds: (studentIds: string[]) => Promise<void>;
  purgeOrphanedJournals: (validStudentIds?: string[]) => Promise<{ deletedCount: number }>;
  clearAllJournals: () => Promise<void>;
  
  // Stats & Analytics
  getClassAnalysis: (classId: string, studentIds: string[], onlyValidated?: boolean) => ClassAnalysisSummary;
  getStudentStats: (studentId: string) => {
    avgScore: number;
    streak: number;
    completedEntries: number;
    kategoriLevel: HabitKategoriLevel;
    habitRadar: { habit: string; score: number; fullMark: number }[];
    weeklyTrend: { date: string; day: string; score: number; completed: number }[];
  };

  // Reminders & Notifications
  updateReminder: (habitId: HabitId, updates: Partial<ReminderSetting>) => void;
  dismissReminder: () => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
  sendCustomNotification: (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

const JOURNALS_STORAGE_KEY = '7kaih_journals_v2';
const DELETED_JOURNALS_STORAGE_KEY = '7kaih_deleted_journals_v1';
const REMINDERS_STORAGE_KEY = '7kaih_reminders_v1';
const NOTIFICATIONS_STORAGE_KEY = '7kaih_notifications_v1';

export const getDeletedJournalIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_JOURNALS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (e) {
    console.warn('Error reading deleted journals:', e);
  }
  return new Set();
};

export const markJournalsAsDeleted = (ids: string | string[]) => {
  try {
    const existing = getDeletedJournalIds();
    const idList = Array.isArray(ids) ? ids : [ids];
    idList.forEach(id => existing.add(id));
    localStorage.setItem(DELETED_JOURNALS_STORAGE_KEY, JSON.stringify(Array.from(existing)));
  } catch (e) {
    console.warn('Error marking journals as deleted:', e);
  }
};

// Global cross-tab and cross-window real-time broadcast helper
export const broadcastJournalUpdate = (entry: JournalEntry) => {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('7kaih_journal_sync_v1');
      channel.postMessage({ type: 'JOURNAL_SAVED', entry });
      channel.close();
    }
  } catch (e) {
    // Ignore broadcast errors
  }
  try {
    window.dispatchEvent(new CustomEvent('7kaih_journal_updated', { detail: entry }));
  } catch (e) {}
};

export const JournalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Clear any legacy seed data from v1
  useEffect(() => {
    try {
      localStorage.removeItem('7kaih_journals_v1');
    } catch (e) {
      console.warn('Storage cleanup:', e);
    }
  }, []);

  const [journals, setJournals] = useState<JournalEntry[]>(() => {
    const deletedIds = getDeletedJournalIds();
    const deletedUserIds = getDeletedUserIds();
    const saved = localStorage.getItem(JOURNALS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(j => !deletedIds.has(j.id) && !deletedUserIds.has(j.studentId));
        }
      } catch (e) {
        console.error('Failed to parse cached journals:', e);
      }
    }
    // Default to empty array - all monitoring data starts empty until filled
    return [];
  });

  const [reminders, setReminders] = useState<ReminderSetting[]>(() => {
    const saved = localStorage.getItem(REMINDERS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse reminders:', e);
      }
    }
    return DEFAULT_REMINDERS;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse notifications:', e);
      }
    }
    return [
      {
        id: 'notif-welcome',
        userId: 'all',
        title: '🌟 Selamat Datang di 7 KAIH!',
        message: 'Mulai bangun karakter unggul dengan mencatat 7 Kebiasaan Anak Indonesia Hebat setiap hari.',
        timestamp: Date.now() - 3600000,
        read: false,
        type: 'system'
      }
    ];
  });

  const [activeReminderHabit, setActiveReminderHabit] = useState<HabitId | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(JOURNALS_STORAGE_KEY, JSON.stringify(journals));
  }, [journals]);

  useEffect(() => {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  // Live Real-Time Multi-Tab & Cross-Window Synchronization
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('7kaih_journal_sync_v1');
        channel.onmessage = (event) => {
          if (event.data?.type === 'JOURNAL_SAVED' && event.data?.entry) {
            const entry = event.data.entry as JournalEntry;
            const deletedIds = getDeletedJournalIds();
            const deletedUserIds = getDeletedUserIds();
            if (!deletedIds.has(entry.id) && !deletedUserIds.has(entry.studentId)) {
              setJournals(prev => {
                const filtered = prev.filter(j => j.id !== entry.id);
                return [entry, ...filtered];
              });
            }
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel sync notice:', e);
    }

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === JOURNALS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            const deletedIds = getDeletedJournalIds();
            const deletedUserIds = getDeletedUserIds();
            setJournals(parsed.filter(j => !deletedIds.has(j.id) && !deletedUserIds.has(j.studentId)));
          }
        } catch (err) {
          console.warn('Storage sync error:', err);
        }
      }
    };

    const handleCustomJournalEvent = (e: any) => {
      if (e?.detail) {
        const entry = e.detail as JournalEntry;
        const deletedIds = getDeletedJournalIds();
        const deletedUserIds = getDeletedUserIds();
        if (!deletedIds.has(entry.id) && !deletedUserIds.has(entry.studentId)) {
          setJournals(prev => {
            const filtered = prev.filter(j => j.id !== entry.id);
            return [entry, ...filtered];
          });
        }
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    window.addEventListener('7kaih_journal_updated', handleCustomJournalEvent);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('7kaih_journal_updated', handleCustomJournalEvent);
      if (channel) {
        channel.close();
      }
    };
  }, []);

  // Firestore background sync & initial direct fetch
  useEffect(() => {
    if (!db) return;

    let isMounted = true;
    const journalsColRef = collection(db, 'journals');

    // 1. Direct initial fetch for instant cross-device visibility
    getDocs(journalsColRef).then((snapshot) => {
      if (!isMounted) return;
      const deletedIds = getDeletedJournalIds();
      const deletedUserIds = getDeletedUserIds();
      if (!snapshot.empty) {
        const firestoreJournals: JournalEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          if (!deletedIds.has(docSnap.id) && !deletedUserIds.has(data.studentId)) {
            firestoreJournals.push({ id: docSnap.id, ...data });
          }
        });
        setJournals(firestoreJournals.sort((a, b) => ((b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))));
      }
    }).catch(err => {
      console.warn('Firestore journals direct fetch notice:', err);
    });

    // 2. Real-time snapshot listener
    try {
      const unsub = onSnapshot(journalsColRef, (snapshot) => {
        if (!isMounted) return;
        const deletedIds = getDeletedJournalIds();
        const deletedUserIds = getDeletedUserIds();
        const firestoreJournals: JournalEntry[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          if (!deletedIds.has(docSnap.id) && !deletedUserIds.has(data.studentId)) {
            firestoreJournals.push({ id: docSnap.id, ...data });
          }
        });
        if (firestoreJournals.length > 0) {
          setJournals(firestoreJournals.sort((a, b) => ((b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))));
        }
      }, (err) => {
        console.warn('Firestore journals listener notice:', err);
      });
      return () => {
        isMounted = false;
        unsub();
      };
    } catch (e) {
      console.warn('Firestore init err:', e);
    }
  }, []);

  // Reminder interval check (checks every 30 seconds for matching HH:mm)
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      reminders.forEach((r) => {
        if (r.enabled && r.time === currentTimeStr) {
          const habitDef = HABIT_LIST.find(h => h.id === r.habitId);
          if (habitDef) {
            setActiveReminderHabit(r.habitId);
            if (r.sound) {
              audioNotifier.playReminderChime();
            }
            audioNotifier.triggerPushNotification(
              `Waktunya ${habitDef.shortName}!`,
              `${habitDef.tagline}. Jangan lupa catat di Jurnal 7 KAIH.`
            );
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [reminders]);

  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  const saveJournalEntry = async (
    entryData: Partial<JournalEntry> & { studentId: string; date: string }
  ): Promise<JournalEntry> => {
    const entryId = entryData.id || `journal-${entryData.studentId}-${entryData.date}`;
    
    // Calculate score factoring in 5 daily prayers (keterlaksanaan sholat lima waktu masuk hitungan dalam persentase)
    const scoreCalc = calculateJournalScore(entryData.habits, (entryData.habits as any)?.ibadah?.values?.religion);
    const overallScore = scoreCalc.overallScore;
    const kategoriLevel = scoreCalc.kategoriLevel;
    // completedCount: other habits completed + (1 if all mandatory prayers executed)
    const completedCount = scoreCalc.otherCompletedCount + (scoreCalc.worshipCount === scoreCalc.worshipTotal && scoreCalc.worshipTotal > 0 ? 1 : 0);

    // Handle E2EE encryption for reflection
    let encryptedReflection = entryData.encryptedReflection;
    let decryptedReflection = entryData.decryptedReflection;
    if (decryptedReflection && !encryptedReflection) {
      encryptedReflection = E2EEService.encrypt(decryptedReflection, entryData.studentId);
    } else if (encryptedReflection && !decryptedReflection) {
      decryptedReflection = E2EEService.decrypt(encryptedReflection, entryData.studentId);
    }

    const existing = journals.find(j => j.id === entryId);

    // Intelligently sync parentValidation when habits are changed by the student
    let updatedParentValidation = existing?.parentValidation;
    let nextStatus = entryData.status || (existing?.status === 'validated' ? 'validated' : 'submitted');

    if (updatedParentValidation) {
      const verifications = { ...(updatedParentValidation.habitVerifications || {}) };
      const disputedSet = new Set(updatedParentValidation.disputedHabits || []);
      let habitsModified = false;

      HABIT_LIST.forEach(h => {
        const prevHabit = existing?.habits?.[h.id];
        const newHabit = (entryData.habits as any)?.[h.id];
        const prevDone = prevHabit?.completed === true;
        const newDone = newHabit?.completed === true;

        // If the habit was updated to completed by the student
        if (newDone && !prevDone) {
          habitsModified = true;
          // Clear previous invalid/unfilled verification so parent sees it as freshly executed by student
          if (verifications[h.id]) {
            delete verifications[h.id];
          }
          if (disputedSet.has(h.id)) {
            disputedSet.delete(h.id);
          }
        } else if (!newDone && prevDone) {
          habitsModified = true;
          // If habit was marked uncompleted by student, clear old valid verification
          if (verifications[h.id]?.status === 'valid') {
            delete verifications[h.id];
          }
        } else if (newDone && verifications[h.id]?.reason === 'Tidak diisi oleh siswa') {
          // If it was marked unfilled earlier, clean it up
          habitsModified = true;
          delete verifications[h.id];
          disputedSet.delete(h.id);
        }
      });

      if (habitsModified) {
        updatedParentValidation = {
          ...updatedParentValidation,
          habitVerifications: verifications,
          disputedHabits: Array.from(disputedSet)
        };
        nextStatus = 'submitted';
      }
    }

    const fullEntry: JournalEntry = {
      id: entryId,
      studentId: entryData.studentId,
      studentName: entryData.studentName || 'Siswa',
      studentNis: entryData.studentNis || entryData.studentNisn,
      studentNisn: entryData.studentNisn || entryData.studentNis,
      studentAttendanceNo: entryData.studentAttendanceNo,
      className: entryData.className || '7A',
      date: entryData.date,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
      habits: entryData.habits as any,
      overallScore,
      completedCount,
      kategoriLevel,
      isEncrypted: true,
      encryptedReflection,
      decryptedReflection,
      photoProof: entryData.photoProof || existing?.photoProof,
      status: nextStatus,
      parentValidation: updatedParentValidation,
      teacherFeedback: existing?.teacherFeedback
    };

    // Update state immediately
    setJournals(prev => {
      const filtered = prev.filter(j => j.id !== entryId);
      return [fullEntry, ...filtered];
    });

    // Broadcast across all open browser tabs/windows
    broadcastJournalUpdate(fullEntry);

    // Add in-app notification
    sendCustomNotification({
      userId: entryData.studentId,
      targetRole: 'orangtua',
      title: '📝 Jurnal Harian Terkirim',
      message: `${fullEntry.studentName} telah mengisi jurnal 7 KAIH (${completedCount}/7 selesai, Skor: ${overallScore}%). Menunggu validasi orang tua.`,
      type: 'journal_submitted',
      linkDate: fullEntry.date,
      studentId: fullEntry.studentId
    });

    // Attempt cloud firestore write
    if (db) {
      try {
        await setDoc(doc(db, 'journals', entryId), cleanForFirestore(fullEntry));
      } catch (e) {
        console.warn('Firestore journal write fallback:', e);
      }
    }

    return fullEntry;
  };

  const validateByParent = async (
    journalId: string,
    parentUser: User,
    notes: string,
    rating: number,
    status: 'valid' | 'invalid' = 'valid',
    disputedHabits?: HabitId[]
  ): Promise<void> => {
    const target = journals.find(j => j.id === journalId);
    if (!target) return;

    const isValid = status === 'valid';
    const updated: JournalEntry = {
      ...target,
      status: isValid ? 'validated' : 'needs_revision',
      updatedAt: Date.now(),
      parentValidation: {
        validated: true,
        status: status,
        validatedAt: Date.now(),
        parentId: parentUser.id,
        parentName: parentUser.name,
        notes,
        rating: isValid ? rating : 0,
        signatureStatus: isValid,
        disputedHabits: disputedHabits || []
      }
    };

    setJournals(prev => prev.map(j => (j.id === journalId ? updated : j)));

    // Play sound
    if (isValid) {
      audioNotifier.playSuccessChime();
      audioNotifier.triggerPushNotification(
        '✅ Jurnal Disetujui Orang Tua!',
        `Orang tua (${parentUser.name}) mengonfirmasi Benar jurnal tanggal ${target.date}: "${notes || 'Sangat bagus!'}"`
      );
      sendCustomNotification({
        userId: target.studentId,
        targetRole: 'siswa',
        title: '🎉 Jurnal 7 KAIH Dikonfirmasi BENAR',
        message: `${parentUser.name} telah mengonfirmasi bahwa 7 KAIH telah dilakukan dengan jujur di rumah: "${notes || 'Hebat!'}" (Rating: ${rating}/5)`,
        type: 'validation',
        linkDate: target.date,
        studentId: target.studentId
      });
    } else {
      audioNotifier.playReminderChime();
      audioNotifier.triggerPushNotification(
        '⚠️ Catatan Perbaikan Jurnal',
        `Orang tua (${parentUser.name}) menandai catatan pada jurnal tanggal ${target.date}`
      );
      sendCustomNotification({
        userId: target.studentId,
        targetRole: 'siswa',
        title: '⚠️ Catatan Evaluasi dari Orang Tua',
        message: `${parentUser.name} menandai kebiasaan yang perlu diperbaiki: "${notes || 'Perlu bimbingan dan perbaikan'}"`,
        type: 'validation',
        linkDate: target.date,
        studentId: target.studentId
      });
    }

    if (db) {
      try {
        await setDoc(doc(db, 'journals', journalId), cleanForFirestore(updated), { merge: true });
      } catch (e) {
        console.warn('Firestore parent validation sync:', e);
      }
    }
  };

  const verifyHabitByParent = async (
    journalId: string,
    habitId: HabitId,
    status: 'valid' | 'invalid',
    parentUser: User,
    reason?: string
  ): Promise<void> => {
    const target = journals.find(j => j.id === journalId);
    if (!target) return;

    const currentVerifications = target.parentValidation?.habitVerifications || {};
    const updatedVerifications = {
      ...currentVerifications,
      [habitId]: {
        status,
        reason: status === 'invalid' ? (reason || 'Tidak dilaksanakan di rumah') : '',
        updatedAt: Date.now()
      }
    };

    // Calculate disputed habits
    const disputedHabits = (Object.keys(updatedVerifications) as HabitId[]).filter(
      hId => updatedVerifications[hId]?.status === 'invalid'
    );

    const hasAnyInvalid = disputedHabits.length > 0;
    const allVerifiedCount = Object.keys(updatedVerifications).length;
    const overallValidationStatus: 'valid' | 'invalid' | 'pending' = 
      hasAnyInvalid ? 'invalid' : (allVerifiedCount >= 7 ? 'valid' : 'valid');

    const updated: JournalEntry = {
      ...target,
      status: hasAnyInvalid ? 'needs_revision' : 'validated',
      updatedAt: Date.now(),
      parentValidation: {
        validated: true,
        status: overallValidationStatus,
        validatedAt: Date.now(),
        parentId: parentUser.id,
        parentName: parentUser.name,
        notes: target.parentValidation?.notes || (hasAnyInvalid ? 'Ada kebiasaan yang tidak sesuai di rumah.' : 'Semua kebiasaan terkonfirmasi benar.'),
        rating: target.parentValidation?.rating || (hasAnyInvalid ? 3 : 5),
        signatureStatus: !hasAnyInvalid,
        disputedHabits,
        habitVerifications: updatedVerifications
      }
    };

    setJournals(prev => prev.map(j => (j.id === journalId ? updated : j)));
    broadcastJournalUpdate(updated);

    if (db) {
      try {
        await setDoc(doc(db, 'journals', journalId), cleanForFirestore(updated), { merge: true });
      } catch (e) {
        console.warn('Firestore habit parent verify sync:', e);
      }
    }
  };

  const batchVerifyHabitsByParent = async (
    journalId: string,
    verifications: Record<HabitId, { status: 'valid' | 'invalid'; reason?: string }>,
    parentUser: User,
    notes?: string
  ): Promise<void> => {
    const target = journals.find(j => j.id === journalId);
    if (!target) return;

    const updatedVerifications: Record<string, { status: 'valid' | 'invalid'; reason: string; updatedAt: number }> = {};
    (Object.keys(verifications) as HabitId[]).forEach(hId => {
      const v = verifications[hId];
      if (v) {
        updatedVerifications[hId] = {
          status: v.status,
          reason: v.status === 'invalid' ? (v.reason || 'Tidak dilaksanakan di rumah') : '',
          updatedAt: Date.now()
        };
      }
    });

    const disputedHabits = (Object.keys(updatedVerifications) as HabitId[]).filter(
      hId => updatedVerifications[hId]?.status === 'invalid'
    );

    const hasAnyInvalid = disputedHabits.length > 0;

    const updated: JournalEntry = {
      ...target,
      status: hasAnyInvalid ? 'needs_revision' : 'validated',
      updatedAt: Date.now(),
      parentValidation: {
        validated: true,
        status: hasAnyInvalid ? 'invalid' : 'valid',
        validatedAt: Date.now(),
        parentId: parentUser.id,
        parentName: parentUser.name,
        notes: notes || (hasAnyInvalid ? 'Ada kebiasaan yang ditandai tidak dilaksanakan di rumah.' : 'Semua 7 kebiasaan terkonfirmasi dan disetujui orang tua.'),
        rating: hasAnyInvalid ? 3 : 5,
        signatureStatus: !hasAnyInvalid,
        disputedHabits,
        habitVerifications: updatedVerifications as any
      }
    };

    setJournals(prev => prev.map(j => (j.id === journalId ? updated : j)));
    broadcastJournalUpdate(updated);

    if (db) {
      try {
        await setDoc(doc(db, 'journals', journalId), cleanForFirestore(updated), { merge: true });
      } catch (e) {
        console.warn('Firestore batch parent verify sync:', e);
      }
    }
  };

  const giveTeacherFeedback = async (
    journalId: string,
    teacherUser: User,
    notes: string,
    recommendation?: string,
    badge?: string
  ): Promise<void> => {
    const target = journals.find(j => j.id === journalId);
    if (!target) return;

    const updated: JournalEntry = {
      ...target,
      updatedAt: Date.now(),
      teacherFeedback: {
        reviewed: true,
        reviewedAt: Date.now(),
        teacherId: teacherUser.id,
        teacherName: teacherUser.name,
        notes,
        recommendation,
        badgeAwarded: badge
      }
    };

    setJournals(prev => prev.map(j => (j.id === journalId ? updated : j)));

    sendCustomNotification({
      userId: target.studentId,
      targetRole: 'siswa',
      title: '👨‍🏫 Catatan Baru dari Wali Kelas',
      message: `${teacherUser.name}: "${notes}" ${badge ? `🎖️ Penghargaan: ${badge}` : ''}`,
      type: 'teacher_note',
      linkDate: target.date,
      studentId: target.studentId
    });

    if (db) {
      try {
        await setDoc(doc(db, 'journals', journalId), cleanForFirestore(updated), { merge: true });
      } catch (e) {
        console.warn('Firestore teacher feedback sync:', e);
      }
    }
  };

  const deleteJournal = async (journalId: string): Promise<void> => {
    markJournalsAsDeleted(journalId);
    setJournals(prev => {
      const updated = prev.filter(j => j.id !== journalId);
      localStorage.setItem(JOURNALS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (db) {
      try {
        await deleteDoc(doc(db, 'journals', journalId));
      } catch (e) {
        console.warn('Firestore delete journal sync:', e);
      }
    }
  };

  const deleteJournalsBulk = async (journalIds: string[]): Promise<void> => {
    if (!journalIds || journalIds.length === 0) return;
    markJournalsAsDeleted(journalIds);
    const idSet = new Set(journalIds);
    setJournals(prev => {
      const updated = prev.filter(j => !idSet.has(j.id));
      localStorage.setItem(JOURNALS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (db) {
      try {
        const batch = writeBatch(db);
        journalIds.forEach(id => {
          batch.delete(doc(db, 'journals', id));
        });
        await batch.commit();
      } catch (e) {
        console.warn('Firestore bulk delete journal sync:', e);
      }
    }
  };

  const deleteJournalsByStudentIds = async (studentIds: string[]): Promise<void> => {
    if (!studentIds || studentIds.length === 0) return;
    const studentSet = new Set(studentIds);
    
    // Find all journal entries belonging to these students
    const journalsToDelete = journals.filter(j => studentSet.has(j.studentId));
    const journalIdsToDelete = journalsToDelete.map(j => j.id);
    
    if (journalIdsToDelete.length > 0) {
      markJournalsAsDeleted(journalIdsToDelete);
    }
    
    // Remove from local state
    setJournals(prev => {
      const updated = prev.filter(j => !studentSet.has(j.studentId));
      localStorage.setItem(JOURNALS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // Also clean notifications related to these students
    setNotifications(prev => {
      const updated = prev.filter(n => !(n.studentId && studentSet.has(n.studentId)) && !(n.userId && studentSet.has(n.userId)));
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // Permanently delete matching journals from Firestore
    if (db) {
      try {
        const journalsSnapshot = await getDocs(collection(db, 'journals'));
        const batchList: Promise<void>[] = [];
        let currentBatch = writeBatch(db);
        let opCount = 0;

        journalsSnapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (studentSet.has(data.studentId) || journalIdsToDelete.includes(docSnap.id)) {
            currentBatch.delete(doc(db, 'journals', docSnap.id));
            opCount++;
            if (opCount >= 400) {
              batchList.push(currentBatch.commit());
              currentBatch = writeBatch(db);
              opCount = 0;
            }
          }
        });

        if (opCount > 0) {
          batchList.push(currentBatch.commit());
        }
        if (batchList.length > 0) {
          await Promise.all(batchList);
        }
      } catch (e) {
        console.warn('Firestore deleteJournalsByStudentIds sync error:', e);
      }
    }
  };

  const purgeOrphanedJournals = async (validStudentIds?: string[]): Promise<{ deletedCount: number }> => {
    let count = 0;
    const deletedIds = getDeletedJournalIds();
    const deletedUserIds = getDeletedUserIds();
    const validSet = validStudentIds ? new Set(validStudentIds) : null;

    // 1. Filter local journals
    setJournals(prev => {
      const updated = prev.filter(j => {
        const isDeletedId = deletedIds.has(j.id);
        const isDeletedStudent = deletedUserIds.has(j.studentId);
        const isInvalidStudent = validSet ? !validSet.has(j.studentId) : false;
        if (isDeletedId || isDeletedStudent || isInvalidStudent) {
          count++;
          return false;
        }
        return true;
      });
      localStorage.setItem(JOURNALS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // 2. Query Firestore and delete all orphaned/deleted journals
    if (db) {
      try {
        const snapshot = await getDocs(collection(db, 'journals'));
        const batchList: Promise<void>[] = [];
        let currentBatch = writeBatch(db);
        let opCount = 0;

        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          const isDeletedId = deletedIds.has(docSnap.id);
          const isDeletedStudent = deletedUserIds.has(data.studentId);
          const isInvalidStudent = validSet ? !validSet.has(data.studentId) : false;

          if (isDeletedId || isDeletedStudent || isInvalidStudent) {
            currentBatch.delete(doc(db, 'journals', docSnap.id));
            opCount++;
            if (opCount >= 400) {
              batchList.push(currentBatch.commit());
              currentBatch = writeBatch(db);
              opCount = 0;
            }
          }
        });

        if (opCount > 0) {
          batchList.push(currentBatch.commit());
        }
        if (batchList.length > 0) {
          await Promise.all(batchList);
        }
      } catch (e) {
        console.warn('Firestore purgeOrphanedJournals error:', e);
      }
    }

    return { deletedCount: count };
  };

  const clearAllJournals = async (): Promise<void> => {
    const currentJournals = [...journals];
    if (currentJournals.length > 0) {
      markJournalsAsDeleted(currentJournals.map(j => j.id));
    }
    setJournals([]);
    try {
      localStorage.removeItem(JOURNALS_STORAGE_KEY);
      localStorage.removeItem('7kaih_journals_v1');
    } catch (e) {
      console.warn('Local storage clear error:', e);
    }
    if (db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'journals'));
        const batch = writeBatch(db);
        querySnapshot.forEach((docSnap) => {
          batch.delete(doc(db, 'journals', docSnap.id));
        });
        await batch.commit();
      } catch (e) {
        console.warn('Firestore clear all journals sync:', e);
      }
    }
  };

  const getStudentJournalByDate = (studentId: string, date: string): JournalEntry | undefined => {
    return journals.find(j => j.studentId === studentId && j.date === date);
  };

  const getStudentJournals = (studentId: string): JournalEntry[] => {
    return journals
      .filter(j => j.studentId === studentId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getStudentStats = (studentId: string) => {
    const studentEntries = getStudentJournals(studentId);
    const totalCount = studentEntries.length;
    
    if (totalCount === 0) {
      return {
        avgScore: 0,
        streak: 0,
        completedEntries: 0,
        kategoriLevel: 'belum_terbiasa' as HabitKategoriLevel,
        habitRadar: HABIT_LIST.map(h => ({ habit: h.shortName, score: 0, fullMark: 100 })),
        weeklyTrend: []
      };
    }

    const totalScore = studentEntries.reduce((acc, curr) => acc + curr.overallScore, 0);
    const avgScore = Math.round(totalScore / totalCount);

    let kategoriLevel: HabitKategoriLevel = 'belum_terbiasa';
    if (avgScore >= 80) kategoriLevel = 'sudah_terbiasa';
    else if (avgScore >= 50) kategoriLevel = 'mulai_terbiasa';

    // Calculate streak
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const dStr = getDateString(i);
      const entry = studentEntries.find(e => e.date === dStr);
      if (entry && entry.overallScore >= 50) {
        streak++;
      } else if (i === 0) {
        // Today might not be filled yet, continue check yesterday
        continue;
      } else {
        break;
      }
    }

    // Habit radar score calculation
    const habitRadar = HABIT_LIST.map((habit) => {
      const completedTimes = studentEntries.filter(e => e.habits[habit.id]?.completed).length;
      const score = Math.round((completedTimes / totalCount) * 100);
      return {
        habit: habit.shortName,
        score,
        fullMark: 100
      };
    });

    // Weekly trend (last 7 days)
    const weeklyTrend: { date: string; day: string; score: number; completed: number }[] = [];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const entry = studentEntries.find(e => e.date === dStr);
      
      weeklyTrend.push({
        date: dStr,
        day: dayNames[d.getDay()],
        score: entry ? entry.overallScore : 0,
        completed: entry ? entry.completedCount : 0
      });
    }

    return {
      avgScore,
      streak,
      completedEntries: totalCount,
      kategoriLevel,
      habitRadar,
      weeklyTrend
    };
  };

  const getClassAnalysis = (classId: string, studentIds: string[], onlyValidated: boolean = true): ClassAnalysisSummary => {
    // Sesuai kebijakan: isian jurnal yang belum diverifikasi dan divalidasi oleh orang tua tidak masuk dalam rekapitulasi laporan
    const classEntries = journals.filter(j => 
      studentIds.includes(j.studentId) && (!onlyValidated || isJournalParentValidated(j))
    );
    const totalStudents = studentIds.length || 1;
    const totalEntries = classEntries.length;

    const habitScores: Record<HabitId, number> = {
      bangun_pagi: 0,
      ibadah: 0,
      olahraga: 0,
      makan_sehat: 0,
      membaca: 0,
      bermasyarakat: 0,
      istirahat: 0
    };

    if (totalEntries > 0) {
      HABIT_LIST.forEach(h => {
        const completed = classEntries.filter(e => e.habits[h.id]?.completed).length;
        habitScores[h.id] = Math.round((completed / totalEntries) * 100);
      });
    }

    const studentScoreMap = new Map<string, { score: number; count: number; name: string; missed: string[] }>();
    
    studentIds.forEach(id => {
      const userEntries = classEntries.filter(e => e.studentId === id);
      const name = userEntries[0]?.studentName || `Siswa ${id.slice(-4)}`;
      if (userEntries.length > 0) {
        const avg = Math.round(userEntries.reduce((a, b) => a + b.overallScore, 0) / userEntries.length);
        studentScoreMap.set(id, { score: avg, count: userEntries.length, name, missed: [] });
      } else {
        studentScoreMap.set(id, { score: 0, count: 0, name, missed: ['Belum mengisi jurnal'] });
      }
    });

    const categoryDistribution = {
      belum_terbiasa: 0,
      mulai_terbiasa: 0,
      sudah_terbiasa: 0
    };

    const studentSummaryList: any[] = [];
    studentScoreMap.forEach((val, id) => {
      let lvl: HabitKategoriLevel = 'belum_terbiasa';
      if (val.score >= 80) lvl = 'sudah_terbiasa';
      else if (val.score >= 50) lvl = 'mulai_terbiasa';
      
      categoryDistribution[lvl]++;
      studentSummaryList.push({
        studentId: id,
        studentName: val.name,
        score: val.score,
        streak: Math.min(val.count, 7),
        level: lvl,
        missedHabits: val.missed
      });
    });

    const overallClassAvg = Math.round(
      Array.from(studentScoreMap.values()).reduce((a, b) => a + b.score, 0) / totalStudents
    );

    const sortedByScore = [...studentSummaryList].sort((a, b) => b.score - a.score);
    const topPerformers = sortedByScore.slice(0, 5);
    const needsAttention = sortedByScore.filter(s => s.score < 60);

    return {
      classId,
      className: classId ? classId.replace('class-', '').toUpperCase() : '7A',
      totalStudents,
      totalEntries,
      averageScore: overallClassAvg,
      habitScores,
      categoryDistribution,
      topPerformers,
      needsAttention
    };
  };

  const updateReminder = (habitId: HabitId, updates: Partial<ReminderSetting>) => {
    setReminders(prev =>
      prev.map(r => (r.habitId === habitId ? { ...r, ...updates } : r))
    );
  };

  const dismissReminder = () => {
    setActiveReminderHabit(null);
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, ...readNotification(n) } : n))
    );
  };

  const readNotification = (n: AppNotification) => ({ ...n, read: true });

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const sendCustomNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      read: false,
      ...notif
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  return (
    <JournalContext.Provider
      value={{
        journals,
        reminders,
        notifications,
        unreadNotificationCount,
        activeReminderHabit,
        saveJournalEntry,
        validateByParent,
        verifyHabitByParent,
        batchVerifyHabitsByParent,
        giveTeacherFeedback,
        getStudentJournalByDate,
        getStudentJournals,
        deleteJournal,
        deleteJournalsBulk,
        deleteJournalsByStudentIds,
        purgeOrphanedJournals,
        clearAllJournals,
        getClassAnalysis,
        getStudentStats,
        updateReminder,
        dismissReminder,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotifications,
        sendCustomNotification
      }}
    >
      {children}
    </JournalContext.Provider>
  );
};

export const useJournal = () => {
  const context = useContext(JournalContext);
  if (!context) {
    throw new Error('useJournal must be used within a JournalProvider');
  }
  return context;
};
