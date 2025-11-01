/**
 * Permission Service
 * 
 * Сервис для проверки прав доступа администраторов на основе RBAC (Role-Based Access Control)
 * 
 * @module services/permission
 */

import { prisma } from '@/lib/prisma';

export class PermissionService {
  /**
   * Проверяет, имеет ли администратор определенное право
   * 
   * @param adminId - ID администратора
   * @param resource - Ресурс (orders, kyc, users, settings, etc.)
   * @param action - Действие (read, create, update, delete, approve, etc.)
   * @returns true если право есть, false если нет
   * 
   * @example
   * ```ts
   * const canApproveKYC = await permissionService.hasPermission(
   *   adminId,
   *   'kyc',
   *   'approve'
   * );
   * ```
   */
  async hasPermission(
    adminId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      // Получить админа с его ролью
      const admin = await prisma.admin.findUnique({
        where: { id: adminId },
        select: {
          roleCode: true,
          status: true,
          isActive: true,
          isSuspended: true,
        },
      });

      // Проверить статус админа
      if (!admin) {
        return false;
      }

      if (!admin.isActive || admin.isSuspended || admin.status !== 'ACTIVE') {
        return false;
      }

      if (!admin.roleCode) {
        // Fallback: если roleCode не установлен, нет прав
        return false;
      }

      // Проверить наличие права в роли
      const permission = await prisma.rolePermission.findFirst({
        where: {
          roleCode: admin.roleCode,
          permission: {
            resource,
            action,
          },
        },
        include: {
          permission: true,
        },
      });

      return !!permission;
    } catch (error) {
      console.error('❌ hasPermission error:', error);
      return false;
    }
  }

  /**
   * Проверяет, имеет ли администратор право по коду (например, 'orders:read')
   * 
   * @param adminId - ID администратора
   * @param permissionCode - Код права (формат: resource:action)
   * @returns true если право есть, false если нет
   * 
   * @example
   * ```ts
   * const canRead = await permissionService.hasPermissionByCode(
   *   adminId,
   *   'orders:read'
   * );
   * ```
   */
  async hasPermissionByCode(
    adminId: string,
    permissionCode: string
  ): Promise<boolean> {
    const [resource, action] = permissionCode.split(':');
    
    if (!resource || !action) {
      console.error('❌ Invalid permission code format:', permissionCode);
      return false;
    }

    return this.hasPermission(adminId, resource, action);
  }

  /**
   * Получить все права администратора
   * 
   * @param adminId - ID администратора
   * @returns Массив кодов прав (например, ['orders:read', 'kyc:approve'])
   * 
   * @example
   * ```ts
   * const permissions = await permissionService.getAdminPermissions(adminId);
   * // ['orders:read', 'orders:create', 'kyc:read', ...]
   * ```
   */
  async getAdminPermissions(adminId: string): Promise<string[]> {
    try {
      const admin = await prisma.admin.findUnique({
        where: { id: adminId },
        select: {
          roleCode: true,
          roleModel: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!admin || !admin.roleModel) {
        return [];
      }

      return admin.roleModel.permissions.map(rp => rp.permission.code);
    } catch (error) {
      console.error('❌ getAdminPermissions error:', error);
      return [];
    }
  }

  /**
   * Получить детальную информацию о правах администратора
   * 
   * @param adminId - ID администратора
   * @returns Массив объектов с полной информацией о правах
   */
  async getAdminPermissionsDetailed(adminId: string) {
    try {
      const admin = await prisma.admin.findUnique({
        where: { id: adminId },
        select: {
          roleCode: true,
          roleModel: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!admin || !admin.roleModel) {
        return [];
      }

      return admin.roleModel.permissions.map(rp => ({
        code: rp.permission.code,
        name: rp.permission.name,
        resource: rp.permission.resource,
        action: rp.permission.action,
        category: rp.permission.category,
        description: rp.permission.description,
      }));
    } catch (error) {
      console.error('❌ getAdminPermissionsDetailed error:', error);
      return [];
    }
  }

  /**
   * Требовать наличие права (throw error если нет)
   * Используется в API routes для проверки доступа
   * 
   * @param adminId - ID администратора
   * @param resource - Ресурс
   * @param action - Действие
   * @throws Error если права нет
   * 
   * @example
   * ```ts
   * await permissionService.requirePermission(
   *   session.user.id,
   *   'kyc',
   *   'approve'
   * );
   * // Если права нет, будет выброшена ошибка ForbiddenError
   * ```
   */
  async requirePermission(
    adminId: string,
    resource: string,
    action: string
  ): Promise<void> {
    const allowed = await this.hasPermission(adminId, resource, action);

    if (!allowed) {
      throw new ForbiddenError(
        `Permission denied: ${resource}:${action}`
      );
    }
  }

  /**
   * Проверить множественные права
   * 
   * @param adminId - ID администратора
   * @param permissions - Массив прав для проверки ['orders:read', 'kyc:approve']
   * @returns Объект с результатами проверки каждого права
   * 
   * @example
   * ```ts
   * const checks = await permissionService.checkMultiplePermissions(
   *   adminId,
   *   ['orders:read', 'orders:create', 'kyc:approve']
   * );
   * // { 'orders:read': true, 'orders:create': false, 'kyc:approve': true }
   * ```
   */
  async checkMultiplePermissions(
    adminId: string,
    permissions: string[]
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const permissionCode of permissions) {
      results[permissionCode] = await this.hasPermissionByCode(
        adminId,
        permissionCode
      );
    }

    return results;
  }

  /**
   * Получить все доступные роли
   * 
   * @returns Список всех ролей в системе
   */
  async getAllRoles() {
    return prisma.roleModel.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
      include: {
        _count: {
          select: { permissions: true, admins: true },
        },
      },
    });
  }

  /**
   * Получить детальную информацию о роли
   * 
   * @param roleCode - Код роли
   * @returns Роль с правами
   */
  async getRoleDetails(roleCode: string) {
    return prisma.roleModel.findUnique({
      where: { code: roleCode },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { admins: true },
        },
      },
    });
  }

  /**
   * Получить все доступные права
   * 
   * @param category - Фильтр по категории (опционально)
   * @returns Список всех прав
   */
  async getAllPermissions(category?: string) {
    return prisma.permission.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { resource: 'asc' }, { action: 'asc' }],
    });
  }

  /**
   * Получить права по категориям (сгруппированные)
   * 
   * @returns Объект с правами, сгруппированными по категориям
   */
  async getPermissionsByCategory() {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { resource: 'asc' }, { action: 'asc' }],
    });

    const grouped: Record<string, any[]> = {};

    for (const permission of permissions) {
      if (!grouped[permission.category]) {
        grouped[permission.category] = [];
      }
      grouped[permission.category].push(permission);
    }

    return grouped;
  }
}

/**
 * Custom Error для отказа в доступе
 */
export class ForbiddenError extends Error {
  statusCode = 403;

  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

// Singleton instance
export const permissionService = new PermissionService();
