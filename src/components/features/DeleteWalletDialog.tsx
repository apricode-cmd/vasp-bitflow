/**
 * Delete Wallet Dialog Component
 * 
 * Confirmation dialog for deleting saved wallet address
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteWalletDialogProps {
  walletId: string;
  walletAddress: string;
  currency: string;
}

export function DeleteWalletDialog({ 
  walletId, 
  walletAddress,
  currency 
}: DeleteWalletDialogProps): React.ReactElement {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/wallets/${walletId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Wallet deleted successfully');
        setOpen(false);
        router.refresh();
      } else {
        const result = await response.json();
        toast.error(result.error || 'Failed to delete wallet');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Wallet Address?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Are you sure you want to delete this wallet address?</p>
            <div className="p-3 bg-muted rounded-lg mt-2">
              <p className="text-xs text-muted-foreground mb-1">{currency} Address:</p>
              <p className="font-mono text-sm break-all">{walletAddress}</p>
            </div>
            <p className="text-xs">
              This action cannot be undone. You can add it again later if needed.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


