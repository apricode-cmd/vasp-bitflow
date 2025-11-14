/**
 * PayIn Overview Tab Component
 * Displays ALL details of a PayIn transaction
 * Including: Payment info, Bank details, Sender info, Blockchain data, Approval workflow, Proofs
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
  CreditCard, 
  Network,
  CheckCircle,
  Clock,
  FileText,
  DollarSign,
  Building2,
  UserCheck,
  FileCheck,
  Link as LinkIcon,
  ExternalLink,
  Download,
  Banknote,
  Send
} from 'lucide-react';
import Link from 'next/link';

interface PayInOverviewTabProps {
  payIn: {
    id: string;
    orderId: string;
    userId: string;
    amount: number;
    expectedAmount: number;
    receivedAmount: number | null;
    amountMismatch: boolean;
    currencyType: string;
    status: string;
    
    // Sender information
    senderName: string | null;
    senderAccount: string | null;
    senderBank: string | null;
    reference: string | null;
    
    // Blockchain information (for crypto)
    senderAddress: string | null;
    transactionHash: string | null;
    blockNumber: number | null;
    confirmations: number;
    explorerUrl: string | null;
    
    transactionId: string | null;
    paymentDate: string | null;
    receivedDate: string | null;
    
    // Verification
    verifiedBy: string | null;
    verifiedAt: string | null;
    reconciledBy: string | null;
    reconciledAt: string | null;
    verificationNotes: string | null;
    
    // Approval workflow
    approvalRequired: boolean;
    approvedBy: string | null;
    approvedAt: string | null;
    initiatedBy: string | null;
    initiatedAt: string | null;
    
    // Proofs
    proofUrls: string[];
    
    createdAt: string;
    updatedAt: string;
    
    order: {
      id: string;
      paymentReference: string;
      cryptoAmount: number;
      currencyCode: string;
      status: string;
      fiatAmount: number;
      rate: number;
      feePercent: number;
      feeAmount: number;
      totalFiat: number;
      paymentProofs: Array<{
        id: string;
        fileUrl: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
        uploadedAt: string;
        user: {
          email: string;
        };
      }>;
    };
    user: {
      id: string;
      email: string;
      profile: {
        firstName: string;
        lastName: string;
        phoneNumber: string | null;
        country: string;
      } | null;
    };
    fiatCurrency: {
      code: string;
      name: string;
      symbol: string;
    } | null;
    cryptocurrency: {
      code: string;
      name: string;
      symbol: string;
    } | null;
    paymentMethod: {
      code: string;
      name: string;
      description: string | null;
      type: string;
      instructions: string | null;
      bankAccount: {
        id: string;
        currency: string;
        bankName: string;
        bankAddress: string | null;
        accountHolder: string;
        iban: string;
        swift: string | null;
        bic: string | null;
        sortCode: string | null;
        referenceTemplate: string;
        instructions: string | null;
      } | null;
      paymentAccount: {
        id: string;
        code: string;
        name: string;
        type: string;
        bankName: string | null;
        bankAddress: string | null;
        accountHolder: string | null;
        iban: string | null;
        swift: string | null;
        bic: string | null;
        sortCode: string | null;
        address: string | null;
        instructions: string | null;
      } | null;
    } | null;
    network: {
      code: string;
      name: string;
    } | null;
    verifier: {
      id: string;
      email: string;
    } | null;
    reconciler: {
      id: string;
      email: string;
    } | null;
    approver: {
      id: string;
      email: string;
    } | null;
    initiator: {
      id: string;
      email: string;
    } | null;
  };
}

export function PayInOverviewTab({ payIn }: PayInOverviewTabProps): JSX.Element {
  const currency = payIn.currencyType === 'FIAT' ? payIn.fiatCurrency : payIn.cryptocurrency;
  const isFiat = payIn.currencyType === 'FIAT';
  const isCrypto = payIn.currencyType === 'CRYPTO';

  // Get bank details from payment method
  const bankDetails = payIn.paymentMethod?.bankAccount || payIn.paymentMethod?.paymentAccount;

  return (
    <div className="space-y-6">
      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Payment Reference</label>
            <p className="font-mono text-sm mt-1">{payIn.order.paymentReference}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Currency Type</label>
            <p className="mt-1">
              <Badge variant="outline">{payIn.currencyType}</Badge>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Currency</label>
            <p className="mt-1">{currency?.name || 'N/A'} ({currency?.code || 'N/A'})</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              {isFiat ? 'Payment Method' : 'Blockchain Network'}
            </label>
            <p className="mt-1">
              {isFiat ? payIn.paymentMethod?.name : payIn.network?.name || 'N/A'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Expected Amount</label>
            <p className="font-semibold mt-1">
              {currency?.symbol || ''}{payIn.expectedAmount.toFixed(2)} {currency?.code || ''}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Received Amount</label>
            <p className={`font-semibold mt-1 ${payIn.amountMismatch ? 'text-red-600' : ''}`}>
              {payIn.receivedAmount 
                ? `${currency?.symbol || ''}${payIn.receivedAmount.toFixed(2)} ${currency?.code || ''}`
                : 'Not received yet'
              }
              {payIn.amountMismatch && (
                <Badge variant="destructive" className="ml-2">Mismatch</Badge>
              )}
            </p>
          </div>
          {payIn.transactionId && (
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Transaction ID</label>
              <p className="font-mono text-sm mt-1 break-all">{payIn.transactionId}</p>
            </div>
          )}
          {payIn.paymentDate && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Payment Date</label>
              <p className="mt-1">{formatDateTime(new Date(payIn.paymentDate))}</p>
            </div>
          )}
          {payIn.receivedDate && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Received Date</label>
              <p className="mt-1">{formatDateTime(new Date(payIn.receivedDate))}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank Account Details (for FIAT) */}
      {isFiat && bankDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Bank Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bank Name</label>
                <p className="font-semibold mt-1">{bankDetails.bankName || 'N/A'}</p>
              </div>
              {bankDetails.bankAddress && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Bank Address</label>
                  <p className="text-sm mt-1">{bankDetails.bankAddress}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Holder</label>
                <p className="mt-1">{bankDetails.accountHolder || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">IBAN</label>
                <p className="font-mono text-sm mt-1">{bankDetails.iban || 'N/A'}</p>
              </div>
              {bankDetails.swift && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">SWIFT/BIC</label>
                  <p className="font-mono text-sm mt-1">{bankDetails.swift} {bankDetails.bic && `/ ${bankDetails.bic}`}</p>
                </div>
              )}
              {bankDetails.sortCode && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Sort Code</label>
                  <p className="font-mono text-sm mt-1">{bankDetails.sortCode}</p>
                </div>
              )}
            </div>
            {bankDetails.instructions && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Payment Instructions</label>
                <p className="mt-1 text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                  {bankDetails.instructions}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sender Information */}
      {(payIn.senderName || payIn.senderAccount || payIn.senderBank || payIn.reference) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Sender Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {payIn.senderName && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Sender Name</label>
                <p className="mt-1">{payIn.senderName}</p>
              </div>
            )}
            {payIn.senderAccount && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Sender Account</label>
                <p className="font-mono text-sm mt-1">{payIn.senderAccount}</p>
              </div>
            )}
            {payIn.senderBank && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Sender Bank</label>
                <p className="mt-1">{payIn.senderBank}</p>
              </div>
            )}
            {payIn.reference && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Payment Reference</label>
                <p className="font-mono text-sm mt-1">{payIn.reference}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Blockchain Transaction (for CRYPTO) */}
      {isCrypto && (payIn.senderAddress || payIn.transactionHash) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Blockchain Transaction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {payIn.senderAddress && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Sender Address</label>
                <p className="font-mono text-sm mt-1 break-all">{payIn.senderAddress}</p>
              </div>
            )}
            {payIn.transactionHash && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Transaction Hash</label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="font-mono text-sm break-all flex-1">{payIn.transactionHash}</p>
                  {payIn.explorerUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={payIn.explorerUrl} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {payIn.blockNumber && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Block Number</label>
                  <p className="font-mono mt-1">{payIn.blockNumber.toLocaleString()}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Confirmations</label>
                <p className="mt-1">
                  <Badge variant={payIn.confirmations >= 6 ? 'default' : 'secondary'}>
                    {payIn.confirmations} / 6
                  </Badge>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Related Order
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Order ID</label>
            <p className="font-mono text-sm mt-1">
              <Link href={`/admin/orders?id=${payIn.order.id}`} className="text-blue-600 hover:underline">
                {payIn.order.id}
              </Link>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Order Status</label>
            <p className="mt-1">
              <Badge>{payIn.order.status}</Badge>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Crypto Amount</label>
            <p className="font-semibold mt-1">
              {payIn.order.cryptoAmount.toFixed(8)} {payIn.order.currencyCode}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Fiat Amount</label>
            <p className="font-semibold mt-1">
              {currency?.symbol || ''}{payIn.order.fiatAmount.toFixed(2)}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Exchange Rate</label>
            <p className="mt-1">{payIn.order.rate.toFixed(2)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Fee ({payIn.order.feePercent}%)</label>
            <p className="mt-1">
              {currency?.symbol || ''}{payIn.order.feeAmount.toFixed(2)}
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-muted-foreground">Total Amount (incl. fee)</label>
            <p className="font-bold text-lg mt-1">
              {currency?.symbol || ''}{payIn.order.totalFiat.toFixed(2)} {currency?.code || ''}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground">User ID</label>
            <p className="font-mono text-sm mt-1">
              <Link href={`/admin/users/${payIn.user.id}`} className="text-blue-600 hover:underline">
                {payIn.user.id}
              </Link>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="mt-1">{payIn.user.email}</p>
          </div>
          {payIn.user.profile && (
            <>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <p className="mt-1">
                  {payIn.user.profile.firstName} {payIn.user.profile.lastName}
                </p>
              </div>
              {payIn.user.profile.phoneNumber && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="mt-1">{payIn.user.profile.phoneNumber}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Country</label>
                <p className="mt-1">
                  {getCountryFlag(payIn.user.profile.country)} {getCountryName(payIn.user.profile.country)}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Proofs */}
      {payIn.order.paymentProofs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Payment Proofs ({payIn.order.paymentProofs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payIn.order.paymentProofs.map((proof) => (
                <div key={proof.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{proof.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {(proof.fileSize / 1024).toFixed(2)} KB • 
                        Uploaded by {proof.user.email} • 
                        {formatDateTime(new Date(proof.uploadedAt))}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={proof.fileUrl} target="_blank">
                      <Download className="h-4 w-4 mr-2" />
                      View
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Workflow */}
      {(payIn.initiatedBy || payIn.approvedBy) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Approval Workflow
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {payIn.approvalRequired && (
              <div>
                <Badge variant="outline">Approval Required</Badge>
              </div>
            )}
            {payIn.initiatedBy && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Initiated By</label>
                  <p className="mt-1">{payIn.initiator?.email || payIn.initiatedBy}</p>
                </div>
                {payIn.initiatedAt && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Initiated At</label>
                    <p className="mt-1">{formatDateTime(new Date(payIn.initiatedAt))}</p>
                  </div>
                )}
              </div>
            )}
            {payIn.approvedBy && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Approved By</label>
                  <p className="mt-1">{payIn.approver?.email || payIn.approvedBy}</p>
                </div>
                {payIn.approvedAt && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Approved At</label>
                    <p className="mt-1">{formatDateTime(new Date(payIn.approvedAt))}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Verification & Reconciliation */}
      {(payIn.verifiedBy || payIn.reconciledBy || payIn.verificationNotes) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Verification & Reconciliation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {payIn.verifiedBy && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Verified By</label>
                  <p className="mt-1">{payIn.verifier?.email || payIn.verifiedBy}</p>
                </div>
                {payIn.verifiedAt && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Verified At</label>
                    <p className="mt-1">{formatDateTime(new Date(payIn.verifiedAt))}</p>
                  </div>
                )}
              </div>
            )}
            {payIn.reconciledBy && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Reconciled By</label>
                  <p className="mt-1">{payIn.reconciler?.email || payIn.reconciledBy}</p>
                </div>
                {payIn.reconciledAt && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Reconciled At</label>
                    <p className="mt-1">{formatDateTime(new Date(payIn.reconciledAt))}</p>
                  </div>
                )}
              </div>
            )}
            {payIn.verificationNotes && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Verification Notes</label>
                <p className="mt-1 text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                  {payIn.verificationNotes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Created At</label>
            <p className="mt-1">{formatDateTime(new Date(payIn.createdAt))}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
            <p className="mt-1">{formatDateTime(new Date(payIn.updatedAt))}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
