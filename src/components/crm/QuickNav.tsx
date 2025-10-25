/**
 * QuickNav Component
 * 
 * Quick navigation buttons to related entities
 */

'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface QuickNavLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface QuickNavProps {
  from: string;
  links: QuickNavLink[];
  variant?: 'outline' | 'ghost' | 'default';
}

export function QuickNav({
  from,
  links,
  variant = 'outline'
}: QuickNavProps): React.ReactElement {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground uppercase font-semibold">Quick Navigation</p>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Button variant={variant} size="sm">
                <Icon className="h-4 w-4 mr-2" />
                {link.label}
              </Button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

