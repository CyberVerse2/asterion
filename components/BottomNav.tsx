'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/providers/UserProvider';
import { useRef, useState, useEffect } from 'react';

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6"
        />
      </svg>
    )
  },
  {
    href: '/ranking',
    label: 'Ranking',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 17v-2a4 4 0 014-4h10a4 4 0 014 4v2"
        />
      </svg>
    )
  },
  {
    href: '/library',
    label: 'Library',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
        />
      </svg>
    )
  },
  { href: '/profile', label: 'Profile', icon: null } // Profile icon handled below
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });

  // Determine active index
  const activeIndex = NAV_ITEMS.findIndex((item) =>
    item.href === '/profile' ? pathname === '/profile' : pathname === item.href
  );

  // Update pill position on hover/active
  useEffect(() => {
    const idx = hoveredIndex !== null ? hoveredIndex : activeIndex;
    const el = itemRefs.current[idx];
    if (el && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setPillStyle({
        left: elRect.left - navRect.left + elRect.width / 2 - 48,
        width: 96 // w-24 (96px)
      });
    }
  }, [hoveredIndex, activeIndex]);

  // Hide nav on novel detail and reading pages
  const hideNav =
    pathname?.startsWith('/novels/') &&
    (pathname.split('/').length === 3 || pathname.split('/').length === 5);
  if (hideNav) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border rounded-t-3xl shadow-2xl">
      <div
        ref={navRef}
        className="container mx-auto px-4 h-16 flex items-center justify-around relative"
      >
        {/* Animated pill */}
        <span
          className="absolute top-1/2 -translate-y-1/2 h-12 rounded-full bg-primary/20 z-0 transition-all duration-300"
          style={{ left: pillStyle.left, width: pillStyle.width, pointerEvents: 'none' }}
        />
        {NAV_ITEMS.map((item, idx) => (
          <Link
            key={item.href}
            href={item.href}
            ref={(el) => {
              itemRefs.current[idx] = el;
            }}
            className={`relative flex flex-col items-center gap-1 transition-colors rounded-xl px-2 py-1 group z-10 ${
              (activeIndex === idx && hoveredIndex === null) || hoveredIndex === idx
                ? 'text-primary'
                : 'text-muted-foreground hover:text-primary'
            }`}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {item.href === '/profile' ? (
              user && user.pfpUrl ? (
                <span className="relative flex items-center justify-center z-10">
                  <img
                    src={user.pfpUrl}
                    alt="Profile"
                    className="w-[30px] h-[30px] rounded-full object-cover border-1 border-primary ring-2 ring-[#8260c2] shadow"
                  />
                  <span
                    className="absolute inset-0 rounded-full ring-2 ring-[#8260c2] animate-pulse"
                    style={{ zIndex: 1 }}
                  />
                </span>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 z-10"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.121 17.804A9 9 0 1112 21a9 9 0 01-6.879-3.196z"
                  />
                </svg>
              )
            ) : (
              item.icon
            )}
            <span className="text-xs z-10">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
