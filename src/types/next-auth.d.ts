/**
 * NextAuth Type Extensions
 * 
 * Extends NextAuth types to include custom user properties.
 */

import { Role } from '@prisma/client';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    role: Role;
    authMethod?: string; // 'PASSWORD', 'TOTP', 'PASSKEY', 'SSO'
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: Role;
      authMethod?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
    authMethod?: string;
  }
}

