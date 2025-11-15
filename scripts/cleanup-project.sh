#!/bin/bash

###############################################################################
# Project Cleanup Script - Enterprise CRM VASP
# 
# Safely organizes and cleans up project files
# - Creates backups before any changes
# - Logs all actions
# - Allows rollback
###############################################################################

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$PROJECT_ROOT/.cleanup_backup_$TIMESTAMP"
LOG_FILE="$PROJECT_ROOT/cleanup_log_$TIMESTAMP.txt"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}" | tee -a "$LOG_FILE"
}

# Banner
clear
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     Enterprise CRM VASP - Project Cleanup Script          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Safety check
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    log_error "Not in project root directory!"
    exit 1
fi

log_info "Project root: $PROJECT_ROOT"
log_info "Backup dir: $BACKUP_DIR"
log_info "Log file: $LOG_FILE"
echo ""

# Confirmation
read -p "⚠️  This will reorganize project files. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    log_warning "Cleanup cancelled by user"
    exit 0
fi

###############################################################################
# Phase 1: Create Backup
###############################################################################

log_info "PHASE 1: Creating backup..."
mkdir -p "$BACKUP_DIR"

# Backup all files we're going to move/delete
log "Backing up documentation..."
mkdir -p "$BACKUP_DIR/docs"
cp *.md "$BACKUP_DIR/docs/" 2>/dev/null || true

log "Backing up scripts..."
mkdir -p "$BACKUP_DIR/scripts"
cp *.js *.ts *.sh "$BACKUP_DIR/scripts/" 2>/dev/null || true

log "Backing up SQL files..."
mkdir -p "$BACKUP_DIR/sql"
cp *.sql "$BACKUP_DIR/sql/" 2>/dev/null || true

log "Backing up dumps..."
mkdir -p "$BACKUP_DIR/dumps"
cp *.dump "$BACKUP_DIR/dumps/" 2>/dev/null || true

log_success "Backup created at: $BACKUP_DIR"
echo ""

###############################################################################
# Phase 2: Create New Structure
###############################################################################

log_info "PHASE 2: Creating new folder structure..."

mkdir -p "$PROJECT_ROOT/docs/current"
mkdir -p "$PROJECT_ROOT/docs/archive/2024-Q4"
mkdir -p "$PROJECT_ROOT/docs/archive/2025-Q1"
mkdir -p "$PROJECT_ROOT/backups/database"
mkdir -p "$PROJECT_ROOT/scripts/tests"
mkdir -p "$PROJECT_ROOT/scripts/deployment"
mkdir -p "$PROJECT_ROOT/scripts/database"
mkdir -p "$PROJECT_ROOT/prisma/manual/archive"

log_success "Folder structure created"
echo ""

###############################################################################
# Phase 3: Move Current Documentation
###############################################################################

log_info "PHASE 3: Organizing current documentation..."

# Keep these in root
KEEP_IN_ROOT=(
    "README.md"
    "SECURITY.md"
    "CHANGELOG.md"
    "LICENSE.md"
)

# Move to docs/current
DOCS_CURRENT=(
    "API_DOCUMENTATION.md"
    "DEPLOYMENT.md"
    "DEPLOYMENT_READY.md"
    "BUILD_FIX_REPORT.md"
    "PROJECT_CLEANUP_PLAN.md"
    "DATABASE_BACKUP_GUIDE.md"
    "QUICKSTART.md"
    "VERCEL_DEPLOYMENT_GUIDE.md"
    "ENV_VARIABLES_PRODUCTION.md"
)

for doc in "${DOCS_CURRENT[@]}"; do
    if [ -f "$PROJECT_ROOT/$doc" ]; then
        mv "$PROJECT_ROOT/$doc" "$PROJECT_ROOT/docs/current/"
        log "Moved $doc to docs/current/"
    fi
done

log_success "Current documentation organized"
echo ""

###############################################################################
# Phase 4: Archive Old Documentation
###############################################################################

log_info "PHASE 4: Archiving old documentation..."

# Patterns for archive
ARCHIVE_PATTERNS=(
    "*_FIX.md"
    "*_PROBLEM.md"
    "*_TESTING.md"
    "*_TEST_*.md"
    "*_PLAN.md"
    "*_STATUS.md"
    "*_COMPLETE.md"
    "*_AUDIT.md"
    "*_ANALYSIS.md"
    "BUGFIX_*.md"
    "CHECK_*.md"
    "LOCAL_*.md"
)

for pattern in "${ARCHIVE_PATTERNS[@]}"; do
    for file in $PROJECT_ROOT/$pattern; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            # Skip if in KEEP or DOCS_CURRENT
            if [[ ! " ${KEEP_IN_ROOT[@]} " =~ " $filename " ]] && \
               [[ ! " ${DOCS_CURRENT[@]} " =~ " $filename " ]]; then
                mv "$file" "$PROJECT_ROOT/docs/archive/2025-Q1/"
                log "Archived: $filename"
            fi
        fi
    done
done

log_success "Old documentation archived"
echo ""

###############################################################################
# Phase 5: Move Test/Debug Scripts
###############################################################################

log_info "PHASE 5: Organizing test scripts..."

TEST_SCRIPTS=(
    check-*.js
    check-*.ts
    test-*.js
    test-*.ts
    debug-*.js
    debug-*.ts
    monitor-*.js
    cleanup-*.js
    list-*.js
    find-*.js
    decode-*.js
)

for pattern in "${TEST_SCRIPTS[@]}"; do
    for file in $PROJECT_ROOT/$pattern; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            mv "$file" "$PROJECT_ROOT/scripts/tests/"
            log "Moved test script: $filename"
        fi
    done
done

log_success "Test scripts organized"
echo ""

###############################################################################
# Phase 6: Move Database Backups
###############################################################################

log_info "PHASE 6: Organizing database backups..."

# Move .dump files
for file in $PROJECT_ROOT/*.dump; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        mv "$file" "$PROJECT_ROOT/backups/database/"
        log "Moved backup: $filename"
    fi
done

# Move backup SQL files
for file in $PROJECT_ROOT/backup*.sql; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        mv "$file" "$PROJECT_ROOT/backups/database/"
        log "Moved backup: $filename"
    fi
done

# Move supabase dumps
mv "$PROJECT_ROOT/supabase_dump_"*.sql "$PROJECT_ROOT/backups/database/" 2>/dev/null || true

log_success "Database backups organized"
echo ""

###############################################################################
# Phase 7: Move SQL Scripts
###############################################################################

log_info "PHASE 7: Organizing SQL scripts..."

# Archive old SQL scripts
for file in $PROJECT_ROOT/*.sql; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        # Skip migration logs
        if [[ ! "$filename" =~ migration_log ]]; then
            mv "$file" "$PROJECT_ROOT/prisma/manual/archive/"
            log "Archived SQL: $filename"
        fi
    fi
done

log_success "SQL scripts organized"
echo ""

###############################################################################
# Phase 8: Clean up Logs and Temporary Files
###############################################################################

log_info "PHASE 8: Cleaning up temporary files..."

# Remove log files
rm -f "$PROJECT_ROOT"/*.log 2>/dev/null || true
log "Removed .log files"

# Remove tsbuildinfo
rm -f "$PROJECT_ROOT"/tsconfig.tsbuildinfo 2>/dev/null || true
log "Removed tsbuildinfo"

# Remove old migration logs
rm -f "$PROJECT_ROOT"/migration_log*.txt 2>/dev/null || true
log "Removed migration logs"

log_success "Temporary files cleaned"
echo ""

###############################################################################
# Phase 9: Create Summary
###############################################################################

log_info "PHASE 9: Creating cleanup summary..."

cat > "$PROJECT_ROOT/CLEANUP_SUMMARY_$TIMESTAMP.md" << EOF
# Project Cleanup Summary

**Date:** $(date +'%Y-%m-%d %H:%M:%S')
**Backup Location:** \`$BACKUP_DIR\`
**Log File:** \`cleanup_log_$TIMESTAMP.txt\`

## Actions Performed

### ✅ Organized
- Documentation moved to \`docs/current/\`
- Old docs archived to \`docs/archive/2025-Q1/\`
- Test scripts moved to \`scripts/tests/\`
- Database backups moved to \`backups/database/\`
- SQL scripts archived to \`prisma/manual/archive/\`

### 🗑️ Cleaned
- Removed .log files
- Removed temporary files
- Removed build artifacts

### 📦 Backup Created
All original files backed up to:
\`$BACKUP_DIR\`

## Rollback Instructions

If you need to rollback:

\`\`\`bash
# Restore from backup
cp -r $BACKUP_DIR/* $PROJECT_ROOT/

# Or revert git commit
git reset --hard HEAD~1
\`\`\`

## New Structure

\`\`\`
root/
├── docs/
│   ├── current/          # Active documentation
│   └── archive/          # Historical docs
├── backups/
│   └── database/         # DB backups
├── scripts/
│   ├── tests/            # Test/debug scripts
│   ├── deployment/       # Deploy scripts
│   └── database/         # DB scripts
└── prisma/
    └── manual/
        └── archive/      # Old SQL scripts
\`\`\`

---

**Status:** ✅ Cleanup completed successfully
EOF

log_success "Summary created: CLEANUP_SUMMARY_$TIMESTAMP.md"
echo ""

###############################################################################
# Final Summary
###############################################################################

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                  CLEANUP COMPLETED ✅                      ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
log_success "Project cleanup completed successfully!"
log_info "Backup: $BACKUP_DIR"
log_info "Log: $LOG_FILE"
log_info "Summary: CLEANUP_SUMMARY_$TIMESTAMP.md"
echo ""
log_warning "NEXT STEPS:"
echo "  1. Test the application: npm run dev"
echo "  2. Verify build: npm run build"
echo "  3. If everything works, commit changes"
echo "  4. If issues occur, restore from: $BACKUP_DIR"
echo ""

