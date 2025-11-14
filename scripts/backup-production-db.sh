#!/bin/bash
# Production Database Backup Script
# Creates a backup before applying performance indexes

set -e  # Exit on error

echo "🔒 Starting production database backup..."
echo ""

# Supabase connection (production)
PROD_URL="postgres://postgres.rltqjdujiacriilmijpz:sYWtAE9nQNkViy3E@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"

# Backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups"
BACKUP_FILE="${BACKUP_DIR}/production_backup_${TIMESTAMP}.sql"

# Create backups directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "📦 Backup will be saved to: $BACKUP_FILE"
echo ""

# Create backup (schema + data)
echo "⏳ Creating backup (this may take 1-2 minutes)..."
pg_dump "$PROD_URL" \
  --verbose \
  --no-owner \
  --no-acl \
  --format=plain \
  --file="$BACKUP_FILE" \
  2>&1 | grep -E "^(dumping|reading)"

# Check if backup was successful
if [ $? -eq 0 ] && [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo ""
    echo "✅ Backup completed successfully!"
    echo "📁 File: $BACKUP_FILE"
    echo "📊 Size: $BACKUP_SIZE"
    echo ""
    
    # Show backup summary
    echo "📋 Backup contains:"
    grep -E "^-- (Name|Type):" "$BACKUP_FILE" | head -20
    echo ""
    
    echo "🔐 Backup is ready. Safe to proceed with migrations."
    echo ""
    echo "To restore (if needed):"
    echo "  psql \$DATABASE_URL < $BACKUP_FILE"
else
    echo ""
    echo "❌ Backup failed!"
    exit 1
fi

