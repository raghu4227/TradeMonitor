# This script creates and runs a SYSTEM-level scheduled task to deploy IIS config
# No admin prompt needed for schtasks + SYSTEM

$scriptPath = "C:\Claude\Projects\TradeMonitor\deploy-iis-logged.ps1"
$taskName = "TradeMonitorIISDeploy"

# Register task as SYSTEM (elevated, no UAC prompt needed for this call)
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -NonInteractive -File `"$scriptPath`""
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(5)

Register-ScheduledTask -TaskName $taskName -Action $action -Principal $principal `
    -Settings $settings -Trigger $trigger -Force | Out-Null

Write-Host "Task registered. Running now..."
Start-ScheduledTask -TaskName $taskName

# Wait for completion
$timeout = 120
$elapsed = 0
do {
    Start-Sleep 3
    $elapsed += 3
    $state = (Get-ScheduledTask -TaskName $taskName).State
    Write-Host "  Task state: $state (${elapsed}s elapsed)"
} while ($state -eq "Running" -and $elapsed -lt $timeout)

Write-Host "Task completed. Reading log..."
Start-Sleep 2

if (Test-Path "C:\Claude\Projects\TradeMonitor\deploy-log.txt") {
    Get-Content "C:\Claude\Projects\TradeMonitor\deploy-log.txt"
} else {
    Write-Host "Log not found. Script may have failed to start."
}

# Cleanup
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
