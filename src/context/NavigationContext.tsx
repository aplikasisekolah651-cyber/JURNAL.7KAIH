import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type AdminMenuKey = 
  | 'overview' 
  | 'students' 
  | 'parents' 
  | 'teachers' 
  | 'journals' 
  | 'reports' 
  | 'import' 
  | 'credentials' 
  | 'settings' 
  | 'database';

export type StudentTabKey = 'form' | 'analytics' | 'history';
export type ParentTabKey = 'validation' | 'progress' | 'history';

export interface RouteInfo {
  pathname: string;
  roleRoute: 'admin' | 'siswa' | 'orangtua' | 'walikelas' | 'login' | 'root';
  adminTab: AdminMenuKey | null;
  studentTab: StudentTabKey | null;
  parentTab: ParentTabKey | null;
}

interface NavigationContextType {
  currentPath: string;
  routeInfo: RouteInfo;
  intendedPath: string | null;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  setAdminMenuTab: (tab: AdminMenuKey, updateUrl?: boolean) => void;
  setStudentActiveTab: (tab: StudentTabKey, updateUrl?: boolean) => void;
  setParentActiveTab: (tab: ParentTabKey, updateUrl?: boolean) => void;
  clearIntendedPath: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Mapping from Admin Tab to clean Indonesian URLs
export const ADMIN_TAB_TO_PATH: Record<AdminMenuKey, string> = {
  overview: '/admin',
  students: '/admin/siswa',
  parents: '/admin/orangtua',
  teachers: '/admin/guru',
  journals: '/admin/jurnal',
  reports: '/admin/laporan',
  import: '/admin/import',
  credentials: '/admin/akun',
  settings: '/admin/pengaturan',
  database: '/admin/database',
};

// Reverse mapping for various aliases
export const PATH_TO_ADMIN_TAB: Record<string, AdminMenuKey> = {
  '/admin': 'overview',
  '/admin/': 'overview',
  '/admin/overview': 'overview',
  '/admin/siswa': 'students',
  '/admin/students': 'students',
  '/admin/orangtua': 'parents',
  '/admin/parents': 'parents',
  '/admin/guru': 'teachers',
  '/admin/walikelas': 'teachers',
  '/admin/teachers': 'teachers',
  '/admin/jurnal': 'journals',
  '/admin/journals': 'journals',
  '/admin/laporan': 'reports',
  '/admin/reports': 'reports',
  '/admin/import': 'import',
  '/admin/akun': 'credentials',
  '/admin/credentials': 'credentials',
  '/admin/pengaturan': 'settings',
  '/admin/settings': 'settings',
  '/admin/database': 'database',
  '/admin/keamanan': 'database',
  '/admin/security': 'database',
};

// Student tab mapping
export const STUDENT_TAB_TO_PATH: Record<StudentTabKey, string> = {
  form: '/siswa',
  analytics: '/siswa/analisis',
  history: '/siswa/riwayat',
};

export const PATH_TO_STUDENT_TAB: Record<string, StudentTabKey> = {
  '/siswa': 'form',
  '/siswa/': 'form',
  '/siswa/jurnal': 'form',
  '/siswa/form': 'form',
  '/siswa/analisis': 'analytics',
  '/siswa/analytics': 'analytics',
  '/siswa/statistik': 'analytics',
  '/siswa/riwayat': 'history',
  '/siswa/history': 'history',
};

// Parent tab mapping
export const PARENT_TAB_TO_PATH: Record<ParentTabKey, string> = {
  validation: '/orangtua',
  progress: '/orangtua/progres',
  history: '/orangtua/riwayat',
};

export const PATH_TO_PARENT_TAB: Record<string, ParentTabKey> = {
  '/orangtua': 'validation',
  '/orangtua/': 'validation',
  '/orangtua/validasi': 'validation',
  '/orangtua/progres': 'progress',
  '/orangtua/progress': 'progress',
  '/orangtua/analisis': 'progress',
  '/orangtua/riwayat': 'history',
  '/orangtua/history': 'history',
};

export const parsePathname = (rawPath: string): RouteInfo => {
  // Normalize pathname: remove trailing slash except root
  let path = rawPath.split('?')[0].split('#')[0] || '/';
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  const lowerPath = path.toLowerCase();

  // Admin routes
  if (lowerPath === '/admin' || lowerPath.startsWith('/admin/')) {
    const matchedTab = PATH_TO_ADMIN_TAB[lowerPath] || 'overview';
    return {
      pathname: path,
      roleRoute: 'admin',
      adminTab: matchedTab,
      studentTab: null,
      parentTab: null,
    };
  }

  // Siswa routes
  if (lowerPath === '/siswa' || lowerPath.startsWith('/siswa/')) {
    const matchedTab = PATH_TO_STUDENT_TAB[lowerPath] || 'form';
    return {
      pathname: path,
      roleRoute: 'siswa',
      adminTab: null,
      studentTab: matchedTab,
      parentTab: null,
    };
  }

  // Orangtua routes
  if (lowerPath === '/orangtua' || lowerPath.startsWith('/orangtua/')) {
    const matchedTab = PATH_TO_PARENT_TAB[lowerPath] || 'validation';
    return {
      pathname: path,
      roleRoute: 'orangtua',
      adminTab: null,
      studentTab: null,
      parentTab: matchedTab,
    };
  }

  // Walikelas / Guru routes
  if (lowerPath === '/walikelas' || lowerPath.startsWith('/walikelas/') || lowerPath === '/guru' || lowerPath.startsWith('/guru/')) {
    return {
      pathname: path,
      roleRoute: 'walikelas',
      adminTab: null,
      studentTab: null,
      parentTab: null,
    };
  }

  // Login route
  if (lowerPath === '/login') {
    return {
      pathname: path,
      roleRoute: 'login',
      adminTab: null,
      studentTab: null,
      parentTab: null,
    };
  }

  // Root / Home
  return {
    pathname: path,
    roleRoute: 'root',
    adminTab: null,
    studentTab: null,
    parentTab: null,
  };
};

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window === 'undefined') return '/';
    // Check if there was a redirect stored from 404.html (e.g. on static hosts)
    const storedRedirect = sessionStorage.getItem('redirect');
    if (storedRedirect) {
      sessionStorage.removeItem('redirect');
      try {
        window.history.replaceState(null, '', storedRedirect);
        return storedRedirect.split('?')[0].split('#')[0] || '/';
      } catch (e) {
        console.warn('Redirect restore error:', e);
      }
    }
    return window.location.pathname || '/';
  });

  const [intendedPath, setIntendedPath] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const initialPath = window.location.pathname;
    if (initialPath && initialPath !== '/' && initialPath !== '/login') {
      return initialPath;
    }
    return null;
  });

  const [routeInfo, setRouteInfo] = useState<RouteInfo>(() => parsePathname(currentPath));

  // Sync state with URL
  const updateRoute = useCallback((newPath: string) => {
    setCurrentPath(newPath);
    setRouteInfo(parsePathname(newPath));
  }, []);

  // Browser navigation (Back / Forward) listener
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname || '/';
      updateRoute(path);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [updateRoute]);

  // Navigate helper
  const navigate = useCallback((path: string, options?: { replace?: boolean }) => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname !== path) {
      if (options?.replace) {
        window.history.replaceState(null, '', path);
      } else {
        window.history.pushState(null, '', path);
      }
    }
    updateRoute(path);
  }, [updateRoute]);

  // Set Admin menu tab and update browser URL to clean Indonesian name
  const setAdminMenuTab = useCallback((tab: AdminMenuKey, updateUrl: boolean = true) => {
    const targetPath = ADMIN_TAB_TO_PATH[tab] || '/admin';
    if (updateUrl) {
      navigate(targetPath);
    } else {
      setRouteInfo(prev => ({ ...prev, adminTab: tab }));
    }
  }, [navigate]);

  // Set Student tab and update browser URL
  const setStudentActiveTab = useCallback((tab: StudentTabKey, updateUrl: boolean = true) => {
    const targetPath = STUDENT_TAB_TO_PATH[tab] || '/siswa';
    if (updateUrl) {
      navigate(targetPath);
    } else {
      setRouteInfo(prev => ({ ...prev, studentTab: tab }));
    }
  }, [navigate]);

  // Set Parent tab and update browser URL
  const setParentActiveTab = useCallback((tab: ParentTabKey, updateUrl: boolean = true) => {
    const targetPath = PARENT_TAB_TO_PATH[tab] || '/orangtua';
    if (updateUrl) {
      navigate(targetPath);
    } else {
      setRouteInfo(prev => ({ ...prev, parentTab: tab }));
    }
  }, [navigate]);

  const clearIntendedPath = useCallback(() => {
    setIntendedPath(null);
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        currentPath,
        routeInfo,
        intendedPath,
        navigate,
        setAdminMenuTab,
        setStudentActiveTab,
        setParentActiveTab,
        clearIntendedPath,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
