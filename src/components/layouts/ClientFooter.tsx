/**
 * Client Footer Component
 * 
 * Minimalistic footer for client dashboard
 */

'use client';

import Link from 'next/link';
import { useBranding } from '@/hooks/useBranding';
import { Skeleton } from '@/components/ui/skeleton';
import { ApricodeLogo } from '@/components/icons/ApricodeLogo';

export function ClientFooter(): React.ReactElement {
  const { branding, loading } = useBranding();
  const currentYear = new Date().getFullYear();
  const version = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

  return (
    <footer className="border-t bg-card/30 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          {/* Left: Copyright */}
          <div className="flex items-center gap-1">
            {loading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <>
                <span>© {currentYear}</span>
                <span className="font-medium text-foreground">{branding.companyName}</span>
                <span className="hidden sm:inline">• All rights reserved</span>
              </>
            )}
          </div>

          {/* Center: Links */}
          <div className="flex items-center gap-6">
            <Link 
              href="/terms" 
              className="hover:text-foreground transition"
            >
              Terms
            </Link>
            <Link 
              href="/privacy" 
              className="hover:text-foreground transition"
            >
              Privacy
            </Link>
            <Link 
              href="/support" 
              className="hover:text-foreground transition"
            >
              Support
            </Link>
          </div>

          {/* Right: Developer & Version */}
          <div className="flex items-center gap-4">
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md font-mono text-xs">
              v{version}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs">Powered by</span>
              <a 
                href="https://apricode.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-semibold text-primary hover:text-primary/80 transition-colors group"
              >
                <ApricodeLogo size={14} className="text-primary group-hover:text-primary/80 transition-colors" />
                <span>Apricode</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

