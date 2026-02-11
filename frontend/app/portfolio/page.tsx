'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useUserPositions } from '@/hooks/useUserPositions';
import { TopNav } from '@/components/nav/TopNav';
import { formatAmount } from '@/lib/format/formatters';
import Link from 'next/link';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/shared/Motion';

export default function PortfolioPage() {
  const { publicKey } = useWallet();
  const { data: positions, isLoading } = useUserPositions();

  const totalInvested = positions?.reduce((sum, p) => sum + p.totalInvested, 0) || 0;
  // const potentialPayout = positions?.reduce((sum, p) => sum + p.potentialPayout, 0) || 0; 
  // Hiding potential payout for now as it's misleading without known final ratio

  if (!publicKey) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <PageTransition className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-[var(--bg-elevated)] mb-6 shadow-inner">
            <svg className="h-10 w-10 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-display font-bold mb-4">Connect Wallet</h1>
          <p className="text-[var(--text-secondary)] mb-8">
            Please connect your wallet to view your portfolio and positions.
          </p>
        </PageTransition>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopNav />

      <PageTransition className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-display font-bold mb-8">Your Portfolio</h1>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-4xl">
          <div className="card p-6 border-l-4 border-l-[var(--primary)]">
            <p className="text-sm text-[var(--text-secondary)] mb-1">Total Active Positions</p>
            <p className="text-3xl font-mono font-bold">{positions?.length || 0}</p>
          </div>
          <div className="card p-6 border-l-4 border-l-[var(--accent)]">
            <p className="text-sm text-[var(--text-secondary)] mb-1">Total Invested Value</p>
            <p className="text-3xl font-mono font-bold">{totalInvested.toFixed(2)} USDC</p>
          </div>
          {/* 
          <div className="card p-6 border-l-4 border-l-[var(--success)]">
            <p className="text-sm text-[var(--text-secondary)] mb-1">Potential Payout</p>
            <p className="text-3xl font-mono font-bold">{formatAmount(potentialPayout)} USDC</p>
          </div>
          */}
        </div>

        {/* Positions List */}
        <h2 className="text-xl font-display font-semibold mb-6">Active Positions</h2>
        
        {isLoading ? (
          <div className="space-y-4">
             {[...Array(3)].map((_, i) => (
               <div key={i} className="h-24 bg-[var(--bg-elevated)] rounded-xl animate-pulse" />
             ))}
          </div>
        ) : positions?.length === 0 ? (
          <div className="text-center py-12 bg-[var(--bg-elevated)]/30 rounded-xl border border-[var(--border)] border-dashed">
            <p className="text-[var(--text-secondary)] mb-4">You don't have any active positions yet.</p>
            <Link href="/" className="btn btn-primary">
              Explore Markets
            </Link>
          </div>
        ) : (
          <StaggerContainer className="space-y-4">
            {positions?.map((pos) => (
              <StaggerItem 
                key={pos.market.publicKey.toString()} 
                className="card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-[var(--primary)] transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      pos.market.account.status.resolved 
                        ? 'bg-[var(--success-bg)] text-[var(--success)]' 
                        : 'bg-[var(--primary-bg)] text-[var(--primary)]'
                    }`}>
                      {pos.market.account.status.resolved ? 'Resolved' : 'Active'}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">ID: {pos.market.account.marketId}</span>
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-1">
                    <Link href={`/markets/${pos.market.publicKey.toString()}`} className="hover:text-[var(--primary)] transition-colors">
                      {pos.market.account.question}
                    </Link>
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Ends: {new Date(pos.market.account.marketCloseTimestamp * 1000).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-8">
                  {pos.yesAmount > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-[var(--text-secondary)] mb-1">YES Shares</p>
                      <p className="font-mono font-bold text-[var(--success)]">{pos.yesAmount}</p>
                    </div>
                  )}
                  {pos.noAmount > 0 && (
                     <div className="text-right">
                      <p className="text-xs text-[var(--text-secondary)] mb-1">NO Shares</p>
                      <p className="font-mono font-bold text-[var(--danger)]">{pos.noAmount}</p>
                    </div>
                  )}
                  <div className="text-right border-l border-[var(--border)] pl-8">
                     <p className="text-xs text-[var(--text-secondary)] mb-1">Value</p>
                     <p className="font-mono font-bold">{pos.totalInvested.toFixed(2)} USDC</p>
                  </div>
                  
                  <Link 
                    href={`/markets/${pos.market.publicKey.toString()}`}
                    className="btn btn-secondary px-4 py-2 text-sm"
                  >
                    View
                  </Link>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </PageTransition>
    </div>
  );
}
