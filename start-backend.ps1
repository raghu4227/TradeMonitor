# start-backend.ps1
# Supervisor loop: starts uvicorn and restarts it automatically if it crashes.
# Working directory set explicitly so SQLite relative path resolves correctly.

$BackendDir  = "C:\Claude\Projects\TradeMonitor\backend"
$Python      = "$BackendDir\venv\Scripts\python.exe"
$UvicornArgs = "-m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1"
$LogFile     = "$BackendDir\logs\uvicorn.log"

New-Item -ItemType Directory -Force -Path "$BackendDir\logs" | Out-Null
Set-Location $BackendDir

$restarts = 0
while ($true) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $LogFile -Value "[$ts] Starting uvicorn (restart #$restarts)..."

    $proc = Start-Process -FilePath $Python `
        -ArgumentList $UvicornArgs `
        -WorkingDirectory $BackendDir `
        -NoNewWindow `
        -PassThru `
        -Wait

    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $LogFile -Value "[$ts] Uvicorn exited (code $($proc.ExitCode)). Restarting in 5s..."
    $restarts++
    Start-Sleep -Seconds 5
}
