/**
 * Encryption Service
 * 
 * Provides AES-256-GCM encryption for sensitive data
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

class EncryptionService {
  private masterKey: Buffer;

  constructor() {
    // Get encryption key from environment
    const keyString = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'default-key-change-in-production';
    
    // Derive key using PBKDF2
    this.masterKey = crypto.pbkdf2Sync(
      keyString,
      'apricode-exchange-salt',
      100000,
      KEY_LENGTH,
      'sha512'
    );
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(data: string): string {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(IV_LENGTH);

      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv);

      // Encrypt
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get auth tag
      const tag = cipher.getAuthTag();

      // Combine iv + tag + encrypted data
      const result = iv.toString('hex') + tag.toString('hex') + encrypted;

      return result;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData: string): string {
    try {
      // Extract components
      const ivHex = encryptedData.slice(0, IV_LENGTH * 2);
      const tagHex = encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2);
      const encrypted = encryptedData.slice((IV_LENGTH + TAG_LENGTH) * 2);

      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');

      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, iv);
      decipher.setAuthTag(tag);

      // Decrypt
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash data using SHA-256
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate random secret
   */
  generateSecret(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt JSON object
   */
  encryptObject(obj: Record<string, any>): string {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString);
  }

  /**
   * Decrypt to JSON object
   */
  decryptObject(encryptedData: string): Record<string, any> {
    const jsonString = this.decrypt(encryptedData);
    return JSON.parse(jsonString);
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();


