/**
 * Feature flags for admin authentication
 * 
 * Controls whether administrators can use Password + TOTP
 * as an alternative to Passkey (biometric/security key)
 */

import { prisma } from '@/lib/prisma';
import { AdminRole } from '@prisma/client';

// Cache для performance (обновляется каждые 5 минут)
interface AdminAuthFeaturesCache {
  passwordAuthEnabled: boolean;
  allowedRoles: AdminRole[];
  cachedAt: number;
}

let cachedSettings: AdminAuthFeaturesCache | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get admin auth feature flags
 * 
 * @returns Feature flags with cache
 */
export async function getAdminAuthFeatures(): Promise<AdminAuthFeaturesCache> {
  const now = Date.now();
  
  // Return cached if fresh
  if (cachedSettings && (now - cachedSettings.cachedAt) < CACHE_TTL) {
    return cachedSettings;
  }

  console.log('🔄 [AdminAuthFeatures] Fetching from database (cache miss or expired)');

  // Fetch from database
  const [passwordAuthSetting, allowedRolesSetting] = await Promise.all([
    prisma.systemSettings.findUnique({
      where: { key: 'adminPasswordAuthEnabled' }
    }),
    prisma.systemSettings.findUnique({
      where: { key: 'adminPasswordAuthForRoles' }
    })
  ]);

  // Parse password auth enabled (default: false)
  const passwordAuthEnabled = passwordAuthSetting?.value === 'true';

  // Parse allowed roles (default: ADMIN, SUPPORT, FINANCE)
  let allowedRoles: AdminRole[] = ['ADMIN', 'SUPPORT', 'FINANCE'];
  
  try {
    if (allowedRolesSetting?.value) {
      const parsed = JSON.parse(allowedRolesSetting.value);
      if (Array.isArray(parsed)) {
        allowedRoles = parsed as AdminRole[];
      }
    }
  } catch (error) {
    console.error('❌ [AdminAuthFeatures] Failed to parse adminPasswordAuthForRoles:', error);
    // Use default roles on parse error
  }

  cachedSettings = {
    passwordAuthEnabled,
    allowedRoles,
    cachedAt: now
  };

  console.log('✅ [AdminAuthFeatures] Cached settings:', {
    passwordAuthEnabled,
    allowedRolesCount: allowedRoles.length,
    allowedRoles
  });

  return cachedSettings;
}

/**
 * Check if password auth is enabled for specific admin role
 * 
 * @param role Admin role to check
 * @returns True if Password + TOTP is allowed for this role
 */
export async function isPasswordAuthEnabledForRole(role: AdminRole): Promise<boolean> {
  const features = await getAdminAuthFeatures();
  
  // SUPER_ADMIN always requires Passkey (maximum security)
  if (role === 'SUPER_ADMIN') {
    console.log('🔒 [AdminAuthFeatures] SUPER_ADMIN requires Passkey (Password auth disabled)');
    return false;
  }
  
  const isEnabled = features.passwordAuthEnabled && features.allowedRoles.includes(role);
  
  console.log(`🔍 [AdminAuthFeatures] Password auth for ${role}:`, isEnabled);
  
  return isEnabled;
}

/**
 * Check if password auth is globally enabled
 * 
 * @returns True if feature is enabled system-wide
 */
export async function isPasswordAuthEnabled(): Promise<boolean> {
  const features = await getAdminAuthFeatures();
  return features.passwordAuthEnabled;
}

/**
 * Get list of roles allowed to use password auth
 * 
 * @returns Array of allowed roles (empty if feature disabled)
 */
export async function getAllowedPasswordAuthRoles(): Promise<AdminRole[]> {
  const features = await getAdminAuthFeatures();
  
  if (!features.passwordAuthEnabled) {
    return [];
  }
  
  return features.allowedRoles;
}

/**
 * Clear cache (call after updating settings)
 * 
 * This should be called when adminPasswordAuthEnabled or
 * adminPasswordAuthForRoles settings are updated
 */
export function clearAdminAuthFeaturesCache(): void {
  cachedSettings = null;
  console.log('🗑️  [AdminAuthFeatures] Cache cleared');
}

/**
 * Get cache status (for debugging)
 * 
 * @returns Cache information
 */
export function getCacheStatus(): {
  isCached: boolean;
  cacheAge?: number;
  settings?: AdminAuthFeaturesCache;
} {
  if (!cachedSettings) {
    return { isCached: false };
  }

  const now = Date.now();
  const age = now - cachedSettings.cachedAt;

  return {
    isCached: true,
    cacheAge: age,
    settings: cachedSettings
  };
}

