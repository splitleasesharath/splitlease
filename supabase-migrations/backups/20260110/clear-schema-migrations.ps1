# clear-schema-migrations.ps1
#
# Clears the schema_migrations table before data import
# This table is metadata about migrations and should not be imported from production
#
# Created: 2026-01-10

$ErrorActionPreference = "Stop"

# Configuration
$DEV_PROJECT_ID = "qzsmhgyojmwvtjmnrdea"
$DEV_DB_HOST = "db.$DEV_PROJECT_ID.supabase.co"
$DEV_DB_PORT = "5432"
$DEV_DB_NAME = "postgres"
$DEV_DB_USER = "postgres"

# Get password from environment variable
$DB_PASSWORD = $env:eCom2026dev
if (-not $DB_PASSWORD) {
    Write-Host "ERROR: eCom2026dev environment variable not set" -ForegroundColor Red
    exit 1
}

# Connection string
$CONNECTION_STRING = "postgresql://${DEV_DB_USER}:${DB_PASSWORD}@${DEV_DB_HOST}:${DEV_DB_PORT}/${DEV_DB_NAME}"

Write-Host "Clearing schema_migrations table..." -ForegroundColor Yellow

# Truncate schema_migrations (it's in supabase_migrations schema)
psql $CONNECTION_STRING -c "TRUNCATE TABLE supabase_migrations.schema_migrations;" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "schema_migrations cleared successfully!" -ForegroundColor Green
} else {
    Write-Host "Failed to clear schema_migrations" -ForegroundColor Red
    exit 1
}
