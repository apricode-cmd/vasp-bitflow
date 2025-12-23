/**
 * Universal Transliteration Utility
 * 
 * Converts non-Latin characters to ASCII for BCB API compatibility
 * Supports European languages: Greek, Cyrillic, and Latin diacritics
 * 
 * Uses any-ascii library for reliable transliteration
 */

import anyAscii from 'any-ascii';

/**
 * Transliterates any Unicode text to ASCII
 * 
 * Examples:
 * - Greek: ΖΑΓΟΡΑ → ZAGORA
 * - Cyrillic: Москва → Moskva, Київ → Kyiv
 * - Latin diacritics: Søren → Soren, Müller → Muller
 * 
 * @param input - Text in any language/script
 * @returns ASCII-only text
 */
export function transliterateToASCII(input: string | null | undefined): string {
  if (!input) return '';
  
  try {
    return anyAscii(input);
  } catch (error) {
    console.error('[Transliterate] Error transliterating:', error);
    // Fallback: remove non-ASCII characters
    return input.replace(/[^\x00-\x7F]/g, '');
  }
}

/**
 * Detects if text contains non-Latin characters that need transliteration
 * 
 * @param input - Text to check
 * @returns true if contains non-Latin characters
 */
export function needsTransliteration(input: string | null | undefined): boolean {
  if (!input) return false;
  
  // Check for non-Latin scripts
  // Greek: U+0370–U+03FF
  // Cyrillic: U+0400–U+04FF
  // Other non-Latin European scripts
  return /[\u0370-\u03FF\u0400-\u04FF\u0100-\u017F\u0180-\u024F]/.test(input);
}

/**
 * Detects the script/language of the text
 * 
 * @param input - Text to analyze
 * @returns Script identifier or 'latin'
 */
export function detectScript(input: string | null | undefined): 'greek' | 'cyrillic' | 'latin' | 'mixed' {
  if (!input) return 'latin';
  
  const hasGreek = /[\u0370-\u03FF]/.test(input);
  const hasCyrillic = /[\u0400-\u04FF]/.test(input);
  const hasLatin = /[a-zA-Z]/.test(input);
  
  if (hasGreek && hasCyrillic) return 'mixed';
  if (hasGreek) return 'greek';
  if (hasCyrillic) return 'cyrillic';
  return 'latin';
}

