'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle, XCircle, Clock } from 'lucide-react';
import { type HttpRequestConfig } from '@/lib/validations/http-request';

interface HttpRequestTesterProps {
  config: HttpRequestConfig;
}

export default function HttpRequestTester({ config }: HttpRequestTesterProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [testContext, setTestContext] = useState('{\n  "userId": "test-123",\n  "amount": 1000\n}');
  const [testEnv, setTestEnv] = useState('{\n  "API_KEY": "test-key"\n}');
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Parse context
      const variables = testContext ? JSON.parse(testContext) : {};
      const env = testEnv ? JSON.parse(testEnv) : {};

      // Make request
      const res = await fetch('/api/admin/workflows/test-http', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          context: { variables, env },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setResponse(data.response);

    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Test HTTP Request</Label>
        <Button
          size="sm"
          onClick={handleTest}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isLoading ? 'Testing...' : 'Run Test'}
        </Button>
      </div>

      {/* Test Context */}
      <div className="space-y-2">
        <Label className="text-xs">Test Variables (JSON)</Label>
        <Textarea
          value={testContext}
          onChange={(e) => setTestContext(e.target.value)}
          placeholder='{"userId": "123", "amount": 1000}'
          className="font-mono text-xs"
          rows={4}
        />
      </div>

      {/* Environment Variables */}
      <div className="space-y-2">
        <Label className="text-xs">Environment Variables (JSON)</Label>
        <Textarea
          value={testEnv}
          onChange={(e) => setTestEnv(e.target.value)}
          placeholder='{"API_KEY": "your-key"}'
          className="font-mono text-xs"
          rows={3}
        />
      </div>

      {/* Response */}
      {response && (
        <Card className="p-3 bg-background">
          <div className="space-y-3">
            {/* Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {response.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <Badge variant={response.success ? 'default' : 'destructive'}>
                  {response.status} {response.statusText}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {response.duration}ms
              </div>
            </div>

            {/* Headers */}
            {response.headers && Object.keys(response.headers).length > 0 && (
              <div>
                <Label className="text-xs font-semibold mb-2 block">Response Headers</Label>
                <div className="bg-muted/50 rounded p-2 max-h-32 overflow-y-auto">
                  {Object.entries(response.headers).map(([key, value]: [string, any]) => (
                    <div key={key} className="text-xs font-mono">
                      <span className="text-muted-foreground">{key}:</span> {value}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Body */}
            <div>
              <Label className="text-xs font-semibold mb-2 block">Response Body</Label>
              <div className="bg-muted/50 rounded p-3 max-h-64 overflow-y-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {JSON.stringify(response.body, null, 2)}
                </pre>
              </div>
            </div>

            {/* Error */}
            {response.error && (
              <div className="text-xs text-destructive bg-destructive/10 rounded p-2">
                {response.error}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="p-3 bg-destructive/10 border-destructive">
          <div className="flex items-start gap-2">
            <XCircle className="h-4 w-4 text-destructive mt-0.5" />
            <div className="text-xs text-destructive">{error}</div>
          </div>
        </Card>
      )}
    </div>
  );
}

