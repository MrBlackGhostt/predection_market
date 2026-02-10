import { PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';

const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID
  ? new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID)
  : PublicKey.default;

/**
 * Derive the market PDA
 * Seeds: ["market", authority, market_id]
 */
export function getMarketPDA(authority: PublicKey, marketId: BN | number): [PublicKey, number] {
  const marketIdBN = typeof marketId === 'number' ? new BN(marketId) : marketId;
  const marketIdBuffer = marketIdBN.toArrayLike(Buffer, 'le', 8);
  
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('market'),
      authority.toBuffer(),
      marketIdBuffer,
    ],
    PROGRAM_ID
  );
}

/**
 * Derive the YES mint PDA
 * Seeds: ["yes_mint", market]
 */
export function getYesMintPDA(market: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('yes_mint'),
      market.toBuffer(),
    ],
    PROGRAM_ID
  );
}

/**
 * Derive the NO mint PDA
 * Seeds: ["no_mint", market]
 */
export function getNoMintPDA(market: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('no_mint'),
      market.toBuffer(),
    ],
    PROGRAM_ID
  );
}

/**
 * Get associated token address
 */
export async function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  programId: PublicKey = new PublicKey('TokenkgQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
): Promise<PublicKey> {
  const [address] = PublicKey.findProgramAddressSync(
    [
      owner.toBuffer(),
      programId.toBuffer(),
      mint.toBuffer(),
    ],
    new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
  );
  return address;
}

export { PROGRAM_ID };
