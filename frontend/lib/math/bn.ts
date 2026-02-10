import { BN } from 'bn.js';

/**
 * Convert UI amount to raw amount (with decimals)
 * @param amountUi - Amount in UI format (e.g., 100.5)
 * @param decimals - Number of decimals (e.g., 6 for USDC)
 * @returns BN in raw format
 */
export function toRaw(amountUi: number | string, decimals: number): BN {
  const amountStr = typeof amountUi === 'number' ? amountUi.toString() : amountUi;
  const [whole, fraction = ''] = amountStr.split('.');
  
  // Pad or trim fraction to match decimals
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  const rawStr = whole + paddedFraction;
  
  return new BN(rawStr);
}

/**
 * Convert raw amount to UI amount (with decimals)
 * @param raw - Raw amount as BN
 * @param decimals - Number of decimals
 * @returns UI amount as string
 */
export function toUi(raw: BN, decimals: number): string {
  const rawStr = raw.toString().padStart(decimals + 1, '0');
  const whole = rawStr.slice(0, -decimals) || '0';
  const fraction = rawStr.slice(-decimals);
  
  // Remove trailing zeros from fraction
  const trimmedFraction = fraction.replace(/0+$/, '');
  
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
}

/**
 * Convert raw amount to UI number
 */
export function toUiNumber(raw: BN, decimals: number): number {
  return parseFloat(toUi(raw, decimals));
}

/**
 * Calculate fee amount from BPS (basis points)
 * @param amount - Amount in raw format
 * @param feeBps - Fee in basis points (100 = 1%)
 * @returns Fee amount as BN
 */
export function calculateFee(amount: BN, feeBps: number): BN {
  const fee = amount.mul(new BN(feeBps)).div(new BN(10000));
  return fee;
}

/**
 * Calculate amount after fee deduction
 */
export function amountAfterFee(amount: BN, feeBps: number): BN {
  const fee = calculateFee(amount, feeBps);
  return amount.sub(fee);
}

/**
 * Format BN to display string with commas
 */
export function formatBN(bn: BN, decimals: number): string {
  const uiAmount = toUi(bn, decimals);
  const [whole, fraction] = uiAmount.split('.');
  
  // Add commas to whole part
  const wholeWithCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return fraction ? `${wholeWithCommas}.${fraction}` : wholeWithCommas;
}

/**
 * Safe BN creation from string or number
 */
export function safeBN(value: string | number | BN): BN {
  if (value instanceof BN) return value;
  if (typeof value === 'number') return new BN(Math.floor(value));
  return new BN(value);
}

/**
 * Check if BN is zero
 */
export function isZero(bn: BN): boolean {
  return bn.isZero();
}

/**
 * Check if BN is positive
 */
export function isPositive(bn: BN): boolean {
  return !bn.isZero() && !bn.isNeg();
}

/**
 * Max of two BNs
 */
export function max(a: BN, b: BN): BN {
  return a.gt(b) ? a : b;
}

/**
 * Min of two BNs
 */
export function min(a: BN, b: BN): BN {
  return a.lt(b) ? a : b;
}
