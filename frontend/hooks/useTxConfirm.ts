'use client';

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Transaction, TransactionSignature } from '@solana/web3.js';
import { toast } from 'sonner';

interface TxState {
  loading: boolean;
  error: Error | null;
  signature: TransactionSignature | null;
}

export function useTxConfirm() {
  const { connection } = useConnection();
  const { sendTransaction } = useWallet();
  const [state, setState] = useState<TxState>({
    loading: false,
    error: null,
    signature: null,
  });

  const confirm = useCallback(
    async (tx: Transaction, description: string = 'Transaction') => {
      setState({ loading: true, error: null, signature: null });

      try {
        const signature = await sendTransaction(tx, connection);
        
        toast.loading(`${description} pending...`, { id: signature });

        const latestBlockhash = await connection.getLatestBlockhash();
        await connection.confirmTransaction(
          {
            signature,
            ...latestBlockhash,
          },
          'confirmed'
        );

        toast.success(`${description} successful!`, { id: signature });
        
        setState({ loading: false, error: null, signature });
        return signature;
      } catch (error: any) {
        const err = error as Error;
        console.error('Transaction error:', err);
        
        toast.error(`${description} failed: ${err.message}`, { id: 'tx-error' });
        
        setState({ loading: false, error: err, signature: null });
        throw err;
      }
    },
    [connection, sendTransaction]
  );

  return {
    ...state,
    confirm,
  };
}
