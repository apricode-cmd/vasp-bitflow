/**
 * NextAuth v5 Configuration
 * 
 * BACKWARD COMPATIBILITY: Re-exports client auth
 * For new code, use auth-client.ts or auth-admin.ts directly
 */

export { 
  clientHandlers as handlers,
  clientSignIn as signIn,
  clientSignOut as signOut,
  getClientSession as auth
} from './auth-client';
