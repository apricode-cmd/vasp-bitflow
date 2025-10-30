/**
 * Brand Logo Component
 * 
 * Dynamically displays the client's uploaded logo or brand name from system settings.
 * Falls back to ApricodeLogo if no custom logo is set.
 */

'use client';

import { useSettings } from '@/components/providers/settings-provider';
import { ApricodeLogo } from '@/components/icons/ApricodeLogo';
import Image from 'next/image';

interface BrandLogoProps {
  className?: string;
  fallbackClassName?: string;
  size?: number;
  priority?: boolean;
}

export function BrandLogo({ 
  className = '', 
  fallbackClassName = 'text-primary w-full h-full',
  size = 48,
  priority = false
}: BrandLogoProps): React.ReactElement {
  const { settings } = useSettings();

  // If custom logo is uploaded, display it
  if (settings.brandLogo && settings.brandLogo !== '/uploads/default_logo.svg') {
    return (
      <Image
        src={settings.brandLogo}
        alt={settings.brandName || 'Platform Logo'}
        width={size}
        height={size}
        className={className || 'w-full h-full object-contain'}
        priority={priority}
      />
    );
  }

  // If only brand name is set (no custom logo), show initials
  if (settings.brandName && settings.brandName !== 'CryptoExchange') {
    const initials = settings.brandName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div className={className || 'w-full h-full flex items-center justify-center'}>
        <span className="text-2xl font-bold text-primary">
          {initials}
        </span>
      </div>
    );
  }

  // Fallback to ApricodeLogo
  return <ApricodeLogo className={fallbackClassName} />;
}

