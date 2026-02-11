'use client';

import { FC } from 'react';
import Link from 'next/link';
import { Market } from '@/hooks/useMarkets';
import { formatTimeRemaining, formatAmount } from '@/lib/format/formatters';
import { Badge } from '@/components/shared/Badge';
import { useWallet } from '@solana/wallet-adapter-react';

interface MarketCardProps {
  market: Market;
}

export const MarketCard: FC<MarketCardProps> = ({ market }) => {
  const { publicKey } = useWallet();
  const { account } = market;
  
  const isResolver = publicKey && account.resolver.equals(publicKey);
  const isEnded = Date.now() > account.marketCloseTimestamp * 1000;
  const isResolved = account.status.resolved;

  return (
    <Link href={`/markets/${market.publicKey.toString()}`}>
      <div className="card h-full flex flex-col hover-lift group border-[var(--border)] hover:border-[var(--primary)]/50 transition-colors">
        {/* Header: Status & Resolver Badge */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-2">
            {isResolved ? (
              <Badge variant="success">Resolved</Badge>
            ) : isEnded ? (
              <Badge variant="warning">Ended</Badge>
            ) : (
              <Badge>Active</Badge>
            )}
            
            {isResolver && (
              <span className="bg-[var(--primary-bg)] text-[var(--primary)] text-xs font-medium px-2 py-0.5 rounded-full border border-[var(--primary)]/20">
                You Resolve
              </span>
            )}
          </div>
          
          <div className="text-xs text-[var(--text-secondary)] font-medium bg-[var(--bg-elevated)] px-2 py-1 rounded">
            ID: {account.marketId}
          </div>
        </div>

        {/* Question */}
        <h3 className="text-lg font-display font-semibold mb-4 line-clamp-3 group-hover:text-[var(--primary)] transition-colors">
          {account.question}
        </h3>

        {/* Stats Grid */}
        <div className="mt-auto grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-1">Total Volume</p>
            <p className="font-mono text-sm">
              {/* Note: In a real app we'd sum up Yes+No supply */}
              - USDC
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-secondary)] mb-1">Ends In</p>
            <p className={`font-mono text-sm ${isEnded ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
              {formatTimeRemaining(account.marketCloseTimestamp)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
};
