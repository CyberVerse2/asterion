'use client';

import { usePathname } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showBottomNav = pathname !== '/presave';

  return (
    <>
      <main className="bg-background">{children}</main>
      {showBottomNav && <BottomNav />}
    </>
  );
}
