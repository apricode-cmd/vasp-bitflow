/**
 * Admin Group Layout
 * 
 * Layout for all admin routes - uses separate providers
 */

import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { SettingsProvider } from '@/components/providers/settings-provider';

export default function AdminGroupLayout({
  children
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </ThemeProvider>
      <Toaster position="top-right" richColors />
    </>
  );
}

