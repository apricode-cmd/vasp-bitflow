/**
 * UX Enhancements Section Component
 * Configure help text, placeholder, and custom styling
 */

'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface UXEnhancementsProps {
  helpText: string;
  placeholder: string;
  customClass: string;
  onHelpTextChange: (value: string) => void;
  onPlaceholderChange: (value: string) => void;
  onCustomClassChange: (value: string) => void;
  fieldType: string;
}

export function UXEnhancementsSection({
  helpText,
  placeholder,
  customClass,
  onHelpTextChange,
  onPlaceholderChange,
  onCustomClassChange,
  fieldType
}: UXEnhancementsProps) {
  const supportsPlaceholder = ['text', 'email', 'tel', 'number', 'textarea', 'date'].includes(fieldType);

  return (
    <div className="space-y-6">
      {/* Help Text */}
      <div className="space-y-2">
        <Label htmlFor="helpText">Help Text</Label>
        <Textarea
          id="helpText"
          placeholder="Additional information to help users fill this field..."
          value={helpText}
          onChange={(e) => onHelpTextChange(e.target.value)}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Shown below the field to provide guidance to users
        </p>
      </div>

      {/* Placeholder */}
      {supportsPlaceholder && (
        <div className="space-y-2">
          <Label htmlFor="placeholder">Placeholder Text</Label>
          <Input
            id="placeholder"
            placeholder="e.g., Enter your first name..."
            value={placeholder}
            onChange={(e) => onPlaceholderChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Placeholder text shown inside the input field when empty
          </p>
        </div>
      )}

      {!supportsPlaceholder && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Placeholder text is not supported for field type: <strong>{fieldType}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Custom CSS Classes */}
      <div className="space-y-2">
        <Label htmlFor="customClass">Custom CSS Classes</Label>
        <Input
          id="customClass"
          placeholder="e.g., w-full md:w-1/2"
          value={customClass}
          onChange={(e) => onCustomClassChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Tailwind CSS classes for custom styling and layout
        </p>
      </div>

      {/* Common Class Examples */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2 text-sm">
            <p className="font-medium">Common examples:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><code className="px-1 py-0.5 bg-muted rounded">w-full</code> - Full width</li>
              <li><code className="px-1 py-0.5 bg-muted rounded">md:w-1/2</code> - Half width on medium screens</li>
              <li><code className="px-1 py-0.5 bg-muted rounded">col-span-2</code> - Span 2 columns in grid</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

