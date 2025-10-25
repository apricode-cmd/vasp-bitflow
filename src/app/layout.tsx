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

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Apricode Exchange - Buy Cryptocurrency Securely',
  description: 'Buy Bitcoin, Ethereum, Tether, and Solana with EUR or PLN after KYC verification',
  keywords: ['cryptocurrency', 'bitcoin', 'ethereum', 'buy crypto', 'KYC', 'exchange'],
  authors: [{ name: 'Apricode Exchange' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#3b82f6'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}

