import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { IDL, Predection } from '@/types/predection';
import { PROGRAM_ID } from './pdas';

/**
 * Get the Anchor program instance
 */
export function getProgram(
  connection: Connection,
  wallet?: AnchorWallet
): Program<any> {
  const provider = new AnchorProvider(
    connection,
    wallet as any,
    { commitment: 'confirmed' }
  );

  return new Program(IDL as any, provider);
}

/**
 * Get program without wallet (read-only)
 */
export function getProgramReadOnly(connection: Connection): Program<any> {
  // Create a dummy wallet for read-only operations
  const dummyWallet = {
    publicKey: PublicKey.default,
    signTransaction: async () => { throw new Error('Read-only mode'); },
    signAllTransactions: async () => { throw new Error('Read-only mode'); },
  };

  const provider = new AnchorProvider(
    connection,
    dummyWallet as any,
    { commitment: 'confirmed' }
  );

  return new Program(IDL as any, provider);
}

export { PROGRAM_ID };
