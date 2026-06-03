@echo off
schtasks /Create /TN "TMDeploy" /XML "C:\Claude\Projects\TradeMonitor\deploy-task.xml" /F
if %errorlevel% neq 0 goto :fail
schtasks /Run /TN "TMDeploy"
echo Task started. Waiting 30s...
timeout /t 30 /nobreak
type "C:\Claude\Projects\TradeMonitor\deploy-result.txt" 2>nul || echo No result yet
schtasks /Delete /TN "TMDeploy" /F >nul 2>&1
goto :end
:fail
echo FAILED to register task
:end
