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
  reference?: string;
  senderName?: string;
  senderAccount?: string;
  description?: string;
  processedAt: string;
  orderId?: string;
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

