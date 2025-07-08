'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();
  // Hide nav on novel detail and reading pages
  const hideNav =
    pathname?.startsWith('/novels/') &&
    (pathname.split('/').length === 3 || pathname.split('/').length === 5);
  if (hideNav) return null;
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#181825]/95 border-t border-purple-900/40 rounded-t-3xl shadow-2xl backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-around">
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 transition-colors rounded-xl px-2 py-1 ${
            pathname === '/'
              ? 'text-purple-400 bg-purple-900/20'
              : 'text-gray-400 hover:text-purple-300 hover:bg-white/5'
          }`}
        >
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
          <span className="text-xs">Home</span>
        </Link>
        <Link
          href="/ranking"
          className={`flex flex-col items-center gap-1 transition-colors rounded-xl px-2 py-1 ${
            pathname === '/ranking'
              ? 'text-purple-400 bg-purple-900/20'
              : 'text-gray-400 hover:text-purple-300 hover:bg-white/5'
          }`}
        >
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
          <span className="text-xs">Ranking</span>
        </Link>
        <Link
          href="/library"
          className={`flex flex-col items-center gap-1 transition-colors rounded-xl px-2 py-1 ${
            pathname === '/library'
              ? 'text-purple-400 bg-purple-900/20'
              : 'text-gray-400 hover:text-purple-300 hover:bg-white/5'
          }`}
        >
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
          <span className="text-xs">Library</span>
        </Link>
        <Link
          href="/profile"
          className={`flex flex-col items-center gap-1 transition-colors rounded-xl px-2 py-1 ${
            pathname === '/profile'
              ? 'text-purple-400 bg-purple-900/20'
              : 'text-gray-400 hover:text-purple-300 hover:bg-white/5'
          }`}
        >
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
              d="M5.121 17.804A9 9 0 1112 21a9 9 0 01-6.879-3.196z"
            />
          </svg>
          <span className="text-xs">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
