/**
 * Providers Component
 * 
 * Wraps application with necessary providers (NextAuth, Theme, Settings).
 */

'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { SettingsProvider } from '@/components/providers/settings-provider';

export function Providers({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <SessionProvider>
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

