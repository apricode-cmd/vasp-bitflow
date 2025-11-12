/**
 * NextAuth API Route Handler
 * 
 * Handles all NextAuth authentication requests for CLIENT users.
 */

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { loginSchema } from '@/lib/validations/auth';
import { verifyUserTotp } from '@/lib/services/totp.service';
import { securityAuditService } from '@/lib/services/security-audit.service';

export const runtime = 'nodejs'; // NextAuth v4 requires Node.js runtime

const { handlers } = NextAuth({
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
          const validated = loginSchema.parse(credentials);

          const user = await prisma.user.findUnique({
            where: { email: validated.email },
            include: {
              twoFactorAuth: true,
              kycSession: true,
              profile: true
            }
          });

          if (!user) {
            await securityAuditService.logFailedLogin(validated.email, 'USER_NOT_FOUND');
            return null;
          }

          const isValidPassword = await bcrypt.compare(validated.password, user.password);
          if (!isValidPassword) {
            await securityAuditService.logFailedLogin(validated.email, 'INVALID_PASSWORD', user.id);
            return null;
          }

          if (user.twoFactorAuth?.totpEnabled && validated.twoFactorCode) {
            const isValidTotp = await verifyUserTotp(user.id, validated.twoFactorCode);
            if (!isValidTotp) {
              await securityAuditService.logFailedLogin(validated.email, 'INVALID_2FA', user.id);
              return null;
            }
          }

          await securityAuditService.logSuccessfulLogin(user.id, 'CLIENT');

          return {
            id: user.id,
            email: user.email,
            name: user.profile?.firstName || user.email,
            role: user.role
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
    error: '/login'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  }
});

export const GET = handlers.GET;
export const POST = handlers.POST;

