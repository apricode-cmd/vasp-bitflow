/**
 * RelatedEntityBadge Component
 * 
 * Displays count of related entities with click navigation
 */

'use client';

import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface RelatedEntityBadgeProps {
  entity: string;
  count: number;
  href: string;
  icon?: LucideIcon;
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'info' | 'destructive';
}

export function RelatedEntityBadge({
  entity,
  count,
  href,
  icon: Icon,
  variant = 'outline'
}: RelatedEntityBadgeProps): React.ReactElement {
  return (
    <Link href={href}>
      <Badge 
        variant={variant} 
        className="cursor-pointer hover:bg-accent transition-colors gap-1.5"
      >
        {Icon && <Icon className="h-3 w-3" />}
        <span className="capitalize">{entity}:</span>
        <span className="font-bold">{count}</span>
      </Badge>
    </Link>
  );
}

