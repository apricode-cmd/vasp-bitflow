/**
 * Test script for country flags
 * Tests all country codes to ensure flags display correctly
 */

import { getCountryFlag, getCountryName, formatCountry, getAllCountries, POPULAR_COUNTRIES } from '../src/lib/utils/country-utils';

console.log('🌍 Testing Country Flags & Names\n');
console.log('='.repeat(80));

// Test popular countries
console.log('\n📍 POPULAR COUNTRIES (40):\n');
POPULAR_COUNTRIES.forEach((country, index) => {
  console.log(`${(index + 1).toString().padStart(2)}. ${country.flag} ${country.code.padEnd(3)} - ${country.name}`);
});

// Test specific examples
console.log('\n\n✅ TEST CASES:\n');
const testCases = [
  'US', 'GB', 'DE', 'FR', 'IT', 'ES', 'PL', 'UA', 'RU', 'CN',
  'JP', 'IN', 'BR', 'AU', 'CA', 'MX', 'ZA', 'EG', 'NG', 'KE',
  'SG', 'HK', 'AE', 'IL', 'TR', 'SE', 'NO', 'DK', 'FI', 'CH',
];

testCases.forEach(code => {
  const flag = getCountryFlag(code);
  const name = getCountryName(code);
  const formatted = formatCountry(code);
  console.log(`${code}: ${flag} ${name.padEnd(25)} → ${formatted}`);
});

// Test edge cases
console.log('\n\n⚠️  EDGE CASES:\n');
console.log('Empty string:', getCountryFlag(''), '→', getCountryName(''));
console.log('Invalid code (XYZ):', getCountryFlag('XYZ'), '→', getCountryName('XYZ'));
console.log('Lowercase (us):', getCountryFlag('us'), '→', getCountryName('us'));
console.log('3-letter (USA):', getCountryFlag('USA'), '→', getCountryName('USA'));

// Get all countries count
const allCountries = getAllCountries();
console.log('\n\n📊 STATISTICS:\n');
console.log(`Total countries supported: ${allCountries.length}`);
console.log(`Popular countries: ${POPULAR_COUNTRIES.length}`);

// Show all countries by continent
console.log('\n\n🌎 ALL COUNTRIES BY CONTINENT:\n');

const continents = {
  'Europe': allCountries.filter(c => 
    ['AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
     'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'XK', 'LV', 'LI', 'LT', 'LU', 'MK', 'MT', 'MD',
     'MC', 'ME', 'NL', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SE',
     'CH', 'UA', 'GB', 'VA'].includes(c.code)
  ),
  'Americas': allCountries.filter(c => 
    ['AG', 'AR', 'BS', 'BB', 'BZ', 'BO', 'BR', 'CA', 'CL', 'CO', 'CR', 'CU', 'DM', 'DO',
     'EC', 'SV', 'GD', 'GT', 'GY', 'HT', 'HN', 'JM', 'MX', 'NI', 'PA', 'PY', 'PE', 'KN',
     'LC', 'VC', 'SR', 'TT', 'US', 'UY', 'VE'].includes(c.code)
  ),
  'Asia': allCountries.filter(c => 
    ['AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE', 'IN', 'ID', 'IR', 'IQ',
     'IL', 'JP', 'JO', 'KZ', 'KW', 'KG', 'LA', 'LB', 'MY', 'MV', 'MN', 'MM', 'NP', 'KP',
     'OM', 'PK', 'PS', 'PH', 'QA', 'SA', 'SG', 'KR', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL',
     'TR', 'TM', 'AE', 'UZ', 'VN', 'YE'].includes(c.code)
  ),
  'Africa': allCountries.filter(c => 
    ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI',
     'DJ', 'EG', 'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR',
     'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW', 'ST', 'SN',
     'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW'].includes(c.code)
  ),
  'Oceania': allCountries.filter(c => 
    ['AU', 'FJ', 'KI', 'MH', 'FM', 'NR', 'NZ', 'PW', 'PG', 'WS', 'SB', 'TO', 'TV', 'VU'].includes(c.code)
  ),
};

Object.entries(continents).forEach(([continent, countries]) => {
  console.log(`\n${continent} (${countries.length}):`);
  countries.forEach((country, index) => {
    if (index % 4 === 0) console.log(''); // New line every 4 countries
    process.stdout.write(`${country.flag} ${country.code.padEnd(3)} ${country.name.padEnd(20)} `);
  });
  console.log('\n');
});

console.log('\n' + '='.repeat(80));
console.log('✅ All tests completed!\n');

