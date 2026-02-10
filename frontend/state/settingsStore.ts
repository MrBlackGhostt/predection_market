import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Cluster } from '@/lib/solana/connection';

interface SettingsStore {
  // Cluster settings
  cluster: Cluster;
  setCluster: (cluster: Cluster) => void;
  
  // RPC settings
  customRpcUrl: string | null;
  setCustomRpcUrl: (url: string | null) => void;
  
  // Dev toggles
  showDevTools: boolean;
  toggleDevTools: () => void;
  
  // Slippage tolerance (in BPS)
  slippageBps: number;
  setSlippageBps: (bps: number) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // Cluster settings
      cluster: (process.env.NEXT_PUBLIC_CLUSTER as Cluster) || 'localnet',
      setCluster: (cluster) => set({ cluster }),
      
      // RPC settings
      customRpcUrl: null,
      setCustomRpcUrl: (url) => set({ customRpcUrl: url }),
      
      // Dev toggles
      showDevTools: process.env.NODE_ENV === 'development',
      toggleDevTools: () => set((state) => ({ showDevTools: !state.showDevTools })),
      
      // Slippage tolerance (default 1% = 100 BPS)
      slippageBps: 100,
      setSlippageBps: (bps) => set({ slippageBps: bps }),
    }),
    {
      name: 'prediction-market-settings',
    }
  )
);
