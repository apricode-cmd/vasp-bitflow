/**
 * Order Calculation Utilities
 * 
 * Functions for calculating order totals, fees, and validating amounts.
 */

import { PLATFORM_CONFIG } from '@/lib/constants';

export interface OrderCalculation {
  amount: number;          // Crypto amount
  rate: number;            // Exchange rate
  fiatAmount: number;      // Fiat before fee
  fee: number;             // Platform fee amount
  feePercentage: number;   // Fee as percentage
  totalFiat: number;       // Total fiat to pay
}

/**
 * Calculates the total order cost including platform fee
 * 
 * Formula: totalFiat = amount × rate × (1 + feePercentage)
 */
export function calculateOrderTotal(
  cryptoAmount: number,
  exchangeRate: number,
  feePercentage: number = PLATFORM_CONFIG.FEE_PERCENTAGE
): OrderCalculation {
  const fiatAmount = cryptoAmount * exchangeRate;
  const fee = fiatAmount * feePercentage;
  const totalFiat = fiatAmount + fee;

  return {
    amount: cryptoAmount,
    rate: exchangeRate,
    fiatAmount,
    fee,
    feePercentage,
    totalFiat
  };
}

/**
 * Validates if the order amount is within currency limits
 */
export function validateOrderLimits(
  amount: number,
  minAmount: number,
  maxAmount: number
): {
  valid: boolean;
  error?: string;
} {
  if (amount < minAmount) {
    return {
      valid: false,
      error: `Minimum amount is ${minAmount}`
    };
  }

  if (amount > maxAmount) {
    return {
      valid: false,
      error: `Maximum amount is ${maxAmount}`
    };
  }

  return { valid: true };
}

/**
 * Validates if the total fiat amount is within platform limits
 */
export function validateFiatLimits(totalFiat: number): {
  valid: boolean;
  error?: string;
} {
  if (totalFiat < PLATFORM_CONFIG.MIN_ORDER_VALUE_EUR) {
    return {
      valid: false,
      error: `Minimum order value is €${PLATFORM_CONFIG.MIN_ORDER_VALUE_EUR}`
    };
  }

  if (totalFiat > PLATFORM_CONFIG.MAX_ORDER_VALUE_EUR) {
    return {
      valid: false,
      error: `Maximum order value is €${PLATFORM_CONFIG.MAX_ORDER_VALUE_EUR}`
    };
  }

  return { valid: true };
}

/**
 * Calculates crypto amount from desired fiat amount (reverse calculation)
 */
export function calculateCryptoFromFiat(
  fiatAmount: number,
  exchangeRate: number,
  feePercentage: number = PLATFORM_CONFIG.FEE_PERCENTAGE
): number {
  // fiatAmount = cryptoAmount × rate × (1 + fee)
  // cryptoAmount = fiatAmount / (rate × (1 + fee))
  return fiatAmount / (exchangeRate * (1 + feePercentage));
}

/**
 * Formats order calculation for display
 */
export function formatOrderCalculation(calc: OrderCalculation, cryptoCurrency: string, fiatCurrency: string): {
  cryptoAmount: string;
  rate: string;
  subtotal: string;
  fee: string;
  total: string;
} {
  return {
    cryptoAmount: `${calc.amount} ${cryptoCurrency}`,
    rate: `1 ${cryptoCurrency} = ${calc.rate.toFixed(2)} ${fiatCurrency}`,
    subtotal: `${calc.fiatAmount.toFixed(2)} ${fiatCurrency}`,
    fee: `${calc.fee.toFixed(2)} ${fiatCurrency} (${(calc.feePercentage * 100).toFixed(1)}%)`,
    total: `${calc.totalFiat.toFixed(2)} ${fiatCurrency}`
  };
}

