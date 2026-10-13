/**
 * Currency utilities for Indian Rupee (INR)
 * Formats with Indian numbering system (e.g., ₹1,23,456.00, ₹10,00,000 for 10 Lakhs).
 * Provides exact decimal math utilities to prevent floating point inaccuracies.
 */

export const DEFAULT_CURRENCY = 'INR';

/**
 * Formats an amount in INR with Indian numbering system (Lakhs and Crores).
 * Example: 123456.78 -> "₹1,23,456.78"
 */
export function formatINR(amount: number, showDecimals: boolean = true): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0.00';
  }

  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  return formatter.format(amount);
}

/**
 * Compact Indian currency formatting for compact charts or KPI badges.
 * Example: 150000 -> "₹1.5L", 25000000 -> "₹2.5Cr", 4500 -> "₹4.5K"
 */
export function formatCompactINR(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 10000000) {
    const val = parseFloat((abs / 10000000).toFixed(2));
    return `${sign}₹${val}Cr`;
  }
  if (abs >= 100000) {
    const val = parseFloat((abs / 100000).toFixed(2));
    return `${sign}₹${val}L`;
  }
  if (abs >= 1000) {
    const val = parseFloat((abs / 1000).toFixed(1));
    return `${sign}₹${val}K`;
  }
  return formatINR(amount);
}

/**
 * Convert rupees to integer paise (cents) to avoid IEEE 754 floating point arithmetic issues.
 */
export function toPaise(rupees: number): number {
  return Math.round((rupees + Number.EPSILON) * 100);
}

/**
 * Convert paise back to rupees rounded to two decimal places.
 */
export function toRupees(paise: number): number {
  return Math.round(paise) / 100;
}

/**
 * Safe 2-decimal rounding.
 */
export function roundToPaise(amount: number): number {
  return toRupees(toPaise(amount));
}
