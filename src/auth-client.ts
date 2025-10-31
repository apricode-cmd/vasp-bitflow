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

export const { 
  handlers: clientHandlers, 
  signIn: clientSignIn, 
  signOut: clientSignOut, 
  auth: getClientSession 
} = NextAuth({
  providers: [
    Credentials({
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

          if (!user || !user.isActive) {
            return null;
          }

          // Verify password
          const isValid = await bcrypt.compare(
            validatedData.password,
            user.password
          );

          if (!isValid) {
            return null;
          }

          // Check if 2FA is enabled
          const has2FA = user.twoFactorAuth?.totpEnabled === true;

          if (has2FA) {
            const twoFactorCode = credentials.twoFactorCode as string | undefined;

            if (!twoFactorCode) {
              console.log('2FA required for user:', user.email);
              return null;
            }

            // Verify 2FA code
            const { success } = await verifyUserTotp(
              user.id,
              user.email,
              twoFactorCode
            );

            if (!success) {
              console.log('Invalid 2FA code for user:', user.email);
              return null;
            }
          }

          return {
            id: user.id,
            email: user.email,
            role: user.role
          };
        } catch (error: any) {
          console.error('Client auth error:', error);
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

