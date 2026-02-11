'use client';

import { FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: 'Markets' },
  { href: '/create', label: 'Create' },
  { href: '/portfolio', label: 'Portfolio' },
];

export const TopNav: FC = () => {
  const { connected } = useWallet();
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] shadow-glow transition-transform group-hover:scale-105">
              <span className="text-xl font-display font-bold text-white">S</span>
            </div>
            <span className="text-xl font-display font-bold text-[var(--text)]">
              SolBet
            </span>
          </Link>

          {/* Nav Links (Desktop) */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-[var(--bg-elevated)] text-[var(--primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-elev)]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Wallet Button */}
          <div className="wallet-adapter-button-container">
            <WalletMultiButton className="!bg-gradient-to-r !from-[var(--primary)] !to-[var(--accent)] !rounded-lg !font-medium !text-sm !px-4 !py-2 !h-10 hover:!opacity-90 !transition-all" />
          </div>
        </div>
      </div>
    </nav>
  );
};
