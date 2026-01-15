# Kill zombie Playwright/Chrome processes
# Run before starting ADW orchestrator to prevent MCP session conflicts

Write-Host "Cleaning up browser processes..." -ForegroundColor Yellow

# Kill Chrome/Chromium processes with remote debugging
Get-Process | Where-Object {
    $_.ProcessName -match "chrome|chromium|msedge" -and
    $_.CommandLine -match "remote-debugging"
} | ForEach-Object {
    Write-Host "  Killing: $($_.ProcessName) (PID: $($_.Id))"
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

# Kill any playwright processes
Get-Process | Where-Object { $_.ProcessName -match "playwright" } | ForEach-Object {
    Write-Host "  Killing: $($_.ProcessName) (PID: $($_.Id))"
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

# Kill processes on debug ports (9222, 9223, etc.)
$debugPorts = @(9222, 9223, 9224, 9225)
foreach ($port in $debugPorts) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "  Killing process on port ${port}: $($proc.ProcessName) (PID: $($proc.Id))"
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    }
}

# Clean up Playwright MCP state directories
$mcpDirs = @(
    "$env:USERPROFILE\.playwright-mcp",
    "$PWD\.playwright-mcp"
)
foreach ($dir in $mcpDirs) {
    if (Test-Path "$dir\SingletonLock") {
        Write-Host "  Removing lock file: $dir\SingletonLock"
        Remove-Item "$dir\SingletonLock" -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Browser cleanup complete." -ForegroundColor Green
