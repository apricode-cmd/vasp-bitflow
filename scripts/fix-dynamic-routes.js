#!/usr/bin/env node
/**
 * Script to add 'export const dynamic = "force-dynamic"' to API routes
 * that don't already have it
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const API_DIR = path.join(__dirname, '../src/app/api');

async function fixRouteFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has dynamic export
    if (content.includes('export const dynamic')) {
      console.log(`✓ Skipped (already has dynamic): ${filePath}`);
      return false;
    }
    
    // Skip if it's NextAuth route (handles its own config)
    if (filePath.includes('[...nextauth]')) {
      console.log(`✓ Skipped (NextAuth): ${filePath}`);
      return false;
    }
    
    // Add dynamic export at the top of the file (after imports)
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Find last import statement
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ') || 
          lines[i].trim().startsWith('import{') ||
          lines[i].trim().startsWith('import{')) {
        insertIndex = i + 1;
      }
    }
    
    // Insert after imports, before any other code
    const dynamicExport = "\n// Force dynamic rendering for API route\nexport const dynamic = 'force-dynamic';\n";
    lines.splice(insertIndex, 0, dynamicExport);
    
    const newContent = lines.join('\n');
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Finding API route files...\n');
  
  // Find all route.ts files in api directory
  const pattern = path.join(API_DIR, '**/route.ts');
  const files = await glob(pattern.replace(/\\/g, '/'));
  
  console.log(`Found ${files.length} API route files\n`);
  
  let fixed = 0;
  let skipped = 0;
  
  for (const file of files) {
    const wasFixed = await fixRouteFile(file);
    if (wasFixed) {
      fixed++;
    } else {
      skipped++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Fixed: ${fixed} files`);
  console.log(`⏭️  Skipped: ${skipped} files`);
  console.log('='.repeat(50));
}

main().catch(console.error);

