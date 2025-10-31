/**
 * Seed Roles and Permissions
 * 
 * Creates all roles and their permissions according to IAM plan
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define all permissions
const permissions = [
  // Orders Management
  { code: 'orders:read', name: 'View Orders', resource: 'orders', action: 'read', category: 'Orders', description: 'View all orders' },
  { code: 'orders:create', name: 'Create Orders', resource: 'orders', action: 'create', category: 'Orders', description: 'Create new orders' },
  { code: 'orders:update', name: 'Update Orders', resource: 'orders', action: 'update', category: 'Orders', description: 'Update order details' },
  { code: 'orders:delete', name: 'Delete Orders', resource: 'orders', action: 'delete', category: 'Orders', description: 'Delete orders' },
  { code: 'orders:approve', name: 'Approve Orders', resource: 'orders', action: 'approve', category: 'Orders', description: 'Approve pending orders' },
  { code: 'orders:cancel', name: 'Cancel Orders', resource: 'orders', action: 'cancel', category: 'Orders', description: 'Cancel orders' },

  // KYC Management
  { code: 'kyc:read', name: 'View KYC', resource: 'kyc', action: 'read', category: 'KYC', description: 'View KYC data' },
  { code: 'kyc:approve', name: 'Approve KYC', resource: 'kyc', action: 'approve', category: 'KYC', description: 'Approve KYC applications' },
  { code: 'kyc:reject', name: 'Reject KYC', resource: 'kyc', action: 'reject', category: 'KYC', description: 'Reject KYC applications' },
  { code: 'kyc:request_docs', name: 'Request Documents', resource: 'kyc', action: 'request_docs', category: 'KYC', description: 'Request additional documents' },
  { code: 'kyc:view_documents', name: 'View Documents', resource: 'kyc', action: 'view_documents', category: 'KYC', description: 'View uploaded documents' },

  // AML Compliance
  { code: 'aml:read', name: 'View AML Cases', resource: 'aml', action: 'read', category: 'AML', description: 'View AML cases' },
  { code: 'aml:create_case', name: 'Create AML Case', resource: 'aml', action: 'create_case', category: 'AML', description: 'Create AML investigation case' },
  { code: 'aml:submit_str', name: 'Submit STR/SAR', resource: 'aml', action: 'submit_str', category: 'AML', description: 'Submit Suspicious Transaction Report' },
  { code: 'aml:flag_suspicious', name: 'Flag Suspicious', resource: 'aml', action: 'flag_suspicious', category: 'AML', description: 'Flag suspicious activities' },

  // Payouts (Critical - requires Step-up MFA)
  { code: 'payouts:read', name: 'View Payouts', resource: 'payouts', action: 'read', category: 'Treasury', description: 'View payout requests' },
  { code: 'payouts:create', name: 'Create Payouts', resource: 'payouts', action: 'create', category: 'Treasury', description: 'Create payout requests' },
  { code: 'payouts:approve', name: 'Approve Payouts', resource: 'payouts', action: 'approve', category: 'Treasury', description: '✨ Approve payouts (Step-up MFA required)' },
  { code: 'payouts:execute', name: 'Execute Payouts', resource: 'payouts', action: 'execute', category: 'Treasury', description: 'Execute approved payouts' },

  // Users Management
  { code: 'users:read', name: 'View Users', resource: 'users', action: 'read', category: 'Users', description: 'View user profiles' },
  { code: 'users:update', name: 'Update Users', resource: 'users', action: 'update', category: 'Users', description: 'Update user information' },
  { code: 'users:suspend', name: 'Suspend Users', resource: 'users', action: 'suspend', category: 'Users', description: 'Suspend user accounts' },
  { code: 'users:delete', name: 'Delete Users', resource: 'users', action: 'delete', category: 'Users', description: 'Delete user accounts' },
  { code: 'users:impersonate', name: 'Impersonate Users', resource: 'users', action: 'impersonate', category: 'Users', description: '✨ Login as user (SUPER_ADMIN only)' },

  // Admins Management
  { code: 'admins:read', name: 'View Admins', resource: 'admins', action: 'read', category: 'Admins', description: 'View admin list' },
  { code: 'admins:create', name: 'Create Admins', resource: 'admins', action: 'create', category: 'Admins', description: 'Create new admins' },
  { code: 'admins:update', name: 'Update Admins', resource: 'admins', action: 'update', category: 'Admins', description: 'Update admin information' },
  { code: 'admins:delete', name: 'Delete Admins', resource: 'admins', action: 'delete', category: 'Admins', description: 'Delete admins' },
  { code: 'admins:change_role', name: 'Change Admin Role', resource: 'admins', action: 'change_role', category: 'Admins', description: '✨ Change admin role (Step-up MFA required)' },

  // Finance
  { code: 'finance:read', name: 'View Finance', resource: 'finance', action: 'read', category: 'Finance', description: 'View financial data' },
  { code: 'finance:bank_accounts', name: 'Manage Bank Accounts', resource: 'finance', action: 'bank_accounts', category: 'Finance', description: 'Manage bank accounts' },
  { code: 'finance:reconcile', name: 'Reconcile Payments', resource: 'finance', action: 'reconcile', category: 'Finance', description: 'Reconcile payments' },
  { code: 'finance:export', name: 'Export Finance Data', resource: 'finance', action: 'export', category: 'Finance', description: 'Export financial reports' },

  // API Keys (Critical)
  { code: 'api_keys:read', name: 'View API Keys', resource: 'api_keys', action: 'read', category: 'API', description: 'View API keys' },
  { code: 'api_keys:create', name: 'Create API Keys', resource: 'api_keys', action: 'create', category: 'API', description: '✨ Create API keys (Step-up MFA required)' },
  { code: 'api_keys:revoke', name: 'Revoke API Keys', resource: 'api_keys', action: 'revoke', category: 'API', description: 'Revoke API keys' },

  // Settings
  { code: 'settings:read', name: 'View Settings', resource: 'settings', action: 'read', category: 'Settings', description: 'View system settings' },
  { code: 'settings:update', name: 'Update Settings', resource: 'settings', action: 'update', category: 'Settings', description: 'Update system settings' },
  { code: 'settings:limits', name: 'Change Limits', resource: 'settings', action: 'limits', category: 'Settings', description: '✨ Change transaction limits (Step-up MFA required)' },
  { code: 'settings:integrations', name: 'Manage Integrations', resource: 'settings', action: 'integrations', category: 'Settings', description: 'Manage third-party integrations' },

  // Audit & Logs
  { code: 'audit:read', name: 'View Audit Logs', resource: 'audit', action: 'read', category: 'Audit', description: 'View audit logs' },
  { code: 'audit:export', name: 'Export Audit Logs', resource: 'audit', action: 'export', category: 'Audit', description: 'Export audit logs' },
  { code: 'sessions:read', name: 'View Sessions', resource: 'sessions', action: 'read', category: 'Security', description: 'View active sessions' },
  { code: 'sessions:terminate', name: 'Terminate Sessions', resource: 'sessions', action: 'terminate', category: 'Security', description: 'Terminate active sessions' },
];

// Define role-permission mappings
const rolePermissions = {
  SUPER_ADMIN: [
    // Full access - all permissions
    ...permissions.map(p => p.code)
  ],
  
  ADMIN: [
    // Orders
    'orders:read', 'orders:create', 'orders:update', 'orders:approve', 'orders:cancel',
    // KYC
    'kyc:read', 'kyc:approve', 'kyc:reject', 'kyc:request_docs', 'kyc:view_documents',
    // Users
    'users:read', 'users:update', 'users:suspend',
    // Finance (read-only)
    'finance:read',
    // Settings (read-only)
    'settings:read',
    // Audit
    'audit:read',
  ],
  
  COMPLIANCE: [
    // KYC (full access)
    'kyc:read', 'kyc:approve', 'kyc:reject', 'kyc:request_docs', 'kyc:view_documents',
    // AML (full access)
    'aml:read', 'aml:create_case', 'aml:submit_str', 'aml:flag_suspicious',
    // Orders (read-only)
    'orders:read',
    // Users (read + suspend)
    'users:read', 'users:suspend',
    // Audit
    'audit:read', 'audit:export',
  ],
  
  TREASURY_APPROVER: [
    // Payouts (full access including approve)
    'payouts:read', 'payouts:approve', 'payouts:execute',
    // Orders (read-only)
    'orders:read',
    // Finance
    'finance:read', 'finance:reconcile', 'finance:export',
    // Audit
    'audit:read',
  ],
  
  FINANCE: [
    // Finance (full access)
    'finance:read', 'finance:bank_accounts', 'finance:reconcile', 'finance:export',
    // Payouts (read + create, not approve)
    'payouts:read', 'payouts:create',
    // Orders (read-only)
    'orders:read',
    // Audit
    'audit:read',
  ],
  
  SUPPORT: [
    // Orders (read + update)
    'orders:read', 'orders:update',
    // Users (read + update)
    'users:read', 'users:update',
    // KYC (read-only)
    'kyc:read', 'kyc:view_documents',
    // Settings (read-only)
    'settings:read',
  ],
  
  READ_ONLY: [
    // Everything read-only
    'orders:read',
    'kyc:read', 'kyc:view_documents',
    'aml:read',
    'payouts:read',
    'users:read',
    'finance:read',
    'settings:read',
    'audit:read',
  ]
};

async function seedRolesAndPermissions() {
  console.log('🌱 Seeding roles and permissions...\n');

  try {
    // 1. Create all permissions
    console.log('📝 Creating permissions...');
    for (const perm of permissions) {
      await prisma.permission.upsert({
        where: { code: perm.code },
        update: {
          name: perm.name,
          description: perm.description
        },
        create: {
          code: perm.code,
          name: perm.name,
          resource: perm.resource,
          action: perm.action,
          description: perm.description,
          category: perm.category,
          isSystem: true
        }
      });
    }
    console.log(`✅ Created/updated ${permissions.length} permissions\n`);

    // 2. Create all roles
    console.log('👥 Creating roles...');
    const roles = [
      { code: 'SUPER_ADMIN', name: 'Super Administrator', description: 'Full system access', priority: 100 },
      { code: 'ADMIN', name: 'Administrator', description: 'Manage clients and orders', priority: 90 },
      { code: 'COMPLIANCE', name: 'Compliance Officer', description: 'KYC/AML management', priority: 80 },
      { code: 'TREASURY_APPROVER', name: 'Treasury Approver', description: 'Approve payouts (4-eyes)', priority: 85 },
      { code: 'FINANCE', name: 'Finance Manager', description: 'Financial operations', priority: 70 },
      { code: 'SUPPORT', name: 'Support Agent', description: 'Customer support', priority: 50 },
      { code: 'READ_ONLY', name: 'Read Only', description: 'View-only access', priority: 10 },
    ];

    for (const role of roles) {
      await prisma.roleModel.upsert({
        where: { code: role.code },
        update: {
          name: role.name,
          description: role.description,
          priority: role.priority
        },
        create: {
          code: role.code,
          name: role.name,
          description: role.description,
          isSystem: true,
          isActive: true,
          priority: role.priority
        }
      });
    }
    console.log(`✅ Created/updated ${roles.length} roles\n`);

    // 3. Assign permissions to roles
    console.log('🔗 Assigning permissions to roles...');
    for (const [roleCode, permCodes] of Object.entries(rolePermissions)) {
      // Delete existing permissions for this role
      await prisma.rolePermission.deleteMany({
        where: { roleCode }
      });

      // Create new permissions
      for (const permCode of permCodes) {
        await prisma.rolePermission.create({
          data: {
            roleCode,
            permissionCode: permCode
          }
        });
      }
      console.log(`  ✅ ${roleCode}: ${permCodes.length} permissions`);
    }

    // 4. Summary
    console.log('\n📊 Summary:');
    const totalRoles = await prisma.roleModel.count();
    const totalPermissions = await prisma.permission.count();
    const totalRolePermissions = await prisma.rolePermission.count();

    console.log(`  - Roles: ${totalRoles}`);
    console.log(`  - Permissions: ${totalPermissions}`);
    console.log(`  - Role-Permission mappings: ${totalRolePermissions}`);

    console.log('\n✅ Roles and permissions seeded successfully!');
  } catch (error) {
    console.error('❌ Failed to seed roles and permissions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed
seedRolesAndPermissions()
  .then(() => {
    console.log('\n🎉 Seed script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seed script failed:', error);
    process.exit(1);
  });

