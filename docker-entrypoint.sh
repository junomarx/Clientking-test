#!/bin/sh
set -e

# Enhanced Docker entrypoint for Handyshop Verwaltung
echo "🚀 Starting Handyshop Verwaltung Container..."

# Wait for database health if using PostgreSQL
if [ -n "$DATABASE_URL" ]; then
  echo "🔍 Running database health check..."
  
  # Use our dedicated health check script
  if command -v node >/dev/null 2>&1; then
    node scripts/wait-for-db.js
    if [ $? -eq 0 ]; then
      echo "✅ Database health check passed"
    else
      echo "❌ Database health check failed"
      exit 1
    fi
  else
    echo "⚠️  Node.js not available, falling back to basic TCP check"
    
    # Fallback: Extract host and port for basic connectivity check
    DB_INFO=$(echo $DATABASE_URL | sed -E 's|.*://[^@]*@([^:/]+)(:([0-9]+))?.*|\1 \3|')
    DB_HOST=$(echo $DB_INFO | cut -d' ' -f1)
    DB_PORT=$(echo $DB_INFO | cut -d' ' -f2)
    if [ -z "$DB_PORT" ]; then
      DB_PORT=5432
    fi
    
    # Wait for database connection with timeout
    timeout=30
    while ! nc -z $DB_HOST $DB_PORT; do
      timeout=$((timeout-1))
      if [ $timeout -eq 0 ]; then
        echo "❌ Database connection timeout"
        exit 1
      fi
      echo "⏳ Waiting for database at $DB_HOST:$DB_PORT..."
      sleep 1
    done
    
    echo "✅ Database TCP connection successful"
  fi
else
  echo "⚠️  No DATABASE_URL provided, skipping database checks"
fi

# Note: Database migrations are now handled by a separate service in docker-compose.yml
# This ensures migrations run exactly once before the main application starts

# Start the application
echo "🌟 Starting main application..."
exec "$@"