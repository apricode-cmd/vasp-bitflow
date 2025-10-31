/**
 * NextAuth v5 Configuration - ADMIN
 * 
 * Authentication for administrators (Admin table)
 * Supports: Passkeys (WebAuthn) + Password + TOTP + SSO
 */

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { loginSchema } from '@/lib/validations/auth';
// import { verifyAdminPasskey } from '@/lib/services/passkey.service'; // TODO: implement
import { verifyUserTotp } from '@/lib/services/totp.service';
import UAParser from 'ua-parser-js';

export const { 
  handlers: adminHandlers, 
  signIn: adminSignIn, 
  signOut: adminSignOut, 
  auth: getAdminSession 
} = NextAuth({
  providers: [
    // Provider 1: Passkeys (WebAuthn) - PRIMARY
    Credentials({
      id: 'passkey',
      name: 'Passkey',
      credentials: {
        email: { label: 'Email', type: 'email' },
        passkeyResponse: { label: 'Passkey Response', type: 'text' }
      },
      async authorize(credentials) {
        try {
          // TODO: Implement passkey verification
          // const admin = await verifyAdminPasskey(
          //   credentials.email as string,
          //   JSON.parse(credentials.passkeyResponse as string)
          // );
          
          // Temporary: return null to skip passkey for now
          console.log('Passkey auth not yet implemented');
          return null;
        } catch (error) {
          console.error('Passkey auth error:', error);
          return null;
        }
      }
    }),

    // Provider 2: Password + TOTP (FALLBACK)
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        twoFactorCode: { label: '2FA Code', type: 'text' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const validatedData = loginSchema.parse({
            email: credentials.email,
            password: credentials.password
          });

          // Find admin in Admin table
          const admin = await prisma.admin.findUnique({
            where: { email: validatedData.email },
            select: {
              id: true,
              email: true,
              password: true,
              role: true,
              isActive: true,
              isSuspended: true,
              authMethod: true,
              twoFactorAuth: {
                select: {
                  totpEnabled: true,
                  webAuthnEnabled: true,
                  webAuthnRequired: true
                }
              }
            }
          });

          if (!admin || !admin.isActive || admin.isSuspended) {
            return null;
          }

          // Check if password is set (might be SSO-only account)
          if (!admin.password) {
            console.log('Admin has no password set (SSO-only):', admin.email);
            return null;
          }

          // Verify password
          const isValid = await bcrypt.compare(
            validatedData.password,
            admin.password
          );

          if (!isValid) {
            return null;
          }

          // Check if 2FA is enabled
          const has2FA = admin.twoFactorAuth?.totpEnabled === true;

          if (has2FA) {
            const twoFactorCode = credentials.twoFactorCode as string | undefined;

            if (!twoFactorCode) {
              console.log('2FA required for admin:', admin.email);
              return null;
            }

            // Verify TOTP code (reuse existing service, but pass adminId)
            // TODO: Create separate verifyAdminTotp service
            const { success } = await verifyUserTotp(
              admin.id,
              admin.email,
              twoFactorCode
            );

            if (!success) {
              console.log('Invalid 2FA code for admin:', admin.email);
              return null;
            }
          }

          return {
            id: admin.id,
            email: admin.email,
            role: admin.role,
            authMethod: 'PASSWORD'
          };
        } catch (error: any) {
          console.error('Admin auth error:', error);
          return null;
        }
      }
    })

    // TODO: Add SSO providers (Google Workspace, Azure AD)
    // GoogleWorkspace({...}),
    // AzureAD({...})
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
    maxAge: 8 * 60 * 60, // 8 hours for admins
    updateAge: 15 * 60, // Update every 15 minutes
  },

  cookies: {
    sessionToken: {
      name: 'admin.session-token', // SEPARATE cookie for admins!
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/admin', // Only for /admin paths
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },

  secret: process.env.NEXTAUTH_SECRET
});

