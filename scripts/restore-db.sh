#!/bin/bash

# Database Restore Script for Apricode Exchange
# Restores database from a backup file

set -e

# Check if backup file is provided
if [ -z "$1" ]; then
  echo "❌ Please provide backup file path"
  echo "Usage: npm run db:restore <backup-file>"
  echo ""
  echo "Available backups:"
  ls -1t ./backups/backup_*.sql 2>/dev/null | head -5
  exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

DB_URL="${DATABASE_URL}"

if [ -z "$DB_URL" ]; then
  echo "❌ DATABASE_URL not found in .env"
  exit 1
fi

# Parse connection string
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "⚠️  WARNING: This will restore database from backup"
echo "   Database: $DB_NAME"
echo "   Backup: $BACKUP_FILE"
echo ""
read -p "Are you sure? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
  echo "❌ Restore cancelled"
  exit 1
fi

echo "📦 Restoring database from backup..."

# Drop existing database and recreate
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"

# Restore from backup
PGPASSWORD=$DB_PASS pg_restore \
  -h $DB_HOST \
  -p $DB_PORT \
  -U $DB_USER \
  -d $DB_NAME \
  --no-owner \
  --no-acl \
  $BACKUP_FILE

if [ $? -eq 0 ]; then
  echo "✅ Database restored successfully!"
  echo "   From: $BACKUP_FILE"
  exit 0
else
  echo "❌ Restore failed!"
  exit 1
fi

