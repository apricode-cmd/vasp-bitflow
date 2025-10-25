/**
 * DependencyAlert Component
 * 
 * Shows warnings about entity dependencies before deletion
 */

'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface Dependency {
  type: string;
  count: number;
  blocking?: boolean;
}

interface DependencyAlertProps {
  entity: string;
  dependencies: Dependency[];
  action: 'delete' | 'deactivate' | 'update';
}

export function DependencyAlert({
  entity,
  dependencies,
  action
}: DependencyAlertProps): React.ReactElement {
  const hasBlockingDeps = dependencies.some(d => d.blocking && d.count > 0);
  const totalDeps = dependencies.reduce((sum, d) => sum + d.count, 0);

  if (totalDeps === 0) {
    return <></>;
  }

  return (
    <Alert variant={hasBlockingDeps ? 'destructive' : 'default'}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {hasBlockingDeps ? 'Cannot Proceed' : 'Warning'}
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          {hasBlockingDeps 
            ? `Cannot ${action} ${entity}. The following dependencies must be resolved first:`
            : `This will ${action} ${entity} and affect the following:`
          }
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          {dependencies.filter(d => d.count > 0).map((dep) => (
            <Badge 
              key={dep.type}
              variant={dep.blocking ? 'destructive' : 'secondary'}
            >
              {dep.type}: {dep.count}
            </Badge>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}

