/**
 * Two-Factor Authentication Service (TOTP)
 * 
 * Handles TOTP (Time-based One-Time Password) generation and verification
 * Compatible with Google Authenticator, Authy, Microsoft Authenticator
 */

import { TOTP, Secret } from 'otpauth';
import { randomBytes } from 'crypto';
import QRCode from 'qrcode';
import { encrypt, decrypt } from './encryption.service';
import { prisma } from '@/lib/prisma';

const APP_NAME = 'Apricode Exchange';
const TOTP_WINDOW = 1; // Allow 30 seconds before/after for clock drift

/**
 * Generate a new TOTP secret for a user
 */
export function generateTotpSecret(): {
  secret: string;
  base32: string;
} {
  const secret = new Secret({ size: 20 }); // 160 bits
  
  return {
    secret: secret.hex,
    base32: secret.base32
  };
}

/**
 * Generate TOTP instance
 */
export function createTotpInstance(secret: string, userEmail: string): TOTP {
  return new TOTP({
    issuer: APP_NAME,
    label: userEmail,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromHex(secret)
  });
}

/**
 * Generate QR code for TOTP setup
 */
export async function generateQrCode(
  secret: string,
  userEmail: string
): Promise<string> {
  const totp = createTotpInstance(secret, userEmail);
  const otpauthUrl = totp.toString();
  
  // Generate QR code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 300,
    margin: 1
  });
  
  return qrCodeDataUrl;
}

/**
 * Verify TOTP code
 */
export function verifyTotpCode(
  secret: string,
  userEmail: string,
  code: string
): boolean {
  try {
    const totp = createTotpInstance(secret, userEmail);
    
    // Validate code (with time window for clock drift)
    const delta = totp.validate({
      token: code,
      window: TOTP_WINDOW
    });
    
    // delta is null if invalid, or the time step difference if valid
    return delta !== null;
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
}

/**
 * Generate backup codes (8 codes, 8 characters each)
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = randomBytes(4)
      .toString('hex')
      .toUpperCase()
      .match(/.{1,4}/g)
      ?.join('-') || '';
    
    codes.push(code);
  }
  
  return codes;
}

/**
 * Enable TOTP for a user
 */
export async function enableTotp(
  userId: string,
  secret: string
): Promise<{ backupCodes: string[] }> {
  // Generate backup codes
  const backupCodes = generateBackupCodes();
  
  // Encrypt secret and backup codes
  const encryptedSecret = encrypt(secret);
  const encryptedBackupCodes = encrypt(JSON.stringify(
    backupCodes.map(code => ({ code, used: false }))
  ));
  
  // Save to database
  await prisma.twoFactorAuth.upsert({
    where: { userId },
    create: {
      userId,
      totpEnabled: true,
      totpSecret: encryptedSecret,
      totpVerifiedAt: new Date(),
      backupCodes: encryptedBackupCodes
    },
    update: {
      totpEnabled: true,
      totpSecret: encryptedSecret,
      totpVerifiedAt: new Date(),
      backupCodes: encryptedBackupCodes
    }
  });
  
  return { backupCodes };
}

/**
 * Disable TOTP for a user
 */
export async function disableTotp(userId: string): Promise<void> {
  await prisma.twoFactorAuth.update({
    where: { userId },
    data: {
      totpEnabled: false,
      totpSecret: null,
      totpVerifiedAt: null,
      backupCodes: null
    }
  });
}

/**
 * Verify user's TOTP code or backup code
 */
export async function verifyUserTotp(
  userId: string,
  userEmail: string,
  code: string
): Promise<{ success: boolean; message: string; usedBackupCode?: boolean }> {
  const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
    where: { userId }
  });
  
  if (!twoFactorAuth || !twoFactorAuth.totpEnabled || !twoFactorAuth.totpSecret) {
    return { success: false, message: '2FA not enabled' };
  }
  
  // Decrypt secret
  const secret = decrypt(twoFactorAuth.totpSecret);
  
  // 1. Try TOTP code first
  const isTotpValid = verifyTotpCode(secret, userEmail, code);
  
  if (isTotpValid) {
    return { success: true, message: 'TOTP code valid' };
  }
  
  // 2. Try backup code
  if (twoFactorAuth.backupCodes) {
    const backupCodes = JSON.parse(
      decrypt(twoFactorAuth.backupCodes as string)
    ) as Array<{ code: string; used: boolean }>;
    
    const backupCodeIndex = backupCodes.findIndex(
      bc => bc.code === code.toUpperCase() && !bc.used
    );
    
    if (backupCodeIndex !== -1) {
      // Mark backup code as used
      backupCodes[backupCodeIndex].used = true;
      
      await prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          backupCodes: encrypt(JSON.stringify(backupCodes))
        }
      });
      
      return { 
        success: true, 
        message: 'Backup code valid',
        usedBackupCode: true
      };
    }
  }
  
  return { success: false, message: 'Invalid code' };
}

/**
 * Get user's 2FA status
 */
export async function getTotpStatus(userId: string): Promise<{
  totpEnabled: boolean;
  totpVerifiedAt: Date | null;
  remainingBackupCodes: number;
}> {
  const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
    where: { userId }
  });
  
  if (!twoFactorAuth) {
    return {
      totpEnabled: false,
      totpVerifiedAt: null,
      remainingBackupCodes: 0
    };
  }
  
  let remainingBackupCodes = 0;
  if (twoFactorAuth.backupCodes) {
    const backupCodes = JSON.parse(
      decrypt(twoFactorAuth.backupCodes as string)
    ) as Array<{ code: string; used: boolean }>;
    
    remainingBackupCodes = backupCodes.filter(bc => !bc.used).length;
  }
  
  return {
    totpEnabled: twoFactorAuth.totpEnabled,
    totpVerifiedAt: twoFactorAuth.totpVerifiedAt,
    remainingBackupCodes
  };
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(userId: string): Promise<string[]> {
  const backupCodes = generateBackupCodes();
  
  const encryptedBackupCodes = encrypt(JSON.stringify(
    backupCodes.map(code => ({ code, used: false }))
  ));
  
  await prisma.twoFactorAuth.update({
    where: { userId },
    data: { backupCodes: encryptedBackupCodes }
  });
  
  return backupCodes;
}

