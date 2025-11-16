/**
 * NextAuth v5 Configuration - ADMIN
 * 
 * Production-ready authentication for administrators
 * - Passkeys (WebAuthn/FIDO2) via OTAT - PRIMARY (Recommended)
 * - Password + TOTP - OPTIONAL (Feature flag controlled, disabled by default)
 * - SSO (Google Workspace / Azure AD) - TODO
 * 
 * Uses One-Time Authentication Token (OTAT) for secure session creation with Passkeys
 * Password + TOTP is only available if enabled by SUPER_ADMIN in system settings
 * 
 * Compliant with: PSD2/SCA, DORA, AML best practices
 */

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { isPasswordAuthEnabledForRole } from '@/lib/features/admin-auth-features';
import { verifyPassword } from '@/lib/auth-utils';
import { verifyTotpCode } from '@/lib/services/totp.service';
import { decrypt } from '@/lib/services/encryption.service';
import { validateAndUpdateSession, createSessionRecord } from '@/lib/services/admin-session-tracker.service';
import { headers } from 'next/headers';

export const { 
  handlers: adminHandlers, 
  signIn: adminSignIn, 
  signOut: adminSignOut, 
  auth: getAdminSession 
} = NextAuth({
  basePath: '/api/admin/auth', // CRITICAL: Tell NextAuth where the API route is
  providers: [
    // Provider: One-Time Authentication Token (after Passkey verification)
    Credentials({
      id: 'credentials', // Use default credentials id for NextAuth compatibility
      name: 'One-Time Token',
      credentials: {
        email: { label: 'Email', type: 'email' },
        token: { label: 'Token', type: 'text' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.token) {
            return null;
          }

          // Find and validate One-Time Authentication Token
          const otat = await prisma.oneTimeAuthToken.findUnique({
            where: { token: credentials.token as string },
            include: { 
              admin: {
                select: {
                  id: true,
                  email: true,
                  role: true,
                  firstName: true,
                  lastName: true,
                  isActive: true,
                  isSuspended: true,
                }
              } 
            },
          });

          if (!otat) {
            return null;
          }

          // Check if already used
          if (otat.usedAt) {
            return null;
          }

          // Check if expired
          const now = new Date();
          if (otat.expiresAt < now) {
            // Clean up expired token
            await prisma.oneTimeAuthToken.delete({ where: { id: otat.id } });
            return null;
          }

          // Check email matches
          if (otat.admin.email !== credentials.email) {
            return null;
          }

          // Check admin is active
          if (!otat.admin.isActive || otat.admin.isSuspended) {
            return null;
          }

          // Mark OTAT as used (one-time use only!)
          await prisma.oneTimeAuthToken.update({
            where: { id: otat.id },
            data: { 
              usedAt: new Date(),
              usedFrom: 'nextauth-authorize',
            },
          });

          // Return admin user for session
          return {
            id: otat.admin.id,
            email: otat.admin.email,
            role: otat.admin.role,
            name: `${otat.admin.firstName} ${otat.admin.lastName}`,
            authMethod: 'PASSKEY',
          };
        } catch (error) {
          // Log only critical errors in production
          if (process.env.NODE_ENV === 'development') {
            console.error('Admin authorize error:', error);
          }
          return null;
        }
      }
    }),

    // Provider: Password + TOTP (optional, controlled by feature flag)
    Credentials({
      id: 'password-totp',
      name: 'Password + TOTP',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        totpCode: { label: 'TOTP Code', type: 'text' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password || !credentials?.totpCode) {
            console.error('❌ [PasswordTOTP] Missing credentials');
            return null;
          }

          console.log('🔐 [PasswordTOTP] Auth attempt for:', credentials.email);

          // 1. Find admin
          const admin = await prisma.admin.findFirst({
            where: {
              OR: [
                { email: credentials.email as string },
                { workEmail: credentials.email as string }
              ],
              isActive: true,
              isSuspended: false
            },
            include: {
              twoFactorAuth: true
            }
          });

          if (!admin) {
            console.error('❌ [PasswordTOTP] Admin not found:', credentials.email);
            return null;
          }

          // 2. ✅ CHECK FEATURE FLAG
          const passwordAuthAllowed = await isPasswordAuthEnabledForRole(admin.role);
          
          if (!passwordAuthAllowed) {
            console.error('❌ [PasswordTOTP] Feature disabled for role:', admin.role);
            return null;
          }

          // 3. Verify password
          if (!admin.password) {
            console.error('❌ [PasswordTOTP] Admin has no password:', admin.email || admin.workEmail);
            return null;
          }

          const passwordValid = await verifyPassword(
            credentials.password as string,
            admin.password
          );

          if (!passwordValid) {
            console.error('❌ [PasswordTOTP] Invalid password for:', admin.email || admin.workEmail);
            return null;
          }

          // 4. Verify TOTP
          if (!admin.twoFactorAuth?.totpEnabled || !admin.twoFactorAuth?.totpSecret) {
            console.error('❌ [PasswordTOTP] TOTP not configured for:', admin.email || admin.workEmail);
            return null;
          }

          // Decrypt TOTP secret
          const decryptedSecret = decrypt(admin.twoFactorAuth.totpSecret);

          const totpValid = verifyTotpCode(
            decryptedSecret,
            admin.email || admin.workEmail || '',
            credentials.totpCode as string
          );

          if (!totpValid) {
            console.error('❌ [PasswordTOTP] Invalid TOTP for:', admin.email || admin.workEmail);
            return null;
          }

          // 5. Success - update last login
          await prisma.admin.update({
            where: { id: admin.id },
            data: { lastLogin: new Date() }
          });

          // 6. Log authentication
          await prisma.adminAuditLog.create({
            data: {
              adminId: admin.id,
              adminEmail: admin.email || admin.workEmail || '',
              adminRole: admin.role,
              action: 'ADMIN_LOGIN',
              entityId: admin.id,
              entityType: 'Admin',
              severity: 'INFO',
              context: {
                authMethod: 'PASSWORD_TOTP',
                ipAddress: 'unknown',
                userAgent: 'unknown'
              }
            }
          });

          console.log('✅ [PasswordTOTP] Admin authenticated:', admin.email || admin.workEmail);

          return {
            id: admin.id,
            email: admin.email || admin.workEmail,
            role: admin.role,
            name: `${admin.firstName} ${admin.lastName}`,
            authMethod: 'PASSWORD_TOTP',
          };
        } catch (error) {
          console.error('❌ [PasswordTOTP] Auth error:', error);
          return null;
        }
      }
    }),
    
    // TODO: Add SSO providers
    // GoogleWorkspace({ ... }),
    // AzureAD({ ... })
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (user && account?.provider) {
        try {
          // Check if admin is active and not suspended
          const admin = await prisma.admin.findUnique({
            where: { id: user.id },
            select: { isActive: true, isSuspended: true }
          });

          if (!admin?.isActive || admin.isSuspended) {
            return false;
          }

          // Update lastLogin
          await prisma.admin.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          });

          // Create AdminSession record in database
          try {
            const headersList = await headers();
            const ipAddress = headersList.get('x-forwarded-for') || 
                              headersList.get('x-real-ip') || 
                              'unknown';
            const userAgent = headersList.get('user-agent') || 'unknown';
            const country = headersList.get('x-user-country') || null;
            const city = headersList.get('x-user-city') || null;

            await createSessionRecord({
              adminId: user.id,
              sessionId: crypto.randomUUID(),
              ipAddress,
              userAgent,
              country,
              city,
              mfaMethod: account.provider === 'password-totp' ? 'TOTP' : null,
            });

            console.log('✅ Session record created in database (NextAuth)');
          } catch (error) {
            console.error('⚠️ Failed to create session record (non-critical):', error);
          }

          return true;
        } catch (error) {
          console.error('Failed to process admin signIn:', error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.authMethod = user.authMethod || account?.provider || 'PASSWORD';
        // Generate unique session ID for tracking
        token.sessionId = token.sessionId || crypto.randomUUID();
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token.sessionId) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.authMethod = token.authMethod as string;
        session.user.sessionId = token.sessionId as string;

        // ✅ Check session validity (idle + max duration)
        try {
          const validation = await validateAndUpdateSession(token.sessionId as string);
          
          if (!validation.valid) {
            console.warn(`❌ [Auth] Invalid session for ${session.user.email}: ${validation.reason}`);
            // Return null to force logout
            return null as any;
          }
        } catch (error) {
          // If validation fails (e.g., DB error), allow session but log error
          console.error('❌ [Auth] Session validation error:', error);
          // Don't block user if DB is temporarily down
        }
      }
      return session;
    }
  },

  pages: {
    signIn: '/admin/auth/login',
    error: '/admin/auth/login'
  },

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours (TEMPORARY FIX until full session tracking implemented)
    updateAge: 15 * 60, // Update every 15 minutes (check session validity)
  },

  cookies: {
    sessionToken: {
      name: 'next-auth.session-token.admin', // Different name for admins
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/', // MUST be '/' for NextAuth to work properly
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },

  secret: process.env.NEXTAUTH_ADMIN_SECRET || process.env.NEXTAUTH_SECRET
});

