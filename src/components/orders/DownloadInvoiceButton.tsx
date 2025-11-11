/**
 * Download Invoice Button Component
 * 
 * Client-side button to download PDF invoice for an order
 * Shows loading state and handles errors
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DownloadInvoiceButtonProps {
  orderId: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function DownloadInvoiceButton({
  orderId,
  variant = 'outline',
  size = 'default',
  className
}: DownloadInvoiceButtonProps): JSX.Element {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      
      // Fetch invoice PDF
      const response = await fetch(`/api/orders/${orderId}/invoice`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download invoice');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `invoice-${orderId}.pdf`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Download invoice error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download invoice');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={downloading}
      className={className}
    >
      {downloading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          Download Invoice
        </>
      )}
    </Button>
  );
}

