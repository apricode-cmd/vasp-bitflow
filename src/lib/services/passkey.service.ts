/**
 * Passkey (WebAuthn) Service
 * 
 * Handles passkey registration and authentication for admins
 * Uses @simplewebauthn for FIDO2/WebAuthn implementation
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server/script/deps';
import { prisma } from '@/lib/prisma';
import { AdminRole } from '@prisma/client';

// WebAuthn configuration
const RP_NAME = process.env.RP_NAME || 'Apricode Exchange';
const RP_ID = process.env.RP_ID || 'localhost';
const ORIGIN = process.env.ORIGIN || 'http://localhost:3000';

// In-memory storage for challenges (in production, use Redis)
const challengeStore = new Map<string, { challenge: string; timestamp: number }>();
const CHALLENGE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clean expired challenges
 */
function cleanExpiredChallenges(): void {
  const now = Date.now();
  for (const [key, value] of challengeStore.entries()) {
    if (now - value.timestamp > CHALLENGE_TTL) {
      challengeStore.delete(key);
    }
  }
}

/**
 * Generate registration options for new passkey
 */
export async function generatePasskeyRegistrationOptions(
  adminId: string,
  email: string,
  displayName: string
) {
  cleanExpiredChallenges();

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
      transports: ['internal', 'hybrid'],
    })),
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Prefer platform authenticators (Touch ID, Face ID)
      userVerification: 'required',
      residentKey: 'preferred',
    },
    attestationType: 'none',
  });

  // Store challenge
  challengeStore.set(adminId, {
    challenge: options.challenge,
    timestamp: Date.now(),
  });

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
  // Get stored challenge
  const stored = challengeStore.get(adminId);
  if (!stored) {
    return { verified: false, error: 'Challenge not found or expired' };
  }

  try {
    const verification: VerifiedRegistrationResponse =
      await verifyRegistrationResponse({
        response,
        expectedChallenge: stored.challenge,
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

    // Update admin's 2FA settings
    await prisma.admin.update({
      where: { id: adminId },
      data: {
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

    // Clean up challenge
    challengeStore.delete(adminId);

    return {
      verified: true,
      credentialId: credential.id,
    };
  } catch (error) {
    console.error('Passkey registration verification error:', error);
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate authentication options for passkey login
 */
export async function generatePasskeyAuthenticationOptions(email?: string) {
  cleanExpiredChallenges();

  let allowCredentials: Array<{ id: Buffer; type: 'public-key'; transports?: string[] }> = [];

  if (email) {
    // Get admin's passkeys
    const admin = await prisma.admin.findUnique({
      where: { email },
      include: {
        webAuthnCreds: {
          where: { isActive: true },
          select: { credentialId: true, transports: true },
        },
      },
    });

    if (admin?.webAuthnCreds) {
      allowCredentials = admin.webAuthnCreds.map((cred) => ({
        id: Buffer.from(cred.credentialId, 'base64'),
        type: 'public-key' as const,
        transports: cred.transports as AuthenticatorTransport[],
      }));
    }
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials,
    userVerification: 'required',
  });

  // Store challenge (use email or 'anonymous' as key)
  const key = email || 'anonymous';
  challengeStore.set(key, {
    challenge: options.challenge,
    timestamp: Date.now(),
  });

  return options;
}

/**
 * Verify passkey authentication
 */
export async function verifyPasskeyAuthentication(
  response: AuthenticationResponseJSON,
  email?: string
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
            role: true,
            firstName: true,
            lastName: true,
            isActive: true,
            isSuspended: true,
          },
        },
      },
    });

    if (!credential || !credential.isActive) {
      return { verified: false, error: 'Credential not found' };
    }

    if (!credential.admin.isActive || credential.admin.isSuspended) {
      return { verified: false, error: 'Admin account is not active' };
    }

    // Get stored challenge
    const key = email || 'anonymous';
    const stored = challengeStore.get(key);
    if (!stored) {
      return { verified: false, error: 'Challenge not found or expired' };
    }

    // Verify authentication
    const verification: VerifiedAuthenticationResponse =
      await verifyAuthenticationResponse({
        response,
        expectedChallenge: stored.challenge,
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
    challengeStore.delete(key);

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
    console.error('Passkey authentication verification error:', error);
    return {
      verified: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get admin's passkeys
 */
export async function getAdminPasskeys(adminId: string) {
  return await prisma.webAuthnCredential.findMany({
    where: { adminId },
    select: {
      id: true,
      deviceName: true,
      deviceType: true,
      isActive: true,
      lastUsed: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Delete passkey
 */
export async function deletePasskey(credentialId: string, adminId: string) {
  return await prisma.webAuthnCredential.update({
    where: {
      id: credentialId,
      adminId, // Ensure ownership
    },
    data: {
      isActive: false,
    },
  });
}

export const PasskeyService = {
  generatePasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  generatePasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
  getAdminPasskeys,
  deletePasskey,
};

