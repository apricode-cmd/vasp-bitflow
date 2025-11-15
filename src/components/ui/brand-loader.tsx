/**
 * Brand Loader Component
 * 
 * Beautiful branded loading spinner with logo from system settings
 * Supports both light and dark mode logos with animated ring
 */

'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BrandLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32'
};

const ringClasses = {
  sm: 'w-16 h-16',
  md: 'w-20 h-20',
  lg: 'w-28 h-28',
  xl: 'w-36 h-36'
};

const textClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg'
};

export function BrandLoader({
  size = 'md',
  text,
  className,
  fullScreen = false
}: BrandLoaderProps): React.ReactElement {
  const { resolvedTheme } = useTheme();
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchLogo();
  }, []);

  useEffect(() => {
    if (mounted && resolvedTheme) {
      fetchLogo();
    }
  }, [resolvedTheme, mounted]);

  const fetchLogo = async () => {
    try {
      const response = await fetch('/api/settings/public');
      const data = await response.json();
      
      if (data.success && data.settings) {
        // Use dark logo for dark theme, light logo otherwise
        const isDark = resolvedTheme === 'dark';
        const logo = isDark ? data.settings.brandLogoDark : data.settings.brandLogo;
        
        if (logo) {
          setLogoUrl(logo);
        }
      }
    } catch (error) {
      console.error('Failed to fetch logo:', error);
    }
  };

  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <div className="relative flex items-center justify-center">
        {/* Animated rings */}
        <div className={cn('absolute', ringClasses[size])}>
          {/* Outer ring - slower */}
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-[spin_3s_linear_infinite]" 
               style={{
                 borderTopColor: 'hsl(var(--primary))',
                 borderRightColor: 'transparent'
               }}
          />
          
          {/* Middle ring - medium speed */}
          <div className="absolute inset-2 rounded-full border-4 border-primary/30 animate-[spin_2s_linear_infinite_reverse]"
               style={{
                 borderTopColor: 'hsl(var(--primary))',
                 borderLeftColor: 'transparent'
               }}
          />
          
          {/* Inner ring - faster */}
          <div className="absolute inset-4 rounded-full border-2 border-primary/40 animate-[spin_1.5s_linear_infinite]"
               style={{
                 borderTopColor: 'hsl(var(--primary))',
                 borderRightColor: 'transparent',
                 borderBottomColor: 'transparent'
               }}
          />
        </div>

        {/* Logo */}
        <div className={cn(
          'relative z-10 flex items-center justify-center rounded-full bg-background p-2',
          sizeClasses[size]
        )}>
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Brand Logo"
              fill
              className="object-contain p-2 animate-[pulse_2s_ease-in-out_infinite]"
              priority
            />
          ) : (
            // Fallback animated gradient
            <div className="w-full h-full rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 animate-[pulse_2s_ease-in-out_infinite]" />
          )}
        </div>
      </div>

      {/* Loading text */}
      {text && (
        <p className={cn(
          'font-medium text-muted-foreground animate-pulse',
          textClasses[size]
        )}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Brand Loader for full page loading
 */
export function BrandLoaderPage({
  text = 'Loading...'
}: {
  text?: string;
}): React.ReactElement {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <BrandLoader size="lg" text={text} />
    </div>
  );
}

/**
 * Brand Loader for inline content loading
 */
export function BrandLoaderInline({
  text,
  size = 'sm'
}: {
  text?: string;
  size?: 'sm' | 'md';
}): React.ReactElement {
  return (
    <div className="flex items-center justify-center py-8">
      <BrandLoader size={size} text={text} />
    </div>
  );
}

/**
 * Brand Loader overlay for blocking interactions
 */
export function BrandLoaderOverlay({
  text = 'Processing...',
  show
}: {
  text?: string;
  show: boolean;
}): React.ReactElement | null {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border shadow-2xl rounded-2xl p-8">
        <BrandLoader size="lg" text={text} />
      </div>
    </div>
  );
}

