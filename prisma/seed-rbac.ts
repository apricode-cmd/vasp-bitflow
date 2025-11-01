/**
 * Seed Script для RBAC (Roles, Permissions, RolePermissions)
 * 
 * Создает:
 * - Стандартные роли (SUPER_ADMIN, ADMIN, COMPLIANCE, TREASURY_APPROVER, FINANCE, SUPPORT, READ_ONLY)
 * - Детальные права (permissions) по категориям
 * - Привязку прав к ролям (role-permission matrix)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// PERMISSIONS (Детальные права)
// ============================================

const PERMISSIONS = [
  // ORDERS
  { code: 'orders:read', name: 'View Orders', resource: 'orders', action: 'read', category: 'orders', description: 'View order details' },
  { code: 'orders:create', name: 'Create Orders', resource: 'orders', action: 'create', category: 'orders', description: 'Create new orders' },
  { code: 'orders:update', name: 'Update Orders', resource: 'orders', action: 'update', category: 'orders', description: 'Update order details' },
  { code: 'orders:cancel', name: 'Cancel Orders', resource: 'orders', action: 'cancel', category: 'orders', description: 'Cancel draft/pending orders' },
  { code: 'orders:delete', name: 'Delete Orders', resource: 'orders', action: 'delete', category: 'orders', description: 'Delete orders (SUPER_ADMIN only)' },
  { code: 'orders:process', name: 'Process Orders', resource: 'orders', action: 'process', category: 'orders', description: 'Process and complete orders' },

  // KYC
  { code: 'kyc:read', name: 'View KYC Data', resource: 'kyc', action: 'read', category: 'kyc', description: 'View KYC verification data' },
  { code: 'kyc:approve', name: 'Approve KYC', resource: 'kyc', action: 'approve', category: 'kyc', description: 'Approve KYC verification' },
  { code: 'kyc:reject', name: 'Reject KYC', resource: 'kyc', action: 'reject', category: 'kyc', description: 'Reject KYC verification' },
  { code: 'kyc:resubmit', name: 'Request KYC Resubmission', resource: 'kyc', action: 'resubmit', category: 'kyc', description: 'Request user to resubmit KYC' },
  { code: 'kyc:delete', name: 'Delete KYC Data', resource: 'kyc', action: 'delete', category: 'kyc', description: 'Delete KYC data (SUPER_ADMIN only)' },
  { code: 'kyc:export', name: 'Export KYC Data', resource: 'kyc', action: 'export', category: 'kyc', description: 'Export KYC data for compliance checks' },

  // FINANCE
  { code: 'finance:read', name: 'View Financial Data', resource: 'finance', action: 'read', category: 'finance', description: 'View financial reports and data' },
  { code: 'finance:process', name: 'Process Payments', resource: 'finance', action: 'process', category: 'finance', description: 'Create and process payments' },
  { code: 'finance:approve', name: 'Approve Payouts', resource: 'finance', action: 'approve', category: 'finance', description: 'Approve payouts (requires Step-up MFA)' },
  { code: 'finance:reconcile', name: 'Reconcile Payments', resource: 'finance', action: 'reconcile', category: 'finance', description: 'Reconcile payment transactions' },
  { code: 'finance:bank_accounts', name: 'Manage Bank Accounts', resource: 'finance', action: 'bank_accounts', category: 'finance', description: 'Manage bank account details' },
  { code: 'finance:reports', name: 'Generate Finance Reports', resource: 'finance', action: 'reports', category: 'finance', description: 'Generate financial reports' },

  // PAYOUTS (Детальные права для выплат)
  { code: 'payouts:read', name: 'View Payouts', resource: 'payouts', action: 'read', category: 'finance', description: 'View payout requests' },
  { code: 'payouts:create', name: 'Create Payouts', resource: 'payouts', action: 'create', category: 'finance', description: 'Create payout requests' },
  { code: 'payouts:approve', name: 'Approve Payouts', resource: 'payouts', action: 'approve', category: 'finance', description: 'Approve payout requests (requires Step-up MFA)' },
  { code: 'payouts:reject', name: 'Reject Payouts', resource: 'payouts', action: 'reject', category: 'finance', description: 'Reject payout requests' },
  { code: 'payouts:execute', name: 'Execute Payouts', resource: 'payouts', action: 'execute', category: 'finance', description: 'Execute approved payouts' },

  // USERS
  { code: 'users:read', name: 'View Users', resource: 'users', action: 'read', category: 'users', description: 'View user profiles' },
  { code: 'users:create', name: 'Create Users', resource: 'users', action: 'create', category: 'users', description: 'Create new users' },
  { code: 'users:update', name: 'Update Users', resource: 'users', action: 'update', category: 'users', description: 'Update user details' },
  { code: 'users:update_contact', name: 'Update User Contacts', resource: 'users', action: 'update_contact', category: 'users', description: 'Update user contact information' },
  { code: 'users:suspend', name: 'Suspend Users', resource: 'users', action: 'suspend', category: 'users', description: 'Suspend user accounts' },
  { code: 'users:delete', name: 'Delete Users', resource: 'users', action: 'delete', category: 'users', description: 'Delete user accounts (SUPER_ADMIN only)' },
  { code: 'users:impersonate', name: 'Impersonate Users', resource: 'users', action: 'impersonate', category: 'users', description: 'Login as user (SUPER_ADMIN only, requires Step-up MFA)' },

  // ADMINS
  { code: 'admins:read', name: 'View Admins', resource: 'admins', action: 'read', category: 'admins', description: 'View administrator profiles' },
  { code: 'admins:create', name: 'Create Admins', resource: 'admins', action: 'create', category: 'admins', description: 'Create new administrators' },
  { code: 'admins:update', name: 'Update Admins', resource: 'admins', action: 'update', category: 'admins', description: 'Update administrator details' },
  { code: 'admins:change_role', name: 'Change Admin Role', resource: 'admins', action: 'change_role', category: 'admins', description: 'Change administrator role (SUPER_ADMIN only, requires Step-up MFA)' },
  { code: 'admins:suspend', name: 'Suspend Admins', resource: 'admins', action: 'suspend', category: 'admins', description: 'Suspend administrator accounts' },
  { code: 'admins:delete', name: 'Delete Admins', resource: 'admins', action: 'delete', category: 'admins', description: 'Delete administrator accounts (SUPER_ADMIN only)' },
  { code: 'admins:revoke_session', name: 'Revoke Admin Sessions', resource: 'admins', action: 'revoke_session', category: 'admins', description: 'Revoke active sessions of other admins' },

  // SETTINGS
  { code: 'settings:read', name: 'View Settings', resource: 'settings', action: 'read', category: 'settings', description: 'View system settings' },
  { code: 'settings:update', name: 'Update Settings', resource: 'settings', action: 'update', category: 'settings', description: 'Update tenant settings' },
  { code: 'settings:system', name: 'Manage System Settings', resource: 'settings', action: 'system', category: 'settings', description: 'Manage system-wide settings (SUPER_ADMIN only)' },
  { code: 'settings:integrations', name: 'Manage Integrations', resource: 'settings', action: 'integrations', category: 'settings', description: 'Configure external integrations (SUPER_ADMIN only)' },
  { code: 'settings:limits', name: 'Manage Limits', resource: 'settings', action: 'limits', category: 'settings', description: 'Configure trading limits (SUPER_ADMIN only, requires Step-up MFA)' },

  // API KEYS
  { code: 'api_keys:read', name: 'View API Keys', resource: 'api_keys', action: 'read', category: 'api', description: 'View API key details' },
  { code: 'api_keys:create', name: 'Create API Keys', resource: 'api_keys', action: 'create', category: 'api', description: 'Create new API keys (requires Step-up MFA)' },
  { code: 'api_keys:revoke', name: 'Revoke API Keys', resource: 'api_keys', action: 'revoke', category: 'api', description: 'Revoke API keys (requires Step-up MFA)' },
  { code: 'api_keys:delete', name: 'Delete API Keys', resource: 'api_keys', action: 'delete', category: 'api', description: 'Delete API keys (SUPER_ADMIN only)' },

  // AUDIT
  { code: 'audit:read', name: 'View Audit Logs', resource: 'audit', action: 'read', category: 'audit', description: 'View audit logs' },
  { code: 'audit:export', name: 'Export Audit Logs', resource: 'audit', action: 'export', category: 'audit', description: 'Export audit logs (CSV/JSON)' },
  { code: 'audit:delete', name: 'Delete Audit Logs', resource: 'audit', action: 'delete', category: 'audit', description: 'Delete old audit logs (SUPER_ADMIN only)' },

  // INTEGRATIONS
  { code: 'integrations:read', name: 'View Integrations', resource: 'integrations', action: 'read', category: 'integrations', description: 'View integration status' },
  { code: 'integrations:update', name: 'Update Integrations', resource: 'integrations', action: 'update', category: 'integrations', description: 'Update integration settings (SUPER_ADMIN only)' },
  { code: 'integrations:test', name: 'Test Integrations', resource: 'integrations', action: 'test', category: 'integrations', description: 'Test integration connections' },

  // REPORTS
  { code: 'reports:read', name: 'View Reports', resource: 'reports', action: 'read', category: 'reports', description: 'View generated reports' },
  { code: 'reports:generate', name: 'Generate Reports', resource: 'reports', action: 'generate', category: 'reports', description: 'Generate new reports' },
  { code: 'reports:export', name: 'Export Reports', resource: 'reports', action: 'export', category: 'reports', description: 'Export reports' },
  { code: 'reports:schedule', name: 'Schedule Reports', resource: 'reports', action: 'schedule', category: 'reports', description: 'Configure scheduled reports' },
];

// ============================================
// ROLES (Стандартные роли)
// ============================================

const ROLES = [
  {
    code: 'SUPER_ADMIN',
    name: 'Super Administrator',
    description: 'Full system access. Manage tenants, roles, limits, integrations, API keys, approve payouts.',
    isSystem: true,
    priority: 100,
  },
  {
    code: 'ADMIN',
    name: 'Administrator',
    description: 'Manage clients and orders within tenant. No access to global settings.',
    isSystem: true,
    priority: 90,
  },
  {
    code: 'COMPLIANCE',
    name: 'Compliance Officer',
    description: 'KYC/KYB data management, approve/reject verifications, AML cases, STR/SAR submission.',
    isSystem: true,
    priority: 80,
  },
  {
    code: 'TREASURY',
    name: 'Treasury Approver',
    description: 'Review and approve payouts (4-eyes principle). No access to KYC data.',
    isSystem: true,
    priority: 70,
  },
  {
    code: 'FINANCE',
    name: 'Finance Manager',
    description: 'Bank account management, reconciliation. No access to KYC data.',
    isSystem: true,
    priority: 60,
  },
  {
    code: 'SUPPORT',
    name: 'Support Agent',
    description: 'Read-only access with limited actions (update contacts, cancel draft orders).',
    isSystem: true,
    priority: 50,
  },
  {
    code: 'READ_ONLY',
    name: 'Read Only',
    description: 'View-only access for auditors. No modification rights.',
    isSystem: true,
    priority: 10,
  },
];

// ============================================
// ROLE-PERMISSION MATRIX
// ============================================

const ROLE_PERMISSIONS = {
  SUPER_ADMIN: [
    // Full access to everything
    'orders:read', 'orders:create', 'orders:update', 'orders:cancel', 'orders:delete', 'orders:process',
    'kyc:read', 'kyc:approve', 'kyc:reject', 'kyc:resubmit', 'kyc:delete', 'kyc:export',
    'finance:read', 'finance:process', 'finance:approve', 'finance:reconcile', 'finance:bank_accounts', 'finance:reports',
    'payouts:read', 'payouts:create', 'payouts:approve', 'payouts:reject', 'payouts:execute',
    'users:read', 'users:create', 'users:update', 'users:update_contact', 'users:suspend', 'users:delete', 'users:impersonate',
    'admins:read', 'admins:create', 'admins:update', 'admins:change_role', 'admins:suspend', 'admins:delete', 'admins:revoke_session',
    'settings:read', 'settings:update', 'settings:system', 'settings:integrations', 'settings:limits',
    'api_keys:read', 'api_keys:create', 'api_keys:revoke', 'api_keys:delete',
    'audit:read', 'audit:export', 'audit:delete',
    'integrations:read', 'integrations:update', 'integrations:test',
    'reports:read', 'reports:generate', 'reports:export', 'reports:schedule',
  ],
  
  ADMIN: [
    'orders:read', 'orders:create', 'orders:update', 'orders:cancel', 'orders:process',
    'kyc:read', 'kyc:export',
    'users:read', 'users:create', 'users:update', 'users:suspend',
    'admins:read', 'admins:create',
    'settings:read', 'settings:update',
    'api_keys:read', 'api_keys:create', 'api_keys:revoke',
    'audit:read', 'audit:export',
    'reports:read', 'reports:generate', 'reports:export',
  ],
  
  COMPLIANCE: [
    'orders:read',
    'kyc:read', 'kyc:approve', 'kyc:reject', 'kyc:resubmit', 'kyc:export',
    'users:read',
    'settings:read',
    'audit:read', 'audit:export',
    'reports:read', 'reports:generate', 'reports:export',
  ],
  
  TREASURY: [
    'orders:read',
    'finance:read', 'finance:approve',
    'payouts:read', 'payouts:approve', 'payouts:reject',
    'settings:read',
    'audit:read',
    'reports:read',
  ],
  
  FINANCE: [
    'orders:read',
    'finance:read', 'finance:process', 'finance:reconcile', 'finance:bank_accounts', 'finance:reports',
    'payouts:read', 'payouts:create',
    'settings:read',
    'audit:read',
    'reports:read', 'reports:generate', 'reports:export',
  ],
  
  SUPPORT: [
    'orders:read', 'orders:cancel',
    'kyc:read',
    'users:read', 'users:update_contact',
    'settings:read',
    'reports:read',
  ],
  
  READ_ONLY: [
    'orders:read',
    'kyc:read',
    'finance:read',
    'payouts:read',
    'users:read',
    'admins:read',
    'settings:read',
    'api_keys:read',
    'audit:read', 'audit:export',
    'integrations:read',
    'reports:read',
  ],
};

// ============================================
// SEED FUNCTIONS
// ============================================

async function seedPermissions() {
  console.log('📋 Seeding Permissions...');
  
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        name: permission.name,
        description: permission.description,
      },
      create: {
        ...permission,
        isSystem: true, // All standard permissions are system permissions
      },
    });
  }
  
  console.log(`✅ Seeded ${PERMISSIONS.length} permissions`);
}

async function seedRoles() {
  console.log('👥 Seeding Roles...');
  
  for (const role of ROLES) {
    await prisma.roleModel.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description,
        priority: role.priority,
      },
      create: role,
    });
  }
  
  console.log(`✅ Seeded ${ROLES.length} roles`);
}

async function seedRolePermissions() {
  console.log('🔗 Seeding Role-Permission associations...');
  
  let totalAssociations = 0;
  
  for (const [roleCode, permissionCodes] of Object.entries(ROLE_PERMISSIONS)) {
    // Delete existing associations for this role (clean slate)
    await prisma.rolePermission.deleteMany({
      where: { roleCode },
    });
    
    // Create new associations
    for (const permissionCode of permissionCodes) {
      await prisma.rolePermission.create({
        data: {
          roleCode,
          permissionCode,
        },
      });
      totalAssociations++;
    }
    
    console.log(`  ✅ ${roleCode}: ${permissionCodes.length} permissions`);
  }
  
  console.log(`✅ Seeded ${totalAssociations} role-permission associations`);
}

async function updateExistingAdmins() {
  console.log('🔄 Updating existing Admin records with roleCode...');
  
  // Get all admins without roleCode
  const admins = await prisma.admin.findMany({
    where: {
      OR: [
        { roleCode: null },
        { roleCode: '' },
      ],
    },
  });
  
  for (const admin of admins) {
    // Map legacy enum role to new roleCode
    const roleCodeMap: Record<string, string> = {
      'SUPER_ADMIN': 'SUPER_ADMIN',
      'ADMIN': 'ADMIN',
      'COMPLIANCE': 'COMPLIANCE',
      'TREASURY_APPROVER': 'TREASURY',
      'FINANCE': 'FINANCE',
      'SUPPORT': 'SUPPORT',
      'READ_ONLY': 'READ_ONLY',
    };
    
    const newRoleCode = roleCodeMap[admin.role] || 'ADMIN';
    
    await prisma.admin.update({
      where: { id: admin.id },
      data: { roleCode: newRoleCode },
    });
  }
  
  console.log(`✅ Updated ${admins.length} admin records with roleCode`);
}

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function main() {
  console.log('🌱 Starting RBAC seed...\n');
  
  try {
    // 1. Seed Permissions
    await seedPermissions();
    console.log('');
    
    // 2. Seed Roles
    await seedRoles();
    console.log('');
    
    // 3. Seed Role-Permission associations
    await seedRolePermissions();
    console.log('');
    
    // 4. Update existing admins
    await updateExistingAdmins();
    console.log('');
    
    console.log('🎉 RBAC seed completed successfully!');
  } catch (error) {
    console.error('❌ Error during RBAC seed:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

