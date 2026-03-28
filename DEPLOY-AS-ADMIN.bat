@echo off
:: ================================================================
:: Trade Monitor — IIS Deploy (RIGHT-CLICK → RUN AS ADMINISTRATOR)
:: ================================================================
echo.
echo   Trade Monitor IIS Deployment
echo   ================================
echo.

:: Verify admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo   [ERROR] This script must be run as Administrator.
    echo   Right-click the file and select "Run as Administrator"
    pause
    exit /b 1
)

echo   [OK] Running as Administrator
echo.

:: Download and install HttpPlatformHandler if needed
if not exist "C:\Windows\System32\inetsrv\httpPlatformHandler.dll" (
    echo   Downloading HttpPlatformHandler from Microsoft...
    powershell -Command "Invoke-WebRequest 'https://go.microsoft.com/fwlink/?LinkId=690721' -OutFile '%TEMP%\hph.msi' -UseBasicParsing"
    msiexec /i "%TEMP%\hph.msi" /quiet /norestart
    echo   HttpPlatformHandler installed.
) else (
    echo   [OK] HttpPlatformHandler already present.
)

:: Run PowerShell deployment script
echo.
echo   Running IIS configuration...
powershell.exe -ExecutionPolicy Bypass -NonInteractive -File "C:\Claude\Projects\TradeMonitor\deploy-iis-logged.ps1"

echo.
echo   ================================================
echo   DONE. URLs:
echo   Frontend:    http://localhost:3000
echo   Backend API: http://localhost:8000
echo   API Docs:    http://localhost:8000/docs
echo   ================================================
echo.
pause
