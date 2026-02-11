'use client';

import { useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getProgram } from '@/lib/anchor/getProgram';
import { getMarketPDA, getYesMintPDA, getNoMintPDA, getAssociatedTokenAddress } from '@/lib/anchor/pdas';
import { useTxConfirm } from './useTxConfirm';
import { useQueryClient } from '@tanstack/react-query';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

export function useClaimWinnings(marketPubkey: PublicKey) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { confirm } = useTxConfirm();
  const queryClient = useQueryClient();

  const claimWinnings = useCallback(async () => {
    if (!wallet.publicKey) throw new Error('Wallet not connected');

    const program = getProgram(connection, wallet as any);
    
    // Fetch market to get details
    const market = await (program.account as any).market.fetch(marketPubkey);
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
    
    // Get fee collector ATA
    const feeCollectorAta = await getAssociatedTokenAddress(
      (market as any).collateralMint,
      (market as any).feeCollector
    );
    
    // Create the transaction
    const tx = await (program as any).methods
      .claimWinning()
      .accounts({
        user: wallet.publicKey,
        market: marketPubkey,
        yesMint: yesMint,
        noMint: noMint,
        collateralMint: (market as any).collateralMint,
        collateralVault: (market as any).collateralVault,
        userCollateralAta: userCollateralAta,
        userYesAta: userYesAta,
        userNoAta: userNoAta,
        feeCollectorAta: feeCollectorAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    const signature = await confirm(
      tx,
      'Claim Winnings'
    );

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['markets'] });
    queryClient.invalidateQueries({ queryKey: ['market', marketPubkey.toString()] });

    return signature;
  }, [wallet, connection, marketPubkey, confirm, queryClient]);

  return { claimWinnings };
}
