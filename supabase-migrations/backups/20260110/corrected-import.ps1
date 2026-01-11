# corrected-import.ps1
#
# Corrected data import script for Supabase production-to-dev migration
# Disables triggers during COPY operations to prevent FK cascade failures
#
# Created: 2026-01-10
# Context: Debug plan 20260110143000-debug-supabase-import-fk-cascade-failure.md
#
# PREREQUISITES:
# 1. Environment variable $env:eCom2026dev must be set with dev database password
# 2. Ensure production_data.sql exists in this directory
# 3. Schema must already be applied to dev database
#
# USAGE:
# cd "c:\Users\Split Lease\Documents\Split Lease\supabase-migrations\backups\20260110"
# .\corrected-import.ps1

$ErrorActionPreference = "Stop"

# Configuration
$DEV_PROJECT_ID = "qzsmhgyojmwvtjmnrdea"  # Development Supabase project
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

# File paths
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$DATA_FILE = Join-Path $SCRIPT_DIR "production_data.sql"
$LOG_FILE = Join-Path $SCRIPT_DIR "corrected_import_log_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"

# Verify data file exists
if (-not (Test-Path $DATA_FILE)) {
    Write-Host "ERROR: production_data.sql not found at $DATA_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Supabase Corrected Data Import" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Target: $DEV_DB_HOST" -ForegroundColor White
Write-Host "Data File: $DATA_FILE" -ForegroundColor White
Write-Host "Log File: $LOG_FILE" -ForegroundColor White
Write-Host ""

# Step 1: Disable triggers
Write-Host "[1/4] Disabling triggers (session_replication_role = replica)..." -ForegroundColor Yellow
$disableResult = psql $CONNECTION_STRING -c "SET session_replication_role = replica;" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to disable triggers" -ForegroundColor Red
    Write-Host $disableResult -ForegroundColor Red
    exit 1
}
Write-Host "      Triggers disabled successfully" -ForegroundColor Green

# Step 2: Import data with ON_ERROR_STOP=1
Write-Host "[2/4] Importing production data (this may take a few minutes)..." -ForegroundColor Yellow
$importStart = Get-Date

# Note: We need to disable triggers within the same session as the import
# So we create a combined SQL approach
$combinedSql = @"
SET session_replication_role = replica;
\i '$($DATA_FILE -replace '\\', '/')'
SET session_replication_role = DEFAULT;
"@

$tempSqlFile = Join-Path $SCRIPT_DIR "temp_import_commands.sql"
$combinedSql | Out-File -FilePath $tempSqlFile -Encoding UTF8

# Run the import
psql $CONNECTION_STRING `
    --file=$tempSqlFile `
    --set=ON_ERROR_STOP=1 `
    2>&1 | Tee-Object -FilePath $LOG_FILE

$importExitCode = $LASTEXITCODE
$importDuration = (Get-Date) - $importStart

# Clean up temp file
Remove-Item $tempSqlFile -Force -ErrorAction SilentlyContinue

if ($importExitCode -ne 0) {
    Write-Host "ERROR: Data import failed with exit code $importExitCode" -ForegroundColor Red
    Write-Host "Check log file for details: $LOG_FILE" -ForegroundColor Yellow

    # Still try to re-enable triggers
    Write-Host "[!] Attempting to re-enable triggers despite import failure..." -ForegroundColor Yellow
    psql $CONNECTION_STRING -c "SET session_replication_role = DEFAULT;" 2>&1
    exit 1
}

Write-Host "      Import completed in $($importDuration.TotalSeconds.ToString('F1')) seconds" -ForegroundColor Green

# Step 3: Re-enable triggers (redundant since done in SQL above, but ensure it's set)
Write-Host "[3/4] Verifying triggers are re-enabled..." -ForegroundColor Yellow
$enableResult = psql $CONNECTION_STRING -c "SHOW session_replication_role;" 2>&1
Write-Host "      session_replication_role: $($enableResult | Select-String -Pattern 'origin|replica')" -ForegroundColor White

# Force re-enable just in case
psql $CONNECTION_STRING -c "SET session_replication_role = DEFAULT;" 2>&1 | Out-Null
Write-Host "      Triggers re-enabled" -ForegroundColor Green

# Step 4: Clear sync_queue of pending items (imported data doesn't need re-sync to Bubble)
Write-Host "[4/4] Clearing sync_queue of pending items..." -ForegroundColor Yellow
$clearResult = psql $CONNECTION_STRING -c "DELETE FROM sync_queue WHERE status = 'pending'; SELECT COUNT(*) as remaining FROM sync_queue;" 2>&1
Write-Host "      $clearResult" -ForegroundColor White
Write-Host "      Sync queue cleared" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Import completed successfully!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run verification queries to compare row counts with production" -ForegroundColor White
Write-Host "2. Test application functionality with imported data" -ForegroundColor White
Write-Host ""
Write-Host "Verification query:" -ForegroundColor Yellow
Write-Host @"
SELECT 'listing' as table_name, COUNT(*) as dev_count, 312 as prod_count FROM listing
UNION ALL SELECT 'thread', COUNT(*), 800 FROM thread
UNION ALL SELECT '_message', COUNT(*), 6074 FROM "_message"
UNION ALL SELECT 'bookings_leases', COUNT(*), 197 FROM bookings_leases
UNION ALL SELECT 'listing_drafts', COUNT(*), 6 FROM listing_drafts
UNION ALL SELECT 'sync_config', COUNT(*), 5 FROM sync_config;
"@ -ForegroundColor Gray
