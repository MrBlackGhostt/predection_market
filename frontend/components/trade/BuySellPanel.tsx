'use client';

import { FC, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBuyShare } from '@/hooks/useBuyShare';
import { useSellShare } from '@/hooks/useSellShare';
import { useMarketOdds } from '@/hooks/useMarketOdds';
import { Market } from '@/hooks/useMarkets';
import { toast } from 'sonner';
import { useUSDCBalance } from '@/hooks/useUSDCBalance';
import { useSOLBalance } from '@/hooks/useSOLBalance';
import { FaucetAlert } from '@/components/shared/FaucetAlert';

interface BuySellPanelProps {
  market: Market;
}

export const BuySellPanel: FC<BuySellPanelProps> = ({ market }) => {
  const { connected } = useWallet();
  const { buyShare } = useBuyShare(market.publicKey);
  const { sellShare } = useSellShare(market.publicKey);
  const { data: odds } = useMarketOdds(market);
  const { data: usdcBalance } = useUSDCBalance();
  const { data: solBalance } = useSOLBalance();
  const [amount, setAmount] = useState<string>('');
  const [isYes, setIsYes] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');

  const price = odds ? (isYes ? odds.yesPrice : odds.noPrice) : 0.5;
  const payoutMult = price > 0.001 ? 1 / price : 2.0;
  
  const handleAction = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    setLoading(true);
    try {
      const rawAmount = Math.floor(parseFloat(amount) * 1_000_000); 
      
      if (mode === 'buy') {
        await buyShare(rawAmount, isYes);
        toast.success('Shares purchased successfully!');
      } else {
        await sellShare(rawAmount, isYes);
        toast.success('Shares sold successfully!');
      }
      setAmount('');
    } catch (error: any) {
      console.error(`${mode} error:`, error);
      toast.error(error.message || `Failed to ${mode} shares`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-6">
      {connected && (solBalance || 0) < 0.05 && <FaucetAlert token="SOL" />}
      {connected && (usdcBalance || 0) < 1 && <FaucetAlert token="USDC" />}
      
      {/* Mode Toggle */}
      <div className="bg-[var(--bg-elevated)] p-1 rounded-lg flex">
        <button
          onClick={() => setMode('buy')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            mode === 'buy'
              ? 'bg-[var(--bg)] text-[var(--text)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setMode('sell')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            mode === 'sell'
              ? 'bg-[var(--bg)] text-[var(--text)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
          }`}
        >
          Sell
        </button>
      </div>

      <h3 className="text-xl font-display font-semibold">
        {mode === 'buy' ? 'Place Your Bet' : 'Sell Your Position'}
      </h3>
      
      {/* Outcome Toggle */}
      <div className="flex gap-4">
        <button
          onClick={() => setIsYes(true)}
          className={`flex-1 py-3 rounded-lg font-medium transition-all ${
            isYes
              ? 'bg-[var(--success)] text-white shadow-glow ring-2 ring-[var(--success)]/50'
              : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-elev)]'
          }`}
        >
          YES
        </button>
        <button
          onClick={() => setIsYes(false)}
          className={`flex-1 py-3 rounded-lg font-medium transition-all ${
            !isYes
              ? 'bg-[var(--danger)] text-white shadow-glow ring-2 ring-[var(--danger)]/50'
              : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-elev)]'
          }`}
        >
          NO
        </button>
      </div>

      {/* Amount Input */}
      <div>
        <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
          Amount (USDC)
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input pr-16 font-mono text-lg"
            placeholder="0.00"
            min="0"
            step="0.01"
            disabled={loading}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-medium">
            USDC
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-[var(--bg-elevated)]/50 rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">Implied Price</span>
          <span className="font-mono">{price.toFixed(2)} USDC ({mode === 'buy' ? `${payoutMult.toFixed(2)}x` : 'Refund Rate'})</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">
            {mode === 'buy' ? 'Est. Potential Payout' : 'Estimated Refund'}
          </span>
          <span className="font-mono text-[var(--primary)]">
            {amount ? `${(parseFloat(amount) * (mode === 'buy' ? payoutMult : 1.0)).toFixed(2)} USDC` : '-'}
          </span>
        </div>
        {mode === 'buy' && (
          <div className="flex justify-between pt-2 border-t border-[var(--border)]">
            <span className="text-[var(--text-secondary)]">Fee ({market.account.fee / 100}%)</span>
            <span className="font-mono">
              {amount ? `${(parseFloat(amount) * market.account.fee / 10000).toFixed(4)} USDC` : '-'}
            </span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={handleAction}
        disabled={!connected || !amount || loading}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
          mode === 'buy'
            ? (isYes 
                ? 'bg-[var(--success)] hover:bg-[var(--success)]/90 text-white shadow-glow'
                : 'bg-[var(--danger)] hover:bg-[var(--danger)]/90 text-white shadow-glow')
            : 'bg-[var(--warning)] hover:bg-[var(--warning)]/90 text-[var(--bg)] shadow-glow'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </span>
        ) : !connected ? (
          'Connect Wallet to Trade'
        ) : (
          `${mode === 'buy' ? 'Buy' : 'Sell'} ${isYes ? 'YES' : 'NO'} Shares`
        )}
      </button>
    </div>
  );
};
