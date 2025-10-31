/**
 * Permission Service
 * 
 * Manages role-based permissions for admins
 * Implements caching for performance
 */

import { prisma } from '@/lib/prisma';
import { AdminRole } from '@prisma/client';

// Cache for permissions (in-memory, можно заменить на Redis в production)
const permissionsCache = new Map<string, Set<string>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps = new Map<string, number>();

/**
 * Get all permissions for a specific role
 */
export async function getRolePermissions(role: AdminRole): Promise<string[]> {
  const cacheKey = `role:${role}`;
  
  // Check cache
  const cached = permissionsCache.get(cacheKey);
  const timestamp = cacheTimestamps.get(cacheKey);
  
  if (cached && timestamp && Date.now() - timestamp < CACHE_TTL) {
    return Array.from(cached);
  }

  // Fetch from DB
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { roleCode: role },
    select: { permissionCode: true }
  });

  const permissions = rolePermissions.map(rp => rp.permissionCode);
  
  // Update cache
  permissionsCache.set(cacheKey, new Set(permissions));
  cacheTimestamps.set(cacheKey, Date.now());

  return permissions;
}

/**
 * Get all permissions for an admin (by admin ID)
 */
export async function getAdminPermissions(adminId: string): Promise<string[]> {
  const cacheKey = `admin:${adminId}`;
  
  // Check cache
  const cached = permissionsCache.get(cacheKey);
  const timestamp = cacheTimestamps.get(cacheKey);
  
  if (cached && timestamp && Date.now() - timestamp < CACHE_TTL) {
    return Array.from(cached);
  }

  // Fetch admin and role
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { role: true, isActive: true, isSuspended: true }
  });

  if (!admin || !admin.isActive || admin.isSuspended) {
    return [];
  }

  // Get role permissions
  const permissions = await getRolePermissions(admin.role);
  
  // Update cache
  permissionsCache.set(cacheKey, new Set(permissions));
  cacheTimestamps.set(cacheKey, Date.now());

  return permissions;
}

/**
 * Check if admin has a specific permission
 */
export async function hasPermission(
  adminId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const permissionCode = `${resource}:${action}`;
  const permissions = await getAdminPermissions(adminId);
  
  return permissions.includes(permissionCode);
}

/**
 * Check if admin has ANY of the specified permissions
 */
export async function hasAnyPermission(
  adminId: string,
  permissionCodes: string[]
): Promise<boolean> {
  const permissions = await getAdminPermissions(adminId);
  const permissionSet = new Set(permissions);
  
  return permissionCodes.some(code => permissionSet.has(code));
}

/**
 * Check if admin has ALL specified permissions
 */
export async function hasAllPermissions(
  adminId: string,
  permissionCodes: string[]
): Promise<boolean> {
  const permissions = await getAdminPermissions(adminId);
  const permissionSet = new Set(permissions);
  
  return permissionCodes.every(code => permissionSet.has(code));
}

/**
 * Check if role has a specific permission
 */
export async function roleHasPermission(
  role: AdminRole,
  resource: string,
  action: string
): Promise<boolean> {
  const permissionCode = `${resource}:${action}`;
  const permissions = await getRolePermissions(role);
  
  return permissions.includes(permissionCode);
}

/**
 * Get full permission details for display
 */
export async function getPermissionDetails(permissionCode: string) {
  return await prisma.permission.findUnique({
    where: { code: permissionCode }
  });
}

/**
 * Get all permissions grouped by category
 */
export async function getAllPermissionsGrouped() {
  const permissions = await prisma.permission.findMany({
    orderBy: [
      { category: 'asc' },
      { name: 'asc' }
    ]
  });

  // Group by category
  const grouped = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>);

  return grouped;
}

/**
 * Clear permissions cache (call after role changes)
 */
export function clearPermissionsCache(adminId?: string, role?: AdminRole) {
  if (adminId) {
    permissionsCache.delete(`admin:${adminId}`);
    cacheTimestamps.delete(`admin:${adminId}`);
  }
  
  if (role) {
    permissionsCache.delete(`role:${role}`);
    cacheTimestamps.delete(`role:${role}`);
  }
  
  if (!adminId && !role) {
    // Clear all cache
    permissionsCache.clear();
    cacheTimestamps.clear();
  }
}

/**
 * Get permissions required for specific action
 * Used to show which permissions are needed
 */
export function getRequiredPermissions(action: string): string[] {
  // Map of common actions to required permissions
  const actionPermissions: Record<string, string[]> = {
    'approve_kyc': ['kyc:approve'],
    'reject_kyc': ['kyc:reject'],
    'approve_payout': ['payouts:approve'], // Step-up MFA required
    'create_api_key': ['api_keys:create'], // Step-up MFA required
    'change_admin_role': ['admins:change_role'], // Step-up MFA required
    'change_limits': ['settings:limits'], // Step-up MFA required
    'suspend_user': ['users:suspend'],
    'submit_str': ['aml:submit_str'],
    'manage_bank_accounts': ['finance:bank_accounts'],
    'terminate_session': ['sessions:terminate'],
    'impersonate_user': ['users:impersonate'], // SUPER_ADMIN only
  };

  return actionPermissions[action] || [];
}

/**
 * Check if action requires Step-up MFA
 */
export function requiresStepUpMfa(permissionCode: string): boolean {
  const stepUpRequired = [
    'payouts:approve',
    'api_keys:create',
    'admins:change_role',
    'settings:limits',
    'users:impersonate',
  ];

  return stepUpRequired.includes(permissionCode);
}

/**
 * Validate admin can perform action (with detailed error)
 */
export async function validatePermission(
  adminId: string,
  resource: string,
  action: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Check if admin exists and is active
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { isActive: true, isSuspended: true, role: true }
  });

  if (!admin) {
    return { allowed: false, reason: 'Admin not found' };
  }

  if (!admin.isActive) {
    return { allowed: false, reason: 'Admin account is inactive' };
  }

  if (admin.isSuspended) {
    return { allowed: false, reason: 'Admin account is suspended' };
  }

  // Check permission
  const hasAccess = await hasPermission(adminId, resource, action);

  if (!hasAccess) {
    return { 
      allowed: false, 
      reason: `Missing permission: ${resource}:${action}` 
    };
  }

  return { allowed: true };
}

export const PermissionService = {
  getRolePermissions,
  getAdminPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  roleHasPermission,
  getPermissionDetails,
  getAllPermissionsGrouped,
  clearPermissionsCache,
  getRequiredPermissions,
  requiresStepUpMfa,
  validatePermission
};

