'use client';

import { usePathname } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { useEffect, useRef, useState } from 'react';
import Spinner from '@/components/ui/Spinner';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      setShowOverlay(true);
      NProgress.start();
      // Simulate a short delay for demo; in real app, tie to data loading
      setTimeout(() => {
        NProgress.done();
        setShowOverlay(false);
      }, 400);
      prevPathRef.current = pathname;
    }
  }, [pathname]);

  const showBottomNav = pathname !== '/presave';

  return (
    <>
      {showOverlay && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 transition-opacity">
          <Spinner size={48} />
        </div>
      )}
      <main className="bg-background">{children}</main>
      {showBottomNav && <BottomNav />}
    </>
  );
}
