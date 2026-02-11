'use client';

import { FC, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBuyShare } from '@/hooks/useBuyShare';
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
  const { data: usdcBalance } = useUSDCBalance();
  const { data: solBalance } = useSOLBalance();
  const [amount, setAmount] = useState<string>('');
  const [isYes, setIsYes] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    setLoading(true);
    try {
      // In a real app, multiply by decimals
      // const rawAmount = parseFloat(amount) * 1_000_000; // Assuming 6 decimals
      const rawAmount = Math.floor(parseFloat(amount) * 1_000_000); 
      await buyShare(rawAmount, isYes);
      setAmount('');
      toast.success('Shares purchased successfully!');
    } catch (error: any) {
      console.error('Buy error:', error);
      toast.error(error.message || 'Failed to purchase shares');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-6">
      {connected && (solBalance || 0) < 0.05 && <FaucetAlert token="SOL" />}
      {connected && (usdcBalance || 0) < 1 && <FaucetAlert token="USDC" />}
      <h3 className="text-xl font-display font-semibold">Place Your Bet</h3>
      
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
          <span className="text-[var(--text-secondary)]">Price per share</span>
          <span className="font-mono">1.00 USDC</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">Potential Payout</span>
          <span className="font-mono text-[var(--primary)]">
            {amount ? `${parseFloat(amount).toFixed(2)} USDC` : '-'}
          </span>
        </div>
        <div className="flex justify-between pt-2 border-t border-[var(--border)]">
          <span className="text-[var(--text-secondary)]">Fee ({market.account.fee / 100}%)</span>
          <span className="font-mono">
            {amount ? `${(parseFloat(amount) * market.account.fee / 10000).toFixed(4)} USDC` : '-'}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleBuy}
        disabled={!connected || !amount || loading}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
          isYes 
            ? 'bg-[var(--success)] hover:bg-[var(--success)]/90 text-white shadow-glow'
            : 'bg-[var(--danger)] hover:bg-[var(--danger)]/90 text-white shadow-glow'
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
          `Buy ${isYes ? 'YES' : 'NO'} Shares`
        )}
      </button>
    </div>
  );
};
