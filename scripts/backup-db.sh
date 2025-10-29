#!/bin/bash

# Database Backup Script for Apricode Exchange
# Creates timestamped backup before any schema changes

set -e

# Load environment variables
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
elif [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Extract database connection info from DATABASE_URL
DB_URL="${DATABASE_URL}"

if [ -z "$DB_URL" ]; then
  echo "❌ DATABASE_URL not found - cannot create backup"
  exit 1
fi

# Parse connection string
DB_URL_CLEAN="${DB_URL#postgresql://}"
DB_URL_CLEAN="${DB_URL_CLEAN#postgres://}"

# Check if password exists (format: user:password@host or just user@host)
if [[ "$DB_URL_CLEAN" == *":"*"@"* ]]; then
  # Has password: user:password@host:port/database
  DB_USER=$(echo "$DB_URL_CLEAN" | cut -d':' -f1)
  DB_PASS=$(echo "$DB_URL_CLEAN" | cut -d':' -f2 | cut -d'@' -f1)
  HOST_PORT=$(echo "$DB_URL_CLEAN" | cut -d'@' -f2 | cut -d'/' -f1)
else
  # No password: user@host:port/database (uses system auth)
  DB_USER=$(echo "$DB_URL_CLEAN" | cut -d'@' -f1)
  DB_PASS=""
  HOST_PORT=$(echo "$DB_URL_CLEAN" | cut -d'@' -f2 | cut -d'/' -f1)
fi

DB_HOST=$(echo "$HOST_PORT" | cut -d':' -f1)
DB_PORT=$(echo "$HOST_PORT" | cut -d':' -f2)
DB_NAME=$(echo "$DB_URL_CLEAN" | grep -o '/[^?]*' | cut -d'/' -f2)

# Create backups directory
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${TIMESTAMP}.sql"

echo "📦 Creating database backup..."
echo "   Database: $DB_NAME"
echo "   Host: $DB_HOST:$DB_PORT"
echo "   User: $DB_USER"
echo "   File: $BACKUP_FILE"

# Create backup using pg_dump
if [ -n "$DB_PASS" ]; then
  export PGPASSWORD="$DB_PASS"
fi

pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-acl \
  -F c \
  -f "$BACKUP_FILE"

BACKUP_EXIT_CODE=$?

if [ $BACKUP_EXIT_CODE -eq 0 ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "✅ Backup created successfully!"
  echo "   Size: $SIZE"
  echo "   Location: $BACKUP_FILE"
  
  # Keep only last 10 backups
  echo ""
  echo "🧹 Cleaning old backups (keeping last 10)..."
  BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup_*.sql 2>/dev/null | wc -l | tr -d ' ')
  
  if [ "$BACKUP_COUNT" -gt 10 ]; then
    ls -t "$BACKUP_DIR"/backup_*.sql | tail -n +11 | xargs rm -f
    echo "   Removed $((BACKUP_COUNT - 10)) old backup(s)"
  fi
  
  REMAINING=$(ls -1 "$BACKUP_DIR"/backup_*.sql 2>/dev/null | wc -l | tr -d ' ')
  echo "   Backups in storage: $REMAINING"
  
  exit 0
else
  echo "❌ Backup failed with exit code $BACKUP_EXIT_CODE"
  echo "   This may be due to:"
  echo "   - PostgreSQL not installed or not in PATH"
  echo "   - Incorrect DATABASE_URL credentials"
  echo "   - Database server not accessible"
  exit 1
fi

