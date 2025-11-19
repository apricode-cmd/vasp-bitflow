'use client';

/**
 * HTTP Request Node Component
 * 
 * n8n-style HTTP request node for external API integrations
 */

import { memo } from 'react';
import { Handle, Position, type Node } from '@xyflow/react';

type NodeProps<T = any> = {
  data: T;
  selected: boolean;
};
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Globe,
  Loader2,
  CheckCircle,
  XCircle,
  Lock,
  Zap,
} from 'lucide-react';
import type { ExecutionStatus } from './TriggerNode';
import type { HttpMethod, AuthType } from '@/lib/validations/http-request';

export interface HttpRequestNodeData {
  actionType: 'HTTP_REQUEST';
  config: {
    method?: HttpMethod;
    url?: string;
    auth?: {
      type?: AuthType;
    };
    timeout?: number;
    retryOnFailure?: boolean;
    [key: string]: any;
  };
  executionStatus?: ExecutionStatus;
  executionResult?: any;
  executionTime?: number;
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  POST: 'bg-green-500/10 text-green-600 border-green-500/30',
  PUT: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  PATCH: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  DELETE: 'bg-red-500/10 text-red-600 border-red-500/30',
  HEAD: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  OPTIONS: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
};

function HttpRequestNode({ data, selected }: NodeProps<HttpRequestNodeData>) {
  const method = data.config?.method || 'GET';
  const url = data.config?.url || '';
  const hasAuth = data.config?.auth && data.config.auth.type !== 'NONE';
  const hasRetry = data.config?.retryOnFailure;

  // Get hostname from URL
  const getHostname = (urlString: string) => {
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
        min-w-[320px] transition-all
        ${selected ? 'ring-2 ring-primary shadow-lg' : 'shadow-md hover:shadow-lg'}
        bg-card border-2 border-primary/20
        ${getExecutionStyles()}
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
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Globe className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className="text-xs font-semibold">
                HTTP REQUEST
              </Badge>
              {data.executionStatus && data.executionStatus !== 'idle' && (
                <div className="flex items-center gap-1">
                  <ExecutionIcon />
                </div>
              )}
            </div>
            <h3 className="font-semibold text-sm leading-tight text-foreground">
              {getHostname(url)}
            </h3>
            {data.executionTime !== undefined && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.executionTime}ms
              </p>
            )}
          </div>
        </div>

        {/* Method & URL */}
        <div className="space-y-2 bg-muted/50 rounded-lg p-3 border border-border">
          <div className="flex items-center gap-2">
            <Badge className={`text-xs font-bold ${METHOD_COLORS[method]}`}>
              {method}
            </Badge>
            <code className="text-xs font-mono text-foreground flex-1 truncate">
              {url || 'No URL configured'}
            </code>
          </div>

          {/* Features */}
          <div className="flex items-center gap-2 flex-wrap">
            {hasAuth && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>{data.config.auth?.type}</span>
              </div>
            )}
            {hasRetry && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" />
                <span>Retry</span>
              </div>
            )}
            {data.config?.timeout && (
              <div className="text-xs text-muted-foreground">
                ⏱️ {data.config.timeout / 1000}s
              </div>
            )}
          </div>
        </div>

        {/* Execution Result */}
        {data.executionResult && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-xs space-y-1">
              {data.executionResult.status && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-muted-foreground">Status:</span>
                  <Badge 
                    variant={data.executionResult.status < 400 ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {data.executionResult.status} {data.executionResult.statusText}
                  </Badge>
                </div>
              )}
              {data.executionResult.error && (
                <div className="text-xs text-red-600 dark:text-red-400">
                  Error: {data.executionResult.error}
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

