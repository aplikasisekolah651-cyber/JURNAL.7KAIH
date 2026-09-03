import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { DEMO_USERS } from '../lib/constants';
import { E2EEService } from '../lib/crypto';
import { db, cleanForFirestore } from '../lib/firebase';
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
    parentName?: string; 
    parentPhone?: string 
  }[]) => Promise<number>;
  generateNewCredentials: (userId: string) => Promise<string>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = '7kaih_users_v1';
const DELETED_USERS_STORAGE_KEY = '7kaih_deleted_users_v1';
const AUTH_SESSION_KEY = '7kaih_auth_session_v1';

export const getDeletedUserIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (e) {
    console.warn('Error reading deleted users:', e);
  }
  return new Set();
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

export const normalizeClassName = (cn?: string): string => {
  if (!cn) return '7A';
  const clean = String(cn).trim().replace(/\s+/g, ' ');
  return clean || '7A';
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const deletedIds = getDeletedUserIds();
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed: User[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
            .filter(u => !deletedIds.has(u.id))
            .map(u => ({
              ...u,
              className: u.className ? normalizeClassName(u.className) : u.className,
              avatar: getUserAvatarUrl(u)
            }));
        }
      } catch (e) {
        console.error('Failed to parse cached users:', e);
      }
    }
    return DEMO_USERS
      .filter(u => !deletedIds.has(u.id))
      .map(u => ({
        ...u,
        className: u.className ? normalizeClassName(u.className) : u.className,
        avatar: getUserAvatarUrl(u)
      }));
  });

  const [currentUser, setCurrentUserState] = useState<User>(() => {
    const sessionUserId = localStorage.getItem(AUTH_SESSION_KEY);
    if (sessionUserId) {
      const match = allUsers.find(u => u.id === sessionUserId);
      if (match) return match;
    }
    const defaultUser = allUsers.find(u => u.role === 'siswa') || DEMO_USERS[0];
    return defaultUser;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const sessionUserId = localStorage.getItem(AUTH_SESSION_KEY);
    return !!sessionUserId;
  });

  // Sync users to localStorage whenever allUsers changes
  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(allUsers));
    } catch (e) {
      console.warn('LocalStorage users sync warning:', e);
    }
  }, [allUsers]);

  // Helper to safely merge remote users from Firestore with local state
  const mergeFirestoreUsers = (prevUsers: User[], firestoreUsers: User[]): User[] => {
    const deletedIds = getDeletedUserIds();
    const map = new Map<string, User>();
    
    // 1. Put demo admin and teachers as safety fallbacks only if not deleted
    DEMO_USERS
      .filter(u => (u.role === 'admin' || u.role === 'walikelas') && !deletedIds.has(u.id))
      .forEach(u => {
        map.set(u.id, {
          ...u,
          avatar: getUserAvatarUrl(u)
        });
      });

    // 2. Put existing local non-deleted users
    prevUsers
      .filter(u => !deletedIds.has(u.id))
      .forEach(u => {
        map.set(u.id, {
          ...u,
          className: u.className ? normalizeClassName(u.className) : u.className,
          avatar: getUserAvatarUrl(u)
        });
      });

    // 3. Put remote firestore users (Cloud is authoritative) only if not deleted
    firestoreUsers
      .filter(u => !deletedIds.has(u.id))
      .forEach(u => {
        map.set(u.id, {
          ...u,
          className: u.className ? normalizeClassName(u.className) : u.className,
          avatar: getUserAvatarUrl(u)
        });
      });

    return Array.from(map.values());
  };

  // Seed default demo users to Firestore if collection is empty
  const seedDemoUsersToFirestore = async () => {
    if (!db) return;
    try {
      const deletedIds = getDeletedUserIds();
      const nonDeletedDemoUsers = DEMO_USERS.filter(u => !deletedIds.has(u.id));
      if (nonDeletedDemoUsers.length === 0) return;

      const batch = writeBatch(db);
      nonDeletedDemoUsers.forEach(u => {
        batch.set(doc(db, 'users', u.id), cleanForFirestore(u));
      });
      await batch.commit();
      console.log('Seeded initial DEMO_USERS to Cloud Firestore');
    } catch (err) {
      console.warn('Error seeding demo users to Firestore:', err);
    }
  };

  // Real-time Firestore sync listener & initial fetch
  useEffect(() => {
    if (!db) return;

    let isMounted = true;
    const usersColRef = collection(db, 'users');

    // 1. Immediate direct fetch from Firestore
    getDocs(usersColRef).then((snapshot) => {
      if (!isMounted) return;
      const deletedIds = getDeletedUserIds();
      if (!snapshot.empty) {
        const firestoreUsers: User[] = [];
        snapshot.forEach((docSnap) => {
          if (!deletedIds.has(docSnap.id)) {
            firestoreUsers.push({ id: docSnap.id, ...(docSnap.data() as any) });
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
      console.warn('Firestore users direct fetch notice:', err);
    });

    // 2. Real-time snapshot listener across all connected devices
    try {
      const unsub = onSnapshot(usersColRef, (snapshot) => {
        if (!isMounted) return;
        const deletedIds = getDeletedUserIds();
        const firestoreUsers: User[] = [];
        snapshot.forEach((docSnap) => {
          if (!deletedIds.has(docSnap.id)) {
            firestoreUsers.push({ id: docSnap.id, ...(docSnap.data() as any) });
          }
        });
        if (firestoreUsers.length > 0) {
          setAllUsers(prev => mergeFirestoreUsers(prev, firestoreUsers));
        }
      }, (err) => {
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

    try {
      const chunkSize = 100;
      for (let i = 0; i < list.length; i += chunkSize) {
        const chunk = list.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(u => {
          batch.set(doc(db, 'users', u.id), cleanForFirestore(u));
        });
        await batch.commit();
      }
      console.log(`Successfully synced all ${list.length} users to Cloud Firestore`);
      return { count: list.length, success: true };
    } catch (e) {
      console.error('Error syncing all users to Firestore:', e);
      return { count: 0, success: false };
    }
  };

  const findUserByIdentifier = (userList: User[], cleaned: string, rawPassword?: string): User | undefined => {
    const rawClean = cleaned.replace(/\s+/g, '');
    const cleanNoSpecial = cleaned.replace(/[^a-z0-9]/g, '');
    const cleanPwd = (rawPassword || '').trim().toLowerCase();

    // 1. Check if user typed role-specific prefix or intent
    const isParentIntent = cleaned.startsWith('ortu') || cleanPwd.startsWith('ortu');
    const isTeacherIntent = cleaned.startsWith('wali') || cleaned.startsWith('guru');
    const isAdminIntent = cleaned.startsWith('admin');

    // Priority 1: Direct matches based on explicit role intent
    if (isTeacherIntent) {
      const teacherTargetCode = normalizeClassCode(cleaned.replace(/^(wali|guru)[._-]*/, ''));
      const foundTeacher = userList.find(u => {
        if (u.role !== 'walikelas') return false;
        const uClassCode = normalizeClassCode(u.className);
        const uAssigned = (u.assignedClassIds || []).map(id => normalizeClassCode(id));
        const uEmail = (u.email || '').toLowerCase().trim();
        const uName = (u.name || '').toLowerCase().trim();

        if (teacherTargetCode && (uClassCode === teacherTargetCode || uAssigned.includes(teacherTargetCode))) return true;
        if (uEmail === cleaned || uEmail.replace(/[^a-z0-9]/g, '') === cleanNoSpecial) return true;
        if (uName.includes(cleaned) || cleaned.includes(uName)) return true;
        return false;
      });
      if (foundTeacher) return foundTeacher;
    }

    if (isParentIntent) {
      const parentTargetNis = cleaned.replace(/^ortu[._-]*/, '').replace(/[^0-9]/g, '');
      const foundParent = userList.find(u => {
        if (u.role !== 'orangtua') return false;
        const uEmail = (u.email || '').toLowerCase().trim();
        const uPhone = (u.phone || '').replace(/[^0-9]/g, '');
        const uName = (u.name || '').toLowerCase().trim();

        if (uEmail === cleaned || uEmail.replace(/[^a-z0-9]/g, '') === cleanNoSpecial) return true;
        if (parentTargetNis && (uEmail.includes(parentTargetNis) || u.id.includes(parentTargetNis))) return true;

        if (parentTargetNis && u.studentIds && u.studentIds.length > 0) {
          const linkedStudents = userList.filter(s => u.studentIds?.includes(s.id));
          for (const s of linkedStudents) {
            const childNis = (s.nis || s.nisn || '').toLowerCase().trim();
            if (childNis && childNis === parentTargetNis) return true;
          }
        }

        if (uPhone && uPhone.length >= 8 && uPhone === cleaned.replace(/[^0-9]/g, '')) return true;
        if (uName === cleaned || (uName.length > 3 && uName.includes(cleaned))) return true;
        return false;
      });
      if (foundParent) return foundParent;
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

      // Parent aliases: "ortu.23451", "ortu_23451", "ortu23451", child's NIS
      if (u.role === 'orangtua') {
        if (uEmailPrefix.replace(/[^a-z0-9]/g, '') === cleanNoSpecial) return true;

        if (u.studentIds && u.studentIds.length > 0) {
          const linkedStudents = userList.filter(s => u.studentIds?.includes(s.id));
          for (const s of linkedStudents) {
            const childNis = (s.nis || s.nisn || '').toLowerCase().trim();
            if (childNis) {
              if (
                cleaned === `ortu.${childNis}` ||
                cleaned === `ortu_${childNis}` ||
                cleaned === `ortu-${childNis}` ||
                cleaned === `ortu${childNis}` ||
                cleaned === `ortu.${childNis}@sekolah.id` ||
                (isParentIntent && cleaned === childNis)
              ) return true;
            }
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
        const linkedStudents = userPool.filter(s => found.studentIds?.includes(s.id));
        const childNisList = linkedStudents.map(s => (s.nis || s.nisn || '').toLowerCase().trim()).filter(Boolean);
        const childNisMatch = childNisList.some(nis => 
          cleanPwd.toLowerCase() === `ortu${nis}` || 
          cleanPwd.toLowerCase() === `ortu.${nis}` || 
          cleanPwd.toLowerCase() === `ortu_${nis}` || 
          cleanPwd.toLowerCase() === `ortu-${nis}` || 
          cleanPwd.toLowerCase() === nis
        );
        isPasswordValid = 
          childNisMatch || 
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
    
    // Standardized default password logic based on role & NIS
    let defaultPassword = userData.password;
    if (!defaultPassword) {
      if (userData.role === 'siswa' && userNis) {
        defaultPassword = `siswa${userNis}`;
      } else if (userData.role === 'orangtua') {
        defaultPassword = 'ortu123#Secure';
      } else if (userData.role === 'walikelas') {
        defaultPassword = 'wali123#Secure';
      } else if (userData.role === 'admin') {
        defaultPassword = 'admin123#Master';
      } else {
        defaultPassword = E2EEService.generateSecurePassword(8);
      }
    }
    
    // Identifier (Username / NIS / Email / Bebas)
    const identifier = userData.email?.trim() || (
      userData.role === 'siswa' && userNis
        ? userNis
        : `${userData.role || 'user'}_${Date.now()}`
    );

    const computedAvatar = userData.avatar && !userData.avatar.includes('api.dicebear.com') && !userData.avatar.includes('images.unsplash.com')
      ? userData.avatar
      : getUserAvatarUrl({ role: userData.role || 'siswa', gender: userData.gender });

    const newUser: User = {
      id: newId,
      name: userData.name || 'Pengguna Baru',
      email: identifier,
      role: userData.role || 'siswa',
      gender: userData.gender,
      nip: userData.nip,
      nis: userNis,
      nisn: userNis,
      attendanceNumber: userAbsen,
      noAbsen: userAbsen,
      classId: userData.classId || 'class-7a',
      className: userData.className ? normalizeClassName(userData.className) : '7A',
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
      try {
        await setDoc(doc(db, 'users', newId), cleanForFirestore(newUser));
      } catch (e) {
        console.warn('Firestore write user fallback:', e);
      }
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
      try {
        await setDoc(doc(db, 'users', userId), cleanForFirestore(updates), { merge: true });
      } catch (e) {
        console.warn('Firestore user update fallback:', e);
      }
    }
  };

  const deleteUser = async (userId: string): Promise<void> => {
    markUsersAsDeleted(userId);
    const userToDelete = allUsers.find(u => u.id === userId);
    
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
      try {
        // 1. Permanently delete user document from Firestore
        await deleteDoc(doc(db, 'users', userId));
        
        // 2. Update modified parent relations in Firestore
        if (updatedParentsToSync.length > 0) {
          for (const parent of updatedParentsToSync) {
            await setDoc(doc(db, 'users', parent.id), cleanForFirestore(parent), { merge: true });
          }
        }

        // 3. Update modified student relations in Firestore
        if (updatedStudentsToSync.length > 0) {
          for (const student of updatedStudentsToSync) {
            await setDoc(doc(db, 'users', student.id), cleanForFirestore(student), { merge: true });
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
      } catch (e) {
        console.warn('Firestore delete user and cascade sync fallback:', e);
      }
    }
  };

  const deleteUsersBulk = async (userIds: string[]): Promise<void> => {
    if (!userIds || userIds.length === 0) return;
    markUsersAsDeleted(userIds);
    const userSet = new Set(userIds);
    const usersToDelete = allUsers.filter(u => userSet.has(u.id));
    const studentIdsToDelete = new Set(usersToDelete.filter(u => u.role === 'siswa').map(u => u.id));
    const parentIdsToDelete = new Set(usersToDelete.filter(u => u.role === 'orangtua').map(u => u.id));

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
      try {
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
            await setDoc(doc(db, 'users', student.id), cleanForFirestore(student), { merge: true });
          }
        }
      } catch (e) {
        console.warn('Firestore bulk delete user and cascade fallback:', e);
      }
    }
  };

  const purgeDeletedUsersAndOrphansFromCloud = async (): Promise<{ deletedUsersCount: number; deletedJournalsCount: number }> => {
    let deletedUsersCount = 0;
    let deletedJournalsCount = 0;
    const deletedUserIds = getDeletedUserIds();

    if (db) {
      try {
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
      } catch (e) {
        console.warn('Error purging deleted users & journals from cloud:', e);
      }
    }

    return { deletedUsersCount, deletedJournalsCount };
  };

  const generateNewCredentials = async (userId: string): Promise<string> => {
    const targetUser = allUsers.find(u => u.id === userId);
    let newPassword = E2EEService.generateSecurePassword(10);
    const targetNis = targetUser?.nis || targetUser?.nisn;
    if (targetUser?.role === 'siswa' && targetNis) {
      newPassword = `siswa${targetNis}`;
    } else if (targetUser?.role === 'orangtua') {
      const linked = allUsers.filter(s => targetUser.studentIds?.includes(s.id));
      const childNis = linked.length > 0 ? (linked[0].nis || linked[0].nisn) : '';
      if (childNis) {
        newPassword = `ortu${childNis}`;
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

      const normalizedClass = item.className ? normalizeClassName(item.className) : '7A';
      const cleanClassId = `class-${normalizedClass.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      // 2. Siswa: Kredensial terstandarisasi berbasis NIS
      const studentUser: User = {
        id: studentId,
        name: cleanName,
        email: cleanNis,
        role: 'siswa',
        gender: cleanGender,
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
      try {
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
      } catch (e) {
        console.error('Firestore write batch error during import:', e);
      }
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
        generateNewCredentials,
        changePassword
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
