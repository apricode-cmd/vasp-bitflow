/**
 * Providers Component
 * 
 * Wraps application with necessary providers (NextAuth, Theme, Settings).
 */

'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { SettingsProvider } from '@/components/providers/settings-provider';
import { usePathname } from 'next/navigation';

export function Providers({ children }: { children: React.ReactNode }): React.ReactElement {
  const pathname = usePathname();
  
  // Don't use SessionProvider on admin auth pages (they use separate admin auth)
  const isAdminAuthPage = pathname?.startsWith('/admin/auth');
  
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {isAdminAuthPage ? (
        <SettingsProvider>
          {children}
        </SettingsProvider>
      ) : (
        <SessionProvider>
          <SettingsProvider>
            {children}
          </SettingsProvider>
        </SessionProvider>
      )}
    </ThemeProvider>
  );
}

