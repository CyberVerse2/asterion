'use client';

import { usePathname } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { useEffect, useRef, useState, createContext, useCallback } from 'react';
import Spinner from '@/components/ui/Spinner';
import { createPortal } from 'react-dom';

export const NavigationLoadingContext = createContext<{
  show: () => void;
  hide: () => void;
} | null>(null);

function GlobalSpinnerOverlay({ show }: { show: boolean }) {
  if (typeof window === 'undefined') return null;
  return show
    ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 transition-opacity">
          <Spinner size={48} />
        </div>,
        document.body
      )
    : null;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);
  const [showOverlay, setShowOverlay] = useState(false);

  const show = useCallback(() => {
    setShowOverlay(true);
  }, []);
  const hide = useCallback(() => {
    setShowOverlay(false);
  }, []);

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      hide();
      prevPathRef.current = pathname;
    }
  }, [pathname, hide]);

  const showBottomNav = pathname !== '/presave';

  return (
    <NavigationLoadingContext.Provider value={{ show, hide }}>
      <GlobalSpinnerOverlay show={showOverlay} />
      <main className="bg-background">{children}</main>
      {showBottomNav && <BottomNav />}
    </NavigationLoadingContext.Provider>
  );
}
