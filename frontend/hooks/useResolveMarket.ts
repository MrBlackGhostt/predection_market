'use client';

import { useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getProgram } from '@/lib/anchor/getProgram';
import { useTxConfirm } from './useTxConfirm';
import { useQueryClient } from '@tanstack/react-query';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export function useResolveMarket(marketPubkey: PublicKey) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { confirm } = useTxConfirm();
  const queryClient = useQueryClient();

  const resolveMarket = useCallback(
    async (outcome: boolean) => {
      if (!wallet.publicKey) throw new Error('Wallet not connected');

      const program = getProgram(connection, wallet as any);
      
      // Fetch market to get resolver
      const market = await program.account.market.fetch(marketPubkey);
      const resolver = (market as any).resolver;

      if (!resolver.equals(wallet.publicKey)) {
        throw new Error('Only the designated resolver can resolve this market');
      }

      // Create the transaction
      const tx = await program.methods
        .resolveMarket(outcome)
        .accounts({
          resolver: wallet.publicKey,
          market: marketPubkey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const signature = await confirm(
        tx,
        `Resolve market as ${outcome ? 'YES' : 'NO'}`
      );

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['markets'] });
      queryClient.invalidateQueries({ queryKey: ['market', marketPubkey.toString()] });

      return signature;
    },
    [wallet, connection, marketPubkey, confirm, queryClient]
  );

  return { resolveMarket };
}
