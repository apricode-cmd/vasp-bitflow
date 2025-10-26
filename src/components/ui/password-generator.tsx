/**
 * Password Generator Component
 * 
 * Interactive password generator with options and strength indicator
 */

'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Copy, Check, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { generatePassword, calculatePasswordStrength, type PasswordOptions } from '@/lib/utils/password-generator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PasswordGeneratorProps {
  onGenerate?: (password: string) => void;
  className?: string;
}

export function PasswordGenerator({ onGenerate, className }: PasswordGeneratorProps): React.ReactElement {
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeSimilar: false,
    excludeAmbiguous: false,
  });

  const strength = password ? calculatePasswordStrength(password) : null;

  // Generate initial password
  useEffect(() => {
    handleGenerate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = () => {
    try {
      const newPassword = generatePassword(options);
      setPassword(newPassword);
      onGenerate?.(newPassword);
      setCopied(false);
    } catch (error) {
      toast.error('Failed to generate password');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy password');
    }
  };

  const handleUse = () => {
    onGenerate?.(password);
    toast.success('Password applied');
  };

  const getStrengthColor = (level: string) => {
    switch (level) {
      case 'Weak': return 'text-red-500';
      case 'Fair': return 'text-orange-500';
      case 'Good': return 'text-yellow-500';
      case 'Strong': return 'text-green-500';
      case 'Very Strong': return 'text-emerald-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStrengthBgColor = (level: string) => {
    switch (level) {
      case 'Weak': return 'bg-red-500';
      case 'Fair': return 'bg-orange-500';
      case 'Good': return 'bg-yellow-500';
      case 'Strong': return 'bg-green-500';
      case 'Very Strong': return 'bg-emerald-500';
      default: return 'bg-muted';
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Wand2 className="w-4 h-4 mr-2" />
          Generate Password
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="start">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h3 className="font-semibold text-lg">Password Generator</h3>
            <p className="text-sm text-muted-foreground">
              Create a secure random password
            </p>
          </div>

          {/* Generated Password */}
          <div className="space-y-2">
            <Label>Generated Password</Label>
            <div className="flex gap-2">
              <Input
                value={password}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={handleGenerate}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Password Strength */}
          {strength && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Strength:</span>
                <Badge 
                  variant="outline" 
                  className={cn('font-semibold', getStrengthColor(strength.level))}
                >
                  {strength.level}
                </Badge>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full transition-all duration-300', getStrengthBgColor(strength.level))}
                  style={{ width: `${strength.score}%` }}
                />
              </div>
            </div>
          )}

          {/* Length */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Length</Label>
              <span className="text-sm font-medium">{options.length}</span>
            </div>
            <Slider
              value={[options.length || 16]}
              onValueChange={([value]) => {
                setOptions({ ...options, length: value });
                // Auto-generate on length change
                setTimeout(() => {
                  const newPassword = generatePassword({ ...options, length: value });
                  setPassword(newPassword);
                  onGenerate?.(newPassword);
                }, 100);
              }}
              min={8}
              max={32}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {options.length! < 12 ? 'Recommended: 12+ characters' : 'Strong length'}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-2">
            <Label>Character Types</Label>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="uppercase" className="text-sm font-normal">
                Uppercase (A-Z)
              </Label>
              <Switch
                id="uppercase"
                checked={options.uppercase}
                onCheckedChange={(checked) => setOptions({ ...options, uppercase: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="lowercase" className="text-sm font-normal">
                Lowercase (a-z)
              </Label>
              <Switch
                id="lowercase"
                checked={options.lowercase}
                onCheckedChange={(checked) => setOptions({ ...options, lowercase: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="numbers" className="text-sm font-normal">
                Numbers (0-9)
              </Label>
              <Switch
                id="numbers"
                checked={options.numbers}
                onCheckedChange={(checked) => setOptions({ ...options, numbers: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="symbols" className="text-sm font-normal">
                Symbols (!@#$...)
              </Label>
              <Switch
                id="symbols"
                checked={options.symbols}
                onCheckedChange={(checked) => setOptions({ ...options, symbols: checked })}
              />
            </div>

            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="excludeSimilar" className="text-sm font-normal">
                  Exclude Similar (i, l, 1, L, o, 0, O)
                </Label>
                <Switch
                  id="excludeSimilar"
                  checked={options.excludeSimilar}
                  onCheckedChange={(checked) => setOptions({ ...options, excludeSimilar: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="excludeAmbiguous" className="text-sm font-normal">
                  Exclude Ambiguous ({'{'}{'}'}, [, ], (, ), /, \)
                </Label>
                <Switch
                  id="excludeAmbiguous"
                  checked={options.excludeAmbiguous}
                  onCheckedChange={(checked) => setOptions({ ...options, excludeAmbiguous: checked })}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleUse}
              className="flex-1"
            >
              Use This Password
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

