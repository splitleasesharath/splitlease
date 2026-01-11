# clear-dev-data.ps1
#
# Clears all data from development database before re-import
# Truncates tables in reverse FK dependency order to avoid constraint violations
#
# Created: 2026-01-10
#
# PREREQUISITES:
# 1. Environment variable $env:eCom2026dev must be set with dev database password
#
# USAGE:
# cd "c:\Users\Split Lease\Documents\Split Lease\supabase-migrations\backups\20260110"
# .\clear-dev-data.ps1

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
    Write-Host "Set it with: `$env:eCom2026dev = 'your-dev-password'" -ForegroundColor Yellow
    exit 1
}

# Connection string
$CONNECTION_STRING = "postgresql://${DEV_DB_USER}:${DB_PASSWORD}@${DEV_DB_HOST}:${DEV_DB_PORT}/${DEV_DB_NAME}"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Clear Development Database Data" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Target: $DEV_DB_HOST" -ForegroundColor White
Write-Host ""
Write-Host "WARNING: This will delete ALL data from the development database!" -ForegroundColor Red
Write-Host ""

# Confirmation prompt
$confirmation = Read-Host "Type 'YES' to confirm you want to clear all data"
if ($confirmation -ne 'YES') {
    Write-Host "Operation cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Clearing all data from ALL schemas (public, reference_table, junctions)..." -ForegroundColor Yellow

# SQL to truncate all tables in all user schemas (public, reference_table, junctions)
# Using CASCADE to handle FK dependencies automatically
$truncateSql = @"
DO `$`$
DECLARE
    r RECORD;
BEGIN
    -- Disable triggers to avoid any trigger-related issues
    SET session_replication_role = replica;

    -- Truncate all tables in all user schemas
    FOR r IN (SELECT tablename, schemaname FROM pg_tables WHERE schemaname IN ('public', 'reference_table', 'junctions')) LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
    END LOOP;

    -- Re-enable triggers
    SET session_replication_role = DEFAULT;
END `$`$;
"@

# Execute truncate
psql $CONNECTION_STRING -c $truncateSql 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "All data cleared successfully!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run the import script:" -ForegroundColor Cyan
    Write-Host ".\corrected-import.ps1" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "ERROR: Failed to clear data" -ForegroundColor Red
    exit 1
}
