import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { USDC_DEVNET_MINT } from "@/lib/constants";

export function useUSDCBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ['usdc-balance', publicKey?.toString()],
    queryFn: async () => {
      if (!publicKey) return 0;
      
      try {
        const ata = await getAssociatedTokenAddress(USDC_DEVNET_MINT, publicKey);
        const balance = await connection.getTokenAccountBalance(ata);
        return balance.value.uiAmount || 0;
      } catch (e) {
        // If ATA doesn't exist or other error, return 0
        return 0;
      }
    },
    enabled: !!publicKey,
    refetchInterval: 10000,
  });
}
