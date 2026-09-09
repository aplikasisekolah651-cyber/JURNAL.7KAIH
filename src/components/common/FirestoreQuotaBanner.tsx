import React, { useState, useEffect } from 'react';
import { isFirestoreQuotaExceeded, clearFirestoreQuotaStatus, testFirestoreConnection } from '../../lib/firebase';
import { AlertTriangle, Database, ExternalLink, RefreshCw, X, ShieldCheck } from 'lucide-react';

export const FirestoreQuotaBanner: React.FC = () => {
  const [isExceeded, setIsExceeded] = useState<boolean>(() => isFirestoreQuotaExceeded());
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('7kaih_dismiss_quota_banner') === 'true';
    } catch {
      return false;
    }
  });
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const handleStatusChange = (e: any) => {
      setIsExceeded(e.detail?.isExceeded ?? isFirestoreQuotaExceeded());
    };

    window.addEventListener('firestore_quota_status_changed', handleStatusChange);
    return () => {
      window.removeEventListener('firestore_quota_status_changed', handleStatusChange);
    };
  }, []);

  if (!isExceeded || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('7kaih_dismiss_quota_banner', 'true');
    } catch {
      // ignore
    }
  };

  const handleCheckConnection = async () => {
    setIsChecking(true);
    clearFirestoreQuotaStatus();
    try {
      await testFirestoreConnection();
    } catch {
      // ignore
    } finally {
      setIsChecking(false);
      setIsExceeded(isFirestoreQuotaExceeded());
    }
  };

  const upgradeUrl = "https://console.firebase.google.com/project/gen-lang-client-0840024627/firestore/databases/ai-studio-9cc42502-4cbb-4188-9c00-2efcfbb775f7/data?openUpgradeDialog=true";

  return (
    <div
      id="firestore-quota-alert-banner"
      className="bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-3 sm:px-6 py-2.5 transition-all text-xs"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
        <div className="flex items-start gap-2.5">
          <div className="p-1 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-amber-900 dark:text-amber-100">
                Informasi Kuota Cloud Firestore (Batas Harian Spark Plan)
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium px-2 py-0.5 rounded-full border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3" /> Mode Offline-First Aktif (Aplikasi Berjalan Lancar)
              </span>
            </div>
            <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
              Batas kuota harian gratis Firebase Firestore (20.000 operasi tulis/hari) telah tercapai hari ini dan akan otomatis direset besok oleh Google Cloud. Seluruh pengisian jurnal, absensi, data orang tua, dan fitur lainnya tetap tersimpan aman di penyimpanan lokal peramban Anda.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <a
            href={upgradeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-md shadow-sm transition-colors"
          >
            <Database className="w-3 h-3" />
            <span>Kelola di Firebase Console</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            onClick={handleCheckConnection}
            disabled={isChecking}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 rounded-md transition-colors disabled:opacity-50"
            title="Cek apakah kuota sudah direset"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Cek Status</span>
          </button>

          <button
            onClick={handleDismiss}
            className="p-1 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 rounded transition-colors"
            title="Sembunyikan pesan ini"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
