#!/bin/sh
set -e

# Wait for database to be ready if using PostgreSQL
if [ -n "$DATABASE_URL" ]; then
  echo "Waiting for database to be ready..."
  
  # Extract host and port using Node.js (Alpine-compatible)
  DB_INFO=$(node -e "
    const url = new URL('$DATABASE_URL');
    console.log(url.hostname + ' ' + (url.port || '5432'));
  ")
  DB_HOST=$(echo $DB_INFO | cut -d' ' -f1)
  DB_PORT=$(echo $DB_INFO | cut -d' ' -f2)
  
  # Wait for database connection
  timeout=30
  while ! nc -z $DB_HOST $DB_PORT; do
    timeout=$((timeout-1))
    if [ $timeout -eq 0 ]; then
      echo "Database connection timeout"
      exit 1
    fi
    echo "Waiting for database at $DB_HOST:$DB_PORT..."
    sleep 1
  done
  
  echo "Database is ready!"
fi

# Note: Database migrations should be run separately, not on every container start
# This is commented out to follow production best practices
# echo "Syncing database schema..."
# npm run db:push || echo "Database sync completed (or no changes needed)"

# Start the application
echo "Starting Handyshop Verwaltung..."
exec "$@"