/**
 * Root Layout
 * 
 * Main application layout with global styles and providers.
 */

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { Providers } from '@/components/layouts/Providers';
import { getPublicSettings } from '@/lib/settings';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();

  return {
    title: settings.seoTitle || 'Apricode Exchange - Buy Cryptocurrency Securely',
    description: settings.seoDescription || 'Buy Bitcoin, Ethereum, Tether, and Solana with EUR or PLN after KYC verification',
    keywords: settings.seoKeywords ? settings.seoKeywords.split(',').map(k => k.trim()) : ['cryptocurrency', 'bitcoin', 'ethereum', 'buy crypto', 'KYC', 'exchange'],
    authors: [{ name: settings.brandName || 'Apricode Exchange' }],
  };
}

export async function generateViewport(): Promise<Viewport> {
  const settings = await getPublicSettings();

  return {
    width: 'device-width',
    initialScale: 1,
    themeColor: settings.primaryColor || '#3b82f6'
  };
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.ReactElement> {
  // Get primary color from DB for instant SSR
  const settings = await getPublicSettings();
  const primaryColorHex = settings.primaryColor || '#06b6d4'; // Cyan fallback

  // Convert hex to HSL for CSS variable
  function hexToHSL(hex: string): { h: number; s: number; l: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  const primaryHSL = hexToHSL(primaryColorHex);
  const primaryCSSValue = `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline critical CSS variable BEFORE any CSS loads */}
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --primary: ${primaryCSSValue};
            }
            .dark {
              --primary: ${primaryCSSValue};
            }
          `
        }} />
        
        {/* Client-side script for localStorage sync (after CSS loads) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Save server-provided color to localStorage for future visits
                  var serverColor = '${primaryColorHex}';
                  localStorage.setItem('brand-primary-color', serverColor);
                  
                  // Also check if user changed color in settings (override)
                  var savedColor = localStorage.getItem('brand-primary-color');
                  if (savedColor && savedColor !== serverColor) {
                    // User customized color - apply it
                    function hexToHSL(hex) {
                      var r = parseInt(hex.slice(1, 3), 16) / 255;
                      var g = parseInt(hex.slice(3, 5), 16) / 255;
                      var b = parseInt(hex.slice(5, 7), 16) / 255;
                      
                      var max = Math.max(r, g, b);
                      var min = Math.min(r, g, b);
                      var h, s, l = (max + min) / 2;
                      
                      if (max === min) {
                        h = s = 0;
                      } else {
                        var d = max - min;
                        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                        
                        switch (max) {
                          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                          case g: h = ((b - r) / d + 2) / 6; break;
                          case b: h = ((r - g) / d + 4) / 6; break;
                        }
                      }
                      
                      return {
                        h: Math.round(h * 360),
                        s: Math.round(s * 100),
                        l: Math.round(l * 100)
                      };
                    }
                    
                    var hsl = hexToHSL(savedColor);
                    document.documentElement.style.setProperty('--primary', hsl.h + ' ' + hsl.s + '% ' + hsl.l + '%');
                  }
                } catch (e) {
                  console.error('Failed to apply brand color:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}

