'use client';

/**
 * HTTP Request Node Component
 * 
 * n8n-style HTTP request node for external API integrations
 * Styled to match ActionNode
 */

import { memo } from 'react';
import { Handle, Position, type Node } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Globe,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';

type NodeProps<T = any> = {
  data: T;
  selected: boolean;
};

type ExecutionStatus = 'idle' | 'running' | 'success' | 'error';

export interface HttpRequestNodeData {
  actionType: 'HTTP_REQUEST';
  config: {
    method?: string;
    url?: string;
    auth?: {
      type?: string;
    };
    timeout?: number;
    retryOnFailure?: boolean;
    [key: string]: any;
  };
  executionStatus?: ExecutionStatus;
  executionResult?: any;
  executionTime?: number;
}

function HttpRequestNode({ data, selected }: NodeProps<HttpRequestNodeData>) {
  const method = data.config?.method || 'GET';
  const url = data.config?.url || 'No URL configured';

  // Get hostname from URL
  const getHostname = (urlString: string) => {
    if (!urlString || urlString === 'No URL configured') {
      return urlString;
    }
    try {
      // Handle expressions
      if (urlString.includes('{{')) {
        return 'Dynamic URL';
      }
      const url = new URL(urlString);
      return url.hostname;
    } catch {
      return urlString.slice(0, 30) + (urlString.length > 30 ? '...' : '');
    }
  };

  // Execution status styling
  const getExecutionStyles = () => {
    switch (data.executionStatus) {
      case 'running':
        return 'ring-2 ring-yellow-500 ring-offset-2 animate-pulse';
      case 'success':
        return 'ring-2 ring-green-500 ring-offset-2';
      case 'error':
        return 'ring-2 ring-red-500 ring-offset-2';
      default:
        return '';
    }
  };

  const ExecutionIcon = () => {
    switch (data.executionStatus) {
      case 'running':
        return <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <Card
      className={`
        min-w-[280px] transition-all
        ${selected ? 'ring-2 ring-primary shadow-lg' : 'shadow-md hover:shadow-lg'}
        bg-primary/10 text-primary border-primary/30
        ${getExecutionStyles()}
        border-2
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-background/80 text-primary">
            <Globe className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs font-semibold">
                HTTP REQUEST
              </Badge>
              {data.executionStatus && data.executionStatus !== 'idle' && (
                <div className="flex items-center gap-1">
                  <ExecutionIcon />
                </div>
              )}
            </div>
            <h3 className="font-semibold text-sm leading-tight">
              {getHostname(url)}
            </h3>
            {data.executionTime !== undefined && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.executionTime}ms
              </p>
            )}
          </div>
        </div>

        {/* Config Details */}
        <div className="mt-3 pt-3 border-t border-current/20">
          <div className="text-xs space-y-2">
            {/* Method */}
            <div className="flex items-center justify-between">
              <span className="font-medium opacity-70">Method:</span>
              <Badge variant="secondary" className="text-xs font-bold">
                {method}
              </Badge>
            </div>

            {/* URL */}
            {url && url !== 'No URL configured' && (
              <div>
                <span className="font-medium opacity-70">URL:</span>
                <p className="mt-1 text-xs bg-background/60 rounded px-2 py-1 font-mono truncate">
                  {url}
                </p>
              </div>
            )}

            {/* Auth */}
            {data.config?.auth && data.config.auth.type && data.config.auth.type !== 'NONE' && (
              <div className="flex items-center justify-between">
                <span className="font-medium opacity-70">Auth:</span>
                <span className="font-mono">{data.config.auth.type}</span>
              </div>
            )}

            {/* Timeout */}
            {data.config?.timeout && (
              <div className="flex items-center justify-between">
                <span className="font-medium opacity-70">Timeout:</span>
                <span className="font-mono">{data.config.timeout / 1000}s</span>
              </div>
            )}

            {/* Retry */}
            {data.config?.retryOnFailure && (
              <div className="flex items-center justify-between">
                <span className="font-medium opacity-70">Retry:</span>
                <span className="font-mono">Enabled</span>
              </div>
            )}
          </div>
        </div>

        {/* Execution Result */}
        {data.executionResult && (
          <div className="mt-3 pt-3 border-t border-current/20">
            <div className="text-xs space-y-1">
              {data.executionResult.status && (
                <div className="flex items-center justify-between">
                  <span className="font-medium opacity-70">Status:</span>
                  <Badge 
                    variant={data.executionResult.status < 400 ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {data.executionResult.status}
                  </Badge>
                </div>
              )}
              {data.executionResult.error && (
                <div>
                  <span className="font-medium opacity-70">Error:</span>
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {data.executionResult.error}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />
    </Card>
  );
}

export default memo(HttpRequestNode);
