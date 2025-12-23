/**
 * Test Universal Transliteration
 * 
 * Tests transliteration for European languages:
 * - Greek
 * - Cyrillic (Russian, Ukrainian, Bulgarian)
 * - Latin diacritics (existing)
 */

import { transliterateToASCII, needsTransliteration, detectScript } from '../src/lib/utils/universal-transliterate';
import { sanitizeName, sanitizeAddress, sanitizeCity } from '../src/lib/utils/bcb-sanitize';

const testCases = [
  // Greek
  {
    name: 'Greek - ΖΑΓΟΡΑ',
    input: 'ΖΑΓΟΡΑ',
    expected: 'ZAGORA',
  },
  {
    name: 'Greek - Αθήνα',
    input: 'Αθήνα',
    expected: 'Athena',
  },
  {
    name: 'Greek address - Οδός Πατησίων',
    input: 'Οδός Πατησίων 45',
    expected: 'Odos Patision 45',
  },
  
  // Cyrillic - Russian
  {
    name: 'Russian - Москва',
    input: 'Москва',
    expected: 'Moskva',
  },
  {
    name: 'Russian - Санкт-Петербург',
    input: 'Санкт-Петербург',
    expected: 'Sankt-Peterburg',
  },
  {
    name: 'Russian address - ул. Ленина',
    input: 'ул. Ленина 10',
    expected: 'ul. Lenina 10',
  },
  
  // Cyrillic - Ukrainian
  {
    name: 'Ukrainian - Київ',
    input: 'Київ',
    expected: 'Kyiv',
  },
  {
    name: 'Ukrainian - Одеса',
    input: 'Одеса',
    expected: 'Odesa',
  },
  
  // Cyrillic - Bulgarian
  {
    name: 'Bulgarian - София',
    input: 'София',
    expected: 'Sofia',
  },
  
  // Mixed
  {
    name: 'Mixed - Moscow, Москва',
    input: 'Moscow, Москва',
    expected: 'Moscow, Moskva',
  },
  {
    name: 'Mixed - Street, Οδός',
    input: 'Street, Οδός 1',
    expected: 'Street, Odos 1',
  },
  
  // Existing Latin diacritics (should still work)
  {
    name: 'Scandinavian - Søren Müller',
    input: 'Søren Müller',
    expected: 'Soren Muller',
  },
  {
    name: 'Polish - Kraków',
    input: 'Kraków',
    expected: 'Krakow',
  },
  {
    name: 'French - José García',
    input: 'José García',
    expected: 'Jose Garcia',
  },
];

console.log('🧪 Testing Universal Transliteration\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const result = transliterateToASCII(testCase.input);
  const needs = needsTransliteration(testCase.input);
  const script = detectScript(testCase.input);
  
  const success = result === testCase.expected;
  
  if (success) {
    passed++;
    console.log(`✅ ${testCase.name}`);
  } else {
    failed++;
    console.log(`❌ ${testCase.name}`);
    console.log(`   Input:    "${testCase.input}"`);
    console.log(`   Expected: "${testCase.expected}"`);
    console.log(`   Got:      "${result}"`);
  }
  
  console.log(`   Script:   ${script}`);
  console.log(`   Needs transliteration: ${needs}`);
  console.log('');
}

console.log('='.repeat(80));
console.log(`Results: ${passed} passed, ${failed} failed\n`);

// Test BCB sanitization functions
console.log('🧪 Testing BCB Sanitization Functions\n');
console.log('='.repeat(80));

const bcbTestCases = [
  {
    name: 'Greek name',
    input: 'Γιάννης Παπαδόπουλος',
    func: sanitizeName,
  },
  {
    name: 'Russian address',
    input: 'ул. Ленина 10, Москва',
    func: sanitizeAddress,
  },
  {
    name: 'Ukrainian city',
    input: 'Київ',
    func: sanitizeCity,
  },
  {
    name: 'Mixed address',
    input: 'Οδός Πατησίων 45, Αθήνα',
    func: sanitizeAddress,
  },
];

for (const testCase of bcbTestCases) {
  const result = testCase.func(testCase.input);
  const needs = needsTransliteration(testCase.input);
  
  console.log(`📝 ${testCase.name}:`);
  console.log(`   Input:  "${testCase.input}"`);
  console.log(`   Output: "${result}"`);
  console.log(`   Needs transliteration: ${needs}`);
  console.log(`   Is ASCII-only: ${/^[a-zA-Z0-9\/\-\?:().'+ ,\s]+$/.test(result)}`);
  console.log('');
}

console.log('='.repeat(80));
console.log('✅ Testing complete!\n');

