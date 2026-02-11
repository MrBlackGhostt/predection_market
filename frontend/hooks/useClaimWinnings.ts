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
    // const [marketPDA] = getMarketPDA((market as any).authority, marketId); // Redundant
    const marketPDA = marketPubkey;
    const [yesMint] = getYesMintPDA(marketPDA);
    const [noMint] = getNoMintPDA(marketPDA);
    
    // Get user token accounts
    const userCollateralAta = await getAssociatedTokenAddress(
      (market as any).collateralMint,
      wallet.publicKey
    );
    
    const userYesAta = await getAssociatedTokenAddress(yesMint, wallet.publicKey);
    const userNoAta = await getAssociatedTokenAddress(noMint, wallet.publicKey);
    
    // Collect pre-instructions for creating missing ATAs
    const preInstructions = [];
    const { createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');

    // 1. Check User Collateral ATA (USDC)
    const userCollateralInfo = await connection.getAccountInfo(userCollateralAta);
    if (!userCollateralInfo) {
      console.log('Creating user collateral ATA...');
      preInstructions.push(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          userCollateralAta,
          wallet.publicKey,
          (market as any).collateralMint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // 2. Check YES ATA
    const yesInfo = await connection.getAccountInfo(userYesAta);
    if (!yesInfo) {
      console.log('Creating YES ATA...');
      preInstructions.push(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          userYesAta,
          wallet.publicKey,
          yesMint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // 3. Check NO ATA
    const noInfo = await connection.getAccountInfo(userNoAta);
    if (!noInfo) {
      console.log('Creating NO ATA...');
      preInstructions.push(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          userNoAta,
          wallet.publicKey,
          noMint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }
    
    // Create the transaction builder
    let txBuilder: any = (program as any).methods
      .claimWinning()
      .accounts({
        signer: wallet.publicKey,
        market: marketPubkey,
        yesMint: yesMint,
        noMint: noMint,
        collateralMint: (market as any).collateralMint,
        marketVault: (market as any).marketVault,
        userCollateralAta: userCollateralAta,
        yesMintAta: userYesAta,
        noMintAta: userNoAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      });

    // Add pre-instructions if any
    if (preInstructions.length > 0) {
      txBuilder = txBuilder.preInstructions(preInstructions);
    }

    const tx = await txBuilder.transaction();

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
