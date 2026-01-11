# full-reimport.ps1
#
# Complete workflow: Clear all data + Import production data
# This ensures data is cleared and immediately imported in one atomic operation
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
    Write-Host "Set it with: `$env:eCom2026dev = 'your-dev-password'" -ForegroundColor Yellow
    exit 1
}

# Connection string
$CONNECTION_STRING = "postgresql://${DEV_DB_USER}:${DB_PASSWORD}@${DEV_DB_HOST}:${DEV_DB_PORT}/${DEV_DB_NAME}"

# File paths
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$DATA_FILE = Join-Path $SCRIPT_DIR "production_data.sql"
$LOG_FILE = Join-Path $SCRIPT_DIR "full_reimport_log_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"

# Verify data file exists
if (-not (Test-Path $DATA_FILE)) {
    Write-Host "ERROR: production_data.sql not found at $DATA_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Supabase Full Re-Import Workflow" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Target: $DEV_DB_HOST" -ForegroundColor White
Write-Host "Data File: $DATA_FILE" -ForegroundColor White
Write-Host "Log File: $LOG_FILE" -ForegroundColor White
Write-Host ""
Write-Host "WARNING: This will DELETE ALL data and re-import from production!" -ForegroundColor Red
Write-Host ""

# Confirmation prompt
$confirmation = Read-Host "Type 'YES' to confirm"
if ($confirmation -ne 'YES') {
    Write-Host "Operation cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# Step 1: Clear all data
Write-Host "[1/5] Clearing all existing data..." -ForegroundColor Yellow

$clearSql = @"
DO `$`$
DECLARE
    r RECORD;
BEGIN
    SET session_replication_role = replica;

    -- Truncate all tables in all user schemas
    FOR r IN (SELECT tablename, schemaname FROM pg_tables WHERE schemaname IN ('public', 'reference_table', 'junctions')) LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
    END LOOP;

    -- Clear schema_migrations
    TRUNCATE TABLE supabase_migrations.schema_migrations;

    SET session_replication_role = DEFAULT;
END `$`$;
"@

# Temporarily allow errors for psql (NOTICE messages trigger PowerShell errors)
$previousErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"

$clearOutput = psql $CONNECTION_STRING -c $clearSql 2>&1
$clearExitCode = $LASTEXITCODE

$ErrorActionPreference = $previousErrorAction

if ($clearExitCode -ne 0) {
    Write-Host "ERROR: Failed to clear data (exit code: $clearExitCode)" -ForegroundColor Red
    Write-Host $clearOutput -ForegroundColor Red
    exit 1
}
Write-Host "      All data cleared successfully" -ForegroundColor Green

# Step 2: Create combined SQL that disables triggers, imports, re-enables triggers
Write-Host "[2/5] Preparing import with triggers disabled..." -ForegroundColor Yellow

$combinedSql = @"
SET session_replication_role = replica;
\i '$($DATA_FILE -replace '\\', '/')'
SET session_replication_role = DEFAULT;
"@

$tempSqlFile = Join-Path $SCRIPT_DIR "temp_full_import.sql"
$combinedSql | Out-File -FilePath $tempSqlFile -Encoding UTF8

Write-Host "      Import script prepared" -ForegroundColor Green

# Step 3: Run import
Write-Host "[3/5] Importing production data (this may take several minutes)..." -ForegroundColor Yellow
$importStart = Get-Date

# Temporarily allow errors for psql
$ErrorActionPreference = "Continue"

psql $CONNECTION_STRING `
    --file=$tempSqlFile `
    --set=ON_ERROR_STOP=1 `
    2>&1 | Tee-Object -FilePath $LOG_FILE

$importExitCode = $LASTEXITCODE
$importDuration = (Get-Date) - $importStart

$ErrorActionPreference = $previousErrorAction

# Clean up temp file
Remove-Item $tempSqlFile -Force -ErrorAction SilentlyContinue

if ($importExitCode -ne 0) {
    Write-Host "ERROR: Data import failed with exit code $importExitCode" -ForegroundColor Red
    Write-Host "Check log file for details: $LOG_FILE" -ForegroundColor Yellow

    # Still try to re-enable triggers
    Write-Host "[!] Attempting to re-enable triggers despite import failure..." -ForegroundColor Yellow
    psql $CONNECTION_STRING -c "SET session_replication_role = DEFAULT;" 2>&1 | Out-Null
    exit 1
}

Write-Host "      Import completed in $($importDuration.TotalSeconds.ToString('F1')) seconds" -ForegroundColor Green

# Step 4: Verify triggers re-enabled
Write-Host "[4/5] Verifying triggers are re-enabled..." -ForegroundColor Yellow
$ErrorActionPreference = "Continue"
psql $CONNECTION_STRING -c "SET session_replication_role = DEFAULT;" 2>&1 | Out-Null
$ErrorActionPreference = $previousErrorAction
Write-Host "      Triggers re-enabled" -ForegroundColor Green

# Step 5: Clear sync_queue
Write-Host "[5/5] Clearing sync_queue of pending items..." -ForegroundColor Yellow
$ErrorActionPreference = "Continue"
psql $CONNECTION_STRING -c "DELETE FROM sync_queue WHERE status = 'pending';" 2>&1 | Out-Null
$ErrorActionPreference = $previousErrorAction
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
