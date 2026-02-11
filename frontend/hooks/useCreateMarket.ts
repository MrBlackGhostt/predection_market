'use client';

import { useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Keypair } from '@solana/web3.js';
import { getProgram } from '@/lib/anchor/getProgram';
import { getMarketPDA, getYesMintPDA, getNoMintPDA, getAssociatedTokenAddress } from '@/lib/anchor/pdas';
import { useQueryClient } from '@tanstack/react-query';
import BN from 'bn.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

interface CreateMarketParams {
  question: string;
  endDate: Date;
  feeBps: number;
  resolver: string;
}

export function useCreateMarket() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const queryClient = useQueryClient();

  const createMarket = useCallback(
    async ({ question, endDate, feeBps, resolver }: CreateMarketParams) => {
      if (!wallet.publicKey) throw new Error('Wallet not connected');

      const program = getProgram(connection, wallet as any);
      
      // Generate a unique market ID based on timestamp
      const marketId = Date.now();
      
      // Calculate duration in seconds based on endDate
      const durationTime = Math.floor((endDate.getTime() - Date.now()) / 1000);
      
      if (durationTime < 60) {
        throw new Error("End date must be in the future");
      }
      
      // Derive PDAs
      const [marketPDA, marketBump] = getMarketPDA(wallet.publicKey, marketId);
      const [yesMint] = getYesMintPDA(marketPDA);
      const [noMint] = getNoMintPDA(marketPDA);
      
      // For devnet, we'll use the standard Devnet USDC mint
      // This ensures we are testing with a real SPL token, not Wrapped SOL which requires special handling
      const collateralMint = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
      
      // Derive fee collector ATA for market creator
      const feeCollectorAta = await getAssociatedTokenAddress(
        collateralMint,
        wallet.publicKey
      );
      
      // Protocol fee collector from environment or fallback to creator
      const protocolFeeCollectorAddress = 
        new PublicKey(process.env.NEXT_PUBLIC_PROTOCOL_FEE_COLLECTOR || wallet.publicKey.toString());
      const protocolFeeCollectorAta = await getAssociatedTokenAddress(
        collateralMint,
        protocolFeeCollectorAddress
      );
      
      const resolverPubkey = new PublicKey(resolver);
      
      // Convert question to bytes (Vec<u8> in Rust)
      const questionBytes = Buffer.from(question, 'utf-8');
      
      try {
        // Use Anchor's .rpc() method which handles transaction construction automatically
        // This is more reliable than manually building the transaction
        
        // Collect pre-instructions for creating ATAs if needed
        const preInstructions = [];
        
        // Check if the fee collector ATA exists, if not, create it
        const feeCollectorAccountInfo = await connection.getAccountInfo(feeCollectorAta);
        if (!feeCollectorAccountInfo) {
          console.log('Creating fee collector ATA...');
          const { createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');
          const createFeeCollectorIx = createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            feeCollectorAta,
            wallet.publicKey,
            collateralMint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          );
          preInstructions.push(createFeeCollectorIx);
        }

        // Check if the protocol fee collector ATA exists, if not, create it
        const protocolFeeCollectorAccountInfo = await connection.getAccountInfo(protocolFeeCollectorAta);
        if (!protocolFeeCollectorAccountInfo) {
          console.log('Creating protocol fee collector ATA...');
          const { createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');
          const createProtocolFeeCollectorIx = createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            protocolFeeCollectorAta,
            protocolFeeCollectorAddress,
            collateralMint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          );
          preInstructions.push(createProtocolFeeCollectorIx);
        }

        // Build the instruction with pre-instructions to create ATAs if needed
        let txBuilder = program.methods
          .initialize(
            resolverPubkey,
            new BN(marketId),
            questionBytes,
            new BN(durationTime),
            new BN(feeBps)
          )
          .accounts({
            feeCollectorColletralAta: feeCollectorAta,
            protocolFeeCollector: protocolFeeCollectorAddress,
            protocolFeeCollectorAta: protocolFeeCollectorAta,
            marketCreator: wallet.publicKey,
            market: marketPDA,
            yesMint: yesMint,
            noMint: noMint,
            collateralMint: collateralMint,
            // marketVault is auto-derived by Anchor, don't pass it explicitly
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          });

        // Add pre-instructions if any
        if (preInstructions.length > 0) {
          txBuilder = txBuilder.preInstructions(preInstructions);
        }

        const signature = await txBuilder.rpc();

        console.log('Market created successfully! Signature:', signature);
        
        // Invalidate markets query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['markets'] });

        return { signature, marketPDA };
      } catch (error: any) {
        console.error('Create market error:', error);
        console.error('Error details:', {
          message: error?.message,
          logs: error?.logs,
          code: error?.code,
        });
        throw error;
      }
    },
    [wallet, connection, queryClient]
  );

  return { createMarket };
}
