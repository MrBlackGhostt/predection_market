'use client';

import { useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getProgram } from '@/lib/anchor/getProgram';
import { getYesMintPDA, getNoMintPDA, getAssociatedTokenAddress } from '@/lib/anchor/pdas';
import { useTxConfirm } from './useTxConfirm';
import { useQueryClient } from '@tanstack/react-query';
import BN from 'bn.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

export function useSellShare(marketPubkey: PublicKey) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { confirm } = useTxConfirm();
  const queryClient = useQueryClient();

  const sellShare = useCallback(
    async (amount: number, isYes: boolean) => {
      if (!wallet.publicKey) throw new Error('Wallet not connected');

      const program = getProgram(connection, wallet as any);
      
      // Fetch market to get details
      const market = await (program.account as any).market.fetch(marketPubkey);
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
      
      try {
        // Collect pre-instructions for creating user's USDC ATA if needed (for refund)
        const preInstructions = [];
        
        const userCollateralAccountInfo = await connection.getAccountInfo(userCollateralAta);
        if (!userCollateralAccountInfo) {
          console.log('Creating user collateral ATA for refund...');
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
        
        // Build the transaction
        let txBuilder: any = (program as any).methods
          .sellShare(new BN(amount), isYes)
          .accounts({
            signer: wallet.publicKey,
            market: marketPubkey,
            marketVault: marketData.marketVault,
            collateralMint: marketData.collateralMint,
            userCollateralAta: userCollateralAta,
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

        const tx = await txBuilder.transaction();

        const signature = await confirm(
          tx,
          `Sell ${isYes ? 'YES' : 'NO'} shares`
        );

        console.log(`Sell ${isYes ? 'YES' : 'NO'} shares successful! Signature:`, signature);

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['markets'] });
        queryClient.invalidateQueries({ queryKey: ['market', marketPubkey.toString()] });
        queryClient.invalidateQueries({ queryKey: ['market-position'] });

        return signature;
      } catch (error: any) {
        console.error('Sell share error:', error);
        console.error('Error details:', {
          message: error?.message,
          logs: error?.logs,
          code: error?.code,
        });
        throw error;
      }
    },
    [wallet, connection, marketPubkey, confirm, queryClient]
  );

  return { sellShare };
}
