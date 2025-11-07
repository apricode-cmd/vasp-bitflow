/**
 * Providers Component
 * 
 * Wraps application with necessary providers (NextAuth, Theme, Settings).
 * Note: Admin routes use separate layout without SessionProvider
 */

'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { SettingsProvider } from '@/components/providers/settings-provider';

export function Providers({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {/* SessionProvider for CLIENT authentication only */}
      {/* Admin routes use separate layout without SessionProvider */}
      <SessionProvider basePath="/api/auth">
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

