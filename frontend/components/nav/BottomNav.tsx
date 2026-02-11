'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const BottomNav = () => {
  const pathname = usePathname();

  const links = [
    { 
      href: '/', 
      label: 'Markets',
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth={active ? 2.5 : 2} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
      )
    },
    { 
      href: '/create', 
      label: 'Create',
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth={active ? 2.5 : 2} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
      )
    },
    { 
      href: '/portfolio', 
      label: 'Portfolio',
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth={active ? 2.5 : 2} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
          <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
        </svg>
      )
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-[var(--bg)]/90 backdrop-blur-lg border-t border-[var(--border)] md:hidden safe-area-bottom">
      <div className="grid h-full grid-cols-3 mx-auto">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`inline-flex flex-col items-center justify-center px-5 hover:bg-[var(--bg-elevated)] transition-colors ${
                isActive ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'
              }`}
            >
              {link.icon(isActive)}
              <span className="text-xs mt-1 font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
