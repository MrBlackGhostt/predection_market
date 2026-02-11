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
  const { sendTransaction, publicKey: walletPublicKey } = useWallet();
  const [state, setState] = useState<TxState>({
    loading: false,
    error: null,
    signature: null,
  });

  const confirm = useCallback(
    async (tx: Transaction, description: string = 'Transaction') => {
      setState({ loading: true, error: null, signature: null });

      try {
        // Get the latest blockhash and set it on the transaction
        const latestBlockhash = await connection.getLatestBlockhash();
        tx.recentBlockhash = latestBlockhash.blockhash;
        tx.feePayer = walletPublicKey!;
        
        // Debug: Log transaction details
        console.log('Transaction details:', {
          feePayer: tx.feePayer?.toString(),
          recentBlockhash: tx.recentBlockhash,
          instructionCount: tx.instructions.length,
          signatures: tx.signatures.length,
        });
        
        // Log instruction details
        tx.instructions.forEach((ix, idx) => {
          console.log(`Instruction ${idx}:`, {
            programId: ix.programId.toString(),
            keys: ix.keys.map(k => ({
              pubkey: k.pubkey.toString(),
              isSigner: k.isSigner,
              isWritable: k.isWritable,
            })),
            dataLength: ix.data.length,
          });
        });
        
        const signature = await sendTransaction(tx, connection);
        
        toast.loading(`${description} pending...`, { id: signature });

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
        console.error('Full error object:', JSON.stringify(error, null, 2));
        
        // Try to extract more detailed error information
        if (error?.logs) {
          console.error('Transaction logs:', error.logs);
        }
        if (error?.message) {
          console.error('Error message:', error.message);
        }
        if (error?.cause) {
          console.error('Error cause:', error.cause);
        }
        
        const errorMessage = error?.message || err.message || 'Unknown error';
        toast.error(`${description} failed: ${errorMessage}`, { id: 'tx-error' });
        
        setState({ loading: false, error: err, signature: null });
        throw err;
      }
    },
    [connection, sendTransaction, walletPublicKey]
  );

  return {
    ...state,
    confirm,
  };
}
