import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  GraduationCap,
  Users,
  Award
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchoolSettings } from '../../context/SchoolContext';
import { useNavigation } from '../../context/NavigationContext';
import { SchoolLogo } from '../common/SchoolLogo';
import { LoginCoverCard } from './LoginCoverCard';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const { schoolSettings } = useSchoolSettings();
  const { routeInfo, intendedPath } = useNavigation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View mode for mobile screens: 'cover' (artwork preview like attached image) or 'form'
  const [mobileView, setMobileView] = useState<'cover' | 'form'>('cover');

  // If user navigated directly to an admin URL (like /admin/siswa), prefill admin or hint admin and show form directly
  useEffect(() => {
    if (routeInfo.roleRoute === 'admin' || (intendedPath && intendedPath.startsWith('/admin'))) {
      setIdentifier('admin');
      setPassword('admin123');
      setMobileView('form');
    }
  }, [routeInfo.roleRoute, intendedPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const result = await login(identifier, password);
      if (!result.success) {
        setErrorMsg(result.message || 'Login gagal. Periksa kembali username dan kata sandi.');
      }
    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan saat memproses login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDestinationLabel = () => {
    const path = (intendedPath || routeInfo.pathname || '').toLowerCase();
    if (path.includes('/admin/siswa') || path.includes('/admin/students')) return 'Data Siswa (Administrator)';
    if (path.includes('/admin/orangtua') || path.includes('/admin/parents')) return 'Data Orang Tua (Administrator)';
    if (path.includes('/admin/guru') || path.includes('/admin/walikelas')) return 'Data Guru & Wali Kelas (Administrator)';
    if (path.includes('/admin/jurnal') || path.includes('/admin/journals')) return 'Monitoring Jurnal (Administrator)';
    if (path.includes('/admin/laporan') || path.includes('/admin/reports')) return 'Rekap Laporan (Administrator)';
    if (path.includes('/admin/import')) return 'Import Data Siswa (Administrator)';
    if (path.includes('/admin/akun') || path.includes('/admin/credentials')) return 'Kartu Akun (Administrator)';
    if (path.includes('/admin/pengaturan') || path.includes('/admin/settings')) return 'Pengaturan Sekolah (Administrator)';
    if (path.includes('/admin/database') || path.includes('/admin/keamanan')) return 'Keamanan & Database (Administrator)';
    if (path.startsWith('/admin')) return 'Portal Administrator';
    if (path.startsWith('/siswa')) return 'Portal Jurnal Siswa';
    if (path.startsWith('/orangtua')) return 'Portal Validasi Orang Tua';
    if (path.startsWith('/walikelas') || path.startsWith('/guru')) return 'Portal Wali Kelas';
    return null;
  };

  const destinationLabel = getDestinationLabel();
  const currentYear = new Date().getFullYear();

  // Helper to prefill demo accounts
  const quickFill = (user: string, pass: string) => {
    setIdentifier(user);
    setPassword(pass);
    setMobileView('form');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50/40 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 transition-colors">
      
      {/* Container: Single column on small screens (toggled by mobileView), two columns on large screens */}
      <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12">
        
        {/* ================= COLUMN 1: ARTWORK COVER (Exact look from the user's image) ================= */}
        <div 
          className={`w-full lg:w-1/2 flex justify-center ${mobileView === 'cover' ? 'block' : 'hidden lg:flex'}`}
        >
          <LoginCoverCard 
            onStartLogin={() => {
              setMobileView('form');
              // On desktop, focus input
              const input = document.getElementById('login-identifier');
              if (input) input.focus();
            }}
            schoolName={schoolSettings.fullName || schoolSettings.name}
          />
        </div>

        {/* ================= COLUMN 2: LOGIN FORM PANEL ================= */}
        <div 
          className={`w-full lg:w-1/2 max-w-md ${mobileView === 'form' ? 'block' : 'hidden lg:block'}`}
        >
          {/* Back to cover button on mobile */}
          <div className="lg:hidden mb-3">
            <button
              onClick={() => setMobileView('cover')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm border border-slate-200 dark:border-slate-800 hover:bg-slate-50 cursor-pointer transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-sky-600" />
              <span>Kembali ke Halaman Sampul</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 py-6 sm:py-8 px-5 sm:px-8 shadow-2xl shadow-sky-900/10 dark:shadow-none border border-slate-200/90 dark:border-slate-800 rounded-3xl backdrop-blur-sm">
            
            {/* Header info */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <div className="p-2.5 bg-gradient-to-tr from-sky-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl shadow-xs border border-sky-100 dark:border-slate-700 inline-flex items-center justify-center">
                  <SchoolLogo 
                    customLogoUrl={schoolSettings.customLogoUrl}
                    size={68}
                    className="w-16 h-16 sm:w-18 sm:h-18 drop-shadow-sm transition-transform hover:scale-105" 
                  />
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                Masuk ke Jurnal
              </h2>
              <p className="text-xs sm:text-sm font-extrabold text-sky-600 dark:text-sky-400 uppercase tracking-wide mt-0.5">
                {schoolSettings.fullName || schoolSettings.name}
              </p>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                7 Kebiasaan Anak Indonesia Hebat
              </p>

              {destinationLabel && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-[11px] text-sky-700 dark:text-sky-300 font-semibold animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Tujuan: {destinationLabel}</span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username / NIS */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label 
                    htmlFor="login-identifier" 
                    className="block text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    NIS Siswa / Username
                  </label>
                  <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100/80 dark:bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
                    Siswa: Gunakan NIS
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="login-identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Masukkan NIS siswa (contoh: 23451) atau username..."
                    className="block w-full pl-10 pr-3.5 py-3 min-h-[46px] text-xs sm:text-sm rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  💡 <strong>Siswa</strong> login menggunakan <strong>NIS</strong> (Nomor Induk Siswa).
                </p>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label 
                    htmlFor="login-password" 
                    className="block text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    Kata Sandi (Password)
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi..."
                    className="block w-full pl-10 pr-12 py-3 min-h-[46px] text-xs sm:text-sm rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Sembunyikan sandi" : "Lihat sandi"}
                    className="absolute inset-y-0 right-0 pr-3.5 pl-2 flex items-center min-h-[44px] min-w-[44px] justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                id="btn-submit-login"
                className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 min-h-[48px] px-4 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 shadow-lg shadow-sky-600/25 dark:shadow-none transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Memverifikasi akun...</span>
                ) : (
                  <>
                    <span>Masuk ke Jurnal Sekarang</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Fill Buttons (Convenience) */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                Pilih Akun Demo Uji Coba:
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => quickFill('23451', 'siswa23451')}
                  className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-[10.5px] font-bold text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <GraduationCap className="w-3.5 h-3.5 shrink-0 text-sky-600" />
                  <span className="truncate">Siswa (NIS: 23451)</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('ortu.23451', 'ortu23451')}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span className="truncate">Orang Tua (ortu.23451)</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('wali.7A', 'wali123#Secure')}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-[10.5px] font-bold text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  <span className="truncate">Wali Kelas (wali.7A)</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('admin', 'admin123')}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-[10.5px] font-bold text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 shrink-0 text-purple-600" />
                  <span className="truncate">Admin (admin)</span>
                </button>
              </div>
            </div>

            {/* Quick Guidance Info */}
            <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between text-[10.5px]">
                <span>Format Akun Resmi Sekolah:</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">☁️ Cloud Firestore</span>
              </p>
              <div className="space-y-1 text-[10px]">
                <p>• <strong>Siswa</strong>: NIS (Username: <code>[NIS]</code> | Sandi: <code>siswa[NIS]</code>)</p>
                <p>• <strong>Orang Tua</strong>: ortu.[NIS] (Sandi: <code>ortu[NIS]</code>)</p>
                <p>• <strong>Wali Kelas</strong>: wali.[Kelas] (Sandi: <code>wali123#Secure</code>)</p>
                <p>• <strong>Admin</strong>: admin (Sandi: <code>admin123</code>)</p>
              </div>
            </div>

            {/* Security Guarantee & School Footer */}
            <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Dilindungi Enkripsi AES-256
              </span>
              <span className="font-medium text-slate-500 dark:text-slate-400">@{currentYear} - SMP Negeri 2 Kasihan</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
