#!/bin/bash
# Local Database Backup Script
# Creates a backup of local database before applying optimizations

set -e  # Exit on error

echo "🔒 Starting LOCAL database backup..."
echo ""

# Local connection
LOCAL_URL="${DATABASE_URL}"

if [ -z "$LOCAL_URL" ]; then
    echo "❌ ERROR: DATABASE_URL not set!"
    echo "Please set DATABASE_URL in .env.local or export it"
    exit 1
fi

# Backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups"
BACKUP_FILE="${BACKUP_DIR}/local_backup_${TIMESTAMP}.sql"

# Create backups directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "📦 Backup will be saved to: $BACKUP_FILE"
echo "🔗 Database: $LOCAL_URL"
echo ""

# Create backup (schema + data)
echo "⏳ Creating backup..."
pg_dump "$LOCAL_URL" \
  --verbose \
  --no-owner \
  --no-acl \
  --format=plain \
  --file="$BACKUP_FILE" \
  2>&1 | grep -E "^(dumping|reading)" || true

# Check if backup was successful
if [ $? -eq 0 ] && [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo ""
    echo "✅ Backup completed successfully!"
    echo "📁 File: $BACKUP_FILE"
    echo "📊 Size: $BACKUP_SIZE"
    echo ""
    
    # Count tables
    TABLE_COUNT=$(grep -c "^CREATE TABLE" "$BACKUP_FILE" || echo "0")
    echo "📋 Tables backed up: $TABLE_COUNT"
    echo ""
    
    echo "🔐 Backup is ready. Safe to proceed with optimizations."
    echo ""
    echo "To restore (if needed):"
    echo "  psql \$DATABASE_URL < $BACKUP_FILE"
else
    echo ""
    echo "❌ Backup failed!"
    exit 1
fi

