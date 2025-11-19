'use client';

/**
 * Trigger Config Dialog
 * 
 * Full-screen modal for configuring trigger filters
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';
import FilterBuilder from './FilterBuilder';
import type { TriggerConfig } from '@/lib/validations/trigger-config';
import type { TriggerType } from '@/lib/validations/trigger-config';

interface TriggerConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: TriggerType;
  config: TriggerConfig;
  onSave: (config: TriggerConfig) => void;
}

export default function TriggerConfigDialog({
  open,
  onOpenChange,
  trigger,
  config: initialConfig,
  onSave,
}: TriggerConfigDialogProps) {
  const [config, setConfig] = useState<TriggerConfig>(initialConfig);

  const handleSave = () => {
    onSave(config);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setConfig(initialConfig); // Reset to initial
    onOpenChange(false);
  };

  // Reset config when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setConfig(initialConfig);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Configure Trigger Filters - {trigger ? String(trigger).replace(/_/g, ' ') : 'Trigger'}
          </DialogTitle>
          <DialogDescription>
            Define conditions that must be met for this workflow to execute. Leave empty to always trigger.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-2">
          <FilterBuilder trigger={trigger} config={config} onChange={setConfig} />
        </div>

        {/* Footer */}
        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

