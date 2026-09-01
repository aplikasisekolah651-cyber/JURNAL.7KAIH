import React, { createContext, useContext, useState, useEffect } from 'react';
import { SchoolSettings } from '../types';
import { DEFAULT_SCHOOL_SETTINGS } from '../lib/constants';
import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';

interface SchoolContextType {
  schoolSettings: SchoolSettings;
  updateSchoolSettings: (updates: Partial<SchoolSettings>) => Promise<boolean>;
  saveSchoolLogo: (base64Logo: string) => Promise<boolean>;
  removeSchoolLogo: () => Promise<boolean>;
  resetSchoolSettings: () => Promise<void>;
  isSyncedWithDb: boolean;
  isLoadingFromDb: boolean;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

const SCHOOL_SETTINGS_STORAGE_KEY = '7kaih_school_settings_v1';

export const SchoolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSyncedWithDb, setIsSyncedWithDb] = useState(false);
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(true);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(() => {
    const saved = localStorage.getItem(SCHOOL_SETTINGS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SCHOOL_SETTINGS, ...parsed };
      } catch (e) {
        console.error('Failed to parse cached school settings:', e);
      }
    }
    return DEFAULT_SCHOOL_SETTINGS;
  });

  // Local storage backup
  useEffect(() => {
    try {
      localStorage.setItem(SCHOOL_SETTINGS_STORAGE_KEY, JSON.stringify(schoolSettings));
    } catch (e) {
      console.warn('Local storage quota warning for school settings:', e);
    }
  }, [schoolSettings]);

  // Firestore real-time sync listener & immediate initial fetch
  useEffect(() => {
    if (!db) {
      setIsLoadingFromDb(false);
      return;
    }

    let isMounted = true;
    const settingsDocRef = doc(db, 'settings', 'school');

    // 1. Immediate direct fetch from Cloud Firestore Database
    getDoc(settingsDocRef)
      .then((docSnap) => {
        if (isMounted) {
          if (docSnap.exists()) {
            const data = docSnap.data() as Partial<SchoolSettings>;
            setSchoolSettings(prev => ({
              ...prev,
              ...data
            }));
            setIsSyncedWithDb(true);
          }
          setIsLoadingFromDb(false);
        }
      })
      .catch((err) => {
        console.warn('Firestore school settings initial fetch notice:', err);
        if (isMounted) setIsLoadingFromDb(false);
      });

    // 2. Real-time onSnapshot listener across all open devices
    try {
      const unsub = onSnapshot(settingsDocRef, (docSnap) => {
        if (isMounted) {
          if (docSnap.exists()) {
            const data = docSnap.data() as Partial<SchoolSettings>;
            setSchoolSettings(prev => ({
              ...prev,
              ...data
            }));
            setIsSyncedWithDb(true);
          }
          setIsLoadingFromDb(false);
        }
      }, (err) => {
        console.warn('Firestore school settings real-time listener notice:', err);
        if (isMounted) setIsLoadingFromDb(false);
      });

      return () => {
        isMounted = false;
        unsub();
      };
    } catch (e) {
      console.warn('Firestore school settings listener initialization notice:', e);
      setIsLoadingFromDb(false);
    }
  }, []);

  const updateSchoolSettings = async (updates: Partial<SchoolSettings>): Promise<boolean> => {
    // 1. Update React state immediately
    setSchoolSettings((prev) => {
      const updated = { ...prev, ...updates };
      try {
        localStorage.setItem(SCHOOL_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Local storage write warning:', e);
      }
      return updated;
    });

    // 2. Persist to Firestore Cloud Database
    if (db) {
      try {
        const settingsDocRef = doc(db, 'settings', 'school');
        await setDoc(settingsDocRef, updates, { merge: true });
        setIsSyncedWithDb(true);
        return true;
      } catch (e) {
        console.error('Firestore school settings save error:', e);
        return false;
      }
    }
    return true;
  };

  const saveSchoolLogo = async (base64Logo: string): Promise<boolean> => {
    return await updateSchoolSettings({ customLogoUrl: base64Logo });
  };

  const removeSchoolLogo = async (): Promise<boolean> => {
    return await updateSchoolSettings({ customLogoUrl: '' });
  };

  const resetSchoolSettings = async () => {
    setSchoolSettings(DEFAULT_SCHOOL_SETTINGS);
    try {
      localStorage.removeItem(SCHOOL_SETTINGS_STORAGE_KEY);
    } catch (e) {
      console.warn('Local storage remove warning:', e);
    }
    if (db) {
      try {
        const settingsDocRef = doc(db, 'settings', 'school');
        await setDoc(settingsDocRef, DEFAULT_SCHOOL_SETTINGS);
        setIsSyncedWithDb(true);
      } catch (e) {
        console.warn('Firestore school settings reset notice:', e);
      }
    }
  };

  return (
    <SchoolContext.Provider
      value={{
        schoolSettings,
        updateSchoolSettings,
        saveSchoolLogo,
        removeSchoolLogo,
        resetSchoolSettings,
        isSyncedWithDb,
        isLoadingFromDb
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchoolSettings = (): SchoolContextType => {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error('useSchoolSettings must be used within a SchoolProvider');
  }
  return context;
};
