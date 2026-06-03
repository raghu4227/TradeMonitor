# setup-backend-service.ps1
# Registers TradeMonitorBackend as a persistent scheduled task (SYSTEM, boot trigger).
# Must be run elevated (via the TMBackendSetup one-shot task).

$TaskName   = "TradeMonitorBackend"
$TaskXml    = "C:\Claude\Projects\TradeMonitor\backend-task.xml"
$ResultFile = "C:\Claude\Projects\TradeMonitor\backend-service-result.txt"

"[$(Get-Date)] Starting backend service registration" | Set-Content $ResultFile

# Kill any existing uvicorn on port 8000
$conn = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    "[INFO] Killed existing uvicorn (PID $($conn.OwningProcess))" | Add-Content $ResultFile
    Start-Sleep -Seconds 2
}

# Remove existing task if present
$existing = schtasks /Query /TN $TaskName 2>&1
if ($LASTEXITCODE -eq 0) {
    schtasks /Delete /TN $TaskName /F | Out-Null
    "[INFO] Removed old task" | Add-Content $ResultFile
}

# Register via XML (runs as SYSTEM, boot trigger)
$out = schtasks /Create /TN $TaskName /XML $TaskXml /F 2>&1
"[INFO] schtasks create: $out" | Add-Content $ResultFile

if ($LASTEXITCODE -ne 0) {
    "[ERROR] Failed to register task: $out" | Add-Content $ResultFile
    exit 1
}

"[INFO] Task registered successfully" | Add-Content $ResultFile

# Start immediately
schtasks /Run /TN $TaskName | Out-Null
"[INFO] Task started" | Add-Content $ResultFile

Start-Sleep -Seconds 8

# Verify
$listen = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($listen) {
    "[SUCCESS] Backend LISTENING on port 8000 (PID $($listen.OwningProcess))" | Add-Content $ResultFile
    Write-Host "[SUCCESS] Backend is running on port 8000"
} else {
    "[WARN] Port 8000 not yet listening after start" | Add-Content $ResultFile
    Write-Host "[WARN] Port 8000 not listening - check backend-service-result.txt"
}

"[DONE] $(Get-Date)" | Add-Content $ResultFile
