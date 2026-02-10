'use client';

import { useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, Keypair } from '@solana/web3.js';
import { getProgram } from '@/lib/anchor/getProgram';
import { getMarketPDA, getYesMintPDA, getNoMintPDA, getAssociatedTokenAddress } from '@/lib/anchor/pdas';
import { useTxConfirm } from './useTxConfirm';
import { useQueryClient } from '@tanstack/react-query';
import BN from 'bn.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

interface CreateMarketParams {
  question: string;
  durationHours: number;
  feeBps: number;
  resolver: string;
}

export function useCreateMarket() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { confirm } = useTxConfirm();
  const queryClient = useQueryClient();

  const createMarket = useCallback(
    async ({ question, durationHours, feeBps, resolver }: CreateMarketParams) => {
      if (!wallet.publicKey) throw new Error('Wallet not connected');

      const program = getProgram(connection, wallet as any);
      
      // Generate a unique market ID based on timestamp
      const marketId = Date.now();
      
      // Convert duration from hours to seconds
      const durationTime = durationHours * 60 * 60;
      
      // Derive PDAs
      const [marketPDA, marketBump] = getMarketPDA(wallet.publicKey, marketId);
      const [yesMint] = getYesMintPDA(marketPDA);
      const [noMint] = getNoMintPDA(marketPDA);
      
      // For devnet, we'll use a common USDC-like token or system token
      // In production, this should be the actual USDC mint
      const collateralMint = new PublicKey('So11111111111111111111111111111111111111112'); // SOL for now
      
      // Derive collateral vault PDA
      const [collateralVault] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), marketPDA.toBuffer()],
        program.programId
      );
      
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
      
      // Create the transaction
      const tx = await program.methods
        .initialize(
          resolverPubkey,
          new BN(marketId),
          Array.from(questionBytes),
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
          collateralVault: collateralVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const signature = await confirm(tx, 'Create Market');

      // Invalidate markets query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['markets'] });

      return { signature, marketPDA };
    },
    [wallet, connection, confirm, queryClient]
  );

  return { createMarket };
}
