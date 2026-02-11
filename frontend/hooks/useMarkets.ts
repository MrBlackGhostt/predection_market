'use client';

import { useQuery } from '@tanstack/react-query';
import { useConnection } from '@solana/wallet-adapter-react';
import { getProgramReadOnly } from '@/lib/anchor/getProgram';
import { PublicKey } from '@solana/web3.js';

export interface Market {
  publicKey: PublicKey;
  account: {
    authority: PublicKey;
    resolver: PublicKey;
    marketId: number;
    question: string;
    resolutionTime: number;
    marketCloseTimestamp: number;
    fee: number;
    option: boolean | null;
    status: any;
    yesMint: PublicKey;
    noMint: PublicKey;
    collateralMint: PublicKey;
    collateralVault: PublicKey;
    feeCollector: PublicKey;
    bump: number;
  };
}

export function useMarkets() {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['markets'],
    queryFn: async () => {
      const program = getProgramReadOnly(connection);
      const markets = await (program.account as any).market.all();
      
      return markets.map((m: any) => ({
        publicKey: m.publicKey,
        account: {
          ...m.account,
          marketId: m.account.marketId.toNumber(),
          resolutionTime: m.account.resolutionTime.toNumber(),
          marketCloseTimestamp: m.account.marketCloseTimestamp.toNumber(),
          fee: m.account.fee.toNumber(),
        },
      })) as Market[];
    },
    refetchInterval: 10_000, // Refetch every 10 seconds
  });
}

export function useMarket(marketPubkey: string | undefined) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['market', marketPubkey],
    queryFn: async () => {
      if (!marketPubkey) throw new Error('Market pubkey required');
      
      const program = getProgramReadOnly(connection);
      const market = await (program.account as any).market.fetch(new PublicKey(marketPubkey));
      
      return {
        publicKey: new PublicKey(marketPubkey),
        account: {
          ...market,
          marketId: (market as any).marketId.toNumber(),
          resolutionTime: (market as any).resolutionTime.toNumber(),
          marketCloseTimestamp: (market as any).marketCloseTimestamp.toNumber(),
          fee: (market as any).fee.toNumber(),
        },
      } as Market;
    },
    enabled: !!marketPubkey,
    refetchInterval: 5_000, // Refetch every 5 seconds
  });
}
