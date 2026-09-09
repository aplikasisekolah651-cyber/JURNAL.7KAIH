import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { DEMO_USERS } from '../lib/constants';
import { E2EEService } from '../lib/crypto';
import { db, cleanForFirestore, safeFirestoreWrite, isFirestoreQuotaExceeded, markFirestoreQuotaExceeded, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { 
  getUserAvatarUrl, 
  getRoleDefaultAvatar, 
  DATA_URI_SISWA_PUTRA, 
  DATA_URI_SISWA_PUTRI, 
  DATA_URI_ORANG_TUA, 
  DATA_URI_WALI_KELAS, 
  DATA_URI_ADMIN 
} from '../lib/avatarHelper';

interface AuthContextType {
  currentUser: User;
  isAuthenticated: boolean;
  allUsers: User[];
  login: (identifier: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  setCurrentUser: (user: User) => void;
  switchUser: (userId: string) => void;
  switchRole: (role: UserRole) => void;
  addUser: (userData: Partial<User>) => Promise<User>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  deleteUsersBulk: (userIds: string[]) => Promise<void>;
  purgeDeletedUsersAndOrphansFromCloud: () => Promise<{ deletedUsersCount: number; deletedJournalsCount: number }>;
  syncAllUsersToCloud: (usersToSync?: User[]) => Promise<{ count: number; success: boolean }>;
  importStudentsBulk: (importedList: { 
    name: string; 
    nis?: string; 
    nisn?: string; 
    attendanceNumber?: string; 
    noAbsen?: string; 
    className: string; 
    gender?: 'L' | 'P'; 
    religion?: string;
    parentName?: string; 
    parentPhone?: string 
  }[]) => Promise<number>;
  importTeachersBulk: (importedList: {
    name: string;
    nip?: string;
    className: string;
    gender?: 'L' | 'P';
    phone?: string;
    username?: string;
    password?: string;
  }[]) => Promise<number>;
  generateNewCredentials: (userId: string) => Promise<string>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  syncParentAccounts: () => Promise<{ createdCount: number; updatedCount: number }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = '7kaih_users_v1';
const DELETED_USERS_STORAGE_KEY = '7kaih_deleted_users_v1';
const AUTH_SESSION_KEY = '7kaih_auth_session_v1';

// Blacklist of permanent target deleted users & identifiers
export const PURGED_USER_IDS = new Set<string>([
  'usr-siswa-1',
  'usr-siswa-2',
  'usr-siswa-3',
  'usr-siswa-4',
  'usr-ortu-1',
  'usr-ortu-2',
  'usr-ortu-3',
  'usr-ortu-4',
  'usr-walikelas-2'
]);

export const PURGED_IDENTIFIERS = new Set<string>([
  '8923', '8924', '8925', '8926',
  'ortu.8923', 'ortu.8924', 'ortu.8925', 'ortu.8926',
  'wali.7b'
]);

export const isTargetPurgedUser = (u: any): boolean => {
  if (!u) return false;
  if (u.id && PURGED_USER_IDS.has(String(u.id))) return true;
  if (u.nis && PURGED_IDENTIFIERS.has(String(u.nis).trim())) return true;
  if (u.nisn && PURGED_IDENTIFIERS.has(String(u.nisn).trim())) return true;
  if (u.email && PURGED_IDENTIFIERS.has(String(u.email).trim().toLowerCase())) return true;
  
  const name = String(u.name || '').toLowerCase().trim();
  if (name.includes('budi santoso')) return true;
  if (name.includes('ahmad rizky pratama') || name.includes('ahmad rizky')) return true;
  if (name.includes('nadia salsabila') || name.includes('nadla salsabila')) return true;
  if (name.includes('dimas bagus wicaksono') || name.includes('dimas bagus')) return true;
  if (name.includes('kirana zahra larasati') || name.includes('kirana zahra')) return true;
  if (name.includes('hendra pratama')) return true;
  if (name.includes('ratna dewi')) return true;
  if (name.includes('wicaksono (ortu') || name.includes('ortu dimas')) return true;
  if (name.includes('larasati (ortu') || name.includes('ortu kirana')) return true;
  
  return false;
};

export const getDeletedUserIds = (): Set<string> => {
  const set = new Set<string>(PURGED_USER_IDS);
  try {
    const raw = localStorage.getItem(DELETED_USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(id => set.add(id));
      }
    }
  } catch (e) {
    console.warn('Error reading deleted users:', e);
  }
  return set;
};

export const markUsersAsDeleted = (ids: string | string[]) => {
  try {
    const existing = getDeletedUserIds();
    const idList = Array.isArray(ids) ? ids : [ids];
    idList.forEach(id => existing.add(id));
    localStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(Array.from(existing)));
  } catch (e) {
    console.warn('Error marking users as deleted:', e);
  }
};

export const normalizeReligionName = (religion?: string): string => {
  if (!religion) return 'Islam';
  const clean = religion.trim().toLowerCase();
  if (clean.includes('kristen') || clean.includes('protestan')) return 'Kristen';
  if (clean.includes('katolik')) return 'Katolik';
  if (clean.includes('hindu')) return 'Hindu';
  if (clean.includes('buddha') || clean.includes('budha')) return 'Buddha';
  if (clean.includes('konghucu') || clean.includes('khonghucu')) return 'Konghucu';
  return 'Islam';
};

export const normalizeClassName = (cn?: string): string => {
  if (!cn) return '';
  let clean = String(cn).trim().replace(/\s+/g, ' ');
  // Unify by stripping leading "Kelas", "Rombel", "Rombongan Belajar", "Kl." (case-insensitive)
  clean = clean.replace(/^(kelas|rombel|rombongan\s*belajar|kl\.?)\s*[-:]?\s*/i, '').trim();
  return clean;
};

export const normalizeClassCode = (cn?: string): string => {
  if (!cn) return '';
  const str = String(cn).toLowerCase();
  const match = str.match(/([7-9])\s*([a-z])/);
  if (match) {
    return `${match[1]}${match[2]}`;
  }
  return str.replace(/[^a-z0-9]/g, '');
};

/**
 * Ekstraksi angka nomor absen untuk pengurutan numerik yang akurat (1, 2, ... 10, dst)
 */
export const getAbsenSortValue = (u?: { attendanceNumber?: string; noAbsen?: string } | null): number => {
  if (!u) return 9999;
  const val = u.attendanceNumber || u.noAbsen;
  if (!val) return 9999;
  const clean = String(val).trim();
  const parsed = parseInt(clean.replace(/\D/g, ''), 10);
  return isNaN(parsed) ? 9999 : parsed;
};

/**
 * Pembanding urutan siswa:
 * 1. Kelas (jika lintas kelas, misal 7A sebelum 7B)
 * 2. Urut Nomor Absen numerik (01, 02, 03... 32)
 * 3. Fallback NIS numerik
 * 4. Fallback Alfabet nama siswa
 */
export const compareStudentsByAbsen = (a: User, b: User): number => {
  // 1. Urutkan berdasarkan Kelas jika kelas berbeda
  const classA = normalizeClassName(a.className) || a.className || '';
  const classB = normalizeClassName(b.className) || b.className || '';
  if (classA !== classB) {
    const classComp = classA.localeCompare(classB, undefined, { numeric: true, sensitivity: 'base' });
    if (classComp !== 0) return classComp;
  }

  // 2. Urutkan berdasarkan Nomor Absen secara numerik
  const absenA = getAbsenSortValue(a);
  const absenB = getAbsenSortValue(b);
  if (absenA !== absenB) {
    return absenA - absenB;
  }

  // 3. Fallback NIS
  const nisA = parseInt(String(a.nis || a.nisn || '0').replace(/\D/g, ''), 10) || 0;
  const nisB = parseInt(String(b.nis || b.nisn || '0').replace(/\D/g, ''), 10) || 0;
  if (nisA !== nisB && nisA > 0 && nisB > 0) {
    return nisA - nisB;
  }

  // 4. Fallback Nama alfabetis
  return (a.name || '').localeCompare(b.name || '', 'id-ID', { sensitivity: 'base' });
};

/**
 * Standardize Orang Tua accounts:
 * - Username: ortu.[NIS]
 * - Password: ortu[NIS]
 * - Automatically ensures every student with a NIS has a linked parent account.
 */
export const ensureParentCredentialsConsistent = (userList: User[]): { updatedUsers: User[]; hasChanges: boolean } => {
  let hasChanges = false;
  const deletedIds = getDeletedUserIds();
  const validUsers = userList.filter(u => !deletedIds.has(u.id) && !isTargetPurgedUser(u));
  const students = validUsers.filter(u => u.role === 'siswa');
  const parentMap = new Map<string, User>();
  const otherUsers: User[] = [];

  validUsers.forEach(u => {
    if (u.role === 'orangtua') {
      parentMap.set(u.id, { ...u });
    } else if (u.role !== 'siswa') {
      otherUsers.push(u);
    }
  });

  const updatedStudents: User[] = [];

  students.forEach(student => {
    const studentNis = (student.nis || student.nisn || '').trim();
    if (!studentNis) {
      updatedStudents.push(student);
      return;
    }

    const expectedEmail = `ortu.${studentNis}`;
    const expectedPassword = `ortu${studentNis}`;

    // Find parent linked by parentId, studentIds, email, or id
    let matchedParent = Array.from(parentMap.values()).find(p => 
      (student.parentId && p.id === student.parentId) || 
      (p.studentIds && p.studentIds.includes(student.id)) ||
      p.email?.toLowerCase() === expectedEmail.toLowerCase() ||
      p.email?.toLowerCase() === `ortu${studentNis}`.toLowerCase() ||
      p.id === `usr-ortu-${studentNis}`
    );

    let currentStudent = { ...student };

    if (matchedParent) {
      const currentPwd = matchedParent.password || '';
      const currentEmail = matchedParent.email || '';
      let parentUpdated = false;

      // Always standardize username to ortu.[NIS]
      if (currentEmail !== expectedEmail) {
        matchedParent.email = expectedEmail;
        parentUpdated = true;
      }
      
      // Enforce password to ortu[NIS] if empty, default, or starts with ortu
      if (!currentPwd || currentPwd === 'ortu123#Secure' || currentPwd === 'ortu123#' || currentPwd === 'ortu123' || currentPwd.toLowerCase().startsWith('ortu')) {
        if (currentPwd !== expectedPassword) {
          matchedParent.password = expectedPassword;
          parentUpdated = true;
        }
      }

      if (!matchedParent.studentIds || !matchedParent.studentIds.includes(student.id)) {
        matchedParent.studentIds = Array.from(new Set([...(matchedParent.studentIds || []), student.id]));
        parentUpdated = true;
      }

      if (currentStudent.parentId !== matchedParent.id) {
        currentStudent.parentId = matchedParent.id;
        hasChanges = true;
      }

      if (parentUpdated) {
        parentMap.set(matchedParent.id, matchedParent);
        hasChanges = true;
      }
    } else {
      // Check if this parent or student's parent account was deleted by admin
      const newParentId = `usr-ortu-${studentNis}`;
      if (
        deletedIds.has(newParentId) || 
        (student.parentId && deletedIds.has(student.parentId)) || 
        deletedIds.has(expectedEmail) || 
        deletedIds.has(`usr-ortu-${student.id}`)
      ) {
        updatedStudents.push(currentStudent);
        return;
      }

      // Auto-generate missing parent for student with NIS
      const pName = student.parentName ? (student.parentName.includes('(Ortu') ? student.parentName : `${student.parentName} (Ortu ${student.name})`) : `Orang Tua dari ${student.name}`;
      const newParent: User = {
        id: newParentId,
        name: pName,
        email: expectedEmail,
        role: 'orangtua',
        studentIds: [student.id],
        phone: student.parentPhone || student.phone || '08123456789',
        avatar: DATA_URI_ORANG_TUA,
        password: expectedPassword,
        schoolName: student.schoolName || 'SMP Negeri 2 Kasihan',
        createdAt: new Date().toISOString()
      };
      parentMap.set(newParentId, newParent);
      currentStudent.parentId = newParentId;
      hasChanges = true;
    }

    updatedStudents.push(currentStudent);
  });

  // Deduplicate parents in parentMap by email and id
  const uniqueParents = new Map<string, User>();
  parentMap.forEach((p) => {
    const pKey = (p.email?.toLowerCase().trim() || p.id);
    if (!uniqueParents.has(pKey)) {
      uniqueParents.set(pKey, p);
    } else {
      // Merge studentIds into the existing one
      const existing = uniqueParents.get(pKey)!;
      existing.studentIds = Array.from(new Set([...(existing.studentIds || []), ...(p.studentIds || [])]));
      hasChanges = true;
    }
  });

  const allUpdated = [...otherUsers, ...updatedStudents, ...Array.from(uniqueParents.values())];
  return { updatedUsers: allUpdated, hasChanges };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const deletedIds = getDeletedUserIds();
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed: User[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed
            .filter(u => !deletedIds.has(u.id) && !isTargetPurgedUser(u))
            .map(u => ({
              ...u,
              className: u.className ? (normalizeClassName(u.className) || u.className) : u.className,
              avatar: getUserAvatarUrl(u)
            }));
          if (filtered.length > 0) {
            const { updatedUsers } = ensureParentCredentialsConsistent(filtered);
            return updatedUsers;
          }
        }
      } catch (e) {
        console.error('Failed to parse cached users:', e);
      }
    }
    const baseUsers = DEMO_USERS
      .filter(u => !deletedIds.has(u.id) && !isTargetPurgedUser(u))
      .map(u => ({
        ...u,
        className: u.className ? (normalizeClassName(u.className) || u.className) : u.className,
        avatar: getUserAvatarUrl(u)
      }));
    const { updatedUsers } = ensureParentCredentialsConsistent(baseUsers);
    return updatedUsers;
  });

  const [currentUser, setCurrentUserState] = useState<User>(() => {
    const deletedIds = getDeletedUserIds();
    const sessionUserId = localStorage.getItem(AUTH_SESSION_KEY);
    if (sessionUserId) {
      const match = allUsers.find(u => u.id === sessionUserId);
      if (match && !deletedIds.has(match.id) && !isTargetPurgedUser(match)) {
        return match;
      } else {
        localStorage.removeItem(AUTH_SESSION_KEY);
      }
    }
    const defaultUser = allUsers.find(u => u.role === 'admin') || allUsers[0] || DEMO_USERS[0];
    return defaultUser;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const sessionUserId = localStorage.getItem(AUTH_SESSION_KEY);
    if (!sessionUserId) return false;
    const deletedIds = getDeletedUserIds();
    return !deletedIds.has(sessionUserId) && !PURGED_USER_IDS.has(sessionUserId);
  });

  // Startup Cleanup: Immediately purge cache & cloud database
  useEffect(() => {
    try {
      const deletedIds = getDeletedUserIds();
      // 1. Purge local storage users cache
      const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
      if (rawUsers) {
        try {
          const parsed = JSON.parse(rawUsers);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(u => !deletedIds.has(u.id) && !isTargetPurgedUser(u));
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(cleaned));
          }
        } catch (e) {
          // ignore
        }
      }

      // 2. Purge local storage journals cache
      const rawJournals = localStorage.getItem('7kaih_journals_v2');
      if (rawJournals) {
        try {
          const parsedJ = JSON.parse(rawJournals);
          if (Array.isArray(parsedJ)) {
            const cleanedJ = parsedJ.filter(j => !deletedIds.has(j.studentId) && !PURGED_USER_IDS.has(j.studentId) && !PURGED_IDENTIFIERS.has(j.studentId));
            localStorage.setItem('7kaih_journals_v2', JSON.stringify(cleanedJ));
          }
        } catch (e) {
          // ignore
        }
      }

      // 3. Purge session if pointed to deleted user
      const session = localStorage.getItem(AUTH_SESSION_KEY);
      if (session && (deletedIds.has(session) || PURGED_USER_IDS.has(session))) {
        localStorage.removeItem(AUTH_SESSION_KEY);
      }

      // 4. Cloud Firestore thorough purge for target deleted records (run only once and if quota not exceeded)
      if (db && !isFirestoreQuotaExceeded()) {
        const hasPurged = localStorage.getItem('has_purged_firestore_v4');
        if (!hasPurged) {
          localStorage.setItem('has_purged_firestore_v4', 'true');
          const purgeFirestore = async () => {
            await safeFirestoreWrite(async () => {
              // Delete target document IDs directly
              const batch = writeBatch(db);
              PURGED_USER_IDS.forEach(uid => {
                batch.delete(doc(db, 'users', uid));
              });
              await batch.commit();

              // Query users collection to catch any docs matching names or NIS
              const userDocs = await getDocs(collection(db, 'users'));
              if (!userDocs.empty) {
                const uBatch = writeBatch(db);
                let uCount = 0;
                userDocs.forEach(d => {
                  const data = d.data();
                  if (isTargetPurgedUser({ id: d.id, ...data })) {
                    uBatch.delete(doc(db, 'users', d.id));
                    uCount++;
                  }
                });
                if (uCount > 0) {
                  await uBatch.commit();
                  console.log(`[Firestore] Cleaned up ${uCount} purged user docs.`);
                }
              }

              // Query journals collection to cascade delete entries belonging to purged students
              const journalDocs = await getDocs(collection(db, 'journals'));
              if (!journalDocs.empty) {
                const jBatch = writeBatch(db);
                let jCount = 0;
                journalDocs.forEach(jd => {
                  const jData = jd.data();
                  if (PURGED_USER_IDS.has(jData.studentId) || PURGED_IDENTIFIERS.has(jData.studentId)) {
                    jBatch.delete(doc(db, 'journals', jd.id));
                    jCount++;
                  }
                });
                if (jCount > 0) {
                  await jBatch.commit();
                  console.log(`[Firestore] Cleaned up ${jCount} purged journal docs.`);
                }
              }
            });
          };
          purgeFirestore();
        }
      }
    } catch (err) {
      console.warn('Initial cleanup error:', err);
    }
  }, []);

  // Sync users to localStorage whenever allUsers changes
  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(allUsers));
    } catch (e) {
      console.warn('LocalStorage users sync warning:', e);
    }
  }, [allUsers]);

  // One-time startup check: standardizes all parent accounts to ortu.[NIS] and ortu[NIS]
  useEffect(() => {
    const { updatedUsers, hasChanges } = ensureParentCredentialsConsistent(allUsers);
    if (hasChanges) {
      setAllUsers(updatedUsers);
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
      } catch (e) {
        console.warn('LocalStorage sync parent warning:', e);
      }
      if (db && !isFirestoreQuotaExceeded()) {
        const parents = updatedUsers.filter(u => u.role === 'orangtua');
        safeFirestoreWrite(async () => {
          const batch = writeBatch(db);
          parents.forEach(p => {
            batch.set(doc(db, 'users', p.id), cleanForFirestore(p), { merge: true });
          });
          await batch.commit();
        }).catch(e => console.warn('Sync consistent parents to cloud warning:', e));
      }
    }
  }, []);

  // Helper to safely merge remote users from Firestore with local state
  const mergeFirestoreUsers = (prevUsers: User[], firestoreUsers: User[]): User[] => {
    const deletedIds = getDeletedUserIds();
    const map = new Map<string, User>();
    
    // 1. Put demo admin and teachers as safety fallbacks only if not deleted
    DEMO_USERS
      .filter(u => (u.role === 'admin' || u.role === 'walikelas') && !deletedIds.has(u.id) && !isTargetPurgedUser(u))
      .forEach(u => {
        map.set(u.id, {
          ...u,
          avatar: getUserAvatarUrl(u)
        });
      });

    // 2. Put existing local non-deleted users
    prevUsers
      .filter(u => !deletedIds.has(u.id) && !isTargetPurgedUser(u))
      .forEach(u => {
        map.set(u.id, {
          ...u,
          className: u.className ? normalizeClassName(u.className) : u.className,
          avatar: getUserAvatarUrl(u)
        });
      });

    // 3. Put remote firestore users (Cloud is authoritative) only if not deleted
    firestoreUsers
      .filter(u => !deletedIds.has(u.id) && !isTargetPurgedUser(u))
      .forEach(u => {
        map.set(u.id, {
          ...u,
          className: u.className ? normalizeClassName(u.className) : u.className,
          avatar: getUserAvatarUrl(u)
        });
      });

    const rawList = Array.from(map.values());
    const { updatedUsers } = ensureParentCredentialsConsistent(rawList);
    return updatedUsers;
  };

  // Seed default demo users to Firestore if collection is empty (guard with quota & local cache)
  const seedDemoUsersToFirestore = async () => {
    if (!db || isFirestoreQuotaExceeded()) return;
    try {
      const alreadySeeded = localStorage.getItem('demo_users_seeded_v3');
      if (alreadySeeded) return;
      localStorage.setItem('demo_users_seeded_v3', 'true');

      const deletedIds = getDeletedUserIds();
      const nonDeletedDemoUsers = DEMO_USERS.filter(u => !deletedIds.has(u.id) && !isTargetPurgedUser(u));
      if (nonDeletedDemoUsers.length === 0) return;

      await safeFirestoreWrite(async () => {
        const batch = writeBatch(db);
        nonDeletedDemoUsers.forEach(u => {
          batch.set(doc(db, 'users', u.id), cleanForFirestore(u));
        });
        await batch.commit();
        console.log('Seeded initial DEMO_USERS to Cloud Firestore');
      });
    } catch (err) {
      console.warn('Error seeding demo users to Firestore:', err);
    }
  };

  // Real-time Firestore sync listener & initial fetch
  useEffect(() => {
    if (!db) return;

    let isMounted = true;
    const usersColRef = collection(db, 'users');

    // 1. Immediate direct fetch from Firestore (skip if quota is known to be exceeded)
    if (!isFirestoreQuotaExceeded()) {
      getDocs(usersColRef).then((snapshot) => {
        if (!isMounted) return;
        const deletedIds = getDeletedUserIds();
        if (!snapshot.empty) {
          const firestoreUsers: User[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const candidate = { id: docSnap.id, ...(data as any) };
            if (!deletedIds.has(docSnap.id) && !isTargetPurgedUser(candidate)) {
              firestoreUsers.push(candidate);
            }
          });
          if (firestoreUsers.length > 0) {
            setAllUsers(prev => mergeFirestoreUsers(prev, firestoreUsers));
          }
        } else {
          // Firestore is empty: auto-seed demo accounts so they work across all devices
          seedDemoUsersToFirestore();
        }
      }).catch((err) => {
        const msg = err?.message || String(err);
        if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded') || msg.includes('quota')) {
          markFirestoreQuotaExceeded(msg);
        }
        console.warn('Firestore users direct fetch notice:', err);
      });
    }

    // 2. Real-time snapshot listener across all connected devices
    try {
      const unsub = onSnapshot(usersColRef, (snapshot) => {
        if (!isMounted) return;
        const deletedIds = getDeletedUserIds();
        const firestoreUsers: User[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const candidate = { id: docSnap.id, ...(data as any) };
          if (!deletedIds.has(docSnap.id) && !isTargetPurgedUser(candidate)) {
            firestoreUsers.push(candidate);
          }
        });
        if (firestoreUsers.length > 0) {
          setAllUsers(prev => mergeFirestoreUsers(prev, firestoreUsers));
        }
      }, (err) => {
        const msg = err?.message || String(err);
        if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded') || msg.includes('quota')) {
          markFirestoreQuotaExceeded(msg);
        }
        console.warn('Firestore users listener notice:', err);
      });
      return () => {
        isMounted = false;
        unsub();
      };
    } catch (e) {
      console.warn('Firestore users init err:', e);
    }
  }, []);

  // Force Push / Sync All In-Memory Users to Cloud Firestore
  const syncAllUsersToCloud = async (usersToSync?: User[]): Promise<{ count: number; success: boolean }> => {
    const list = usersToSync || allUsers;
    if (!db || list.length === 0) return { count: 0, success: false };
    if (isFirestoreQuotaExceeded()) {
      console.warn('[Firestore] Quota exceeded. Skipping syncAllUsersToCloud.');
      return { count: 0, success: false };
    }

    try {
      const chunkSize = 100;
      for (let i = 0; i < list.length; i += chunkSize) {
        const chunk = list.slice(i, i + chunkSize);
        await safeFirestoreWrite(async () => {
          const batch = writeBatch(db);
          chunk.forEach(u => {
            batch.set(doc(db, 'users', u.id), cleanForFirestore(u));
          });
          await batch.commit();
        });
      }
      console.log(`Successfully synced all ${list.length} users to Cloud Firestore`);
      return { count: list.length, success: true };
    } catch (e) {
      console.error('Error syncing all users to Firestore:', e);
      return { count: 0, success: false };
    }
  };

  const findUserByIdentifier = (userList: User[], cleaned: string, rawPassword?: string): User | undefined => {
    // Strip brackets e.g. ortu.[2401] -> ortu.2401, [2401] -> 2401
    const unbracketed = cleaned.replace(/[\[\]]/g, '');
    const rawClean = unbracketed.replace(/\s+/g, '');
    const cleanNoSpecial = unbracketed.replace(/[^a-z0-9]/g, '');
    const cleanPwd = (rawPassword || '').trim().toLowerCase().replace(/[\[\]]/g, '');

    // 1. Check if user typed role-specific prefix or intent
    const isParentIntent = unbracketed.startsWith('ortu') || cleanPwd.startsWith('ortu');
    const isTeacherIntent = unbracketed.startsWith('wali') || unbracketed.startsWith('guru');
    const isAdminIntent = unbracketed.startsWith('admin');

    // Priority 1: Direct matches based on explicit role intent
    if (isTeacherIntent) {
      const teacherTargetCode = normalizeClassCode(unbracketed.replace(/^(wali|guru)[._-]*/, ''));
      const foundTeacher = userList.find(u => {
        if (u.role !== 'walikelas') return false;
        const uClassCode = normalizeClassCode(u.className);
        const uAssigned = (u.assignedClassIds || []).map(id => normalizeClassCode(id));
        const uEmail = (u.email || '').toLowerCase().trim();
        const uName = (u.name || '').toLowerCase().trim();

        if (teacherTargetCode && (uClassCode === teacherTargetCode || uAssigned.includes(teacherTargetCode))) return true;
        if (uEmail === unbracketed || uEmail.replace(/[^a-z0-9]/g, '') === cleanNoSpecial) return true;
        if (uName.includes(unbracketed) || unbracketed.includes(uName)) return true;
        return false;
      });
      if (foundTeacher) return foundTeacher;
    }

    if (isParentIntent) {
      const parentTargetNis = unbracketed.replace(/^ortu[._-]*/, '').replace(/[^0-9]/g, '') ||
                              cleanPwd.replace(/^ortu[._-]*/, '').replace(/[^0-9]/g, '');
      const foundParent = userList.find(u => {
        if (u.role !== 'orangtua') return false;
        const uEmail = (u.email || '').toLowerCase().trim();
        const uPhone = (u.phone || '').replace(/[^0-9]/g, '');
        const uName = (u.name || '').toLowerCase().trim();

        if (uEmail === unbracketed || uEmail.replace(/[^a-z0-9]/g, '') === cleanNoSpecial) return true;
        if (parentTargetNis && (uEmail.includes(parentTargetNis) || u.id.includes(parentTargetNis))) return true;

        if (parentTargetNis) {
          const linkedStudents = userList.filter(s => (u.studentIds && u.studentIds.includes(s.id)) || s.parentId === u.id);
          for (const s of linkedStudents) {
            const childNis = (s.nis || s.nisn || '').toLowerCase().trim();
            if (childNis && childNis === parentTargetNis) return true;
          }
        }

        if (uPhone && uPhone.length >= 8 && uPhone === unbracketed.replace(/[^0-9]/g, '')) return true;
        if (uName === unbracketed || (uName.length > 3 && uName.includes(unbracketed))) return true;
        return false;
      });
      if (foundParent) return foundParent;

      // Auto-fallback: if parent account not yet created, search for student with this NIS
      if (parentTargetNis) {
        const student = userList.find(s => s.role === 'siswa' && ((s.nis && s.nis.trim() === parentTargetNis) || (s.nisn && s.nisn.trim() === parentTargetNis)));
        if (student) {
          const newParent: User = {
            id: student.parentId || `usr-ortu-${parentTargetNis}`,
            name: `Orang Tua dari ${student.name}`,
            email: `ortu.${parentTargetNis}`,
            role: 'orangtua',
            studentIds: [student.id],
            phone: student.phone || '08123456789',
            avatar: DATA_URI_ORANG_TUA,
            password: `ortu${parentTargetNis}`,
            schoolName: student.schoolName || 'SMP Negeri 2 Kasihan',
            createdAt: new Date().toISOString()
          };
          return newParent;
        }
      }
    }

    if (isAdminIntent) {
      const foundAdmin = userList.find(u => {
        if (u.role !== 'admin') return false;
        const uEmail = (u.email || '').toLowerCase().trim();
        if (
          cleaned === 'admin' || 
          cleaned === 'administrator' || 
          cleaned === 'admin1' ||
          cleaned === 'admin@sekolah.id' || 
          cleaned === 'aplikasisekolah651@gmail.com' ||
          cleaned === 'admin@smpn2kasihan.sch.id' ||
          uEmail === cleaned ||
          uEmail.includes(cleaned)
        ) return true;
        return false;
      });
      if (foundAdmin) return foundAdmin;
    }

    // Priority 2: General scan across all users with exhaustive matching
    return userList.find((u) => {
      const uEmail = (u.email || '').toLowerCase().trim();
      const uEmailPrefix = uEmail.split('@')[0];
      const uNis = (u.nis || '').toLowerCase().trim();
      const uNisn = (u.nisn || '').toLowerCase().trim();
      const uName = (u.name || '').toLowerCase().trim();
      const uId = (u.id || '').toLowerCase().trim();
      const uPhone = (u.phone || '').replace(/[^0-9]/g, '');
      const inputPhone = cleaned.replace(/[^0-9]/g, '');
      const uClassCode = normalizeClassCode(u.className);

      // Direct exact matches
      if (uEmail === cleaned || uEmailPrefix === cleaned) return true;
      if (uNis && (uNis === cleaned || uNis === rawClean)) return true;
      if (uNisn && (uNisn === cleaned || uNisn === rawClean)) return true;
      if (uName === cleaned || uName.replace(/\s+/g, '') === rawClean) return true;
      if (uId === cleaned || uId.replace('usr-', '') === cleaned) return true;
      if (inputPhone.length >= 8 && uPhone.length >= 8 && uPhone === inputPhone) return true;

      // Admin aliases
      if (u.role === 'admin') {
        if (
          cleaned === 'admin' || 
          cleaned === 'administrator' || 
          cleaned === 'admin@sekolah.id' || 
          cleaned === 'aplikasisekolah651@gmail.com' ||
          cleaned === 'admin@smpn2kasihan.sch.id' ||
          cleaned === 'admin1'
        ) return true;
      }

      // Student aliases: "siswa.23451", "siswa23451", "siswa_23451", "23451", "23451@sekolah.id"
      if (u.role === 'siswa') {
        const studentNis = uNis || uNisn;
        if (studentNis) {
          if (
            cleaned === studentNis ||
            cleaned === `siswa.${studentNis}` ||
            cleaned === `siswa_${studentNis}` ||
            cleaned === `siswa-${studentNis}` ||
            cleaned === `siswa${studentNis}` ||
            cleaned === `${studentNis}@sekolah.id`
          ) return true;
        }
      }

      // Parent aliases: "ortu.23451", "ortu_23451", "ortu23451", "ortu.[23451]", child's NIS
      if (u.role === 'orangtua') {
        if (uEmailPrefix.replace(/[^a-z0-9]/g, '') === cleanNoSpecial) return true;

        const pNis = (u.email || '').replace(/^ortu[._-]*/i, '').replace(/[^0-9]/g, '') ||
                     (u.id || '').replace(/^usr-ortu-?/i, '').replace(/[^0-9]/g, '');

        if (pNis) {
          if (
            cleaned === `ortu.${pNis}` ||
            cleaned === `ortu_${pNis}` ||
            cleaned === `ortu-${pNis}` ||
            cleaned === `ortu${pNis}` ||
            cleaned === `ortu.[${pNis}]` ||
            cleanNoSpecial === `ortu${pNis}` ||
            (isParentIntent && cleaned === pNis)
          ) return true;
        }

        const linkedStudents = userList.filter(s => 
          (u.studentIds && u.studentIds.includes(s.id)) || 
          s.parentId === u.id ||
          (Boolean(pNis) && (s.nis === pNis || s.nisn === pNis))
        );
        for (const s of linkedStudents) {
          const childNis = (s.nis || s.nisn || '').toLowerCase().trim();
          if (childNis) {
            if (
              cleaned === `ortu.${childNis}` ||
              cleaned === `ortu_${childNis}` ||
              cleaned === `ortu-${childNis}` ||
              cleaned === `ortu${childNis}` ||
              cleaned === `ortu.[${childNis}]` ||
              cleanNoSpecial === `ortu${childNis}` ||
              cleaned === `ortu.${childNis}@sekolah.id` ||
              (isParentIntent && cleaned === childNis)
            ) return true;
          }
        }
      }

      // Homeroom Teacher / Wali Kelas aliases: "wali.7a", "wali7a", "wali_7a", "wali-7a", "guru.7a", "guru7a", "7a", "7A"
      if (u.role === 'walikelas') {
        const uAssigned = (u.assignedClassIds || []).map(id => normalizeClassCode(id));
        const inputClassCode = normalizeClassCode(cleaned.replace(/^(wali|guru)[._-]*/, ''));

        if (inputClassCode) {
          if (uClassCode === inputClassCode || uAssigned.includes(inputClassCode)) {
            return true;
          }
        }

        if (
          cleaned === `wali.${uClassCode}` ||
          cleaned === `wali_${uClassCode}` ||
          cleaned === `wali-${uClassCode}` ||
          cleaned === `wali${uClassCode}` ||
          cleaned === `guru.${uClassCode}` ||
          cleaned === `guru_${uClassCode}` ||
          cleaned === `guru-${uClassCode}` ||
          cleaned === `guru${uClassCode}` ||
          cleaned === `guru.${uClassCode}@sekolah.id` ||
          cleaned === `wali.${uClassCode}@sekolah.id` ||
          cleaned === uClassCode
        ) return true;
      }

      return false;
    });
  };

  const login = async (identifier: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const cleaned = identifier.trim().toLowerCase();
    const cleanPwd = password.trim();

    if (!cleaned || !cleanPwd) {
      return { success: false, message: 'Harap isi username/NIS dan kata sandi.' };
    }

    let userPool = [...allUsers];

    // 1. Direct fetch from Firestore on login to ensure newest accounts are available
    if (db) {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        if (!snapshot.empty) {
          const remoteUsers: User[] = [];
          snapshot.forEach((docSnap) => {
            remoteUsers.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });
          userPool = mergeFirestoreUsers(userPool, remoteUsers);
          setAllUsers(userPool);
        }
      } catch (err) {
        console.warn('Firestore live query during login notice:', err);
      }
    }

    // 2. Find user in the synchronized pool
    let found = findUserByIdentifier(userPool, cleaned, cleanPwd);

    if (!found) {
      return { 
        success: false, 
        message: 'Akun dengan username / NIS tersebut tidak ditemukan. Pastikan data akun telah terdaftar.' 
      };
    }

    // 3. Comprehensive and Lenient Password Verification
    let isPasswordValid = false;
    
    // Direct match with saved password
    if (found.password && (found.password === cleanPwd || found.password.toLowerCase() === cleanPwd.toLowerCase())) {
      isPasswordValid = true;
    }

    // Role-based convenient and standardized fallbacks
    if (!isPasswordValid) {
      if (found.role === 'admin') {
        isPasswordValid = 
          cleanPwd === 'admin' || 
          cleanPwd === 'admin123' || 
          cleanPwd === 'admin123#Master' || 
          cleanPwd === 'admin123#' ||
          cleanPwd === 'admin#123' ||
          cleanPwd === '123456';
      } else if (found.role === 'siswa') {
        const studentNis = (found.nis || found.nisn || '').toLowerCase().trim();
        isPasswordValid = 
          (Boolean(studentNis) && (
            cleanPwd.toLowerCase() === `siswa${studentNis}` ||
            cleanPwd.toLowerCase() === `siswa.${studentNis}` ||
            cleanPwd.toLowerCase() === `siswa_${studentNis}` ||
            cleanPwd.toLowerCase() === `siswa-${studentNis}` ||
            cleanPwd.toLowerCase() === studentNis
          )) ||
          cleanPwd === 'siswa123#' ||
          cleanPwd === 'siswa123#Secure' ||
          cleanPwd === 'siswa123' ||
          cleanPwd === '123456';
      } else if (found.role === 'orangtua') {
        const linkedStudents = userPool.filter(s => (found.studentIds && found.studentIds.includes(s.id)) || s.parentId === found.id);
        const childNisList = linkedStudents.map(s => (s.nis || s.nisn || '').toLowerCase().trim()).filter(Boolean);
        const emailNis = (found.email || '').replace(/^ortu[._-]*/i, '').replace(/[^0-9]/g, '');
        if (emailNis && !childNisList.includes(emailNis)) {
          childNisList.push(emailNis);
        }
        const cleanPwdNoBracket = cleanPwd.replace(/[\[\]]/g, '');
        const childNisMatch = childNisList.some(nis => 
          cleanPwd.toLowerCase() === `ortu${nis}` || 
          cleanPwd.toLowerCase() === `ortu.${nis}` || 
          cleanPwd.toLowerCase() === `ortu_${nis}` || 
          cleanPwd.toLowerCase() === `ortu-${nis}` || 
          cleanPwd.toLowerCase() === nis ||
          cleanPwdNoBracket.toLowerCase() === `ortu${nis}` ||
          cleanPwdNoBracket.toLowerCase() === `ortu.${nis}` ||
          cleanPwdNoBracket.toLowerCase() === `ortu_${nis}` ||
          cleanPwdNoBracket.toLowerCase() === `ortu-${nis}` ||
          cleanPwdNoBracket.toLowerCase() === nis
        );
        isPasswordValid = 
          childNisMatch || 
          (Boolean(found.password) && (
            cleanPwd === (found.password || '').trim() ||
            cleanPwdNoBracket === (found.password || '').trim().replace(/[\[\]]/g, '')
          )) ||
          cleanPwd === 'ortu123#' || 
          cleanPwd === 'ortu123#Secure' || 
          cleanPwd === 'ortu123' ||
          cleanPwd === '123456';
      } else if (found.role === 'walikelas') {
        const uClassCode = normalizeClassCode(found.className);
        isPasswordValid = 
          cleanPwd === 'wali123' || 
          cleanPwd === 'wali123#Secure' || 
          cleanPwd === 'wali123#' || 
          cleanPwd === 'guru123' ||
          cleanPwd === 'guru123#' ||
          cleanPwd === 'guru123#Secure' ||
          (Boolean(uClassCode) && (
            cleanPwd.toLowerCase() === `wali${uClassCode}` ||
            cleanPwd.toLowerCase() === `wali.${uClassCode}` ||
            cleanPwd.toLowerCase() === `guru${uClassCode}` ||
            cleanPwd.toLowerCase() === `guru.${uClassCode}`
          )) ||
          cleanPwd === '123456' ||
          cleanPwd === 'admin123';
      }
    }

    if (!isPasswordValid) {
      return { 
        success: false, 
        message: 'Kata sandi yang Anda masukkan salah. Silakan coba kembali.' 
      };
    }

    if (!allUsers.some(u => u.id === found.id)) {
      setAllUsers(prev => [found, ...prev]);
    }
    setCurrentUserState(found);
    setIsAuthenticated(true);
    localStorage.setItem(AUTH_SESSION_KEY, found.id);
    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_SESSION_KEY);
  };

  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
    setIsAuthenticated(true);
    localStorage.setItem(AUTH_SESSION_KEY, user.id);
  };

  const switchUser = (userId: string) => {
    const target = allUsers.find(u => u.id === userId);
    if (target) {
      setCurrentUserState(target);
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_SESSION_KEY, target.id);
    }
  };

  const switchRole = (role: UserRole) => {
    const target = allUsers.find(u => u.role === role);
    if (target) {
      setCurrentUserState(target);
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_SESSION_KEY, target.id);
    }
  };

  const addUser = async (userData: Partial<User>): Promise<User> => {
    const newId = userData.id || `usr-${userData.role || 'siswa'}-${Date.now()}`;
    const userNis = userData.nis || userData.nisn;
    const userAbsen = userData.attendanceNumber || userData.noAbsen;

    // For orang tua, determine linked child NIS if available
    let parentChildNis = userData.nis || userData.nisn;
    if (!parentChildNis && userData.studentIds && userData.studentIds.length > 0) {
      const linked = allUsers.find(s => userData.studentIds?.includes(s.id));
      parentChildNis = linked?.nis || linked?.nisn;
    }
    
    // Standardized default password logic based on role & NIS
    let defaultPassword = userData.password;
    if (!defaultPassword) {
      if (userData.role === 'siswa' && userNis) {
        defaultPassword = `siswa${userNis}`;
      } else if (userData.role === 'orangtua') {
        defaultPassword = parentChildNis ? `ortu${parentChildNis}` : 'ortu123#Secure';
      } else if (userData.role === 'walikelas') {
        defaultPassword = 'wali123#Secure';
      } else if (userData.role === 'admin') {
        defaultPassword = 'admin123#Master';
      } else {
        defaultPassword = E2EEService.generateSecurePassword(8);
      }
    }
    
    // Identifier (Username: ortu.[NIS] untuk Orang Tua, NIS untuk Siswa)
    let identifier = userData.email?.trim();
    if (!identifier) {
      if (userData.role === 'siswa' && userNis) {
        identifier = userNis;
      } else if (userData.role === 'orangtua' && parentChildNis) {
        identifier = `ortu.${parentChildNis}`;
      } else {
        identifier = `${userData.role || 'user'}_${Date.now()}`;
      }
    } else if (userData.role === 'orangtua' && parentChildNis && !identifier.startsWith('ortu.')) {
      identifier = `ortu.${parentChildNis}`;
    }

    const computedAvatar = userData.avatar && !userData.avatar.includes('api.dicebear.com') && !userData.avatar.includes('images.unsplash.com')
      ? userData.avatar
      : getUserAvatarUrl({ role: userData.role || 'siswa', gender: userData.gender });

    const newUser: User = {
      id: newId,
      name: userData.name || 'Pengguna Baru',
      email: identifier,
      role: userData.role || 'siswa',
      gender: userData.gender,
      religion: userData.religion ? normalizeReligionName(userData.religion) : (userData.role === 'siswa' ? 'Islam' : undefined),
      nip: userData.nip,
      nis: userNis,
      nisn: userNis,
      attendanceNumber: userAbsen,
      noAbsen: userAbsen,
      classId: userData.classId || 'class-7a',
      className: userData.className ? (normalizeClassName(userData.className) || '7A') : '7A',
      parentId: userData.parentId,
      studentIds: userData.studentIds,
      assignedClassIds: userData.assignedClassIds,
      phone: userData.phone || '08123456789',
      avatar: computedAvatar,
      password: defaultPassword,
      schoolName: 'SMP Negeri 2 Kasihan',
      createdAt: new Date().toISOString()
    };

    setAllUsers(prev => {
      const updated = [newUser, ...prev];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (db) {
      await safeFirestoreWrite(async () => {
        await setDoc(doc(db, 'users', newId), cleanForFirestore(newUser));
      });
    }

    return newUser;
  };

  const updateUser = async (userId: string, updates: Partial<User>): Promise<void> => {
    setAllUsers(prev => {
      const updated = prev.map(u => u.id === userId ? { ...u, ...updates } : u);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (currentUser.id === userId) {
      setCurrentUserState(prev => ({ ...prev, ...updates }));
    }

    if (db) {
      await safeFirestoreWrite(async () => {
        await setDoc(doc(db, 'users', userId), cleanForFirestore(updates), { merge: true });
      });
    }
  };

  const deleteUser = async (userId: string): Promise<void> => {
    markUsersAsDeleted(userId);
    const userToDelete = allUsers.find(u => u.id === userId);
    if (userToDelete?.email) {
      markUsersAsDeleted(userToDelete.email);
      const nis = userToDelete.email.replace(/^ortu[._-]*/i, '').replace(/[^0-9]/g, '');
      if (nis) {
        markUsersAsDeleted(`usr-ortu-${nis}`);
        markUsersAsDeleted(`ortu.${nis}`);
        markUsersAsDeleted(`ortu${nis}`);
      }
    }
    
    let updatedParentsToSync: User[] = [];
    let updatedStudentsToSync: User[] = [];

    setAllUsers(prev => {
      let updated = prev.filter(u => u.id !== userId);

      // If deleted user is a student, unlink or remove orphaned parent
      if (userToDelete?.role === 'siswa') {
        updated = updated.map(u => {
          if (u.role === 'orangtua' && u.studentIds?.includes(userId)) {
            const newStudentIds = u.studentIds.filter(id => id !== userId);
            const modParent = { ...u, studentIds: newStudentIds };
            updatedParentsToSync.push(modParent);
            return modParent;
          }
          return u;
        });
      }

      // If deleted user is a parent, unlink child's parentId
      if (userToDelete?.role === 'orangtua') {
        updated = updated.map(u => {
          if (u.role === 'siswa' && u.parentId === userId) {
            const { parentId, ...rest } = u;
            const modStudent = rest as User;
            updatedStudentsToSync.push(modStudent);
            return modStudent;
          }
          return u;
        });
      }

      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (currentUser.id === userId) {
      const fallbackUser = allUsers.find(u => u.id !== userId && (u.role === 'admin' || u.role === 'walikelas')) || DEMO_USERS[0];
      setCurrentUserState(fallbackUser);
      localStorage.setItem(AUTH_SESSION_KEY, fallbackUser.id);
    }

    if (db) {
      await safeFirestoreWrite(async () => {
        // 1. Permanently delete user document from Firestore
        await deleteDoc(doc(db, 'users', userId));
        
        // 2. Update modified parent relations in Firestore
        if (updatedParentsToSync.length > 0) {
          for (const parent of updatedParentsToSync) {
            await setDoc(doc(db, 'users', parent.id), cleanForFirestore(parent), { merge: true });
          }
        }

        // 3. Update modified student relations in Firestore (do not merge so parentId is removed)
        if (updatedStudentsToSync.length > 0) {
          for (const student of updatedStudentsToSync) {
            await setDoc(doc(db, 'users', student.id), cleanForFirestore(student));
          }
        }

        // 4. Cascade delete all journals belonging to this student
        if (userToDelete?.role === 'siswa') {
          const journalsSnapshot = await getDocs(collection(db, 'journals'));
          const batchList: Promise<void>[] = [];
          let currentBatch = writeBatch(db);
          let opCount = 0;

          journalsSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.studentId === userId) {
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
        }
      });
    }
  };

  const deleteUsersBulk = async (userIds: string[]): Promise<void> => {
    if (!userIds || userIds.length === 0) return;
    markUsersAsDeleted(userIds);
    const userSet = new Set(userIds);
    const usersToDelete = allUsers.filter(u => userSet.has(u.id));
    const studentIdsToDelete = new Set(usersToDelete.filter(u => u.role === 'siswa').map(u => u.id));
    const parentIdsToDelete = new Set(usersToDelete.filter(u => u.role === 'orangtua').map(u => u.id));

    // Also mark parent identifiers as deleted to prevent resurrection
    usersToDelete.forEach(u => {
      if (u.role === 'orangtua' && u.email) {
        markUsersAsDeleted(u.email);
        const nis = u.email.replace(/^ortu[._-]*/i, '').replace(/[^0-9]/g, '');
        if (nis) {
          markUsersAsDeleted(`usr-ortu-${nis}`);
          markUsersAsDeleted(`ortu.${nis}`);
          markUsersAsDeleted(`ortu${nis}`);
        }
      }
    });

    let updatedParentsToSync: User[] = [];
    let updatedStudentsToSync: User[] = [];

    setAllUsers(prev => {
      let updated = prev.filter(u => !userSet.has(u.id));

      if (studentIdsToDelete.size > 0) {
        updated = updated.map(u => {
          if (u.role === 'orangtua' && u.studentIds) {
            const newStudentIds = u.studentIds.filter(id => !studentIdsToDelete.has(id));
            const modParent = { ...u, studentIds: newStudentIds };
            updatedParentsToSync.push(modParent);
            return modParent;
          }
          return u;
        });
      }

      if (parentIdsToDelete.size > 0) {
        updated = updated.map(u => {
          if (u.role === 'siswa' && u.parentId && parentIdsToDelete.has(u.parentId)) {
            const { parentId, ...rest } = u;
            const modStudent = rest as User;
            updatedStudentsToSync.push(modStudent);
            return modStudent;
          }
          return u;
        });
      }

      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (userSet.has(currentUser.id)) {
      const fallbackUser = allUsers.find(u => !userSet.has(u.id) && (u.role === 'admin' || u.role === 'walikelas')) || DEMO_USERS[0];
      setCurrentUserState(fallbackUser);
      localStorage.setItem(AUTH_SESSION_KEY, fallbackUser.id);
    }

    if (db) {
      await safeFirestoreWrite(async () => {
        const batchList: Promise<void>[] = [];
        let currentBatch = writeBatch(db);
        let opCount = 0;

        // 1. Batch delete users
        userIds.forEach(uid => {
          currentBatch.delete(doc(db, 'users', uid));
          opCount++;
          if (opCount >= 400) {
            batchList.push(currentBatch.commit());
            currentBatch = writeBatch(db);
            opCount = 0;
          }
        });

        // 2. Cascade delete journals for all deleted students
        if (studentIdsToDelete.size > 0) {
          const journalsSnapshot = await getDocs(collection(db, 'journals'));
          journalsSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (studentIdsToDelete.has(data.studentId)) {
              currentBatch.delete(doc(db, 'journals', docSnap.id));
              opCount++;
              if (opCount >= 400) {
                batchList.push(currentBatch.commit());
                currentBatch = writeBatch(db);
                opCount = 0;
              }
            }
          });
        }

        if (opCount > 0) {
          batchList.push(currentBatch.commit());
        }
        if (batchList.length > 0) {
          await Promise.all(batchList);
        }

        // 3. Update modified parent / student documents
        if (updatedParentsToSync.length > 0) {
          for (const parent of updatedParentsToSync) {
            await setDoc(doc(db, 'users', parent.id), cleanForFirestore(parent), { merge: true });
          }
        }
        if (updatedStudentsToSync.length > 0) {
          for (const student of updatedStudentsToSync) {
            await setDoc(doc(db, 'users', student.id), cleanForFirestore(student));
          }
        }
      });
    }
  };

  const syncParentAccounts = async (): Promise<{ createdCount: number; updatedCount: number }> => {
    let createdCount = 0;
    let updatedCount = 0;

    const currentUsers = [...allUsers];
    const students = currentUsers.filter(u => u.role === 'siswa');
    const parents = currentUsers.filter(u => u.role === 'orangtua');
    const parentMap = new Map<string, User>();
    parents.forEach(p => parentMap.set(p.id, { ...p }));

    const updatedStudents: User[] = [];
    const parentsToSyncToCloud: User[] = [];
    const studentsToSyncToCloud: User[] = [];

    students.forEach(student => {
      const studentNis = (student.nis || student.nisn || '').trim();
      if (!studentNis) {
        updatedStudents.push(student);
        return;
      }

      const expectedEmail = `ortu.${studentNis}`;
      const expectedPassword = `ortu${studentNis}`;

      let matchedParent = Array.from(parentMap.values()).find(p => 
        (student.parentId && p.id === student.parentId) || 
        (p.studentIds && p.studentIds.includes(student.id)) ||
        p.email?.toLowerCase() === expectedEmail.toLowerCase() ||
        p.email?.toLowerCase() === `ortu${studentNis}`.toLowerCase() ||
        p.id === `usr-ortu-${studentNis}`
      );

      let currentStudent = { ...student };

      if (matchedParent) {
        let parentUpdated = false;
        if (matchedParent.email !== expectedEmail) {
          matchedParent.email = expectedEmail;
          parentUpdated = true;
        }
        if (!matchedParent.password || matchedParent.password.toLowerCase().startsWith('ortu') || matchedParent.password === 'ortu123#Secure' || matchedParent.password === '123456') {
          if (matchedParent.password !== expectedPassword) {
            matchedParent.password = expectedPassword;
            parentUpdated = true;
          }
        }
        if (!matchedParent.studentIds || !matchedParent.studentIds.includes(student.id)) {
          matchedParent.studentIds = Array.from(new Set([...(matchedParent.studentIds || []), student.id]));
          parentUpdated = true;
        }
        if (currentStudent.parentId !== matchedParent.id) {
          currentStudent.parentId = matchedParent.id;
          studentsToSyncToCloud.push(currentStudent);
          updatedCount++;
        }
        if (parentUpdated) {
          parentMap.set(matchedParent.id, matchedParent);
          parentsToSyncToCloud.push(matchedParent);
          updatedCount++;
        }
      } else {
        const newParentId = `usr-ortu-${studentNis}`;
        const pName = student.parentName ? (student.parentName.includes('(Ortu') ? student.parentName : `${student.parentName} (Ortu ${student.name})`) : `Orang Tua dari ${student.name}`;
        const newParent: User = {
          id: newParentId,
          name: pName,
          email: expectedEmail,
          role: 'orangtua',
          studentIds: [student.id],
          phone: student.parentPhone || student.phone || '08123456789',
          avatar: DATA_URI_ORANG_TUA,
          password: expectedPassword,
          schoolName: student.schoolName || 'SMP Negeri 2 Kasihan',
          createdAt: new Date().toISOString()
        };
        parentMap.set(newParentId, newParent);
        currentStudent.parentId = newParentId;
        parentsToSyncToCloud.push(newParent);
        studentsToSyncToCloud.push(currentStudent);
        createdCount++;
      }

      updatedStudents.push(currentStudent);
    });

    const uniqueParents = new Map<string, User>();
    parentMap.forEach(p => {
      const pKey = p.email?.toLowerCase().trim() || p.id;
      if (!uniqueParents.has(pKey)) {
        uniqueParents.set(pKey, p);
      } else {
        const existing = uniqueParents.get(pKey)!;
        existing.studentIds = Array.from(new Set([...(existing.studentIds || []), ...(p.studentIds || [])]));
      }
    });

    const nonStudents = currentUsers.filter(u => u.role !== 'siswa' && u.role !== 'orangtua');
    const finalAllUsers = [...nonStudents, ...updatedStudents, ...Array.from(uniqueParents.values())];

    setAllUsers(finalAllUsers);
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(finalAllUsers));
    } catch (e) {
      console.warn('LocalStorage sync parent warning:', e);
    }

    if (db) {
      await safeFirestoreWrite(async () => {
        const batch = writeBatch(db);
        parentsToSyncToCloud.forEach(p => {
          batch.set(doc(db, 'users', p.id), cleanForFirestore(p), { merge: true });
        });
        studentsToSyncToCloud.forEach(s => {
          batch.set(doc(db, 'users', s.id), cleanForFirestore(s), { merge: true });
        });
        await batch.commit();
      });
    }

    return { createdCount, updatedCount };
  };

  const purgeDeletedUsersAndOrphansFromCloud = async (): Promise<{ deletedUsersCount: number; deletedJournalsCount: number }> => {
    let deletedUsersCount = 0;
    let deletedJournalsCount = 0;
    const deletedUserIds = getDeletedUserIds();

    if (db) {
      await safeFirestoreWrite(async () => {
        // 1. Scan and purge deleted users from Firestore
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const userBatchList: Promise<void>[] = [];
        let uBatch = writeBatch(db);
        let uOps = 0;

        usersSnapshot.forEach(docSnap => {
          if (deletedUserIds.has(docSnap.id)) {
            uBatch.delete(doc(db, 'users', docSnap.id));
            deletedUsersCount++;
            uOps++;
            if (uOps >= 400) {
              userBatchList.push(uBatch.commit());
              uBatch = writeBatch(db);
              uOps = 0;
            }
          }
        });

        if (uOps > 0) {
          userBatchList.push(uBatch.commit());
        }
        if (userBatchList.length > 0) {
          await Promise.all(userBatchList);
        }

        // 2. Scan and purge journals belonging to deleted users or orphaned entries
        const journalsSnapshot = await getDocs(collection(db, 'journals'));
        const jBatchList: Promise<void>[] = [];
        let jBatch = writeBatch(db);
        let jOps = 0;

        journalsSnapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (deletedUserIds.has(data.studentId)) {
            jBatch.delete(doc(db, 'journals', docSnap.id));
            deletedJournalsCount++;
            jOps++;
            if (jOps >= 400) {
              jBatchList.push(jBatch.commit());
              jBatch = writeBatch(db);
              jOps = 0;
            }
          }
        });

        if (jOps > 0) {
          jBatchList.push(jBatch.commit());
        }
        if (jBatchList.length > 0) {
          await Promise.all(jBatchList);
        }
      });
    }

    return { deletedUsersCount, deletedJournalsCount };
  };

  const generateNewCredentials = async (userId: string): Promise<string> => {
    const targetUser = allUsers.find(u => u.id === userId);
    let newPassword = E2EEService.generateSecurePassword(10);
    const targetNis = targetUser?.nis || targetUser?.nisn;
    if (targetUser?.role === 'siswa' && targetNis) {
      newPassword = `siswa${targetNis}`;
      await updateUser(userId, { password: newPassword });

      // Automatically sync linked parent credentials to ortu.[NIS] and ortu[NIS]
      const linkedParent = allUsers.find(p => p.role === 'orangtua' && (p.id === targetUser.parentId || p.studentIds?.includes(targetUser.id)));
      if (linkedParent) {
        await updateUser(linkedParent.id, {
          email: `ortu.${targetNis}`,
          password: `ortu${targetNis}`
        });
      }
      return newPassword;
    } else if (targetUser?.role === 'orangtua') {
      const linked = allUsers.filter(s => targetUser.studentIds?.includes(s.id) || s.parentId === targetUser.id);
      const childNis = linked.length > 0 ? (linked[0].nis || linked[0].nisn) : (targetUser.email?.replace(/^ortu\./, '') || targetUser.nis);
      if (childNis) {
        newPassword = `ortu${childNis}`;
        await updateUser(userId, { 
          email: `ortu.${childNis}`,
          password: newPassword 
        });
        return newPassword;
      } else {
        newPassword = 'ortu123#Secure';
      }
    }
    await updateUser(userId, { password: newPassword });
    return newPassword;
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser) {
      return { success: false, message: 'Pengguna tidak ditemukan.' };
    }

    const cleanOld = oldPassword.trim();
    const cleanNew = newPassword.trim();

    if (currentUser.password && currentUser.password !== cleanOld) {
      return { success: false, message: 'Kata sandi lama yang Anda masukkan tidak sesuai.' };
    }

    if (cleanNew.length < 6) {
      return { success: false, message: 'Kata sandi baru harus memiliki minimal 6 karakter.' };
    }

    await updateUser(currentUser.id, { password: cleanNew });
    return { success: true, message: 'Kata sandi berhasil diubah dan disimpan dengan aman!' };
  };

  const importStudentsBulk = async (
    importedList: { 
      name: string; 
      nis?: string; 
      nisn?: string; 
      attendanceNumber?: string; 
      noAbsen?: string; 
      className: string; 
      gender?: 'L' | 'P'; 
      religion?: string;
      parentName?: string; 
      parentPhone?: string 
    }[]
  ): Promise<number> => {
    let count = 0;
    const newStudents: User[] = [];
    const newParents: User[] = [];

    for (const item of importedList) {
      const cleanNis = (item.nis || item.nisn || '').trim();
      const cleanAbsen = (item.attendanceNumber || item.noAbsen || '').trim();
      const cleanName = item.name.trim();
      if (!cleanName || !cleanNis) continue;
      
      const studentId = `usr-siswa-${cleanNis}`;
      const parentId = `usr-ortu-${cleanNis}`;

      // Normalize gender (L = Laki-laki, P = Perempuan)
      let cleanGender: 'L' | 'P' = 'L';
      if (item.gender) {
        const gStr = item.gender.trim().toUpperCase();
        if (gStr.startsWith('P') || gStr === 'WANITA' || gStr === 'PEREMPUAN') {
          cleanGender = 'P';
        } else {
          cleanGender = 'L';
        }
      }

      const cleanReligion = normalizeReligionName(item.religion);

      // 1. Orang tua: Otomatis dibuatkan akun dan dihubungkan ke anak
      const pName = item.parentName?.trim() || `Orang Tua dari ${cleanName}`;
      const parentUser: User = {
        id: parentId,
        name: pName.includes('(Ortu') ? pName : `${pName} (Ortu ${cleanName})`,
        email: `ortu.${cleanNis}`,
        role: 'orangtua',
        studentIds: [studentId],
        phone: item.parentPhone?.trim() || '08123456789',
        avatar: DATA_URI_ORANG_TUA,
        password: `ortu${cleanNis}`, // Digenerate otomatis dari NIS anak
        schoolName: 'SMP Negeri 2 Kasihan',
        createdAt: new Date().toISOString()
      };
      newParents.push(parentUser);

      const normalizedClass = item.className ? (normalizeClassName(item.className) || '7A') : '7A';
      const cleanClassId = `class-${normalizedClass.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      // 2. Siswa: Kredensial terstandarisasi berbasis NIS
      const studentUser: User = {
        id: studentId,
        name: cleanName,
        email: cleanNis,
        role: 'siswa',
        gender: cleanGender,
        religion: cleanReligion,
        nis: cleanNis,
        nisn: cleanNis,
        attendanceNumber: cleanAbsen,
        noAbsen: cleanAbsen,
        classId: cleanClassId,
        className: normalizedClass,
        parentId: parentId,
        phone: '08123456789',
        avatar: cleanGender === 'P' ? DATA_URI_SISWA_PUTRI : DATA_URI_SISWA_PUTRA,
        password: `siswa${cleanNis}`, // Digenerate otomatis dari NIS
        schoolName: 'SMP Negeri 2 Kasihan',
        createdAt: new Date().toISOString()
      };
      newStudents.push(studentUser);
      count++;
    }

    // Pastikan siswa baru selalu tersusun rapi urut nomor absen
    newStudents.sort(compareStudentsByAbsen);

    setAllUsers(prev => {
      // Remove any previous conflicting IDs, then prepend new ones
      const newIds = new Set([...newStudents.map(s => s.id), ...newParents.map(p => p.id)]);
      const filteredPrev = prev.filter(u => !newIds.has(u.id));
      const updated = [...newStudents, ...newParents, ...filteredPrev];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // Realtime persistence to Firestore (chunked in safe batches with cleanForFirestore)
    if (db) {
      await safeFirestoreWrite(async () => {
        const allNew = [...newStudents, ...newParents];
        const chunkSize = 100;
        for (let i = 0; i < allNew.length; i += chunkSize) {
          const chunk = allNew.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          chunk.forEach(u => {
            batch.set(doc(db, 'users', u.id), cleanForFirestore(u));
          });
          await batch.commit();
        }
        console.log(`Successfully synced ${allNew.length} imported user accounts to Cloud Firestore!`);
      });
    }

    return count;
  };

  const importTeachersBulk = async (
    importedList: {
      name: string;
      nip?: string;
      className: string;
      gender?: 'L' | 'P';
      phone?: string;
      username?: string;
      password?: string;
    }[]
  ): Promise<number> => {
    let count = 0;
    const newTeachers: User[] = [];

    for (const item of importedList) {
      const cleanName = item.name.trim();
      if (!cleanName) continue;

      const rawClass = (item.className || '').trim();
      const normalizedClass = rawClass ? (normalizeClassName(rawClass) || '7A') : '7A';
      const cleanClassCode = normalizedClass.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanNip = item.nip ? String(item.nip).trim().replace(/[^0-9]/g, '') : undefined;
      
      const teacherId = `usr-walikelas-${cleanClassCode || (cleanNip || Date.now())}`;

      let cleanGender: 'L' | 'P' = 'L';
      if (item.gender) {
        const gStr = item.gender.trim().toUpperCase();
        if (gStr.startsWith('P') || gStr === 'WANITA' || gStr === 'PEREMPUAN') {
          cleanGender = 'P';
        } else {
          cleanGender = 'L';
        }
      }

      const cleanUsername = (item.username && item.username.trim()) || `wali.${cleanClassCode || (cleanNip || 'guru')}`;
      const cleanPassword = (item.password && item.password.trim()) || 'wali123#Secure';

      const teacherUser: User = {
        id: teacherId,
        name: cleanName,
        email: cleanUsername,
        role: 'walikelas',
        gender: cleanGender,
        nip: cleanNip || undefined,
        className: `${normalizedClass} (Wali Kelas)`,
        classId: `class-${cleanClassCode}`,
        assignedClassIds: [`class-${cleanClassCode}`, normalizedClass],
        phone: item.phone ? String(item.phone).trim() : '08112233445',
        avatar: DATA_URI_WALI_KELAS,
        password: cleanPassword,
        schoolName: 'SMP Negeri 2 Kasihan',
        createdAt: new Date().toISOString()
      };

      newTeachers.push(teacherUser);
      count++;
    }

    if (newTeachers.length === 0) return 0;

    setAllUsers(prev => {
      const newIds = new Set(newTeachers.map(t => t.id));
      const filteredPrev = prev.filter(u => !newIds.has(u.id));
      const updated = [...newTeachers, ...filteredPrev];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (db) {
      await safeFirestoreWrite(async () => {
        const chunkSize = 100;
        for (let i = 0; i < newTeachers.length; i += chunkSize) {
          const chunk = newTeachers.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          chunk.forEach(u => {
            batch.set(doc(db, 'users', u.id), cleanForFirestore(u));
          });
          await batch.commit();
        }
        console.log(`Successfully synced ${newTeachers.length} imported teachers to Cloud Firestore!`);
      });
    }

    return count;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        allUsers,
        login,
        logout,
        setCurrentUser,
        switchUser,
        switchRole,
        addUser,
        updateUser,
        deleteUser,
        deleteUsersBulk,
        purgeDeletedUsersAndOrphansFromCloud,
        syncAllUsersToCloud,
        importStudentsBulk,
        importTeachersBulk,
        generateNewCredentials,
        changePassword,
        syncParentAccounts
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
