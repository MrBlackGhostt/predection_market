'use client';

import { useMarkets } from "@/hooks/useMarkets";
import { TopNav } from "@/components/nav/TopNav";
import { MarketCard } from "@/components/markets/MarketCard";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/shared/Motion";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";

export default function Home() {
  const { data: markets, isLoading, isError } = useMarkets();

  return (
    <div className="min-h-screen">
      <TopNav />
      
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <PageTransition className="mb-12 text-center relative z-10">
          <div className="absolute inset-0 bg-gradient-radial from-[var(--primary)]/10 via-transparent to-transparent opacity-50 blur-3xl -z-10" />
          
          <h1 className="text-5xl md:text-6xl font-display font-bold mb-6 text-gradient bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] tracking-tight">
            Predict the Future
          </h1>
          <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-8 leading-relaxed">
            Trade on the outcome of real-world events. Decentralized, transparent, and powered by Solana.
          </p>
          
          <div className="flex justify-center gap-4">
            <Link 
              href="/create"
              className="btn btn-primary px-8 py-3 text-lg font-semibold rounded-xl shadow-glow hover:shadow-xl transition-all"
            >
              Create Market
            </Link>
            <a 
              href="#markets"
              className="btn btn-secondary px-8 py-3 text-lg font-medium rounded-xl border-opacity-50 hover:border-[var(--primary)] transition-all"
            >
              Browse Markets
            </a>
          </div>
        </PageTransition>

        {/* Markets Grid */}
        <div id="markets" className="pt-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-display font-semibold">
              Active Markets <span className="ml-2 text-sm text-[var(--text-secondary)] font-normal">({markets?.length || 0})</span>
            </h2>
            
            {/* Filter Placeholder */}
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-sm rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] font-medium">All</button>
              <button className="px-3 py-1.5 text-sm rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors">Newest</button>
              <button className="px-3 py-1.5 text-sm rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors">Ending Soon</button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 rounded-xl bg-[var(--bg-elevated)] animate-pulse border border-[var(--border)]" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-20 bg-[var(--danger-bg)]/10 rounded-xl border border-[var(--danger)]/20">
              <p className="text-[var(--danger)] font-medium">Failed to load markets.</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-[var(--bg-elevated)] rounded-lg text-sm hover:bg-[var(--bg-elev)] transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : markets?.length === 0 ? (
            <PageTransition className="text-center py-24 bg-[var(--bg-elevated)]/50 rounded-2xl border border-[var(--border)] glass-panel">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-[var(--bg-elevated)] mb-6 shadow-inner">
                <svg
                  className="h-10 w-10 text-[var(--muted)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[var(--text)] mb-2">No markets yet</h3>
              <p className="text-[var(--text-secondary)] mb-8 max-w-sm mx-auto">
                Be the first to create a prediction market on Solana!
              </p>
              <Link
                href="/create"
                className="btn btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg hover:shadow-glow transition-all"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create First Market
              </Link>
            </PageTransition>
          ) : (
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {markets?.map((market) => (
                <StaggerItem key={market.publicKey.toString()}>
                  <MarketCard market={market} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </main>
    </div>
  );
}
