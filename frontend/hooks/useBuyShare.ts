'use client';

import { useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { getProgram } from '@/lib/anchor/getProgram';
import { getMarketPDA, getYesMintPDA, getNoMintPDA, getAssociatedTokenAddress } from '@/lib/anchor/pdas';
import { useTxConfirm } from './useTxConfirm';
import { useQueryClient } from '@tanstack/react-query';
import BN from 'bn.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

export function useBuyShare(marketPubkey: PublicKey) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { confirm } = useTxConfirm();
  const queryClient = useQueryClient();

  const buyShare = useCallback(
    async (amount: number, isYes: boolean) => {
      if (!wallet.publicKey) throw new Error('Wallet not connected');

      const program = getProgram(connection, wallet as any);
      
      // Fetch market to get details
      const market = await program.account.market.fetch(marketPubkey);
      const marketId = (market as any).marketId.toNumber();
      
      // Derive PDAs
      const [marketPDA] = getMarketPDA((market as any).authority, marketId);
      const [yesMint] = getYesMintPDA(marketPDA);
      const [noMint] = getNoMintPDA(marketPDA);
      
      // Get user token accounts
      const userCollateralAta = await getAssociatedTokenAddress(
        (market as any).collateralMint,
        wallet.publicKey
      );
      
      const userYesAta = await getAssociatedTokenAddress(yesMint, wallet.publicKey);
      const userNoAta = await getAssociatedTokenAddress(noMint, wallet.publicKey);
      
      // Create the transaction
      const tx = await program.methods
        .buyShare(new BN(amount), new BN(marketId), isYes)
        .accounts({
          buyer: wallet.publicKey,
          market: marketPubkey,
          yesMint: yesMint,
          noMint: noMint,
          collateralMint: (market as any).collateralMint,
          collateralVault: (market as any).collateralVault,
          userCollateralAta: userCollateralAta,
          userYesAta: userYesAta,
          userNoAta: userNoAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const signature = await confirm(
        tx,
        `Buy ${isYes ? 'YES' : 'NO'} shares`
      );

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['markets'] });
      queryClient.invalidateQueries({ queryKey: ['market', marketPubkey.toString()] });

      return signature;
    },
    [wallet, connection, marketPubkey, confirm, queryClient]
  );

  return { buyShare };
}
