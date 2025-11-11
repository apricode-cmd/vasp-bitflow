/**
 * Passkey Service
 * 
 * WebAuthn (FIDO2) authentication service for admins
 */

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/types';
import { prisma } from '@/lib/prisma';
import { AdminRole } from '@prisma/client';

// WebAuthn configuration
const RP_NAME = process.env.RP_NAME || 'Apricode Exchange';
const RP_ID = process.env.RP_ID || 'localhost';
const ORIGIN = process.env.ORIGIN || 'http://localhost:3000';

console.log('🔐 WebAuthn Config:', { RP_NAME, RP_ID, ORIGIN });

// Challenge TTL
const CHALLENGE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate registration options for new passkey
 */
export async function generatePasskeyRegistrationOptions(
  adminId: string,
  email: string,
  displayName: string
) {
  // Clean expired challenges from DB
  await prisma.mfaChallenge.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  // Get existing passkeys for this admin
  const existingPasskeys = await prisma.webAuthnCredential.findMany({
    where: { adminId, isActive: true },
    select: { credentialId: true },
  });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: adminId,
    userName: email,
    userDisplayName: displayName,
    // Exclude existing credentials
    excludeCredentials: existingPasskeys.map((passkey) => ({
      id: Buffer.from(passkey.credentialId, 'base64'),
      type: 'public-key',
      transports: ['internal', 'hybrid'] as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      // ✅ Убрали 'platform' - теперь поддерживаются ВСЕ типы аутентификаторов:
      // - Platform: Touch ID, Face ID, Windows Hello, Android Biometrics
      // - Cross-platform: YubiKey, Google Titan Key, другие FIDO2 ключи
      // authenticatorAttachment: undefined, // Allow both platform and cross-platform
      userVerification: 'preferred', // ✅ Изменили на 'preferred' вместо 'required'
      // Это позволяет использовать устройства без биометрии (например, только PIN)
      residentKey: 'preferred',
    },
    attestationType: 'none',
  });

  // Store challenge in DB
  await prisma.mfaChallenge.create({
    data: {
      adminId,
      action: 'PASSKEY_REGISTRATION',
      challengeType: 'WEBAUTHN',
      challenge: options.challenge,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL),
    },
  });

  console.log('✅ Challenge stored in DB for admin:', adminId);

  return options;
}

/**
 * Verify passkey registration
 */
export async function verifyPasskeyRegistration(
  adminId: string,
  response: RegistrationResponseJSON,
  deviceName?: string
): Promise<{ verified: boolean; error?: string; credentialId?: string }> {
  // Get stored challenge from DB
  const storedChallenge = await prisma.mfaChallenge.findFirst({
    where: {
      adminId,
      action: 'PASSKEY_REGISTRATION',
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!storedChallenge) {
    console.error('❌ Challenge not found for admin:', adminId);
    return { verified: false, error: 'Challenge not found or expired' };
  }

  console.log('✅ Challenge found in DB:', storedChallenge.challenge.substring(0, 20) + '...');

  try {
    const verification: VerifiedRegistrationResponse =
      await verifyRegistrationResponse({
        response,
        expectedChallenge: storedChallenge.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
      });

    if (!verification.verified || !verification.registrationInfo) {
      return { verified: false, error: 'Verification failed' };
    }

    const { credentialPublicKey, credentialID, counter } =
      verification.registrationInfo;

    // Save credential to database
    const credential = await prisma.webAuthnCredential.create({
      data: {
        adminId,
        credentialId: Buffer.from(credentialID).toString('base64'),
        publicKey: Buffer.from(credentialPublicKey).toString('base64'),
        counter,
        deviceName: deviceName || 'Unknown Device',
        deviceType: 'platform',
        transports: response.response.transports || [],
        isActive: true,
      },
    });

    console.log('✅ Credential saved:', credential.id);

    // Get admin to check if this is first-time setup
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { status: true, setupToken: true }
    });

    // Update admin's 2FA settings and activate if INVITED
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        // Activate admin if they were INVITED (first-time setup)
        ...(admin?.status === 'INVITED' && admin?.setupToken ? {
          status: 'ACTIVE',
          isActive: true,
          setupToken: null, // Clear setup token after successful registration
          setupTokenExpiry: null,
        } : {}),
        twoFactorAuth: {
          upsert: {
            create: {
              webAuthnEnabled: true,
              preferredMethod: 'WEBAUTHN',
            },
            update: {
              webAuthnEnabled: true,
              preferredMethod: 'WEBAUTHN',
            },
          },
        },
      },
    });

    console.log('✅ Admin activated and 2FA configured:', adminId);

    // Clean up challenge
    await prisma.mfaChallenge.delete({
      where: { id: storedChallenge.id },
    });

    console.log('✅ Registration complete for admin:', adminId);

    return {
      verified: true,
      credentialId: credential.id,
    };
  } catch (error) {
    console.error('❌ Passkey registration verification error:', error);
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate authentication options for passkey login
 */
export async function generatePasskeyAuthenticationOptions(email: string) {
  // Clean expired challenges from DB
  await prisma.mfaChallenge.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  let adminId: string | null = null;
  let allowCredentials: Array<{ id: Buffer; type: 'public-key'; transports?: AuthenticatorTransportFuture[] }> = [];

  // Get admin's passkeys (search by workEmail or email for backward compatibility)
  const admin = await prisma.admin.findFirst({
    where: {
      OR: [
        { workEmail: email },
        { email: email },
      ],
    },
    include: {
      webAuthnCreds: {
        where: { isActive: true },
        select: { credentialId: true, transports: true },
      },
    },
  });

  if (admin?.webAuthnCreds) {
    adminId = admin.id;
    allowCredentials = admin.webAuthnCreds.map((cred) => ({
      id: Buffer.from(cred.credentialId, 'base64'),
      type: 'public-key' as const,
      transports: cred.transports as AuthenticatorTransportFuture[],
    }));
  } else {
    throw new Error('No passkeys registered for this admin.');
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials,
    userVerification: 'required',
  });

  // Store challenge in DB
  await prisma.mfaChallenge.create({
    data: {
      adminId: adminId,
      action: 'PASSKEY_LOGIN',
      challengeType: 'WEBAUTHN',
      challenge: options.challenge,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL),
    },
  });

  console.log('✅ Authentication challenge stored for admin:', adminId);

  return options;
}

/**
 * Verify passkey authentication
 */
export async function verifyPasskeyAuthentication(
  response: AuthenticationResponseJSON,
  email: string
): Promise<{
  verified: boolean;
  admin?: {
    id: string;
    email: string;
    role: AdminRole;
    firstName: string;
    lastName: string;
  };
  error?: string;
}> {
  try {
    // Find credential
    const credential = await prisma.webAuthnCredential.findUnique({
      where: {
        credentialId: Buffer.from(response.id, 'base64url').toString('base64'),
      },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            workEmail: true,
            role: true,
            firstName: true,
            lastName: true,
            status: true,
            isActive: true,
            isSuspended: true,
          },
        },
      },
    });

    if (!credential || !credential.isActive) {
      return { verified: false, error: 'Credential not found' };
    }

    // Check admin account status
    if (credential.admin.status === 'TERMINATED' || !credential.admin.isActive) {
      return { verified: false, error: 'Admin account has been terminated' };
    }

    if (credential.admin.status === 'SUSPENDED' || credential.admin.isSuspended) {
      return { verified: false, error: 'Admin account is suspended' };
    }

    // Get stored challenge from DB
    const storedChallenge = await prisma.mfaChallenge.findFirst({
      where: {
        adminId: credential.admin.id,
        action: 'PASSKEY_LOGIN',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!storedChallenge) {
      console.error('❌ Challenge not found in DB');
      return { verified: false, error: 'Challenge not found or expired' };
    }

    console.log('✅ Challenge found:', storedChallenge.challenge.substring(0, 20) + '...');

    // Verify authentication
    const verification: VerifiedAuthenticationResponse =
      await verifyAuthenticationResponse({
        response,
        expectedChallenge: storedChallenge.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        authenticator: {
          credentialID: Buffer.from(credential.credentialId, 'base64'),
          credentialPublicKey: Buffer.from(credential.publicKey, 'base64'),
          counter: credential.counter,
        },
      });

    if (!verification.verified) {
      return { verified: false, error: 'Verification failed' };
    }

    // Update counter (prevents replay attacks)
    await prisma.webAuthnCredential.update({
      where: { id: credential.id },
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsed: new Date(),
      },
    });

    // Clean up challenge
    await prisma.mfaChallenge.delete({
      where: { id: storedChallenge.id },
    });

    console.log('✅ Passkey authentication successful for:', credential.admin.email);

    return {
      verified: true,
      admin: {
        id: credential.admin.id,
        email: credential.admin.email,
        role: credential.admin.role,
        firstName: credential.admin.firstName,
        lastName: credential.admin.lastName,
      },
    };
  } catch (error) {
    console.error('❌ Passkey authentication verification error:', error);
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Export as PasskeyService for compatibility
export const PasskeyService = {
  generatePasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  generatePasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
};
