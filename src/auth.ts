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
import UAParser from 'ua-parser-js';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          // Validate credentials format
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          // Validate with Zod schema
          const validatedData = loginSchema.parse(credentials);

          // Find user in database
          const user = await prisma.user.findUnique({
            where: { email: validatedData.email },
            select: {
              id: true,
              email: true,
              password: true,
              role: true,
              isActive: true
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

          // Return user data (without password)
          return {
            id: user.id,
            email: user.email,
            role: user.role
          };
        } catch (error) {
          console.error('Auth error:', error);
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

