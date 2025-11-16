/**
 * Currency Icon Component
 * 
 * Displays cryptocurrency icons from uploaded SVG files.
 * Falls back to Lucide icons if SVG not available.
 */

'use client';

import Image from 'next/image';
import { Bitcoin, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CurrencyIconProps {
  currencyCode: string;
  currencyName?: string;
  iconUrl?: string | null;
  size?: number;
  className?: string;
  showFallback?: boolean;
}

/**
 * CurrencyIcon Component
 * 
 * Displays SVG icon if iconUrl provided, otherwise shows fallback icon
 */
export function CurrencyIcon({ 
  currencyCode, 
  currencyName,
  iconUrl, 
  size = 24, 
  className = '',
  showFallback = true
}: CurrencyIconProps): React.ReactElement {
  
  // If we have iconUrl, use it
  if (iconUrl) {
    return (
      <div 
        className={cn("flex items-center justify-center shrink-0", className)}
        style={{ width: size, height: size }}
      >
        <Image
          src={iconUrl}
          alt={currencyName || currencyCode}
          width={size}
          height={size}
          className="object-contain opacity-100"
          style={{ filter: 'none' }}
          onError={(e) => {
            // If image fails to load, hide it
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  // Fallback to Lucide icons
  if (!showFallback) {
    return <></>;
  }

  // Currency-specific fallback icons
  switch (currencyCode) {
    case 'BTC':
      return <Bitcoin size={size} className={cn("text-orange-500", className)} />;
    case 'ETH':
      return <Coins size={size} className={cn("text-blue-500", className)} />;
    case 'USDT':
      return <Coins size={size} className={cn("text-green-500", className)} />;
    case 'SOL':
      return <Coins size={size} className={cn("text-purple-500", className)} />;
    case 'USDC':
      return <Coins size={size} className={cn("text-blue-600", className)} />;
    default:
      return <Coins size={size} className={cn("text-muted-foreground", className)} />;
  }
}

/**
 * CurrencyDisplay Component
 * 
 * Shows currency icon + name/code in a nice layout
 */
interface CurrencyDisplayProps {
  currencyCode: string;
  currencyName?: string;
  iconUrl?: string | null;
  showCode?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CurrencyDisplay({
  currencyCode,
  currencyName,
  iconUrl,
  showCode = true,
  size = 'md',
  className = ''
}: CurrencyDisplayProps): React.ReactElement {
  const sizeConfig = {
    sm: { icon: 16, text: 'text-sm' },
    md: { icon: 24, text: 'text-base' },
    lg: { icon: 32, text: 'text-lg' }
  };

  const config = sizeConfig[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <CurrencyIcon 
        currencyCode={currencyCode}
        currencyName={currencyName}
        iconUrl={iconUrl}
        size={config.icon}
      />
      <div className="flex items-center gap-1.5">
        <span className={cn("font-medium", config.text)}>
          {currencyName || currencyCode}
        </span>
        {showCode && currencyName && (
          <span className={cn("text-muted-foreground", config.text)}>
            ({currencyCode})
          </span>
        )}
      </div>
    </div>
  );
}
