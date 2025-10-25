/**
 * Currency Icon Component
 * 
 * Displays cryptocurrency icons with consistent styling.
 */

'use client';

import { Bitcoin, Coins } from 'lucide-react';
import { CURRENCY_INFO } from '@/lib/constants';

interface CurrencyIconProps {
  currency: 'BTC' | 'ETH' | 'USDT' | 'SOL';
  size?: number;
  className?: string;
}

export function CurrencyIcon({ currency, size = 24, className = '' }: CurrencyIconProps): React.ReactElement {
  const info = CURRENCY_INFO[currency];
  
  // Simple icon representation
  if (currency === 'BTC') {
    return <Bitcoin size={size} className={className} style={{ color: info.color }} />;
  }
  
  // For other currencies, use a generic coin icon with currency-specific color
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Coins size={size} style={{ color: info.color }} />
    </div>
  );
}

