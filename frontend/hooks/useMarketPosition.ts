import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useQuery } from '@tanstack/react-query';
import { getAssociatedTokenAddress } from '@/lib/anchor/pdas';
import { PublicKey } from '@solana/web3.js';
import { Market } from './useMarkets';

export function useMarketPosition(market: Market | undefined) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ['market-position', market?.publicKey.toString(), publicKey?.toString()],
    queryFn: async () => {
      if (!market || !publicKey) return { yes: 0, no: 0 };

      // Ensure mints are PublicKeys (they should be from the Market type, but safely handling)
      const yesMint = new PublicKey(market.account.yesMint);
      const noMint = new PublicKey(market.account.noMint);

      // Derive ATAs
      const [yesAta, noAta] = await Promise.all([
        getAssociatedTokenAddress(yesMint, publicKey),
        getAssociatedTokenAddress(noMint, publicKey),
      ]);

      // Fetch balances (handle case where account doesn't exist yet -> 0 balance)
      const [yesBal, noBal] = await Promise.all([
        connection.getTokenAccountBalance(yesAta).then(res => res.value.uiAmount || 0).catch(() => 0),
        connection.getTokenAccountBalance(noAta).then(res => res.value.uiAmount || 0).catch(() => 0),
      ]);

      return { yes: yesBal, no: noBal };
    },
    enabled: !!market && !!publicKey,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}
