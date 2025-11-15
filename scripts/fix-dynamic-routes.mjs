#!/usr/bin/env node
/**
 * Script to add 'export const dynamic = "force-dynamic"' to API routes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_DIR = path.join(__dirname, '../src/app/api');

function findRouteFiles(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      try {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          findRouteFiles(filePath, fileList);
        } else if (file === 'route.ts') {
          fileList.push(filePath);
        }
      } catch (err) {
        // Skip inaccessible files/directories
        console.warn(`⚠️  Skipped (permission denied): ${path.join(dir, file)}`);
      }
    });
  } catch (err) {
    // Skip inaccessible directories
    console.warn(`⚠️  Skipped directory (permission denied): ${dir}`);
  }
  
  return fileList;
}

function fixRouteFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has dynamic export
    if (content.includes('export const dynamic')) {
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(`⏭️  ${relativePath}`);
      return false;
    }
    
    // Skip if it's NextAuth route
    if (filePath.includes('[...nextauth]')) {
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(`⏭️  ${relativePath} (NextAuth)`);
      return false;
    }
    
    // Add dynamic export at the beginning
    const dynamicExport = "// Force dynamic rendering for API route\nexport const dynamic = 'force-dynamic';\n\n";
    const newContent = dynamicExport + content;
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`✅ ${relativePath}`);
    return true;
  } catch (error) {
    const relativePath = path.relative(process.cwd(), filePath);
    console.error(`❌ ${relativePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔍 Finding API route files...\n');
  
  const files = findRouteFiles(API_DIR);
  console.log(`\nFound ${files.length} API route files\n`);
  
  let fixed = 0;
  let skipped = 0;
  
  for (const file of files) {
    const wasFixed = fixRouteFile(file);
    if (wasFixed) {
      fixed++;
    } else {
      skipped++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Fixed: ${fixed} files`);
  console.log(`⏭️  Skipped: ${skipped} files`);
  console.log('='.repeat(60));
  console.log('\nDone! Run "npm run build" to verify the fix.');
}

main();
