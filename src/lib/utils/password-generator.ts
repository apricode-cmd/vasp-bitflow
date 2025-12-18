/**
 * Password Generator Utility
 * 
 * Generate secure random passwords with various options
 */

export interface PasswordOptions {
  length?: number;
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
  excludeSimilar?: boolean; // Exclude similar characters (i, l, 1, L, o, 0, O)
  excludeAmbiguous?: boolean; // Exclude ambiguous characters ({, }, [, ], (, ), /, \, ', ", `, ~, ,, ;, :, ., <, >)
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

const SIMILAR_CHARS = 'il1Lo0O';
const AMBIGUOUS_CHARS = '{}[]()/\\\'"`~,;:.<>';

/**
 * Generate a random password based on options
 */
export function generatePassword(options: PasswordOptions = {}): string {
  const {
    length = 16,
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
    excludeSimilar = false,
    excludeAmbiguous = false,
  } = options;

  // Build character set
  let charset = '';
  const requiredChars: string[] = [];

  if (uppercase) {
    let chars = UPPERCASE;
    if (excludeSimilar) chars = chars.replace(/[IL]/g, '');
    charset += chars;
    requiredChars.push(chars[Math.floor(Math.random() * chars.length)]);
  }

  if (lowercase) {
    let chars = LOWERCASE;
    if (excludeSimilar) chars = chars.replace(/[ilo]/g, '');
    charset += chars;
    requiredChars.push(chars[Math.floor(Math.random() * chars.length)]);
  }

  if (numbers) {
    let chars = NUMBERS;
    if (excludeSimilar) chars = chars.replace(/[10]/g, '');
    charset += chars;
    requiredChars.push(chars[Math.floor(Math.random() * chars.length)]);
  }

  if (symbols) {
    let chars = SYMBOLS;
    if (excludeAmbiguous) {
      chars = chars.split('').filter(c => !AMBIGUOUS_CHARS.includes(c)).join('');
    }
    charset += chars;
    requiredChars.push(chars[Math.floor(Math.random() * chars.length)]);
  }

  if (charset.length === 0) {
    throw new Error('At least one character type must be selected');
  }

  // Generate password with at least one character from each selected type
  let password = requiredChars.join('');
  
  // Fill remaining length with random characters
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  // Shuffle password to randomize position of required characters
  return shuffleString(password);
}

/**
 * Shuffle string characters randomly
 */
function shuffleString(str: string): string {
  const array = str.split('');
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array.join('');
}

/**
 * Calculate password strength (0-100)
 */
export function calculatePasswordStrength(password: string): {
  score: number;
  level: 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Very Strong';
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];

  // Length score
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  if (password.length < 8) feedback.push('Use at least 8 characters');

  // Character variety
  if (/[a-z]/.test(password)) score += 15;
  else feedback.push('Add lowercase letters');

  if (/[A-Z]/.test(password)) score += 15;
  else feedback.push('Add uppercase letters');

  if (/[0-9]/.test(password)) score += 15;
  else feedback.push('Add numbers');

  if (/[^A-Za-z0-9]/.test(password)) score += 15;
  else feedback.push('Add special characters');

  // Bonus for complexity
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= password.length * 0.7) score += 10;

  let level: 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Very Strong';
  if (score < 40) level = 'Weak';
  else if (score < 60) level = 'Fair';
  else if (score < 80) level = 'Good';
  else if (score < 95) level = 'Strong';
  else level = 'Very Strong';

  return { score, level, feedback };
}

/**
 * Validate password against requirements
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

