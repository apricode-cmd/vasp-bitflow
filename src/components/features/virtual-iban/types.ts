/**
 * Virtual IBAN Types
 */

export interface VirtualIbanAccount {
  id: string;
  iban: string;
  bic: string;
  bankName: string;
  accountHolder: string;
  currency: string;
  country: string;
  balance: number;
  status: VirtualIbanStatus;
  lastBalanceUpdate: string | null;
  createdAt: string;
}

export type VirtualIbanStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'CLOSED' | 'FAILED';

export interface VirtualIbanTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  status: string;
  amount: number;
  currencyCode: string;
  currency?: string;
  reference?: string;
  senderName?: string;
  senderAccount?: string;
  senderIban?: string;
  description?: string;
  processedAt: string;
  orderId?: string;
  order?: {
    id: string;
    status: string;
    paymentReference?: string;
  } | null;
  topUpRequest?: {
    id: string;
    reference: string;
    invoiceNumber?: string | null;
    amount: number;
    status: string;
  } | null;
}

export type TopUpRequestStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

export interface TopUpRequest {
  id: string;
  reference: string;
  invoiceNumber: string | null;
  amount: number;
  currency: string;
  status: TopUpRequestStatus;
  expiresAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  transaction?: {
    id: string;
    amount: number;
    status: string;
    processedAt: string | null;
  } | null;
}

export interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string | null;
  nationality: string | null;
  country: string;
  city: string;
  address: string;
  postalCode: string | null;
}

export interface EligibilityData {
  eligible: boolean;
  hasExistingAccount: boolean;
  hasFailedAccount: boolean;
  existingAccount: VirtualIbanAccount | null;
  kycStatus: string;
  kycApproved: boolean;
  profileComplete: boolean;
  userData: UserData | null;
}

