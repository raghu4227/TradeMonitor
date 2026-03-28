#Requires -RunAsAdministrator
$logFile = "C:\Claude\Projects\TradeMonitor\deploy-log.txt"
Start-Transcript -Path $logFile -Force

$ErrorActionPreference = "Continue"
$ROOT = "C:\Claude\Projects\TradeMonitor"
$BACKEND_PATH = "$ROOT\backend"
$FRONTEND_PATH = "$ROOT\frontend"
$BACKEND_PORT = 8000
$FRONTEND_PORT = 3000

Write-Host "=== Trade Monitor IIS Deployment ===" -ForegroundColor Cyan
Write-Host "Root: $ROOT"
Write-Host "Running as: $([Security.Principal.WindowsIdentity]::GetCurrent().Name)"

# Check HttpPlatformHandler
$hphDll = "C:\Windows\System32\inetsrv\httpPlatformHandler.dll"
Write-Host "`n[1] Checking HttpPlatformHandler..."
if (-not (Test-Path $hphDll)) {
    Write-Host "    Not found. Downloading from Microsoft..."
    $msiPath = "$env:TEMP\HttpPlatformHandler_amd64.msi"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri "https://go.microsoft.com/fwlink/?LinkId=690721" -OutFile $msiPath -UseBasicParsing -TimeoutSec 120
        Write-Host "    Downloaded. Installing..."
        $msiResult = Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /quiet /norestart /log `"$env:TEMP\hph-install.log`"" -Wait -PassThru
        Write-Host "    MSI exit code: $($msiResult.ExitCode)"
    } catch {
        Write-Host "    ERROR downloading: $_"
    }
} else {
    Write-Host "    HttpPlatformHandler found: $hphDll"
}

# Load IIS module
Write-Host "`n[2] Loading WebAdministration module..."
try {
    Import-Module WebAdministration -Force
    Write-Host "    Loaded."
} catch {
    Write-Host "    ERROR: $_"
    Stop-Transcript; exit 1
}

# Create log directories
Write-Host "`n[3] Creating log directories..."
New-Item -Path "$BACKEND_PATH\logs"  -ItemType Directory -Force | Out-Null
New-Item -Path "$FRONTEND_PATH\logs" -ItemType Directory -Force | Out-Null
Write-Host "    Done."

# Remove old sites/pools if exist
Write-Host "`n[4] Cleaning up old sites and pools..."
foreach ($site in @("TradeMonitorBackend","TradeMonitorFrontend")) {
    if (Get-Website -Name $site -ErrorAction SilentlyContinue) {
        Stop-Website -Name $site -ErrorAction SilentlyContinue
        Remove-Website -Name $site
        Write-Host "    Removed site: $site"
    }
}
foreach ($pool in @("TradeMonitorBackend","TradeMonitorFrontend")) {
    if (Test-Path "IIS:\AppPools\$pool") {
        Stop-WebAppPool -Name $pool -ErrorAction SilentlyContinue
        Remove-WebAppPool -Name $pool
        Write-Host "    Removed pool: $pool"
    }
}

# Create App Pools
Write-Host "`n[5] Creating Application Pools..."
foreach ($pool in @("TradeMonitorBackend","TradeMonitorFrontend")) {
    New-WebAppPool -Name $pool
    Set-ItemProperty "IIS:\AppPools\$pool" managedRuntimeVersion ""
    Set-ItemProperty "IIS:\AppPools\$pool" enable32BitAppOnWin64 $false
    Set-ItemProperty "IIS:\AppPools\$pool" startMode "AlwaysRunning"
    Set-ItemProperty "IIS:\AppPools\$pool" processModel.idleTimeout "00:00:00"
    Write-Host "    Created pool: $pool"
}

# Create Sites
Write-Host "`n[6] Creating IIS Sites..."
New-Website -Name "TradeMonitorBackend"  -ApplicationPool "TradeMonitorBackend"  -PhysicalPath $BACKEND_PATH  -Port $BACKEND_PORT  -Force
Write-Host "    Site TradeMonitorBackend -> port $BACKEND_PORT"
New-Website -Name "TradeMonitorFrontend" -ApplicationPool "TradeMonitorFrontend" -PhysicalPath $FRONTEND_PATH -Port $FRONTEND_PORT -Force
Write-Host "    Site TradeMonitorFrontend -> port $FRONTEND_PORT"

# Set permissions
Write-Host "`n[7] Setting permissions..."
foreach ($item in @(
    @{Pool="TradeMonitorBackend";  Path=$BACKEND_PATH},
    @{Pool="TradeMonitorFrontend"; Path=$FRONTEND_PATH}
)) {
    try {
        $acl = Get-Acl $item.Path
        $rule1 = New-Object System.Security.AccessControl.FileSystemAccessRule("IIS_IUSRS","FullControl","ContainerInherit,ObjectInherit","None","Allow")
        $rule2 = New-Object System.Security.AccessControl.FileSystemAccessRule("IIS AppPool\$($item.Pool)","FullControl","ContainerInherit,ObjectInherit","None","Allow")
        $acl.SetAccessRule($rule1)
        $acl.SetAccessRule($rule2)
        Set-Acl $item.Path $acl
        Write-Host "    Permissions set on $($item.Path)"
    } catch { Write-Host "    WARN permissions: $_" }
}

# Firewall
Write-Host "`n[8] Opening firewall ports..."
foreach ($port in @($BACKEND_PORT, $FRONTEND_PORT)) {
    Remove-NetFirewallRule -DisplayName "TradeMonitor-$port" -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "TradeMonitor-$port" -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow | Out-Null
    Write-Host "    Port $port opened."
}

# Start
Write-Host "`n[9] Starting sites and pools..."
foreach ($pool in @("TradeMonitorBackend","TradeMonitorFrontend")) {
    Start-WebAppPool -Name $pool
    Write-Host "    Started pool: $pool"
}
foreach ($site in @("TradeMonitorBackend","TradeMonitorFrontend")) {
    Start-Website -Name $site
    Write-Host "    Started site: $site"
}

# Check status
Write-Host "`n[10] Final status:"
Get-Website | Where-Object {$_.Name -like "TradeMonitor*"} | Select-Object Name,State,@{n='Port';e={($_.Bindings.Collection | Select -First 1).bindingInformation}} | Format-Table
Get-WebAppPool | Where-Object {$_.Name -like "TradeMonitor*"} | Select-Object Name,State | Format-Table

Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host "Frontend:    http://localhost:$FRONTEND_PORT"
Write-Host "Backend API: http://localhost:$BACKEND_PORT"
Write-Host "API Docs:    http://localhost:$BACKEND_PORT/docs"

Stop-Transcript
