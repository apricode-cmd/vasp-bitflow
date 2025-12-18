/**
 * Check if a specific correlationId exists in BCB
 */

import { readFileSync } from 'fs';
import { glob } from 'glob';

const correlationIdToSearch = process.argv[2];

if (!correlationIdToSearch) {
  console.log('Usage: npx tsx scripts/search-correlation-id.ts <correlationId>');
  console.log('');
  console.log('Example:');
  console.log('  npx tsx scripts/search-correlation-id.ts e1d726d5-cea0-11ef-a0fa-d9371feddfc0');
  process.exit(1);
}

// Find latest BCB dump file
const files = glob.sync('logs/bcb-virtual-ibans-*.json');
if (files.length === 0) {
  console.error('No BCB data files found. Run fetch-bcb-virtual-ibans.ts first.');
  process.exit(1);
}

const latestFile = files.sort().reverse()[0];
console.log(`📂 Reading: ${latestFile}`);
console.log(`🔍 Searching for correlationId: ${correlationIdToSearch}`);
console.log('');

const data = JSON.parse(readFileSync(latestFile, 'utf-8'));

const account = data.accounts.find((acc: any) => 
  acc.correlationId === correlationIdToSearch
);

if (account) {
  console.log('✅ FOUND!');
  console.log('');
  console.log(JSON.stringify(account, null, 2));
} else {
  console.log('❌ NOT FOUND in BCB response');
  console.log('');
  console.log(`Total accounts checked: ${data.totalAccounts}`);
  console.log(`Timestamp: ${data.timestamp}`);
  console.log('');
  console.log('💡 Possible reasons:');
  console.log('  1. Account was created after BCB data was fetched');
  console.log('  2. CorrelationId is incorrect');
  console.log('  3. Account creation failed on BCB side');
  console.log('  4. Account was deleted/closed');
}

