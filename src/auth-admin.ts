/**
 * NextAuth v5 Configuration - ADMIN
 * 
 * Production-ready Passwordless authentication for administrators
 * - Passkeys (WebAuthn/FIDO2) via OTAT - PRIMARY
 * - SSO (Google Workspace / Azure AD) - TODO
 * 
 * Uses One-Time Authentication Token (OTAT) for secure session creation
 * 
 * Compliant with: PSD2/SCA, DORA, AML best practices
 */

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';

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

    // NOTE: Password authentication REMOVED
    // Regular admins CANNOT use passwords
    // Break-glass emergency access uses separate endpoint: /api/admin/auth/emergency
    
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

          // TODO: Create AdminSession record
          // await createAdminSession(user.id, request);

          return true;
        } catch (error) {
          console.error('Failed to process admin signIn:', error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.authMethod = user.authMethod || account?.provider || 'PASSWORD';
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.authMethod = token.authMethod as string;

        // TODO: Check session validity (idle + max duration)
        // await checkAdminSessionValidity(token.sessionToken);
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
    maxAge: 30 * 24 * 60 * 60, // 30 days for admins (like regular sessions)
    updateAge: 24 * 60 * 60, // Update once per day
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

