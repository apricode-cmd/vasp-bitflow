/**
 * Client Virtual IBAN Management Page
 * 
 * Full-featured page for managing Virtual IBAN:
 * - KYC verification check before creation
 * - Confirmation dialog with user data preview
 * - View account details (IBAN, BIC, balance)
 * - Top-up instructions
 * - Transaction history
 */

'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { 
  useVirtualIban,
  KYCRequired,
  CreateVirtualIban,
  VirtualIbanDetails 
} from '@/components/features/virtual-iban';

export default function VirtualIbanPage(): JSX.Element {
  const {
    loading,
    creating,
    refreshing,
    account,
    transactions,
    eligibility,
    createAccount,
    refresh,
  } = useVirtualIban();

  // Loading state
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-in">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // KYC Not Approved - Show KYC Required Message
  if (eligibility && !eligibility.kycApproved) {
    return <KYCRequired kycStatus={eligibility.kycStatus} />;
  }

  // No account - show creation form with confirmation
  if (!account) {
    return (
      <CreateVirtualIban
        userData={eligibility?.userData || null}
        creating={creating}
        hasFailedAccount={eligibility?.hasFailedAccount}
        onCreateAccount={createAccount}
      />
    );
  }

  // Account exists - show details
  return (
    <VirtualIbanDetails
      account={account}
      transactions={transactions}
      refreshing={refreshing}
      onRefresh={refresh}
    />
  );
}
