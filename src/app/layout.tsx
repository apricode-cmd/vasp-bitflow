/**
 * Root Layout
 * 
 * Main application layout with global styles and providers.
 */

import type { Metadata } from 'next';
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
    viewport: 'width=device-width, initial-scale=1',
    themeColor: settings.primaryColor || '#3b82f6'
  };
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Load saved brand color from localStorage before React hydrates
                  var savedColor = localStorage.getItem('brand-primary-color');
                  if (savedColor) {
                    // Simple hex to HSL conversion
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

