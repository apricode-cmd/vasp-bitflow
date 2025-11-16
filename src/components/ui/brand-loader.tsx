/**
 * Brand Loader Component
 * 
 * Clean and professional branded loading spinner
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

const sizes = {
  sm: { container: 80, logo: 48, stroke: 3 },
  md: { container: 100, logo: 64, stroke: 4 },
  lg: { container: 140, logo: 96, stroke: 5 },
  xl: { container: 180, logo: 128, stroke: 6 }
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchLogo();
    }
  }, [mounted, resolvedTheme]);

  const fetchLogo = async () => {
    try {
      const response = await fetch('/api/settings/public');
      const data = await response.json();
      
      if (data.success && data.settings) {
        const isDark = resolvedTheme === 'dark';
        const logo = isDark ? data.settings.brandLogoDark : data.settings.brandLogo;
        
        if (logo && logo !== logoUrl) {
          // Reset states when logo changes
          setImageLoaded(false);
          setImageError(false);
          setLogoUrl(logo);
        }
      }
    } catch (error) {
      console.error('Failed to fetch logo:', error);
      setImageError(true);
    }
  };

  const config = sizes[size];
  const radius = (config.container - config.stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <div 
        className="relative flex items-center justify-center"
        style={{ width: config.container, height: config.container }}
      >
        {/* Spinning ring */}
        <svg
          className="absolute inset-0 -rotate-90"
          width={config.container}
          height={config.container}
        >
          {/* Background ring */}
          <circle
            cx={config.container / 2}
            cy={config.container / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            className="text-primary/10"
          />
          
          {/* Animated ring */}
          <circle
            cx={config.container / 2}
            cy={config.container / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            strokeLinecap="round"
            className="text-primary animate-spin"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: circumference * 0.75,
              transformOrigin: 'center',
              animation: 'spin 1.5s linear infinite'
            }}
          />
        </svg>

        {/* Logo */}
        <div 
          className="relative z-10 flex items-center justify-center"
          style={{ width: config.logo, height: config.logo }}
        >
          {/* Fallback dot - visible when image not loaded or error */}
          <div 
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
              (imageLoaded && !imageError) ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
          >
            <div className="w-4 h-4 rounded-full bg-primary animate-pulse" />
          </div>

          {/* Logo image - fades in when loaded */}
          {logoUrl && !imageError && (
            <Image
              key={logoUrl}
              src={logoUrl}
              alt="Loading"
              fill
              sizes={`${config.logo}px`}
              className={cn(
                "object-contain transition-opacity duration-300",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              priority
              unoptimized={logoUrl.startsWith('http')}
              onLoad={(e) => {
                // Check if image actually loaded
                if (e.currentTarget.complete && e.currentTarget.naturalWidth > 0) {
                  setImageLoaded(true);
                  setImageError(false);
                }
              }}
              onError={() => {
                console.error('Failed to load logo image:', logoUrl);
                setImageLoaded(false);
                setImageError(true);
              }}
            />
          )}
        </div>
      </div>

      {text && (
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
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

export function BrandLoaderPage({ text = 'Loading...' }: { text?: string }): React.ReactElement {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <BrandLoader size="lg" text={text} />
    </div>
  );
}

export function BrandLoaderInline({ text, size = 'sm' }: { text?: string; size?: 'sm' | 'md' }): React.ReactElement {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <BrandLoader size={size} text={text} />
    </div>
  );
}

export function BrandLoaderOverlay({ text = 'Processing...', show }: { text?: string; show: boolean }): React.ReactElement | null {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border shadow-2xl rounded-2xl p-8">
        <BrandLoader size="lg" text={text} />
      </div>
    </div>
  );
}
