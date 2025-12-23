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
 * Common country names in various languages (to remove from address)
 */
const COUNTRY_NAMES = [
  // English
  'belgium', 'belgique', 'belgie', 'belgien',
  'france', 'deutschland', 'germany', 'spain', 'espana', 'italy', 'italia',
  'netherlands', 'nederland', 'poland', 'polska', 'denmark', 'danmark',
  'sweden', 'sverige', 'norway', 'norge', 'finland', 'suomi',
  'portugal', 'austria', 'osterreich', 'switzerland', 'schweiz',
  'ireland', 'eire', 'greece', 'ellada', 'czech republic', 'ceska republika',
  'hungary', 'magyarorszag', 'romania', 'romania', 'bulgaria', 'bulgariya',
  'croatia', 'hrvatska', 'slovakia', 'slovensko', 'slovenia', 'slovenija',
  'estonia', 'eesti', 'latvia', 'latvija', 'lithuania', 'lietuva',
  'luxembourg', 'luxemburg', 'malta', 'cyprus', 'kypros',
];

/**
 * Sanitizes address line (allows comma)
 * Removes postal codes and country names that shouldn't be in address field
 */
export function sanitizeAddress(address: string | null | undefined, postalCode?: string | null): string {
  if (!address) return '';
  
  let cleaned = address.trim();
  
  // Step 1: Remove postal code from beginning if it matches the provided postalCode
  if (postalCode && cleaned.toLowerCase().startsWith(postalCode.toLowerCase())) {
    // Remove postal code and any following space/comma
    cleaned = cleaned.substring(postalCode.length).replace(/^[\s,]+/, '');
  }
  
  // Step 2: Remove postal codes at the beginning (4-5 digit pattern)
  // Match patterns like "4210 " or "4210," at the start
  cleaned = cleaned.replace(/^(\d{4,5})[\s,]+/i, '');
  
  // Step 3: Remove country names from the end (case-insensitive)
  const words = cleaned.toLowerCase().split(/\s+/);
  const lastWords = words.slice(-2); // Check last 1-2 words
  
  for (const countryName of COUNTRY_NAMES) {
    const countryWords = countryName.toLowerCase().split(/\s+/);
    
    // Check if last words match country name
    if (lastWords.length >= countryWords.length) {
      const addressEnd = lastWords.slice(-countryWords.length).join(' ');
      if (addressEnd === countryWords.join(' ')) {
        // Remove country name from end
        cleaned = cleaned.substring(0, cleaned.length - addressEnd.length)
          .replace(/\s*,\s*$/, '') // Remove trailing comma
          .trim();
        break;
      }
    }
    
    // Also check single word at the end
    if (words.length > 0 && words[words.length - 1] === countryName.toLowerCase()) {
      cleaned = cleaned.substring(0, cleaned.length - words[words.length - 1].length)
        .replace(/\s*,\s*$/, '') // Remove trailing comma
        .trim();
      break;
    }
  }
  
  // Step 4: Apply standard BCB sanitization (ASCII conversion, etc.)
  cleaned = sanitizeForBCB(cleaned, true);
  
  // Step 5: Ensure address is not empty after cleaning
  if (!cleaned || cleaned.trim().length === 0) {
    // If address became empty, try to use original (at least sanitized)
    cleaned = sanitizeForBCB(address, true);
  }
  
  return cleaned.trim();
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

