/**
 * NextAuth v5 Configuration
 * 
 * Centralized auth configuration file for NextAuth v5.
 */

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { loginSchema } from '@/lib/validations/auth';
import { verifyUserTotp } from '@/lib/services/totp.service';
import UAParser from 'ua-parser-js';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        twoFactorCode: { label: '2FA Code', type: 'text' } // Optional 2FA code
      },
      async authorize(credentials) {
        try {
          // Validate credentials format
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          // Validate with Zod schema
          const validatedData = loginSchema.parse({
            email: credentials.email,
            password: credentials.password
          });

          // Find user in database
          const user = await prisma.user.findUnique({
            where: { email: validatedData.email },
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

          // If 2FA is enabled
          if (has2FA) {
            const twoFactorCode = credentials.twoFactorCode as string | undefined;

            // If no 2FA code provided, return special response to trigger 2FA page
            if (!twoFactorCode) {
              throw new Error('2FA_REQUIRED');
            }

            // Verify 2FA code
            const { success } = await verifyUserTotp(
              user.id,
              user.email,
              twoFactorCode
            );

            if (!success) {
              throw new Error('Invalid 2FA code');
            }
          }

          // Return user data (without password)
          return {
            id: user.id,
            email: user.email,
            role: user.role
          };
        } catch (error: any) {
          console.error('Auth error:', error);
          
          // Re-throw 2FA_REQUIRED to handle it in login page
          if (error.message === '2FA_REQUIRED') {
            throw error;
          }
          
          return null;
        }
      }
    })
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (user && account?.provider === 'credentials') {
        try {
          // Get request info from headers (will be available in auth context)
          // Note: We'll need to pass this info from the login API route
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
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET
});

