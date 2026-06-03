@echo off
echo Installing TradeMonitor backend as a persistent Windows service...

schtasks /Create /TN "TMBackendSetup" /XML "C:\Claude\Projects\TradeMonitor\backend-setup-task.xml" /F
if %errorlevel% neq 0 (
    echo FAILED to create setup task - try running as Administrator
    pause
    exit /b 1
)

schtasks /Run /TN "TMBackendSetup"
echo Setup task started. Waiting 20 seconds for completion...
timeout /t 20 /nobreak

type "C:\Claude\Projects\TradeMonitor\backend-service-result.txt" 2>nul || echo No result file yet

schtasks /Delete /TN "TMBackendSetup" /F >nul 2>&1
echo Done. TradeMonitorBackend task is now registered to auto-start on boot.
pause
