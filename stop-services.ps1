<#  Stop Trade Monitor services  #>
$ROOT = "C:\Claude\Projects\TradeMonitor"
$pidFile = "$ROOT\running-pids.json"

if (Test-Path $pidFile) {
    $pids = Get-Content $pidFile | ConvertFrom-Json
    if ($pids.BackendPID) {
        Stop-Process -Id $pids.BackendPID -Force -ErrorAction SilentlyContinue
        Write-Host "[OK] Backend stopped (PID $($pids.BackendPID))" -ForegroundColor Green
    }
    if ($pids.FrontendPID) {
        Stop-Process -Id $pids.FrontendPID -Force -ErrorAction SilentlyContinue
        Write-Host "[OK] Frontend stopped (PID $($pids.FrontendPID))" -ForegroundColor Green
    }
    Remove-Item $pidFile
} else {
    Write-Host "[!] No PID file found. Killing by process name..." -ForegroundColor Yellow
    Get-Process uvicorn -ErrorAction SilentlyContinue | Stop-Process -Force
}
Write-Host "Trade Monitor stopped." -ForegroundColor Cyan
