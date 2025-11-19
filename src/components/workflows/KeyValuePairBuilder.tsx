'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus } from 'lucide-react';
import ExpressionInput from '@/app/(admin)/admin/workflows/[id]/_components/ExpressionInput';

export interface KeyValuePair {
  key: string;
  value: string;
  enabled?: boolean;
}

interface KeyValuePairBuilderProps {
  items: KeyValuePair[];
  onChange: (items: KeyValuePair[]) => void;
  placeholder?: { key: string; value: string };
  expressionSupport?: boolean;
  availableVariables?: Array<{ name: string; path: string; type: string; description?: string }>;
  keyLabel?: string;
  valueLabel?: string;
}

export default function KeyValuePairBuilder({
  items = [],
  onChange,
  placeholder = { key: 'key', value: 'value' },
  expressionSupport = true,
  availableVariables = [],
  keyLabel = 'Key',
  valueLabel = 'Value',
}: KeyValuePairBuilderProps) {
  const handleAdd = () => {
    onChange([...items, { key: '', value: '', enabled: true }]);
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleToggle = (index: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <div className="text-xs text-muted-foreground py-2 text-center border border-dashed rounded-md">
          No items yet. Click "+ Add" to create one.
        </div>
      )}

      {items.map((item, index) => (
        <div
          key={index}
          className={`grid grid-cols-[auto,1fr,2fr,auto] gap-2 items-start ${
            item.enabled === false ? 'opacity-50' : ''
          }`}
        >
          {/* Enabled Checkbox */}
          <div className="pt-2">
            <input
              type="checkbox"
              checked={item.enabled !== false}
              onChange={() => handleToggle(index)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          </div>

          {/* Key */}
          <div>
            <Input
              value={item.key}
              onChange={(e) => handleUpdate(index, 'key', e.target.value)}
              placeholder={placeholder.key}
              className="text-xs font-mono"
              disabled={item.enabled === false}
            />
          </div>

          {/* Value */}
          <div>
            {expressionSupport ? (
              <ExpressionInput
                value={item.value}
                onChange={(value) => handleUpdate(index, 'value', value)}
                placeholder={placeholder.value}
                availableVariables={availableVariables}
                disabled={item.enabled === false}
              />
            ) : (
              <Input
                value={item.value}
                onChange={(e) => handleUpdate(index, 'value', e.target.value)}
                placeholder={placeholder.value}
                className="text-xs font-mono"
                disabled={item.enabled === false}
              />
            )}
          </div>

          {/* Remove */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemove(index)}
            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {/* Add Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAdd}
        className="w-full text-xs"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add {keyLabel}
      </Button>
    </div>
  );
}

