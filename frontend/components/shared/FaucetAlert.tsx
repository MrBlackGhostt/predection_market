import { FAUCET_URL } from "@/lib/constants";

interface FaucetAlertProps {
  token?: 'USDC' | 'SOL';
}

export const FaucetAlert = ({ token = 'USDC' }: FaucetAlertProps) => {
  const isSol = token === 'SOL';
  const url = isSol ? "https://faucet.solana.com/" : FAUCET_URL;
  const name = isSol ? "SOL" : "USDC";

  return (
    <div className="p-4 bg-[var(--warning-bg)]/10 border border-[var(--warning)]/20 rounded-xl mb-6">
      <div className="flex gap-3">
        <div className="text-[var(--warning)] flex-shrink-0 pt-0.5">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <div>
          <h4 className="font-medium text-[var(--text)] mb-1">Insufficient {name} Balance</h4>
          <p className="text-sm text-[var(--text-secondary)] mb-2">
            You need Devnet {name} to {isSol ? 'pay for gas fees' : 'perform this action'}.
          </p>
          <a 
            href={url}
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm font-medium text-[var(--primary)] hover:underline flex items-center gap-1"
          >
            Get Free {name} from Faucet
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};
