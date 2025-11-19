/**
 * Trigger Evaluation Engine
 * 
 * Evaluates if a trigger should fire based on filter configuration
 */

import type { TriggerConfig, FilterRule } from '@/lib/validations/trigger-config';

/**
 * Evaluate if trigger should fire based on configuration
 */
export async function evaluateTrigger(
  config: TriggerConfig | null | undefined,
  contextData: Record<string, any>
): Promise<boolean> {
  // No config or disabled = always fire
  if (!config || !config.enabled || !config.filters || config.filters.length === 0) {
    return true;
  }

  // Evaluate all filters
  const results = await Promise.all(
    config.filters.map((filter) => evaluateFilter(filter, contextData))
  );

  // Apply logic (AND/OR)
  if (config.logic === 'AND') {
    return results.every((r) => r); // All must be true
  } else {
    return results.some((r) => r); // At least one must be true
  }
}

/**
 * Evaluate a single filter rule
 */
function evaluateFilter(
  filter: FilterRule,
  data: Record<string, any>
): boolean {
  try {
    // Get value from nested path (e.g., "user.country")
    const actualValue = getNestedValue(data, filter.field);
    const expectedValue = filter.value;

    // Handle null/undefined
    if (actualValue === null || actualValue === undefined) {
      return filter.operator === '!=' || filter.operator === 'not_in';
    }

    // Evaluate based on operator
    switch (filter.operator) {
      // Comparison operators
      case '==':
        return actualValue === expectedValue;
      
      case '!=':
        return actualValue !== expectedValue;
      
      case '>':
        return Number(actualValue) > Number(expectedValue);
      
      case '<':
        return Number(actualValue) < Number(expectedValue);
      
      case '>=':
        return Number(actualValue) >= Number(expectedValue);
      
      case '<=':
        return Number(actualValue) <= Number(expectedValue);

      // Array operators
      case 'in':
        if (Array.isArray(expectedValue)) {
          return expectedValue.includes(actualValue);
        }
        return false;
      
      case 'not_in':
        if (Array.isArray(expectedValue)) {
          return !expectedValue.includes(actualValue);
        }
        return true;

      // String operators
      case 'contains':
        return String(actualValue)
          .toLowerCase()
          .includes(String(expectedValue).toLowerCase());
      
      case 'not_contains':
        return !String(actualValue)
          .toLowerCase()
          .includes(String(expectedValue).toLowerCase());
      
      case 'starts_with':
        return String(actualValue)
          .toLowerCase()
          .startsWith(String(expectedValue).toLowerCase());
      
      case 'ends_with':
        return String(actualValue)
          .toLowerCase()
          .endsWith(String(expectedValue).toLowerCase());
      
      case 'matches':
        try {
          const regex = new RegExp(String(expectedValue), 'i');
          return regex.test(String(actualValue));
        } catch {
          return false;
        }

      // Range operator
      case 'between':
        if (Array.isArray(expectedValue) && expectedValue.length === 2) {
          const numValue = Number(actualValue);
          const [min, max] = expectedValue.map(Number);
          return numValue >= min && numValue <= max;
        }
        return false;

      default:
        console.warn(`[Trigger] Unknown operator: ${filter.operator}`);
        return false;
    }
  } catch (error) {
    console.error(`[Trigger] Error evaluating filter:`, filter, error);
    return false;
  }
}

/**
 * Get nested value from object using dot notation
 * 
 * @example
 * getNestedValue({ user: { country: 'US' } }, 'user.country') // 'US'
 */
export function getNestedValue(
  obj: Record<string, any>,
  path: string
): any {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

/**
 * Compute derived fields for ORDER_CREATED context
 */
export function enrichOrderContext(order: any, user: any): Record<string, any> {
  const now = new Date();
  const registeredDate = new Date(user.createdAt);
  const registeredDays = Math.floor(
    (now.getTime() - registeredDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    ...order,
    user: {
      ...user,
      registeredDays,
    },
    // Computed fields
    isFirstOrder: user.totalOrders === 0,
    isHighValue: order.fiatAmount > 10000,
    createdAt: {
      hour: new Date(order.createdAt).getHours(),
      dayOfWeek: getDayOfWeek(new Date(order.createdAt)),
    },
  };
}

/**
 * Compute derived fields for KYC_SUBMITTED context
 */
export function enrichKycContext(
  kycSession: any,
  user: any,
  profile: any
): Record<string, any> {
  const now = new Date();
  const registeredDate = new Date(user.createdAt);
  const registeredDays = Math.floor(
    (now.getTime() - registeredDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate age from date of birth
  let age: number | undefined;
  if (profile?.dateOfBirth) {
    const birthDate = new Date(profile.dateOfBirth);
    age = now.getFullYear() - birthDate.getFullYear();
    const monthDiff = now.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
      age--;
    }
  }

  // Check temp email
  const tempEmailDomains = [
    'temp-mail',
    'guerrillamail',
    '10minutemail',
    'throwaway',
    'tempmail',
    'mailinator',
  ];
  const hasTempEmail = tempEmailDomains.some((domain) =>
    user.email.toLowerCase().includes(domain)
  );

  // Phone country mismatch
  const phoneCountryMismatch =
    profile?.phoneCountry &&
    profile?.country &&
    profile.phoneCountry !== profile.country;

  return {
    kycSession,
    user: {
      ...user,
      registeredDays,
      hasOrders: user.totalOrders > 0,
    },
    profile: {
      ...profile,
      age,
    },
    // Computed fields
    isResubmission: kycSession.attempts > 1,
    hasTempEmail,
    phoneCountryMismatch,
  };
}

/**
 * Compute derived fields for PAYIN_RECEIVED context
 */
export function enrichPayInContext(payIn: any, order: any): Record<string, any> {
  const amountMismatch = order
    ? Math.abs(payIn.amount - order.totalFiat)
    : 0;

  const delayHours = order && order.createdAt
    ? Math.floor(
        (new Date(payIn.receivedAt).getTime() - new Date(order.createdAt).getTime()) /
          (1000 * 60 * 60)
      )
    : 0;

  return {
    ...payIn,
    expectedAmount: order?.totalFiat,
    amountMismatch,
    matchedToOrder: !!order,
    delayHours,
    receivedAt: {
      hour: new Date(payIn.receivedAt).getHours(),
    },
  };
}

/**
 * Compute derived fields for PAYOUT_REQUESTED context
 */
export function enrichPayOutContext(
  payOut: any,
  user: any,
  wallet: any
): Record<string, any> {
  const now = new Date();
  const lastPayoutDays = user.lastPayoutAt
    ? Math.floor(
        (now.getTime() - new Date(user.lastPayoutAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 999;

  // Velocity alert: more than 3 payouts in last 24 hours
  const velocityAlert = user.payoutsLast24h > 3;

  return {
    ...payOut,
    user: {
      ...user,
      lastPayoutDays,
    },
    wallet,
    // Computed fields
    isFirstPayout: user.totalPayouts === 0,
    isNewAddress: wallet?.createdAt
      ? (now.getTime() - new Date(wallet.createdAt).getTime()) / (1000 * 60 * 60 * 24) < 7
      : false,
    velocityAlert,
  };
}

/**
 * Compute derived fields for USER_REGISTERED context
 */
export function enrichUserContext(user: any, profile: any): Record<string, any> {
  const emailDomain = user.email.split('@')[1] || '';

  const phoneCountryMismatch =
    profile?.phoneCountry &&
    profile?.country &&
    profile.phoneCountry !== profile.country;

  // Suspicious pattern detection (basic heuristics)
  const suspiciousPattern =
    phoneCountryMismatch ||
    emailDomain.includes('temp') ||
    emailDomain.includes('throw');

  return {
    ...user,
    profile,
    emailDomain,
    phoneCountryMismatch,
    registeredAt: {
      hour: new Date(user.createdAt).getHours(),
      dayOfWeek: getDayOfWeek(new Date(user.createdAt)),
    },
    suspiciousPattern,
  };
}

/**
 * Compute derived fields for WALLET_ADDED context
 */
export function enrichWalletContext(
  wallet: any,
  user: any,
  riskData?: any
): Record<string, any> {
  return {
    ...wallet,
    user: {
      ...user,
      walletCount: user.wallets?.length || 0,
    },
    // Risk scoring (would come from Chainalysis or similar)
    addressRiskScore: riskData?.riskScore || 0,
    isMixerRelated: riskData?.isMixer || false,
    isSanctioned: riskData?.isSanctioned || false,
  };
}

/**
 * Helper: Get day of week from date
 */
function getDayOfWeek(date: Date): string {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return days[date.getDay()];
}

