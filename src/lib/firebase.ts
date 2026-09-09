import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

let firebaseApp;
let db: Firestore | null = null;
let auth: Auth | null = null;

const FIRESTORE_QUOTA_STORAGE_KEY = '7kaih_firestore_quota_exceeded';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function isFirestoreQuotaExceeded(): boolean {
  try {
    const item = localStorage.getItem(FIRESTORE_QUOTA_STORAGE_KEY);
    if (!item) return false;
    const parsed = JSON.parse(item);
    // Quota resets daily at midnight UTC. Keep active until expiry
    if (Date.now() > parsed.expiry) {
      localStorage.removeItem(FIRESTORE_QUOTA_STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function markFirestoreQuotaExceeded(reason?: string): void {
  try {
    // Quota resets daily; set circuit-breaker expiry to 6 hours or tomorrow
    const expiry = Date.now() + 6 * 60 * 60 * 1000;
    localStorage.setItem(
      FIRESTORE_QUOTA_STORAGE_KEY,
      JSON.stringify({ timestamp: Date.now(), expiry, reason: reason || 'Quota limit exceeded' })
    );
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('firestore_quota_status_changed', {
          detail: { isExceeded: true, reason }
        })
      );
    }
  } catch (e) {
    console.warn('Could not store quota status in localStorage:', e);
  }
}

export function clearFirestoreQuotaStatus(): void {
  try {
    localStorage.removeItem(FIRESTORE_QUOTA_STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('firestore_quota_status_changed', {
          detail: { isExceeded: false }
        })
      );
    }
  } catch (e) {
    // ignore
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errMessage = error instanceof Error ? error.message : String(error);
  
  if (
    errMessage.includes('resource-exhausted') || 
    errMessage.includes('Quota limit exceeded') || 
    errMessage.includes('quota')
  ) {
    markFirestoreQuotaExceeded(errMessage);
    console.warn('[Firestore] Quota limit exceeded caught by handleFirestoreError:', errMessage);
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export async function safeFirestoreWrite<T>(
  operation: () => Promise<T>,
  fallback?: () => Promise<T> | T
): Promise<T | undefined> {
  if (isFirestoreQuotaExceeded()) {
    return fallback ? await fallback() : undefined;
  }
  try {
    return await operation();
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (
      msg.includes('resource-exhausted') || 
      msg.includes('Quota limit exceeded') || 
      msg.includes('quota')
    ) {
      markFirestoreQuotaExceeded(msg);
      console.warn('[Firestore] Daily write quota reached. App is safely operating in offline-first mode.');
      return fallback ? await fallback() : undefined;
    }
    console.warn('[Firestore] Write warning:', msg);
    return fallback ? await fallback() : undefined;
  }
}

try {
  // Try loading from config json if available
  const config = {
    projectId: "gen-lang-client-0840024627",
    appId: "1:63555815050:web:a44c0aaa90eefe53bc4f73",
    apiKey: "AIzaSyAEczPQ7sn2f_G4QxV4On9ot8N4sS7aNws",
    authDomain: "gen-lang-client-0840024627.firebaseapp.com",
    firestoreDatabaseId: "ai-studio-9cc42502-4cbb-4188-9c00-2efcfbb775f7",
    storageBucket: "gen-lang-client-0840024627.firebasestorage.app",
    messagingSenderId: "63555815050"
  };

  if (!getApps().length) {
    firebaseApp = initializeApp(config);
  } else {
    firebaseApp = getApp();
  }

  // Use configured database ID or default
  db = getFirestore(firebaseApp, config.firestoreDatabaseId || '(default)');
  auth = getAuth(firebaseApp);
} catch (error) {
  console.warn('Firebase initialization notice:', error);
}

export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map(item => cleanForFirestore(item)).filter(item => item !== undefined) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

export async function testFirestoreConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    const { doc, getDocFromServer } = await import('firebase/firestore');
    await getDocFromServer(doc(db, 'system', 'ping'));
    clearFirestoreQuotaStatus();
    return true;
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (msg.includes('resource-exhausted') || msg.includes('Quota limit exceeded') || msg.includes('quota')) {
      markFirestoreQuotaExceeded(msg);
    }
    return false;
  }
}

export { db, auth, firebaseApp };

