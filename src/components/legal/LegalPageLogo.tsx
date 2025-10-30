/**
 * Legal Page Logo Component
 * 
 * Client-side component for legal pages that automatically switches logos based on theme.
 */

'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';

interface LegalPageLogoProps {
  settings: {
    brandLogo?: string;
    brandLogoDark?: string;
    brandName?: string;
  };
}

export function LegalPageLogo({ settings }: LegalPageLogoProps): React.ReactElement {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // During SSR, show light mode logo or fallback
    if (settings.brandLogo) {
      return (
        <img
          src={settings.brandLogo}
          alt={settings.brandName || 'Logo'}
          className="h-6 object-contain max-w-[120px]"
        />
      );
    }
    return (
      <>
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70">
          <Shield className="h-3 w-3 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold">{settings.brandName || 'Apricode'}</span>
      </>
    );
  }

  // Select logo based on theme
  const isDark = resolvedTheme === 'dark';
  const logoUrl = isDark && settings.brandLogoDark 
    ? settings.brandLogoDark 
    : settings.brandLogo;

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={settings.brandName || 'Logo'}
        className="h-6 object-contain max-w-[120px]"
      />
    );
  }

  // Fallback
  return (
    <>
      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70">
        <Shield className="h-3 w-3 text-primary-foreground" />
      </div>
      <span className="text-sm font-semibold">{settings.brandName || 'Apricode'}</span>
    </>
  );
}

