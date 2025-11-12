/**
 * NextAuth v5 Configuration - CLIENT
 * 
 * Authentication for regular users (CLIENT role)
 * Email + Password + TOTP 2FA
 */

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { loginSchema } from '@/lib/validations/auth';
import { verifyUserTotp } from '@/lib/services/totp.service';
import { securityAuditService } from '@/lib/services/security-audit.service';

console.log('🔐 [AUTH-CLIENT] Initializing NextAuth for CLIENT users...');

export const { 
  handlers: clientHandlers, 
  signIn: clientSignIn, 
  signOut: clientSignOut, 
  auth: getClientSession 
} = NextAuth({
  debug: process.env.NODE_ENV === 'development',
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        twoFactorCode: { label: '2FA Code', type: 'text' }
      },
      async authorize(credentials) {
        try {
          console.log('🔐 [AUTH-CLIENT] authorize called with:', {
            hasEmail: !!credentials?.email,
            hasPassword: !!credentials?.password,
            has2FA: !!credentials?.twoFactorCode,
            emailType: typeof credentials?.email,
            emailPreview: typeof credentials?.email === 'string' ? credentials.email.substring(0, 20) : 'not-string'
          });

          if (!credentials?.email || !credentials?.password) {
            console.log('❌ [AUTH-CLIENT] Missing email or password');
            return null;
          }

          const validatedData = loginSchema.parse({
            email: credentials.email,
            password: credentials.password
          });

          // Find user in database - ONLY CLIENT role
          const user = await prisma.user.findUnique({
            where: { 
              email: validatedData.email,
              role: 'CLIENT' // IMPORTANT: Only allow CLIENT users
            },
            select: {
              id: true,
              email: true,
              password: true,
              role: true,
              isActive: true,
              twoFactorAuth: {
                select: {
                  totpEnabled: true
                }
              }
            }
          });

          // User not found or inactive
          if (!user) {
            await securityAuditService.logFailedLogin(
              validatedData.email,
              'USER_NOT_FOUND',
              'CLIENT'
            );
            return null;
          }

          if (!user.isActive) {
            await securityAuditService.logFailedLogin(
              validatedData.email,
              'ACCOUNT_DISABLED',
              'CLIENT'
            );
            return null;
          }

          // Verify password
          const isValid = await bcrypt.compare(
            validatedData.password,
            user.password
          );

          if (!isValid) {
            await securityAuditService.logFailedLogin(
              validatedData.email,
              'INVALID_PASSWORD',
              'CLIENT'
            );
            return null;
          }

          // Check if 2FA is enabled
          const has2FA = user.twoFactorAuth?.totpEnabled === true;
          console.log('🔐 User 2FA status:', { has2FA, email: user.email });

          if (has2FA) {
            const twoFactorCode = credentials.twoFactorCode as string | undefined;
            console.log('🔐 2FA code provided:', !!twoFactorCode, 'length:', twoFactorCode?.length);

            if (!twoFactorCode) {
              console.log('❌ 2FA required but no code provided for user:', user.email);
              return null;
            }

            // Verify 2FA code
            console.log('🔐 Verifying 2FA code for user:', user.email);
            const { success, message } = await verifyUserTotp(
              user.id,
              user.email,
              twoFactorCode
            );
            console.log('🔐 2FA verification result:', { success, message });

            if (!success) {
              console.log('❌ Invalid 2FA code for user:', user.email);
              await securityAuditService.logFailedLogin(
                user.email,
                'INVALID_2FA',
                'CLIENT'
              );
              return null;
            }
            console.log('✅ 2FA code verified successfully');
          }

          // Success - log it
          await securityAuditService.logSuccessfulLogin(
            user.id,
            user.email,
            'CLIENT'
          );

          return {
            id: user.id,
            email: user.email,
            role: user.role
          };
        } catch (error: any) {
          console.error('❌ [AUTH-CLIENT] Authorization error:', {
            message: error?.message,
            name: error?.name,
            stack: error?.stack?.split('\n')[0]
          });
          return null;
        }
      }
    })
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (user && account?.provider === 'credentials') {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          });
        } catch (error) {
          console.error('Failed to update lastLogin:', error);
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
      }
      return session;
    }
  },

  pages: {
    signIn: '/login',
    error: '/login'
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours for clients
  },

  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },

  secret: process.env.NEXTAUTH_SECRET
});

