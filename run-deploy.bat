@echo off
schtasks /Create /TN TradeMonitorDeploy /TR "powershell.exe -ExecutionPolicy Bypass -NonInteractive -File C:\Claude\Projects\TradeMonitor\deploy-iis-logged.ps1" /SC ONCE /ST 00:00 /RL HIGHEST /RU SYSTEM /F
schtasks /Run /TN TradeMonitorDeploy
echo Deployment task started. Check log at: C:\Claude\Projects\TradeMonitor\deploy-log.txt
