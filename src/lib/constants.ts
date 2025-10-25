/**
 * Platform Constants
 * 
 * Application-wide constants and configuration values.
 */

// Supported cryptocurrencies
export const SUPPORTED_CURRENCIES = ['BTC', 'ETH', 'USDT', 'SOL'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

// Supported fiat currencies
export const SUPPORTED_FIAT = ['EUR', 'PLN'] as const;
export type SupportedFiat = (typeof SUPPORTED_FIAT)[number];

// Currency metadata
export const CURRENCY_INFO = {
  BTC: {
    name: 'Bitcoin',
    symbol: '₿',
    decimals: 8,
    color: '#F7931A'
  },
  ETH: {
    name: 'Ethereum',
    symbol: 'Ξ',
    decimals: 6,
    color: '#627EEA'
  },
  USDT: {
    name: 'Tether',
    symbol: '₮',
    decimals: 2,
    color: '#26A17B'
  },
  SOL: {
    name: 'Solana',
    symbol: '◎',
    decimals: 4,
    color: '#14F195'
  }
} as const;

// Fiat currency metadata
export const FIAT_INFO = {
  EUR: {
    name: 'Euro',
    symbol: '€',
    locale: 'de-DE'
  },
  PLN: {
    name: 'Polish Zloty',
    symbol: 'zł',
    locale: 'pl-PL'
  }
} as const;

// Order statuses
export const ORDER_STATUSES = {
  PENDING: {
    label: 'Pending Payment',
    color: 'yellow',
    description: 'Waiting for payment transfer'
  },
  PROCESSING: {
    label: 'Processing',
    color: 'blue',
    description: 'Payment received, processing order'
  },
  COMPLETED: {
    label: 'Completed',
    color: 'green',
    description: 'Cryptocurrency sent to wallet'
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'red',
    description: 'Order cancelled'
  }
} as const;

// KYC statuses
export const KYC_STATUSES = {
  PENDING: {
    label: 'Pending Review',
    color: 'yellow',
    description: 'KYC documents submitted, awaiting review'
  },
  APPROVED: {
    label: 'Approved',
    color: 'green',
    description: 'KYC verification approved'
  },
  REJECTED: {
    label: 'Rejected',
    color: 'red',
    description: 'KYC verification rejected'
  }
} as const;

// Platform configuration
export const PLATFORM_CONFIG = {
  FEE_PERCENTAGE: 0.015, // 1.5%
  MIN_ORDER_VALUE_EUR: 10,
  MAX_ORDER_VALUE_EUR: 100000,
  SUPPORTED_IMAGE_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_IMAGE_SIZE_MB: 5,
  RATE_CACHE_DURATION_SECONDS: 30
} as const;

// Wallet address validation patterns
export const WALLET_PATTERNS = {
  BTC: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
  ETH: /^0x[a-fA-F0-9]{40}$/,
  USDT: /^0x[a-fA-F0-9]{40}$/, // ERC-20 address
  SOL: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
} as const;

// Navigation links
export const CLIENT_NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/buy', label: 'Buy Crypto' },
  { href: '/orders', label: 'My Orders' },
  { href: '/kyc', label: 'KYC Verification' },
  { href: '/profile', label: 'Profile' }
] as const;

export const ADMIN_NAV_LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/kyc', label: 'KYC Reviews' },
  { href: '/admin/settings', label: 'Settings' }
] as const;

// API endpoints
export const API_ROUTES = {
  AUTH: {
    LOGIN: '/api/auth/signin',
    LOGOUT: '/api/auth/signout',
    REGISTER: '/api/auth/register'
  },
  KYC: {
    START: '/api/kyc/start',
    STATUS: '/api/kyc/status',
    WEBHOOK: '/api/kyc/webhook'
  },
  ORDERS: {
    CREATE: '/api/orders',
    LIST: '/api/orders',
    DETAIL: (id: string) => `/api/orders/${id}`,
    UPLOAD_PROOF: (id: string) => `/api/orders/${id}/upload-proof`,
    CANCEL: (id: string) => `/api/orders/${id}/cancel`
  },
  RATES: '/api/rates',
  PROFILE: '/api/profile',
  ADMIN: {
    ORDERS: '/api/admin/orders',
    ORDER_STATUS: (id: string) => `/api/admin/orders/${id}/status`,
    KYC: '/api/admin/kyc',
    STATS: '/api/admin/stats',
    BANK_DETAILS: '/api/admin/settings/bank-details',
    CURRENCIES: '/api/admin/settings/currencies'
  }
} as const;

