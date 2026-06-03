# register-backend-task.ps1
# Creates a persistent TradeMonitorBackend scheduled task for the current user.
# No admin rights required — uses AtLogon trigger + S4U (runs even when not logged in).

$TaskName = "TradeMonitorBackend"
$Python   = "C:\Claude\Projects\TradeMonitor\backend\venv\Scripts\python.exe"
$Args     = "-m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1"
$WorkDir  = "C:\Claude\Projects\TradeMonitor\backend"
$User     = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

Write-Host "[INFO] Registering task for user: $User"

# Kill any existing uvicorn on port 8000
$conn = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "[INFO] Killed existing uvicorn (PID $($conn.OwningProcess))"
    Start-Sleep -Seconds 2
}

# Remove existing task
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[INFO] Removed old task"
}

# Action: run uvicorn from backend directory
$action = New-ScheduledTaskAction `
    -Execute          $Python `
    -Argument         $Args `
    -WorkingDirectory $WorkDir

# Trigger: at logon for this user (fires on reboot+login or unlock)
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $User

# Settings: no time limit, restart up to 10 times every 1 min if it crashes
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit  ([TimeSpan]::Zero) `
    -RestartCount        10 `
    -RestartInterval     (New-TimeSpan -Minutes 1) `
    -StartWhenAvailable `
    -MultipleInstances   IgnoreNew

# Principal: current user, S4U (no stored password, can run without interactive session)
$principal = New-ScheduledTaskPrincipal `
    -UserId    $User `
    -LogonType S4U `
    -RunLevel  Limited

# Register
try {
    Register-ScheduledTask `
        -TaskName   $TaskName `
        -Action     $action `
        -Trigger    $trigger `
        -Settings   $settings `
        -Principal  $principal `
        -Description "TradeMonitor FastAPI backend - auto-start on login, restart on failure"
    Write-Host "[OK] Task registered: $TaskName"
} catch {
    Write-Host "[ERROR] Failed to register task: $_"
    exit 1
}

# Start immediately
Start-ScheduledTask -TaskName $TaskName
Write-Host "[INFO] Task started immediately"
Start-Sleep -Seconds 8

# Verify
$listen = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($listen) {
    Write-Host "[SUCCESS] Backend LISTENING on port 8000 (PID $($listen.OwningProcess))"
} else {
    Write-Host "[WARN] Port 8000 not yet listening - starting directly..."

    # Fallback: start uvicorn directly in background via Start-Process
    Start-Process -FilePath $Python `
        -ArgumentList $Args `
        -WorkingDirectory $WorkDir `
        -WindowStyle Hidden `
        -PassThru | Select-Object Id | ForEach-Object { Write-Host "[INFO] Started uvicorn PID: $($_.Id)" }

    Start-Sleep -Seconds 6
    $listen2 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
    if ($listen2) {
        Write-Host "[SUCCESS] Backend LISTENING on port 8000 (PID $($listen2.OwningProcess)) via fallback"
    } else {
        Write-Host "[ERROR] Could not start backend. Check logs."
    }
}

Write-Host "[DONE] $(Get-Date)"
