'use client';

/**
 * Expression Input Component
 * 
 * n8n-like input field with expression support {{ }}
 * Shows available variables from previous nodes
 */

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Code, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExpressionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  availableVariables?: VariableGroup[];
  type?: 'text' | 'number';
}

interface VariableGroup {
  nodeId: string;
  nodeName: string;
  nodeType: 'trigger' | 'condition' | 'action';
  variables: Variable[];
}

interface Variable {
  path: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  example?: any;
}

export default function ExpressionInput({
  value,
  onChange,
  placeholder = 'Enter value or expression...',
  availableVariables = [],
  type = 'text',
}: ExpressionInputProps) {
  const [isExpression, setIsExpression] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect if current value is an expression
  useEffect(() => {
    setIsExpression(String(value).includes('{{'));
  }, [value]);

  const handleVariableSelect = (variable: Variable) => {
    const expression = `{{ $node.${variable.path} }}`;
    onChange(expression);
    setShowVariables(false);
  };

  const toggleExpressionMode = () => {
    if (isExpression) {
      // Switch to static mode
      onChange('');
      setIsExpression(false);
    } else {
      // Switch to expression mode
      onChange('{{ }}');
      setIsExpression(true);
      setTimeout(() => {
        if (inputRef.current) {
          const pos = value.length - 3; // Position before }}
          inputRef.current.setSelectionRange(pos, pos);
          inputRef.current.focus();
        }
      }, 50);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`pr-20 ${isExpression ? 'font-mono text-xs bg-accent/30 border-primary/50' : ''}`}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isExpression && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5">
                <Code className="h-3 w-3 mr-0.5" />
                EXPR
              </Badge>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={toggleExpressionMode}
              title={isExpression ? 'Switch to static value' : 'Use expression'}
            >
              <Sparkles className={`h-3.5 w-3.5 ${isExpression ? 'text-primary' : 'text-muted-foreground'}`} />
            </Button>
          </div>
        </div>

        {availableVariables.length > 0 && (
          <Popover open={showVariables} onOpenChange={setShowVariables}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-2"
              >
                <Code className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-3 border-b bg-muted/50">
                <h4 className="font-semibold text-sm">Available Variables</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click to insert into expression
                </p>
              </div>
              <ScrollArea className="h-[300px]">
                <div className="p-2 space-y-3">
                  {availableVariables.map((group) => (
                    <div key={group.nodeId}>
                      <div className="px-2 py-1 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {group.nodeType.toUpperCase()}
                        </Badge>
                        <span className="ml-2 text-xs font-semibold text-foreground">
                          {group.nodeName}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {group.variables.map((variable, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleVariableSelect(variable)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent text-left group"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-mono text-foreground truncate">
                                {variable.label}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono truncate">
                                {variable.path}
                              </div>
                            </div>
                            <Badge
                              variant="secondary"
                              className="text-[10px] ml-2 shrink-0"
                            >
                              {variable.type}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Expression hint */}
      {isExpression && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-primary/5 border border-primary/20">
          <Code className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-primary">Expression Mode</p>
            <p className="text-muted-foreground mt-0.5">
              Use <code className="px-1 py-0.5 rounded bg-background">{'{{ $node.field }}'}</code> to reference data from previous nodes
            </p>
          </div>
        </div>
      )}

      {/* Example preview (if value is expression) */}
      {isExpression && value.includes('$node') && (
        <div className="px-3 py-2 rounded-md bg-muted/50 border">
          <p className="text-xs font-semibold text-muted-foreground mb-1">
            Example output:
          </p>
          <code className="text-xs font-mono text-foreground">
            {/* Mock example - in real implementation, this would evaluate */}
            {value.replace(/\{\{\s*\$node\.(\w+)\s*\}\}/g, (_, path) => {
              // Mock data for preview
              const mockData: Record<string, any> = {
                amount: '15000',
                currency: 'BTC',
                email: 'user@example.com',
                country: 'US',
              };
              return mockData[path] || '<value>';
            })}
          </code>
        </div>
      )}
    </div>
  );
}

