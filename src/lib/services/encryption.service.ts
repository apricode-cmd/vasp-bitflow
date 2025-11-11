/**
 * Encryption Service
 * 
 * Secure encryption/decryption for sensitive data (API keys, secrets)
 * Uses AES-256-GCM for strong encryption
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer | null {
  const secret = process.env.ENCRYPTION_SECRET;
  
  if (!secret) {
    console.warn('⚠️ ENCRYPTION_SECRET not set - API keys will be stored in plain text (DEV ONLY)');
    return null;
  }
  
  if (secret.length < 32) {
    console.error('❌ ENCRYPTION_SECRET must be at least 32 characters');
    return null;
  }

  // Derive a 256-bit key from the secret
  return crypto.pbkdf2Sync(secret, 'integration-salt', 100000, 32, 'sha256');
}

/**
 * Encrypt sensitive data
 */
export function encrypt(text: string): string {
  try {
    if (!text) return '';

    const key = getEncryptionKey();
    
    // If no encryption key, return plain text with marker
    if (!key) {
      return `plain:${text}`;
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return: iv:authTag:encrypted
    return `encrypted:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encrypted: string): string {
  try {
    if (!encrypted) return '';

    // Check if it's plain text (dev mode)
    if (encrypted.startsWith('plain:')) {
      return encrypted.substring(6);
    }

    // Check if it's encrypted
    if (!encrypted.startsWith('encrypted:')) {
      // Old format without prefix - try to decrypt
      const parts = encrypted.split(':');
      if (parts.length === 3) {
        encrypted = `encrypted:${encrypted}`;
      } else {
        // Assume it's plain text
        return encrypted;
      }
    }

    const key = getEncryptionKey();
    
    if (!key) {
      console.warn('Cannot decrypt - no encryption key available');
      return encrypted;
    }

    const withoutPrefix = encrypted.substring(10); // Remove 'encrypted:'
    const parts = withoutPrefix.split(':');

    if (parts.length !== 3) {
      console.error('Invalid encrypted data format');
      return encrypted;
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return as-is if decryption fails (graceful degradation)
    return encrypted;
  }
}

/**
 * Hash API key for comparison (one-way)
 */
export function hashApiKey(apiKey: string): string {
  return crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');
}

/**
 * Generate random encryption secret (for initial setup)
 */
export function generateEncryptionSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Mask API key for display (show only first/last 4 chars)
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return '••••••••';
  }
  
  const first = apiKey.slice(0, 4);
  const last = apiKey.slice(-4);
  const masked = '•'.repeat(Math.max(8, apiKey.length - 8));
  
  return `${first}${masked}${last}`;
}

/**
 * Encrypt an object (converts to JSON, then encrypts)
 */
export function encryptObject(obj: Record<string, any>): string {
  try {
    const jsonStr = JSON.stringify(obj);
    return encrypt(jsonStr);
  } catch (error) {
    console.error('Object encryption error:', error);
    throw new Error('Failed to encrypt object');
  }
}

/**
 * Decrypt an object (decrypts, then parses JSON)
 */
export function decryptObject(encrypted: string): Record<string, any> {
  try {
    const decryptedStr = decrypt(encrypted);
    return JSON.parse(decryptedStr);
  } catch (error) {
    console.error('Object decryption error:', error);
    throw new Error('Failed to decrypt object');
  }
}

/**
 * Export as service object for backward compatibility
 */
export const encryptionService = {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  hashApiKey,
  maskApiKey,
  generateEncryptionSecret
};

