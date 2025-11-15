#!/usr/bin/env node
/**
 * Find Unused Files in Project
 * 
 * Analyzes TypeScript/React project to find:
 * - Orphan components (not imported anywhere)
 * - Unused utilities
 * - Dead code
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

// Colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

// Files to always skip
const SKIP_FILES = new Set([
  'globals.css',
  'legal-styles.css',
  'presets.json',
  'sumsub_postman.json',
  'middleware.ts', // Root middleware
  'auth.ts', // Auth configs
  'auth-admin.ts',
  'auth-client.ts',
  'build_errod.log',
  'page.tsx.disabled'
]);

// Directories to skip
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'api', // API routes are entry points
  '(admin)', // Route groups
  '(auth)',
  '(client)',
  '(public)'
]);

// Entry points (always used)
const ENTRY_POINTS = new Set([
  'layout.tsx',
  'page.tsx',
  'loading.tsx',
  'error.tsx',
  'not-found.tsx',
  'route.ts', // API routes
  'middleware.ts'
]);

class UnusedFileFinder {
  constructor() {
    this.allFiles = new Map(); // file path -> file info
    this.imports = new Map(); // file path -> Set of imported files
    this.usedFiles = new Set();
    this.stats = {
      total: 0,
      analyzed: 0,
      used: 0,
      unused: 0
    };
  }

  // Find all source files
  findAllFiles(dir, files = []) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(SRC_DIR, fullPath);
        
        if (entry.isDirectory()) {
          const dirName = entry.name;
          if (!SKIP_DIRS.has(dirName) && !dirName.startsWith('.')) {
            this.findAllFiles(fullPath, files);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (['.ts', '.tsx', '.js', '.jsx'].includes(ext) && !SKIP_FILES.has(entry.name)) {
            files.push({
              fullPath,
              relativePath,
              name: entry.name,
              isEntryPoint: ENTRY_POINTS.has(entry.name)
            });
          }
        }
      }
    } catch (err) {
      // Skip inaccessible directories
    }
    
    return files;
  }

  // Extract imports from file content
  extractImports(content, filePath) {
    const imports = new Set();
    const fileDir = path.dirname(filePath);
    
    // Match various import patterns
    const patterns = [
      // import ... from '...'
      /import\s+(?:{[^}]+}|[\w*]+)\s+from\s+['"]([^'"]+)['"]/g,
      // import '...'
      /import\s+['"]([^'"]+)['"]/g,
      // require('...')
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      // dynamic import()
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        let importPath = match[1];
        
        // Skip external packages
        if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
          continue;
        }
        
        // Resolve @/ alias
        if (importPath.startsWith('@/')) {
          importPath = importPath.replace('@/', 'src/');
        } else {
          // Resolve relative path
          importPath = path.join(fileDir, importPath);
          importPath = path.relative(PROJECT_ROOT, importPath);
        }
        
        // Try different extensions
        const possiblePaths = [
          importPath,
          `${importPath}.ts`,
          `${importPath}.tsx`,
          `${importPath}.js`,
          `${importPath}.jsx`,
          `${importPath}/index.ts`,
          `${importPath}/index.tsx`,
        ];
        
        for (const p of possiblePaths) {
          const fullPath = path.join(PROJECT_ROOT, p);
          if (fs.existsSync(fullPath)) {
            imports.add(path.relative(SRC_DIR, fullPath));
            break;
          }
        }
      }
    }
    
    return imports;
  }

  // Analyze all files and their imports
  analyzeFiles() {
    console.log(`${BLUE}🔍 Analyzing project files...${RESET}\n`);
    
    const files = this.findAllFiles(SRC_DIR);
    this.stats.total = files.length;
    
    console.log(`Found ${files.length} source files\n`);
    
    // Read all files and extract imports
    for (const file of files) {
      this.allFiles.set(file.relativePath, file);
      
      try {
        const content = fs.readFileSync(file.fullPath, 'utf8');
        const imports = this.extractImports(content, file.fullPath);
        this.imports.set(file.relativePath, imports);
        this.stats.analyzed++;
      } catch (err) {
        console.error(`${RED}Error reading ${file.relativePath}${RESET}`);
      }
    }
    
    console.log(`${GREEN}✅ Analyzed ${this.stats.analyzed} files${RESET}\n`);
  }

  // Mark file and its dependencies as used
  markAsUsed(filePath, visited = new Set()) {
    if (visited.has(filePath)) return;
    visited.add(filePath);
    
    if (!this.allFiles.has(filePath)) return;
    
    this.usedFiles.add(filePath);
    
    // Recursively mark imported files as used
    const imports = this.imports.get(filePath) || new Set();
    for (const importPath of imports) {
      this.markAsUsed(importPath, visited);
    }
  }

  // Find unused files by starting from entry points
  findUnused() {
    console.log(`${BLUE}🔍 Tracing file dependencies...${RESET}\n`);
    
    // Start from all entry points
    for (const [filePath, file] of this.allFiles) {
      if (file.isEntryPoint) {
        this.markAsUsed(filePath);
      }
    }
    
    // Find unused files
    const unused = [];
    for (const [filePath, file] of this.allFiles) {
      if (!this.usedFiles.has(filePath)) {
        unused.push(file);
      }
    }
    
    this.stats.used = this.usedFiles.size;
    this.stats.unused = unused.length;
    
    return unused;
  }

  // Generate report
  generateReport(unusedFiles) {
    console.log(`${'='.repeat(70)}`);
    console.log(`${GREEN}📊 ANALYSIS COMPLETE${RESET}`);
    console.log(`${'='.repeat(70)}\n`);
    
    console.log(`Total files analyzed: ${this.stats.analyzed}`);
    console.log(`${GREEN}✅ Used files: ${this.stats.used}${RESET}`);
    console.log(`${YELLOW}⚠️  Potentially unused: ${this.stats.unused}${RESET}\n`);
    
    if (unusedFiles.length === 0) {
      console.log(`${GREEN}🎉 No unused files found!${RESET}\n`);
      return;
    }
    
    // Group by directory
    const byDir = new Map();
    for (const file of unusedFiles) {
      const dir = path.dirname(file.relativePath);
      if (!byDir.has(dir)) {
        byDir.set(dir, []);
      }
      byDir.get(dir).push(file);
    }
    
    console.log(`${YELLOW}📂 POTENTIALLY UNUSED FILES:${RESET}\n`);
    
    for (const [dir, files] of Array.from(byDir.entries()).sort()) {
      console.log(`${BLUE}${dir}/${RESET}`);
      for (const file of files) {
        console.log(`  ${YELLOW}⚠️  ${file.name}${RESET}`);
      }
      console.log();
    }
    
    // Save to file
    const reportPath = path.join(PROJECT_ROOT, 'UNUSED_FILES_REPORT.md');
    this.saveReport(reportPath, unusedFiles, byDir);
    
    console.log(`\n${GREEN}📄 Detailed report saved to: UNUSED_FILES_REPORT.md${RESET}\n`);
  }

  saveReport(reportPath, unusedFiles, byDir) {
    let report = `# 🔍 Unused Files Analysis Report\n\n`;
    report += `**Date:** ${new Date().toISOString().split('T')[0]}\n`;
    report += `**Total Files:** ${this.stats.analyzed}\n`;
    report += `**Used:** ${this.stats.used}\n`;
    report += `**Potentially Unused:** ${this.stats.unused}\n\n`;
    
    report += `---\n\n`;
    report += `## ⚠️ Potentially Unused Files\n\n`;
    report += `**Warning:** These files appear to be unused, but verify before deleting:\n`;
    report += `- May be used dynamically\n`;
    report += `- May be future features\n`;
    report += `- May be referenced in non-TS files\n\n`;
    
    for (const [dir, files] of Array.from(byDir.entries()).sort()) {
      report += `### \`${dir}/\`\n\n`;
      for (const file of files) {
        report += `- \`${file.name}\`\n`;
      }
      report += `\n`;
    }
    
    report += `---\n\n`;
    report += `## 📋 Recommendations\n\n`;
    report += `1. **Review each file** - May have dynamic imports\n`;
    report += `2. **Check git history** - May be work in progress\n`;
    report += `3. **Test after removal** - Verify nothing breaks\n`;
    report += `4. **Keep backup** - Use git to revert if needed\n\n`;
    
    fs.writeFileSync(reportPath, report, 'utf8');
  }
}

// Main execution
async function main() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         🔍 Unused Files Finder - Enterprise Edition          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('\n');
  
  const finder = new UnusedFileFinder();
  
  // Step 1: Analyze all files
  finder.analyzeFiles();
  
  // Step 2: Find unused files
  const unusedFiles = finder.findUnused();
  
  // Step 3: Generate report
  finder.generateReport(unusedFiles);
  
  console.log(`${BLUE}💡 Next steps:${RESET}`);
  console.log(`  1. Review UNUSED_FILES_REPORT.md`);
  console.log(`  2. Verify files are actually unused`);
  console.log(`  3. Create backup before deletion`);
  console.log(`  4. Test thoroughly after removal\n`);
}

main().catch(console.error);

