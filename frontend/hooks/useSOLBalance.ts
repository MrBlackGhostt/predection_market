import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export function useSOLBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ['sol-balance', publicKey?.toString()],
    queryFn: async () => {
      if (!publicKey) return 0;
      try {
        const balance = await connection.getBalance(publicKey);
        return balance / LAMPORTS_PER_SOL;
      } catch (e) {
        return 0;
      }
    },
    enabled: !!publicKey,
    refetchInterval: 10000,
  });
}
