/**
 * Email URL Helper
 * 
 * Generates absolute URLs for email templates.
 * Uses NEXTAUTH_URL from config to ensure correct domain in dev/prod.
 * 
 * Usage:
 * ```typescript
 * import { getEmailUrls } from '@/lib/utils/email-urls';
 * 
 * const urls = getEmailUrls();
 * const orderLink = urls.order('order123'); // https://domain.com/orders/order123
 * const logoUrl = urls.logo('/uploads/logo.svg'); // https://domain.com/uploads/logo.svg
 * ```
 */

import { config } from '@/lib/config';

/**
 * Get base URL for the application
 * In dev: http://localhost:3000
 * In prod: https://yourdomain.com
 */
export function getBaseUrl(): string {
  return config.app.url;
}

/**
 * Email URL Generators
 * All URLs are absolute and ready for email templates
 */
export function getEmailUrls() {
  const baseUrl = getBaseUrl();
  
  return {
    // Base URL
    base: baseUrl,
    
    // ==================
    // CLIENT URLS
    // ==================
    
    // Dashboard & Main Pages
    dashboard: `${baseUrl}/dashboard`,
    orders: `${baseUrl}/orders`,
    profile: `${baseUrl}/profile`,
    buy: `${baseUrl}/buy`,
    
    // Order specific
    order: (orderId: string) => `${baseUrl}/orders/${orderId}`,
    
    // KYC
    kyc: `${baseUrl}/kyc`,
    kycStart: `${baseUrl}/kyc`,
    
    // ==================
    // AUTH URLS
    // ==================
    
    login: `${baseUrl}/login`,
    register: `${baseUrl}/register`,
    
    // Password reset with token
    resetPassword: (token: string) => `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`,
    
    // Email verification with token
    verifyEmail: (token: string) => `${baseUrl}/auth/verify-email?token=${encodeURIComponent(token)}`,
    
    // ==================
    // ADMIN URLS
    // ==================
    
    adminDashboard: `${baseUrl}/admin`,
    adminOrders: `${baseUrl}/admin/orders`,
    adminKyc: `${baseUrl}/admin/kyc`,
    adminUsers: `${baseUrl}/admin/users`,
    adminSettings: `${baseUrl}/admin/settings`,
    
    // Admin order specific
    adminOrder: (orderId: string) => `${baseUrl}/admin/orders/${orderId}`,
    
    // Admin KYC specific
    adminKycReview: (userId: string) => `${baseUrl}/admin/kyc?userId=${encodeURIComponent(userId)}`,
    
    // Admin setup (for invitations) - universal setup page
    adminSetup: (token: string, email?: string) => {
      const url = `${baseUrl}/admin/auth/setup?token=${encodeURIComponent(token)}`;
      return email ? `${url}&email=${encodeURIComponent(email)}` : url;
    },
    // Legacy alias for backward compatibility
    adminSetupPasskey: (token: string, email?: string) => {
      const url = `${baseUrl}/admin/auth/setup?token=${encodeURIComponent(token)}`;
      return email ? `${url}&email=${encodeURIComponent(email)}` : url;
    },
    
    // ==================
    // ASSETS
    // ==================
    
    /**
     * Convert relative path to absolute URL
     * If path is already absolute (starts with http), return as-is
     * 
     * Examples:
     * - '/uploads/logo.svg' -> 'https://domain.com/uploads/logo.svg'
     * - 'https://blob.vercel.com/logo.svg' -> 'https://blob.vercel.com/logo.svg'
     */
    logo: (path: string) => {
      if (!path) return `${baseUrl}/logo.png`; // Fallback
      return path.startsWith('http') ? path : `${baseUrl}${path}`;
    },
    
    /**
     * Generic asset URL converter
     */
    asset: (path: string) => {
      if (!path) return baseUrl;
      return path.startsWith('http') ? path : `${baseUrl}${path}`;
    },
    
    // ==================
    // SOCIAL & EXTERNAL
    // ==================
    
    /**
     * Support email mailto link
     */
    supportEmail: (email: string) => `mailto:${email}`,
    
    /**
     * Phone tel link
     */
    supportPhone: (phone: string) => `tel:${phone.replace(/\s/g, '')}`,
  };
}

/**
 * Format date for email display
 */
export function formatEmailDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format currency for email display
 */
export function formatEmailCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

/**
 * Format crypto amount for email display
 */
export function formatEmailCrypto(amount: number, symbol: string): string {
  return `${amount.toFixed(8)} ${symbol}`;
}

