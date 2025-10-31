/**
 * NextAuth v5 Configuration - ADMIN
 * 
 * Passwordless authentication for administrators
 * - Passkeys (WebAuthn/FIDO2) - PRIMARY
 * - SSO (Google Workspace / Azure AD) - TODO
 * 
 * Password authentication REMOVED for regular admins
 * (only available via break-glass emergency access)
 * 
 * Compliant with: PSD2/SCA, DORA, AML best practices
 */

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PasskeyService } from '@/lib/services/passkey.service';

export const { 
  handlers: adminHandlers, 
  signIn: adminSignIn, 
  signOut: adminSignOut, 
  auth: getAdminSession 
} = NextAuth({
  providers: [
    // Provider: Passkeys (WebAuthn) - PRIMARY and ONLY
    Credentials({
      id: 'passkey',
      name: 'Passkey',
      credentials: {
        email: { label: 'Email', type: 'email' },
        passkeyResponse: { label: 'Passkey Response', type: 'text' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.passkeyResponse) {
            return null;
          }

          const response = JSON.parse(credentials.passkeyResponse as string);
          
          // Verify passkey
          const result = await PasskeyService.verifyPasskeyAuthentication(
            response,
            credentials.email as string
          );

          if (!result.verified || !result.admin) {
            console.log('Passkey verification failed:', result.error);
            return null;
          }

          return {
            id: result.admin.id,
            email: result.admin.email,
            role: result.admin.role,
            name: `${result.admin.firstName} ${result.admin.lastName}`,
            authMethod: 'PASSKEY'
          };
        } catch (error) {
          console.error('Passkey auth error:', error);
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

