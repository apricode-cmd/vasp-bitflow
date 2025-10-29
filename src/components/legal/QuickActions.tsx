'use client';

import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';

export function QuickActions() {
  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Button 
        variant="outline" 
        size="sm"
        className="h-8"
        onClick={handlePrint}
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline ml-2">Print</span>
      </Button>
      
      <Button 
        variant="outline" 
        size="sm"
        className="h-8"
        onClick={handleShare}
      >
        <Share2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline ml-2">Share</span>
      </Button>
    </div>
  );
}

