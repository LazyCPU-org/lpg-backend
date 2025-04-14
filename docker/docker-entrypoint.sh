#!/bin/sh
set -e

# Print environment information
echo "Running in ${NODE_ENV:-development} mode (${ENV:-local} environment)"

# Extract database connection details from DATABASE_URL or use defaults
DB_HOST=${DB_HOST:-postgres}
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-lpg_db}

# Wait for database to be ready
if [ "$WAIT_FOR_DB" = "true" ]; then
  echo "Waiting for database to be ready..."

  # Simple retry mechanism
  max_attempts=30
  attempt=0
  until pg_isready -h $DB_HOST -U $DB_USER -d $DB_NAME || [ $attempt -eq $max_attempts ]; do
    attempt=$((attempt+1))
    echo "Waiting for database... attempt $attempt of $max_attempts"
    sleep 2
  done

  if [ $attempt -eq $max_attempts ]; then
    echo "Database connection failed after $max_attempts attempts"
    exit 1
  fi

  echo "Database is ready"
fi

# Run migrations if enabled
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Running database migrations..."
  npm run db:push
fi

# Run the superadmin seed if enabled
if [ "$ENABLE_DATA_SEED" = "true" ]; then
  echo "Seeding superadmin account..."
  npm run db:seed

  echo "Superadmin seeding complete"
fi

# Execute the main command (start your application)
echo "Starting application..."
exec "$@"