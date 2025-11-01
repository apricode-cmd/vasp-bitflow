/**
 * Step-up MFA Service
 * 
 * Provides additional authentication for critical actions
 * even when admin is already logged in.
 * 
 * Compliance: PSD2/SCA, AML, SOC 2
 */

import { prisma } from '@/lib/prisma';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  VerifyAuthenticationResponseOpts,
} from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';

/**
 * Actions that require Step-up MFA
 */
export const STEP_UP_REQUIRED_ACTIONS = [
  // Financial operations
  'APPROVE_PAYOUT',
  'APPROVE_PAYIN',
  'CREATE_LARGE_PAYOUT', // > 10,000 EUR
  'MODIFY_BANK_ACCOUNT',
  
  // Access management
  'CHANGE_ADMIN_ROLE',
  'CREATE_SUPER_ADMIN',
  'SUSPEND_ADMIN',
  'DELETE_ADMIN',
  'REVOKE_ADMIN_SESSION',
  
  // API & Integrations
  'GENERATE_API_KEY',
  'REVOKE_API_KEY',
  'UPDATE_INTEGRATION_KEYS',
  'UPDATE_KYCAID_KEYS',
  'UPDATE_PAYMENT_KEYS',
  
  // System settings
  'CHANGE_LIMITS',
  'UPDATE_AML_POLICY',
  'DISABLE_MFA_REQUIREMENT',
  'CHANGE_SYSTEM_SETTINGS',
  
  // User data
  'DELETE_USER',
  'EXPORT_PII',
  'IMPERSONATE_USER',
] as const;

export type StepUpAction = typeof STEP_UP_REQUIRED_ACTIONS[number];

export interface StepUpChallengeResponse {
  challengeId: string;
  options: any; // WebAuthn options
  expiresAt: Date;
}

export class StepUpMfaService {
  private readonly RP_ID = process.env.RP_ID || 'localhost';
  private readonly ORIGIN = process.env.ORIGIN || 'http://localhost:3000';
  private readonly CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ATTEMPTS = 3;

  /**
   * Check if action requires Step-up MFA
   */
  requiresStepUp(action: string): boolean {
    return STEP_UP_REQUIRED_ACTIONS.includes(action as StepUpAction);
  }

  /**
   * Request Step-up MFA challenge
   */
  async requestChallenge(
    adminId: string,
    action: StepUpAction,
    resourceType?: string,
    resourceId?: string
  ): Promise<StepUpChallengeResponse> {
    // Get admin with credentials
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      include: {
        webAuthnCreds: {
          where: { isActive: true },
          orderBy: { lastUsed: 'desc' },
        },
      },
    });

    if (!admin) {
      throw new Error('Admin not found');
    }

    if (!admin.isActive || admin.isSuspended) {
      throw new Error('Admin account is not active');
    }

    // Check if admin has any credentials
    if (admin.webAuthnCreds.length === 0) {
      throw new Error('No WebAuthn credentials registered. Please set up Passkey first.');
    }

    // Generate WebAuthn authentication options
    const options = await generateAuthenticationOptions({
      rpID: this.RP_ID,
      allowCredentials: admin.webAuthnCreds.map((cred) => ({
        id: Buffer.from(cred.credentialId, 'base64'),
        type: 'public-key',
        transports: cred.transports as any[],
      })),
      userVerification: 'required',
      timeout: 60000, // 60 seconds
    });

    // Create challenge in database
    const expiresAt = new Date(Date.now() + this.CHALLENGE_EXPIRY_MS);
    const challenge = await prisma.mfaChallenge.create({
      data: {
        adminId,
        action,
        resourceType: resourceType || null,
        resourceId: resourceId || null,
        challengeType: 'WEBAUTHN',
        challenge: options.challenge,
        status: 'PENDING',
        attempts: 0,
        maxAttempts: this.MAX_ATTEMPTS,
        expiresAt,
      },
    });

    return {
      challengeId: challenge.id,
      options,
      expiresAt,
    };
  }

  /**
   * Verify Step-up MFA response
   */
  async verifyChallenge(
    challengeId: string,
    response: AuthenticationResponseJSON
  ): Promise<boolean> {
    // Get challenge with admin and credentials
    const challenge = await prisma.mfaChallenge.findUnique({
      where: { id: challengeId },
      include: {
        admin: {
          include: {
            webAuthnCreds: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!challenge) {
      throw new Error('Challenge not found');
    }

    // Check if challenge is still valid
    if (challenge.status !== 'PENDING') {
      throw new Error(`Challenge is ${challenge.status.toLowerCase()}`);
    }

    if (challenge.expiresAt < new Date()) {
      await this.markChallengeExpired(challengeId);
      throw new Error('Challenge has expired');
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      await this.markChallengeFailed(challengeId);
      throw new Error('Maximum attempts exceeded');
    }

    // Find the credential being used
    const credentialId = response.id;
    const credential = challenge.admin.webAuthnCreds.find(
      (c) => c.credentialId === credentialId
    );

    if (!credential) {
      // Increment attempts
      await prisma.mfaChallenge.update({
        where: { id: challengeId },
        data: { attempts: { increment: 1 } },
      });
      throw new Error('Credential not found');
    }

    try {
      // Verify the authentication response
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: this.ORIGIN,
        expectedRPID: this.RP_ID,
        authenticator: {
          credentialID: Buffer.from(credential.credentialId, 'base64'),
          credentialPublicKey: Buffer.from(credential.publicKey, 'base64'),
          counter: credential.counter,
        },
      } as VerifyAuthenticationResponseOpts);

      if (verification.verified) {
        // Mark challenge as verified
        await prisma.mfaChallenge.update({
          where: { id: challengeId },
          data: {
            status: 'VERIFIED',
            verifiedAt: new Date(),
            verifiedWith: credential.id,
          },
        });

        // Update credential counter and last used
        await prisma.webAuthnCredential.update({
          where: { id: credential.id },
          data: {
            counter: verification.authenticationInfo.newCounter,
            lastUsed: new Date(),
          },
        });

        // Log successful Step-up MFA
        await prisma.auditLog.create({
          data: {
            userId: challenge.adminId,
            userEmail: challenge.admin.workEmail || challenge.admin.email,
            userRole: challenge.admin.roleCode || 'ADMIN',
            action: 'STEP_UP_MFA_VERIFIED',
            entity: challenge.resourceType || 'System',
            entityId: challenge.resourceId || challengeId,
            metadata: {
              action: challenge.action,
              credentialId: credential.id,
              deviceName: credential.deviceName,
              challengeId,
            },
            ipAddress: 'system', // Will be updated by API route
            userAgent: 'system',
            mfaRequired: true,
            mfaMethod: 'WEBAUTHN',
            mfaVerifiedAt: new Date(),
            severity: 'INFO',
          },
        });

        return true;
      } else {
        // Increment attempts
        await prisma.mfaChallenge.update({
          where: { id: challengeId },
          data: { attempts: { increment: 1 } },
        });
        return false;
      }
    } catch (error) {
      // Increment attempts on error
      await prisma.mfaChallenge.update({
        where: { id: challengeId },
        data: { attempts: { increment: 1 } },
      });
      throw error;
    }
  }

  /**
   * Mark challenge as expired
   */
  private async markChallengeExpired(challengeId: string): Promise<void> {
    await prisma.mfaChallenge.update({
      where: { id: challengeId },
      data: { status: 'EXPIRED' },
    });
  }

  /**
   * Mark challenge as failed
   */
  private async markChallengeFailed(challengeId: string): Promise<void> {
    await prisma.mfaChallenge.update({
      where: { id: challengeId },
      data: { status: 'FAILED' },
    });
  }

  /**
   * Clean up expired challenges (cron job)
   */
  async cleanupExpiredChallenges(): Promise<number> {
    const result = await prisma.mfaChallenge.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    return result.count;
  }

  /**
   * Get admin's recent Step-up MFA activity
   */
  async getAdminMfaActivity(
    adminId: string,
    limit: number = 10
  ): Promise<any[]> {
    return prisma.mfaChallenge.findMany({
      where: { adminId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        admin: {
          select: {
            email: true,
            workEmail: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }
}

export const stepUpMfaService = new StepUpMfaService();

