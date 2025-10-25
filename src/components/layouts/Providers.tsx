/**
 * Providers Component
 * 
 * Wraps application with necessary providers (NextAuth, Theme, etc.).
 */

'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/providers/theme-provider';

export function Providers({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <SessionProvider>
        {children}
      </SessionProvider>
    </ThemeProvider>
  );
}

