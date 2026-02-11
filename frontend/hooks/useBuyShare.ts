'use client';

import { useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getProgram } from '@/lib/anchor/getProgram';
import { getYesMintPDA, getNoMintPDA, getAssociatedTokenAddress } from '@/lib/anchor/pdas';
import { useQueryClient } from '@tanstack/react-query';
import BN from 'bn.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

export function useBuyShare(marketPubkey: PublicKey) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const queryClient = useQueryClient();

  const buyShare = useCallback(
    async (amount: number, isYes: boolean) => {
      if (!wallet.publicKey) throw new Error('Wallet not connected');

      const program = getProgram(connection, wallet as any);
      
      // Fetch market to get details
      const market = await program.account.market.fetch(marketPubkey);
      const marketData = market as any;
      
      // Derive PDAs
      const [yesMint] = getYesMintPDA(marketPubkey);
      const [noMint] = getNoMintPDA(marketPubkey);
      
      // Get user token accounts
      const userCollateralAta = await getAssociatedTokenAddress(
        marketData.collateralMint,
        wallet.publicKey
      );
      
      const userYesAta = await getAssociatedTokenAddress(yesMint, wallet.publicKey);
      const userNoAta = await getAssociatedTokenAddress(noMint, wallet.publicKey);
      
      // Get fee collector ATAs
      const feeCollectorAta = await getAssociatedTokenAddress(
        marketData.collateralMint,
        marketData.feeCollector
      );
      
      const protocolFeeCollectorAta = await getAssociatedTokenAddress(
        marketData.collateralMint,
        marketData.protocolFeeCollector
      );
      
      try {
        // Collect pre-instructions for creating user's USDC ATA if needed
        const preInstructions = [];
        
        const userCollateralAccountInfo = await connection.getAccountInfo(userCollateralAta);
        if (!userCollateralAccountInfo) {
          console.log('Creating user collateral ATA...');
          const { createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');
          const createUserCollateralIx = createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            userCollateralAta,
            wallet.publicKey,
            marketData.collateralMint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          );
          preInstructions.push(createUserCollateralIx);
        }
        
        // Build the transaction using Anchor's .rpc() method
        let txBuilder = program.methods
          .buyShare(new BN(amount), new BN(marketData.marketId), isYes)
          .accounts({
            signer: wallet.publicKey,
            feeCollectorAta: feeCollectorAta,
            protocolFeeCollectorAta: protocolFeeCollectorAta,
            market: marketPubkey,
            marketVault: marketData.marketVault,
            collateralMint: marketData.collateralMint,
            userCollateralMintAta: userCollateralAta,
            yesMint: yesMint,
            noMint: noMint,
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

        const signature = await txBuilder.rpc();

        console.log(`Buy ${isYes ? 'YES' : 'NO'} shares successful! Signature:`, signature);

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['markets'] });
        queryClient.invalidateQueries({ queryKey: ['market', marketPubkey.toString()] });

        return signature;
      } catch (error: any) {
        console.error('Buy share error:', error);
        console.error('Error details:', {
          message: error?.message,
          logs: error?.logs,
          code: error?.code,
        });
        throw error;
      }
    },
    [wallet, connection, marketPubkey, queryClient]
  );

  return { buyShare };
}
