import { BN } from 'bn.js';
import { PublicKey } from '@solana/web3.js';

export function shortenAddress(address: PublicKey | string, chars = 4): string {
  const str = address.toString();
  return `${str.slice(0, chars)}...${str.slice(-chars)}`;
}

export function formatAmount(amount: BN | number, decimals = 6): string {
  const value = typeof amount === 'number' ? amount : amount.toNumber();
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value / Math.pow(10, decimals));
}

export function formatPct(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatTimeRemaining(timestamp: number): string {
  const now = Date.now() / 1000;
  const diff = timestamp - now;

  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  
  const minutes = Math.floor((diff % 3600) / 60);
  return `${minutes}m left`;
}
