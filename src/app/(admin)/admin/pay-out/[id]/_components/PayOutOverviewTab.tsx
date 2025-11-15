/**
 * PayOut Overview Tab Component
 * Displays ALL details of a PayOut transaction
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/formatters';
import { getCountryFlag, getCountryName } from '@/lib/utils/country-utils';
import { 
  Receipt, 
  User, 
  Wallet,
  Network,
  Clock,
  DollarSign,
  Send,
  ExternalLink,
  Copy,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface PayOutOverviewTabProps {
  payOut: any; // Full PayOut object with all relations
}

export function PayOutOverviewTab({ payOut }: PayOutOverviewTabProps): JSX.Element {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const formatCryptoAmount = (amount: number) => {
    return amount.toFixed(8);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Transaction Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Transaction Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoRow 
            label="PayOut ID" 
            value={payOut.id}
            copyable
            onCopy={() => copyToClipboard(payOut.id, 'PayOut ID')}
          />
          <InfoRow 
            label="Order Reference" 
            value={payOut.order.paymentReference}
            link={`/admin/orders/${payOut.order.id}`}
          />
          <InfoRow 
            label="Amount" 
            value={`${payOut.cryptocurrency.symbol}${formatCryptoAmount(payOut.amount)}`}
            badge={payOut.cryptocurrency.code}
          />
          {payOut.networkFee && (
            <InfoRow 
              label="Network Fee" 
              value={`${payOut.cryptocurrency.symbol}${formatCryptoAmount(payOut.networkFee)}`}
            />
          )}
          <InfoRow 
            label="Net Amount" 
            value={`${payOut.cryptocurrency.symbol}${formatCryptoAmount(payOut.amount - (payOut.networkFee || 0))}`}
          />
          <InfoRow 
            label="Status" 
            value={payOut.status}
            badge={payOut.status}
          />
          <InfoRow 
            label="Created" 
            value={formatDateTime(payOut.createdAt)}
          />
          {payOut.sentAt && (
            <InfoRow 
              label="Sent At" 
              value={formatDateTime(payOut.sentAt)}
            />
          )}
          {payOut.confirmedAt && (
            <InfoRow 
              label="Confirmed At" 
              value={formatDateTime(payOut.confirmedAt)}
            />
          )}
        </CardContent>
      </Card>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoRow 
            label="Name" 
            value={payOut.user.profile 
              ? `${payOut.user.profile.firstName} ${payOut.user.profile.lastName}`
              : 'N/A'
            }
          />
          <InfoRow 
            label="Email" 
            value={payOut.user.email}
            link={`/admin/users/${payOut.user.id}`}
          />
          {payOut.user.profile?.phoneNumber && (
            <InfoRow 
              label="Phone" 
              value={payOut.user.profile.phoneNumber}
            />
          )}
          {payOut.user.profile?.country && (
            <InfoRow 
              label="Country" 
              value={`${getCountryFlag(payOut.user.profile.country)} ${getCountryName(payOut.user.profile.country)}`}
            />
          )}
          {payOut.recipientName && (
            <InfoRow 
              label="Recipient Name" 
              value={payOut.recipientName}
            />
          )}
        </CardContent>
      </Card>

      {/* Blockchain Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Blockchain Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoRow 
            label="Network" 
            value={payOut.network.name}
          />
          <InfoRow 
            label="Destination Address" 
            value={payOut.destinationAddress}
            copyable
            mono
            onCopy={() => copyToClipboard(payOut.destinationAddress, 'Address')}
          />
          {payOut.destinationTag && (
            <InfoRow 
              label="Destination Tag" 
              value={payOut.destinationTag}
              copyable
              onCopy={() => copyToClipboard(payOut.destinationTag, 'Tag')}
            />
          )}
          {payOut.transactionHash && (
            <InfoRow 
              label="Transaction Hash" 
              value={payOut.transactionHash}
              copyable
              mono
              onCopy={() => copyToClipboard(payOut.transactionHash, 'TX Hash')}
              link={payOut.explorerUrl}
              external
            />
          )}
          {payOut.blockNumber && (
            <InfoRow 
              label="Block Number" 
              value={payOut.blockNumber.toString()}
            />
          )}
          <InfoRow 
            label="Confirmations" 
            value={payOut.confirmations.toString()}
            badge={payOut.confirmations > 0 ? `${payOut.confirmations}` : undefined}
          />
          {payOut.explorerUrl && payOut.transactionHash && (
            <div className="pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                asChild
              >
                <a href={payOut.explorerUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Explorer
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wallet Information */}
      {payOut.userWallet && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow 
              label="Wallet Label" 
              value={payOut.userWallet.label || 'Default Wallet'}
            />
            <InfoRow 
              label="Verified" 
              value={payOut.userWallet.isVerified ? 'Yes' : 'No'}
              badge={payOut.userWallet.isVerified ? 'Verified' : 'Unverified'}
            />
          </CardContent>
        </Card>
      )}

      {/* Processing Information */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Processing Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Timeline */}
            <TimelineItem 
              label="Created"
              time={formatDateTime(payOut.createdAt)}
              completed
            />
            {payOut.initiatedAt && payOut.initiator && (
              <TimelineItem 
                label="Initiated"
                time={formatDateTime(payOut.initiatedAt)}
                by={payOut.initiator.email}
                completed
              />
            )}
            {payOut.processedAt && payOut.processor && (
              <TimelineItem 
                label="Processed"
                time={formatDateTime(payOut.processedAt)}
                by={payOut.processor.email}
                completed
              />
            )}
            {payOut.sentAt && (
              <TimelineItem 
                label="Sent to Blockchain"
                time={formatDateTime(payOut.sentAt)}
                completed
              />
            )}
            {payOut.confirmedAt && (
              <TimelineItem 
                label="Confirmed"
                time={formatDateTime(payOut.confirmedAt)}
                completed
              />
            )}
            {payOut.status === 'FAILED' && (
              <TimelineItem 
                label="Failed"
                time={formatDateTime(payOut.updatedAt)}
                completed
                failed
              />
            )}
          </div>

          {payOut.processingNotes && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Processing Notes:</p>
              <p className="text-sm text-muted-foreground">{payOut.processingNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper Components
function InfoRow({ 
  label, 
  value, 
  badge, 
  copyable, 
  mono, 
  link, 
  external, 
  onCopy 
}: { 
  label: string; 
  value: string | number; 
  badge?: string; 
  copyable?: boolean; 
  mono?: boolean; 
  link?: string;
  external?: boolean;
  onCopy?: () => void;
}) {
  const content = (
    <div className="flex items-start justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium text-right ${mono ? 'font-mono' : ''}`}>
          {value}
        </span>
        {badge && (
          <Badge variant="outline" className="text-xs">
            {badge}
          </Badge>
        )}
        {copyable && onCopy && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={onCopy}
          >
            <Copy className="h-3 w-3" />
          </Button>
        )}
        {link && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            asChild
          >
            {external ? (
              <a href={link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <Link href={link}>
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </Button>
        )}
      </div>
    </div>
  );

  return link && !external ? (
    <Link href={link} className="hover:underline">
      {content}
    </Link>
  ) : content;
}

function TimelineItem({ 
  label, 
  time, 
  by, 
  completed, 
  failed 
}: { 
  label: string; 
  time: string; 
  by?: string; 
  completed?: boolean;
  failed?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 pb-3 border-b last:border-0">
      <div className={`rounded-full p-1 mt-1 ${
        failed ? 'bg-red-100 dark:bg-red-950' : 
        completed ? 'bg-green-100 dark:bg-green-950' : 
        'bg-gray-100 dark:bg-gray-900'
      }`}>
        <CheckCircle className={`h-4 w-4 ${
          failed ? 'text-red-600' : 
          completed ? 'text-green-600' : 
          'text-gray-400'
        }`} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{time}</p>
        </div>
        {by && (
          <p className="text-xs text-muted-foreground mt-1">by {by}</p>
        )}
      </div>
    </div>
  );
}

