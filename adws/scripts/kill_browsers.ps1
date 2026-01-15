# Kill ALL Playwright/Chrome/Chromium processes - Nuclear option
# Run before starting ADW orchestrator to prevent MCP session conflicts

Write-Host "=== NUCLEAR BROWSER CLEANUP ===" -ForegroundColor Red

# Step 1: Kill ALL Chrome/Chromium/Edge processes (not just remote-debugging ones)
Write-Host "`n[1/4] Killing ALL browser processes..." -ForegroundColor Yellow
$browsers = Get-Process -Name chrome, chromium, msedge -ErrorAction SilentlyContinue
if ($browsers) {
    $browsers | ForEach-Object {
        Write-Host "  Killing: $($_.ProcessName) (PID: $($_.Id))"
    }
    $browsers | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
} else {
    Write-Host "  No browser processes found"
}

# Step 2: Kill node/npx processes that might be MCP servers
Write-Host "`n[2/4] Killing node/npx processes (MCP servers)..." -ForegroundColor Yellow
$nodeProcs = Get-Process -Name node, npx -ErrorAction SilentlyContinue
if ($nodeProcs) {
    $nodeProcs | ForEach-Object {
        Write-Host "  Killing: $($_.ProcessName) (PID: $($_.Id))"
    }
    $nodeProcs | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
} else {
    Write-Host "  No node/npx processes found"
}

# Step 3: Clean up ALL Playwright MCP user data directories (lock files)
Write-Host "`n[3/4] Removing Playwright lock files..." -ForegroundColor Yellow
$mcpDirs = @(
    "$env:LOCALAPPDATA\ms-playwright\mcp-chrome-host-live",
    "$env:LOCALAPPDATA\ms-playwright\mcp-chrome-host-dev",
    "$env:LOCALAPPDATA\ms-playwright\mcp-chrome-guest-live",
    "$env:LOCALAPPDATA\ms-playwright\mcp-chrome-guest-dev",
    "$env:USERPROFILE\.playwright-mcp",
    "$PWD\.playwright-mcp"
)

foreach ($dir in $mcpDirs) {
    $lockFile = Join-Path $dir "SingletonLock"
    $socketFile = Join-Path $dir "SingletonSocket"
    $cookieFile = Join-Path $dir "SingletonCookie"

    foreach ($file in @($lockFile, $socketFile, $cookieFile)) {
        if (Test-Path $file) {
            Write-Host "  Removing: $file"
            Remove-Item $file -Force -ErrorAction SilentlyContinue
        }
    }

    # Also check for Default/Singleton* files
    $defaultDir = Join-Path $dir "Default"
    if (Test-Path $defaultDir) {
        Get-ChildItem "$defaultDir\Singleton*" -ErrorAction SilentlyContinue | ForEach-Object {
            Write-Host "  Removing: $($_.FullName)"
            Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
        }
    }
}

# Step 4: Release any ports that might be held
Write-Host "`n[4/4] Checking debug ports..." -ForegroundColor Yellow
$debugPorts = @(9222, 9223, 9224, 9225, 9226, 9227, 9228, 9229)
foreach ($port in $debugPorts) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "  Port ${port}: Killing $($proc.ProcessName) (PID: $($proc.Id))"
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "`n=== CLEANUP COMPLETE ===" -ForegroundColor Green
Write-Host "You may now restart Claude Code or the ADW orchestrator." -ForegroundColor Cyan
