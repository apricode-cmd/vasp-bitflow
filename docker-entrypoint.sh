#!/bin/sh
set -e

echo "🚀 Starting Apricode Exchange..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
until npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "✅ Database is ready!"

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Optional: Seed database if SEED_DATABASE=true
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  npx prisma db seed || echo "⚠️  Seeding skipped or failed"
fi

echo "✅ Setup complete! Starting application..."

# Execute the CMD
exec "$@"

