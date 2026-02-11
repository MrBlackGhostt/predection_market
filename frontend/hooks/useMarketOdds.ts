import { useConnection } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { getMint } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { Market } from "./useMarkets";

export interface MarketOdds {
  yesPrice: number;
  noPrice: number;
  yesSupply: number;
  noSupply: number;
  totalPool: number;
  yesOdds: string; // e.g. "1.5x"
  noOdds: string;
}

export function useMarketOdds(market: Market | undefined) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['market-odds', market?.publicKey.toString()],
    queryFn: async (): Promise<MarketOdds> => {
      if (!market) throw new Error("No market");

      // Fetch both mints in parallel
      const [yesMintInfo, noMintInfo] = await Promise.all([
        getMint(connection, new PublicKey(market.account.yesMint)),
        getMint(connection, new PublicKey(market.account.noMint)),
      ]);

      const yesSupply = Number(yesMintInfo.supply) / Math.pow(10, yesMintInfo.decimals);
      const noSupply = Number(noMintInfo.supply) / Math.pow(10, noMintInfo.decimals);
      
      const totalPool = yesSupply + noSupply;
      
      // Handle edge case: Empty pool (0 bets)
      if (totalPool === 0) {
        return {
          yesPrice: 0.5,
          noPrice: 0.5,
          yesSupply: 0,
          noSupply: 0,
          totalPool: 0,
          yesOdds: "2.00x",
          noOdds: "2.00x",
        };
      }

      const yesPrice = yesSupply / totalPool;
      const noPrice = noSupply / totalPool;
      
      // Calculate Odds (Payout Multiplier)
      // If Price is 0.60, Odds = 1/0.60 = 1.66x
      // Avoid division by zero if price is extremely low
      const yesOdds = yesPrice > 0.001 ? (1 / yesPrice).toFixed(2) + "x" : "1000x";
      const noOdds = noPrice > 0.001 ? (1 / noPrice).toFixed(2) + "x" : "1000x";

      return {
        yesPrice,
        noPrice,
        yesSupply,
        noSupply,
        totalPool,
        yesOdds,
        noOdds,
      };
    },
    enabled: !!market,
    refetchInterval: 10000,
  });
}
