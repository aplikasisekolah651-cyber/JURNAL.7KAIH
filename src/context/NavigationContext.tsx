import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface NavigationContextType {
  currentPath: string;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  pathname: string;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

// Helper to extract clean path from pathname or hash
export const getCleanPath = (): string => {
  if (typeof window === 'undefined') return '/';
  
  // Check hash first if present (e.g., #/admin/siswa)
  if (window.location.hash && window.location.hash.startsWith('#/')) {
    return window.location.hash.substring(1);
  }
  
  // Otherwise use pathname
  const path = window.location.pathname;
  return path === '' ? '/' : path;
};

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => getCleanPath());

  const navigate = useCallback((path: string, options?: { replace?: boolean }) => {
    // Normalize path to start with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    if (normalizedPath === currentPath) return;

    try {
      if (options?.replace) {
        window.history.replaceState({ path: normalizedPath }, '', normalizedPath);
      } else {
        window.history.pushState({ path: normalizedPath }, '', normalizedPath);
      }
    } catch (e) {
      // Fallback to hash if pushState is restricted in certain iframe environments
      try {
        window.location.hash = normalizedPath;
      } catch (err) {
        console.warn('Navigation URL update error:', err);
      }
    }

    setCurrentPath(normalizedPath);
  }, [currentPath]);

  // Listen to popstate (browser back/forward) & hashchange
  useEffect(() => {
    const handleLocationChange = () => {
      const newPath = getCleanPath();
      setCurrentPath(newPath);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  return (
    <NavigationContext.Provider value={{ currentPath, navigate, pathname: currentPath }}>
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
