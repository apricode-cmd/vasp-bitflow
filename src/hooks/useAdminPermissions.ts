/**
 * useAdminPermissions Hook
 * 
 * Custom React hook for checking admin permissions on client-side
 * 
 * @example
 * ```tsx
 * const { hasPermission, permissions, loading } = useAdminPermissions();
 * 
 * if (hasPermission('users', 'delete')) {
 *   return <DeleteButton />;
 * }
 * ```
 */

import { useState, useEffect } from 'react';

interface PermissionDetailed {
  code: string;
  name: string;
  resource: string;
  action: string;
  category: string;
  description: string | null;
}

interface UseAdminPermissionsReturn {
  permissions: string[];
  permissionsDetailed: PermissionDetailed[];
  loading: boolean;
  error: string | null;
  hasPermission: (resource: string, action: string) => boolean;
  hasPermissionByCode: (permissionCode: string) => boolean;
  refetch: () => Promise<void>;
}

export function useAdminPermissions(): UseAdminPermissionsReturn {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [permissionsDetailed, setPermissionsDetailed] = useState<PermissionDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/permissions');
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch permissions');
      }

      setPermissions(data.permissions || []);
      setPermissionsDetailed(data.permissionsDetailed || []);
    } catch (err) {
      console.error('❌ Failed to fetch permissions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  /**
   * Check if admin has specific permission
   * 
   * @param resource - Resource name (e.g., 'orders', 'kyc')
   * @param action - Action name (e.g., 'read', 'create', 'delete')
   * @returns true if permission exists, false otherwise
   */
  const hasPermission = (resource: string, action: string): boolean => {
    const permissionCode = `${resource}:${action}`;
    return permissions.includes(permissionCode);
  };

  /**
   * Check if admin has permission by code
   * 
   * @param permissionCode - Permission code (e.g., 'orders:read')
   * @returns true if permission exists, false otherwise
   */
  const hasPermissionByCode = (permissionCode: string): boolean => {
    return permissions.includes(permissionCode);
  };

  return {
    permissions,
    permissionsDetailed,
    loading,
    error,
    hasPermission,
    hasPermissionByCode,
    refetch: fetchPermissions,
  };
}

