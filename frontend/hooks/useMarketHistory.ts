import { useConnection } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";

export interface HistoryPoint {
  time: number; // timestamp (seconds)
  count: number; // transactions in this bucket
  formattedTime: string;
}

export function useMarketHistory(marketPubkey: PublicKey | undefined) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ['market-history', marketPubkey?.toString()],
    queryFn: async (): Promise<HistoryPoint[]> => {
      if (!marketPubkey) return [];

      try {
        // Fetch last 100 signatures
        // Note: In production, you might need an indexer for full history
        const signatures = await connection.getSignaturesForAddress(marketPubkey, { limit: 100 });
        
        if (signatures.length === 0) return [];

        // Group transactions into buckets (e.g., 30 minute intervals)
        const BUCKET_SIZE = 1800; // 30 mins in seconds
        const buckets = new Map<number, number>();
        
        signatures.forEach(sig => {
          if (sig.blockTime) {
            const bucket = Math.floor(sig.blockTime / BUCKET_SIZE) * BUCKET_SIZE;
            buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
          }
        });

        // Fill gaps? Maybe just show activity points for now.
        // Let's ensure we at least cover the range from first to last tx.
        
        const history = Array.from(buckets.entries())
          .map(([time, count]) => ({
            time,
            count,
            formattedTime: new Date(time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }))
          .sort((a, b) => a.time - b.time);

        return history;
      } catch (e) {
        console.error("Failed to fetch history:", e);
        return [];
      }
    },
    enabled: !!marketPubkey,
    refetchInterval: 30000, // Refresh every 30s
  });
}
