/**
 * Formatting Utilities
 * 
 * Functions for formatting currencies, dates, and other data types.
 */

import { format } from 'date-fns';

/**
 * Formats a number as a fiat currency (EUR, PLN)
 */
export function formatFiatCurrency(amount: number, currency: string = 'EUR'): string {
  // Validate currency code
  if (!currency || currency.length !== 3) {
    currency = 'EUR'; // Fallback to EUR
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is invalid
    console.warn(`Invalid currency code: ${currency}`, error);
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Formats a number as a cryptocurrency amount
 */
export function formatCryptoAmount(amount: number, decimals: number = 8): string {
  // Validate decimals
  const validDecimals = typeof decimals === 'number' && decimals >= 0 ? decimals : 8;
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: validDecimals,
    maximumFractionDigits: validDecimals
  }).format(amount);
}

/**
 * Formats a cryptocurrency amount with its symbol
 */
export function formatCryptoWithSymbol(amount: number, currency: string, decimals: number = 8): string {
  return `${formatCryptoAmount(amount, decimals)} ${currency}`;
}

/**
 * Formats a date to a readable string
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'MMM dd, yyyy');
}

/**
 * Formats a date and time to a readable string
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'MMM dd, yyyy HH:mm');
}

/**
 * Formats a date to a relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }

  return formatDate(dateObj);
}

/**
 * Truncates a wallet address for display (shows first and last 6 chars)
 */
export function truncateAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Formats a transaction hash for display
 */
export function formatTxHash(hash: string): string {
  return truncateAddress(hash, 10, 8);
}

/**
 * Formats a percentage value
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Formats a number with thousand separators
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Generic currency formatter (alias for formatFiatCurrency)
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return formatFiatCurrency(amount, currency);
}

