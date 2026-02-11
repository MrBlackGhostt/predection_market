'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useMarket } from '@/hooks/useMarkets';
import { useResolveMarket } from '@/hooks/useResolveMarket';
import { useClaimWinnings } from '@/hooks/useClaimWinnings';
import { BuySellPanel } from '@/components/trade/BuySellPanel';
import { TopNav } from '@/components/nav/TopNav';
import { Badge } from '@/components/shared/Badge';
import { Stat } from '@/components/shared/Stat';
import { formatAmount, formatTimeRemaining, shortenAddress } from '@/lib/format/formatters';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { PublicKey } from '@solana/web3.js';
import { PageTransition } from '@/components/shared/Motion';

export default function MarketDetailPage() {
  const { marketId } = useParams();
  const marketPubkey = marketId ? new PublicKey(marketId as string) : undefined;
  
  const { data: market, isLoading, isError } = useMarket(marketId as string);
  const { publicKey } = useWallet();
  
  // Hooks need a valid PublicKey, so we condition them or pass dummy if undefined (though hooks should handle it)
  // Better pattern: only call hook functions when marketPubkey is defined
  const { resolveMarket } = useResolveMarket(marketPubkey || PublicKey.default); 
  const { claimWinnings } = useClaimWinnings(marketPubkey || PublicKey.default);

  const [resolving, setResolving] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const handleResolve = async (outcome: boolean) => {
    setResolving(true);
    try {
      await resolveMarket(outcome);
      toast.success(`Market resolved as ${outcome ? 'YES' : 'NO'}`);
    } catch (error: any) {
      console.error('Resolve error:', error);
      toast.error(error.message || 'Failed to resolve market');
    } finally {
      setResolving(false);
    }
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await claimWinnings();
      toast.success('Winnings claimed successfully!');
    } catch (error: any) {
      console.error('Claim error:', error);
      toast.error(error.message || 'Failed to claim winnings');
    } finally {
      setClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-[var(--bg-elevated)] w-3/4 rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 h-64 bg-[var(--bg-elevated)] rounded-xl" />
              <div className="h-96 bg-[var(--bg-elevated)] rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isError || !market) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-2xl font-bold text-[var(--danger)]">Market not found</h1>
          <p className="text-[var(--text-secondary)] mt-2">The market you are looking for does not exist or failed to load.</p>
        </main>
      </div>
    );
  }

  const { account } = market;
  const isResolver = publicKey && account.resolver.equals(publicKey);
  const isEnded = account.marketCloseTimestamp * 1000 < Date.now();
  const isResolved = account.status.resolved;

  return (
    <div className="min-h-screen">
      <TopNav />

      <PageTransition className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {isResolved ? (
              <Badge variant="success">Resolved: {account.option ? 'YES' : 'NO'}</Badge>
            ) : isEnded ? (
              <Badge variant="warning">Ended</Badge>
            ) : (
              <Badge>Active</Badge>
            )}
            <span className="text-sm text-[var(--text-secondary)]">ID: {account.marketId}</span>
            {isResolver && (
              <span className="bg-[var(--primary-bg)] text-[var(--primary)] text-xs font-medium px-2 py-0.5 rounded-full border border-[var(--primary)]/20">
                Resolver View
              </span>
            )}
          </div>
          
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4 leading-tight">
            {account.question}
          </h1>

          <div className="flex flex-wrap gap-6 text-sm text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
              Ends: <span className="text-[var(--text)] font-mono">{new Date(account.marketCloseTimestamp * 1000).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--warning)]" />
              Resolver: <span className="text-[var(--text)] font-mono">{shortenAddress(account.resolver)}</span>
            </div>
             <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
              Fee: <span className="text-[var(--text)] font-mono">{account.fee / 100}%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Market Info & Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chart Placeholder */}
            <div className="card h-80 flex items-center justify-center bg-[var(--bg-elevated)]/30 border border-[var(--border)] relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 to-[var(--accent)]/5 opacity-50" />
              <div className="text-center z-10">
                <p className="text-[var(--text-secondary)] mb-2">Volume History Chart</p>
                <span className="text-xs px-2 py-1 bg-[var(--bg-elevated)] rounded text-[var(--muted)]">Coming Soon</span>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-4">
                <Stat label="Volume" value={`${formatAmount(0)} USDC`} /> {/* Placeholder volume */}
              </div>
              <div className="card p-4">
                <Stat label="Liquidity" value={`${formatAmount(0)} USDC`} /> {/* Placeholder liquidity */}
              </div>
              <div className="card p-4">
                <Stat label="Yes Price" value="0.50 USDC" /> {/* Placeholder price */}
              </div>
              <div className="card p-4">
                 <Stat label="No Price" value="0.50 USDC" /> {/* Placeholder price */}
              </div>
            </div>

            {/* Resolver Panel (Only visible to resolver) */}
            {isResolver && !isResolved && isEnded && (
              <div className="card border-[var(--warning)]/30 bg-[var(--warning-bg)]/10">
                <h3 className="text-xl font-display font-semibold mb-4 text-[var(--warning)]">Resolve Market</h3>
                <p className="mb-6 text-[var(--text-secondary)]">
                  The market has ended. As the designated resolver, please select the final outcome.
                  This action is irreversible.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleResolve(true)}
                    disabled={resolving}
                    className="flex-1 py-3 bg-[var(--success)] text-white rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    Resolve YES
                  </button>
                  <button
                    onClick={() => handleResolve(false)}
                    disabled={resolving}
                    className="flex-1 py-3 bg-[var(--danger)] text-white rounded-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    Resolve NO
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Trading Interface */}
          <div className="lg:col-span-1 space-y-6">
            {isResolved ? (
               <div className="card border-[var(--success)]/30 bg-[var(--success-bg)]/10 text-center p-8">
                <h3 className="text-2xl font-display font-bold mb-2 text-[var(--success)]">Market Resolved</h3>
                <p className="text-lg mb-6">
                  Outcome: <span className="font-bold">{account.option ? 'YES' : 'NO'}</span>
                </p>
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="w-full py-4 bg-[var(--primary)] text-white rounded-xl font-bold shadow-glow hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {claiming ? 'Claiming...' : 'Claim Winnings'}
                </button>
                <p className="mt-4 text-xs text-[var(--text-secondary)]">
                  If you hold winning shares, claim your USDC payout now.
                </p>
              </div>
            ) : isEnded ? (
              <div className="card text-center p-8">
                <h3 className="text-xl font-display font-semibold mb-2">Market Ended</h3>
                <p className="text-[var(--text-secondary)]">
                  Trading is closed. Waiting for resolution by the resolver.
                </p>
              </div>
            ) : (
              <BuySellPanel market={market} />
            )}
            
            {/* User Positions (Placeholder) */}
             <div className="card">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Your Position</h3>
              {publicKey ? (
                 <div className="space-y-3">
                   <div className="flex justify-between items-center">
                     <span className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
                       YES Shares
                     </span>
                     <span className="font-mono">0</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-[var(--danger)]" />
                       NO Shares
                     </span>
                     <span className="font-mono">0</span>
                   </div>
                 </div>
              ) : (
                <p className="text-sm text-[var(--muted)] text-center py-4">
                  Connect wallet to view positions
                </p>
              )}
            </div>
          </div>
        </div>
      </PageTransition>
    </div>
  );
}
