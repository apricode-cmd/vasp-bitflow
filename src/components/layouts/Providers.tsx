/**
 * Providers Component
 * 
 * Wraps application with necessary providers (NextAuth, Theme, Settings).
 * Note: Admin routes use separate layout without SessionProvider
 */

'use client';

import { usePathname } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { SettingsProvider } from '@/components/providers/settings-provider';

export function Providers({ children }: { children: React.ReactNode }): React.ReactElement {
  const pathname = usePathname();
  
  // Check if current route is admin
  const isAdminRoute = pathname?.startsWith('/admin');
  
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      {/* SessionProvider for CLIENT authentication only */}
      {/* Admin routes DON'T use SessionProvider to avoid /api/auth/session conflicts */}
      {isAdminRoute ? (
        <SettingsProvider>
          {children}
        </SettingsProvider>
      ) : (
        <SessionProvider basePath="/api/auth">
          <SettingsProvider>
            {children}
          </SettingsProvider>
        </SessionProvider>
      )}
    </ThemeProvider>
  );
}

