<#
.SYNOPSIS
    Start Trade Monitor services (backend + frontend).
    Run this to start the app. Services persist until machine reboot or Stop-Services is called.
    For production persistence, run deploy-iis.ps1 as Administrator instead.
#>

$ROOT = "C:\Claude\Projects\TradeMonitor"
$BACKEND = "$ROOT\backend"
$FRONTEND = "$ROOT\frontend\.next\standalone"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "    [OK] $msg" -ForegroundColor Green }

# Kill any existing instances
Write-Step "Stopping any existing Trade Monitor processes..."
Get-Process -Name "uvicorn" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle -eq "" } | ForEach-Object {
    $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
    if ($cmdLine -like "*standalone*server.js*") { $_ | Stop-Process -Force }
}
Start-Sleep 1

# Start backend
Write-Step "Starting FastAPI backend on port 8000..."
$backendJob = Start-Process -FilePath "$BACKEND\venv\Scripts\uvicorn.exe" `
    -ArgumentList "main:app --host 0.0.0.0 --port 8000 --workers 1" `
    -WorkingDirectory $BACKEND `
    -RedirectStandardOutput "$BACKEND\logs\backend.log" `
    -RedirectStandardError "$BACKEND\logs\backend-error.log" `
    -WindowStyle Hidden -PassThru
Write-OK "Backend started (PID: $($backendJob.Id)) → http://localhost:8000"

# Start frontend
Write-Step "Starting Next.js frontend on port 3000..."
$env:HOSTNAME = "0.0.0.0"
$env:PORT = "3000"
$env:NODE_ENV = "production"
$frontendJob = Start-Process -FilePath "node" `
    -ArgumentList ".next\standalone\server.js" `
    -WorkingDirectory "$ROOT\frontend" `
    -RedirectStandardOutput "$ROOT\frontend\logs\frontend.log" `
    -RedirectStandardError "$ROOT\frontend\logs\frontend-error.log" `
    -WindowStyle Hidden -PassThru
Write-OK "Frontend started (PID: $($frontendJob.Id)) → http://localhost:3000"

# Wait for startup
Start-Sleep 5

# Health checks
Write-Step "Running health checks..."
try {
    $health = Invoke-RestMethod "http://localhost:8000/health"
    Write-OK "Backend health: $($health.status)"
} catch { Write-Host "    [!] Backend not responding yet - check logs\backend.log" -ForegroundColor Yellow }

try {
    $resp = Invoke-WebRequest "http://localhost:3000" -TimeoutSec 10 -UseBasicParsing
    Write-OK "Frontend health: HTTP $($resp.StatusCode)"
} catch { Write-Host "    [!] Frontend not responding yet - check logs\frontend.log" -ForegroundColor Yellow }

# Save PIDs
$pids = @{ BackendPID = $backendJob.Id; FrontendPID = $frontendJob.Id }
$pids | ConvertTo-Json | Set-Content "$ROOT\running-pids.json"

Write-Host "`n" + ("=" * 50) -ForegroundColor Green
Write-Host "  TRADE MONITOR RUNNING" -ForegroundColor Green
Write-Host ("=" * 50) -ForegroundColor Green
Write-Host "  Frontend:    http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend API: http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API Docs:    http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Logs: $BACKEND\logs\backend.log" -ForegroundColor Gray
Write-Host "  Logs: $ROOT\frontend\logs\frontend.log" -ForegroundColor Gray
Write-Host ""
Write-Host "  To stop: .\stop-services.ps1" -ForegroundColor Gray
Write-Host ""
