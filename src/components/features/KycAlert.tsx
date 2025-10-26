/**
 * KYC Alert Component
 * 
 * Reusable alert for KYC verification status across all pages
 */

'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Shield, CheckCircle2, Clock, AlertCircle, ChevronRight
} from 'lucide-react';

interface KycAlertProps {
  status: string | null;
  isApproved: boolean;
}

export function KycAlert({ status, isApproved }: KycAlertProps): React.ReactElement | null {
  // Don't show alert if KYC is approved
  if (isApproved) {
    return null;
  }

  return (
    <Card className={`overflow-hidden relative backdrop-blur-sm ${
      status === 'PENDING' 
        ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-50 via-yellow-50/50 to-transparent dark:from-yellow-950/20 dark:via-yellow-950/10 dark:to-transparent'
        : status === 'REJECTED'
        ? 'border-red-500/50 bg-gradient-to-br from-red-50 via-red-50/50 to-transparent dark:from-red-950/20 dark:via-red-950/10 dark:to-transparent'
        : 'border-blue-500/50 bg-gradient-to-br from-blue-50 via-blue-50/50 to-transparent dark:from-blue-950/20 dark:via-blue-950/10 dark:to-transparent'
    }`}>
      {/* Animated background gradient */}
      <div className={`absolute inset-0 animate-pulse ${
        status === 'PENDING'
          ? 'bg-gradient-to-r from-yellow-400/5 via-yellow-500/5 to-yellow-400/5'
          : status === 'REJECTED'
          ? 'bg-gradient-to-r from-red-400/5 via-red-500/5 to-red-400/5'
          : 'bg-gradient-to-r from-blue-400/5 via-blue-500/5 to-blue-400/5'
      }`} />
      
      <CardContent className="p-5 relative">
        {status === 'PENDING' ? (
          <div className="space-y-3">
            {/* Header with icon */}
            <div className="flex items-start gap-3">
              <div className="relative flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-yellow-500 rounded-full animate-ping" />
                <div className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-yellow-500 rounded-full" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                  KYC Verification In Progress
                </h3>
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  Your documents are being reviewed. Usually takes 2-4 hours.
                </p>
              </div>

              <Link href="/kyc">
                <Button size="sm" variant="ghost" className="text-yellow-700 hover:text-yellow-900 hover:bg-yellow-100 dark:text-yellow-300 dark:hover:bg-yellow-950/50 flex-shrink-0">
                  View Status
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>

            {/* Compact Progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-yellow-700 dark:text-yellow-300 font-medium">
                  Progress
                </span>
                <span className="text-yellow-600 dark:text-yellow-400 font-bold">
                  60%
                </span>
              </div>
              <div className="relative h-2 bg-yellow-100 dark:bg-yellow-950/50 rounded-full overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-500 rounded-full transition-all duration-500"
                  style={{ width: '60%' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
              </div>
            </div>

            {/* Compact Steps */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                <span className="text-yellow-800 dark:text-yellow-200">Received</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Clock className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 animate-pulse" />
                <span className="text-yellow-800 dark:text-yellow-200 font-medium">Reviewing</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Approval</span>
              </div>
            </div>
          </div>
        ) : status === 'REJECTED' ? (
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                KYC Verification Failed
              </h3>
              <p className="text-xs text-red-800 dark:text-red-200">
                Your verification was rejected. Please review the feedback and resubmit your documents.
              </p>
            </div>

            <Link href="/kyc">
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/25 flex-shrink-0">
                <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                Resubmit
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-500" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Get Started with KYC Verification
              </h3>
              <p className="text-xs text-blue-800 dark:text-blue-200">
                Verify your identity to unlock crypto trading. Quick and secure process.
              </p>
            </div>

            <Link href="/kyc">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 flex-shrink-0">
                <Shield className="h-3.5 w-3.5 mr-1.5" />
                Start Now
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


