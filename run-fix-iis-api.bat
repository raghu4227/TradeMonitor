@echo off
echo Fixing stale IIS api sub-application...
schtasks /Create /TN "TMFixIISApi" /XML "C:\Claude\Projects\TradeMonitor\fix-iis-api-task.xml" /F
if %errorlevel% neq 0 (echo FAILED to create task & pause & exit /b 1)
schtasks /Run /TN "TMFixIISApi"
echo Waiting 15 seconds...
timeout /t 15 /nobreak >nul
schtasks /Delete /TN "TMFixIISApi" /F >nul 2>&1
echo Done.
