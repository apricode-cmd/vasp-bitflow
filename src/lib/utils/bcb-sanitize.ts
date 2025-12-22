/**
 * Utility functions for sanitizing data for BCB API
 * BCB requires ASCII-only characters in most fields
 */

/**
 * Common character transliterations for European languages
 */
const TRANSLITERATION_MAP: Record<string, string> = {
  // Scandinavian
  'å': 'a', 'Å': 'A',
  'ä': 'a', 'Ä': 'A',
  'æ': 'ae', 'Æ': 'AE',
  'ø': 'o', 'Ø': 'O',
  'ö': 'o', 'Ö': 'O',
  
  // German
  'ü': 'u', 'Ü': 'U',
  'ß': 'ss',
  
  // French
  'é': 'e', 'É': 'E',
  'è': 'e', 'È': 'E',
  'ê': 'e', 'Ê': 'E',
  'ë': 'e', 'Ë': 'E',
  'à': 'a', 'À': 'A',
  'â': 'a', 'Â': 'A',
  'ç': 'c', 'Ç': 'C',
  'î': 'i', 'Î': 'I',
  'ï': 'i', 'Ï': 'I',
  'ô': 'o', 'Ô': 'O',
  'û': 'u', 'Û': 'U',
  'ù': 'u', 'Ù': 'U',
  'ÿ': 'y', 'Ÿ': 'Y',
  
  // Spanish
  'ñ': 'n', 'Ñ': 'N',
  'á': 'a', 'Á': 'A',
  'í': 'i', 'Í': 'I',
  'ó': 'o', 'Ó': 'O',
  'ú': 'u', 'Ú': 'U',
  
  // Polish
  'ą': 'a', 'Ą': 'A',
  'ć': 'c', 'Ć': 'C',
  'ę': 'e', 'Ę': 'E',
  'ł': 'l', 'Ł': 'L',
  'ń': 'n', 'Ń': 'N',
  'ś': 's', 'Ś': 'S',
  'ź': 'z', 'Ź': 'Z',
  'ż': 'z', 'Ż': 'Z',
  
  // Czech/Slovak
  'č': 'c', 'Č': 'C',
  'ď': 'd', 'Ď': 'D',
  'ě': 'e', 'Ě': 'E',
  'ň': 'n', 'Ň': 'N',
  'ř': 'r', 'Ř': 'R',
  'š': 's', 'Š': 'S',
  'ť': 't', 'Ť': 'T',
  'ů': 'u', 'Ů': 'U',
  'ž': 'z', 'Ž': 'Z',
  
  // Other common
  'œ': 'oe', 'Œ': 'OE',
};

/**
 * Sanitizes a string to contain only ASCII characters allowed by BCB API
 * Pattern: ^(?! )[a-zA-Z0-9\/\-\?:().'+ ]+$
 * 
 * @param input - The input string (may contain non-ASCII characters)
 * @param allowComma - Whether to allow comma (for address fields)
 * @returns ASCII-only string safe for BCB API
 */
export function sanitizeForBCB(input: string | null | undefined, allowComma: boolean = false): string {
  if (!input) return '';
  
  let result = input;
  
  // Step 1: Transliterate common non-ASCII characters
  for (const [char, replacement] of Object.entries(TRANSLITERATION_MAP)) {
    result = result.replace(new RegExp(char, 'g'), replacement);
  }
  
  // Step 2: Remove any remaining non-ASCII characters
  // Keep only: a-z A-Z 0-9 / - ? : ( ) . ' + space (and comma if allowed)
  const allowedPattern = allowComma 
    ? /[^a-zA-Z0-9\/\-\?:().'+ ,]/g
    : /[^a-zA-Z0-9\/\-\?:().'+ ]/g;
  
  result = result.replace(allowedPattern, '');
  
  // Step 3: Remove leading spaces (BCB requirement)
  result = result.replace(/^ +/, '');
  
  // Step 4: Collapse multiple spaces into one
  result = result.replace(/ {2,}/g, ' ');
  
  // Step 5: Trim trailing spaces
  result = result.trim();
  
  return result;
}

/**
 * Sanitizes name field (must have at least 2 words)
 */
export function sanitizeName(name: string | null | undefined): string {
  const sanitized = sanitizeForBCB(name, false);
  
  // Ensure at least 2 words separated by space
  const words = sanitized.split(' ').filter(w => w.length > 0);
  if (words.length < 2) {
    // If only one word, duplicate it to meet BCB requirement
    return words[0] ? `${words[0]} ${words[0]}` : 'Unknown User';
  }
  
  return words.join(' ');
}

/**
 * Sanitizes address line (allows comma)
 */
export function sanitizeAddress(address: string | null | undefined): string {
  return sanitizeForBCB(address, true);
}

/**
 * Sanitizes city name (no comma)
 */
export function sanitizeCity(city: string | null | undefined): string {
  return sanitizeForBCB(city, false);
}

/**
 * Sanitizes postcode (no comma)
 */
export function sanitizePostcode(postcode: string | null | undefined): string {
  return sanitizeForBCB(postcode, false);
}

/**
 * Validates if a string contains only BCB-allowed characters
 * Returns true if string is empty (validation happens elsewhere)
 */
export function isValidForBCB(input: string, allowComma: boolean = false): boolean {
  // Empty string is considered "valid" - validation happens elsewhere
  if (!input || input.length === 0) return true;
  
  // Leading space is not allowed by BCB
  if (input.startsWith(' ')) return false;
  
  const pattern = allowComma
    ? /^[a-zA-Z0-9\/\-\?:().'+ ,]+$/
    : /^[a-zA-Z0-9\/\-\?:().'+ ]+$/;
  
  return pattern.test(input);
}

