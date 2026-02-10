'use client';

import { useQuery } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useMarkets, Market } from './useMarkets';

export interface UserPosition {
  market: Market;
  yesAmount: number;
  noAmount: number;
  totalInvested: number; // Simplified: assumes 1:1 mint cost for now
  potentialPayout: number;
}

export function useUserPositions() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { data: markets } = useMarkets();

  return useQuery({
    queryKey: ['user-positions', publicKey?.toString(), markets?.length],
    queryFn: async () => {
      if (!publicKey || !markets) return [];

      // Fetch all token accounts for the user
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      const positions: UserPosition[] = [];

      // Map token accounts to a quick lookup map: Mint -> Amount
      const tokenBalances = new Map<string, number>();
      tokenAccounts.value.forEach((account) => {
        const info = account.account.data.parsed.info;
        const mint = info.mint;
        const amount = info.tokenAmount.uiAmount || 0;
        if (amount > 0) {
          tokenBalances.set(mint, amount);
        }
      });

      // Check each market for user positions
      markets.forEach((market) => {
        const yesMint = market.account.yesMint.toString();
        const noMint = market.account.noMint.toString();

        const yesAmount = tokenBalances.get(yesMint) || 0;
        const noAmount = tokenBalances.get(noMint) || 0;

        if (yesAmount > 0 || noAmount > 0) {
          positions.push({
            market,
            yesAmount,
            noAmount,
            totalInvested: yesAmount + noAmount, // Assuming 1 USDC per share initially
            potentialPayout: yesAmount + noAmount, // 1:1 payout
          });
        }
      });

      return positions;
    },
    enabled: !!publicKey && !!markets,
    refetchInterval: 10_000,
  });
}
