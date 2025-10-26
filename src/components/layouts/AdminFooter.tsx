/**
 * Admin Footer Component
 * 
 * Compact footer for admin panel with developer credits and system version
 */

import Link from 'next/link';
import { ApricodeLogo } from '@/components/icons/ApricodeLogo';

export function AdminFooter(): React.ReactElement {
  const currentYear = new Date().getFullYear();
  const version = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

  return (
    <footer className="bg-muted/30 border-t py-4 mt-auto">
      <div className="container mx-auto px-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
          {/* Left: Copyright */}
          <div className="flex items-center gap-1">
            <span>&copy; {currentYear}</span>
            <span className="font-medium text-foreground">CryptoExchange CRM</span>
            <span className="hidden sm:inline">• All rights reserved</span>
          </div>

          {/* Center: Version */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md font-mono text-[10px]">
              v{version}
            </span>
          </div>

          {/* Right: Developer */}
          <div className="flex items-center gap-1.5">
            <span>Powered by</span>
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
    </footer>
  );
}

