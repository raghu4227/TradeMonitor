#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Deploy Trade Monitor to IIS with HttpPlatformHandler.
    Run this script as Administrator.

.DESCRIPTION
    1. Installs HttpPlatformHandler (if not present)
    2. Creates App Pools: TradeMonitorBackend, TradeMonitorFrontend
    3. Creates IIS Sites: TradeMonitorBackend (port 8000), TradeMonitorFrontend (port 3000)
    4. Grants permissions to app pool identities
    5. Starts both sites
#>

$ErrorActionPreference = "Stop"
$ROOT = "C:\Claude\Projects\TradeMonitor"
$BACKEND_PATH = "$ROOT\backend"
$FRONTEND_PATH = "$ROOT\frontend"
$BACKEND_PORT = 8000
$FRONTEND_PORT = 3000

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-WARN($msg) { Write-Host "    [!] $msg" -ForegroundColor Yellow }

# ── Step 1: Check / Install HttpPlatformHandler ────────────────────────────────
Write-Step "Checking HttpPlatformHandler..."
$hphDll = "C:\Windows\System32\inetsrv\httpPlatformHandler.dll"
if (-not (Test-Path $hphDll)) {
    Write-WARN "HttpPlatformHandler not found. Downloading..."
    $msiUrl = "https://go.microsoft.com/fwlink/?LinkId=690721"
    $msiPath = "$env:TEMP\HttpPlatformHandler_amd64.msi"
    try {
        Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath -UseBasicParsing -TimeoutSec 60
        Write-OK "Downloaded MSI."
        Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /quiet /norestart" -Wait
        Write-OK "HttpPlatformHandler installed."
    } catch {
        Write-Host "    [FAIL] Could not install HttpPlatformHandler automatically." -ForegroundColor Red
        Write-Host "    Download manually from: https://www.iis.net/downloads/microsoft/httpplatformhandler" -ForegroundColor Yellow
        Write-Host "    Then re-run this script." -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-OK "HttpPlatformHandler already installed."
}

# ── Step 2: Import IIS module ──────────────────────────────────────────────────
Write-Step "Loading IIS WebAdministration module..."
Import-Module WebAdministration -ErrorAction Stop
Write-OK "Module loaded."

# ── Step 3: Create log directories ────────────────────────────────────────────
Write-Step "Creating log directories..."
New-Item -Path "$BACKEND_PATH\logs"  -ItemType Directory -Force | Out-Null
New-Item -Path "$FRONTEND_PATH\logs" -ItemType Directory -Force | Out-Null
Write-OK "Log directories ready."

# ── Step 4: Create App Pools ───────────────────────────────────────────────────
Write-Step "Creating Application Pools..."

foreach ($pool in @("TradeMonitorBackend", "TradeMonitorFrontend")) {
    if (Test-Path "IIS:\AppPools\$pool") {
        Write-WARN "$pool app pool already exists — reconfiguring."
        Remove-WebAppPool -Name $pool
    }
    New-WebAppPool -Name $pool
    Set-ItemProperty "IIS:\AppPools\$pool" -Name managedRuntimeVersion -Value ""    # No Managed Code
    Set-ItemProperty "IIS:\AppPools\$pool" -Name enable32BitAppOnWin64  -Value $false
    Set-ItemProperty "IIS:\AppPools\$pool" -Name startMode              -Value "AlwaysRunning"
    Set-ItemProperty "IIS:\AppPools\$pool" -Name processModel.idleTimeout -Value "00:00:00"
    Set-ItemProperty "IIS:\AppPools\$pool" -Name recycling.periodicRestart.time -Value "00:00:00"
    Write-OK "App pool '$pool' created (No Managed Code, Always Running)."
}

# ── Step 5: Create IIS Sites ───────────────────────────────────────────────────
Write-Step "Creating IIS Sites..."

function Create-Site($name, $pool, $path, $port) {
    if (Get-Website -Name $name -ErrorAction SilentlyContinue) {
        Write-WARN "Site '$name' exists — removing."
        Remove-Website -Name $name
    }
    New-Website -Name $name -ApplicationPool $pool -PhysicalPath $path `
                -Port $port -HostHeader "" -Force
    Write-OK "Site '$name' created at http://localhost:$port (path: $path)"
}

Create-Site "TradeMonitorBackend"  "TradeMonitorBackend"  $BACKEND_PATH  $BACKEND_PORT
Create-Site "TradeMonitorFrontend" "TradeMonitorFrontend" $FRONTEND_PATH $FRONTEND_PORT

# ── Step 6: Grant IIS_IUSRS permissions ────────────────────────────────────────
Write-Step "Setting directory permissions..."
foreach ($path in @($BACKEND_PATH, $FRONTEND_PATH)) {
    $acl = Get-Acl $path
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        "IIS_IUSRS", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow"
    )
    $acl.SetAccessRule($rule)
    Set-Acl $path $acl
    Write-OK "IIS_IUSRS FullControl granted on $path"
}

# Grant app pool identities
foreach ($item in @(
    @{Pool="TradeMonitorBackend"; Path=$BACKEND_PATH},
    @{Pool="TradeMonitorFrontend"; Path=$FRONTEND_PATH}
)) {
    $identity = "IIS AppPool\$($item.Pool)"
    $acl = Get-Acl $item.Path
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        $identity, "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow"
    )
    $acl.SetAccessRule($rule)
    Set-Acl $item.Path $acl
    Write-OK "Pool identity '$identity' granted FullControl."
}

# ── Step 7: Start Sites & Pools ────────────────────────────────────────────────
Write-Step "Starting App Pools and Sites..."
foreach ($pool in @("TradeMonitorBackend", "TradeMonitorFrontend")) {
    Start-WebAppPool -Name $pool
    Write-OK "App pool '$pool' started."
}
foreach ($site in @("TradeMonitorBackend", "TradeMonitorFrontend")) {
    Start-Website -Name $site
    Write-OK "Site '$site' started."
}

# ── Step 8: Open firewall ports ────────────────────────────────────────────────
Write-Step "Opening firewall ports..."
foreach ($port in @($BACKEND_PORT, $FRONTEND_PORT)) {
    $ruleName = "TradeMonitor-$port"
    Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP `
                        -LocalPort $port -Action Allow | Out-Null
    Write-OK "Firewall: TCP $port allowed."
}

# ── Summary ────────────────────────────────────────────────────────────────────
Write-Host "`n" + ("=" * 60) -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:    http://localhost:$FRONTEND_PORT" -ForegroundColor Cyan
Write-Host "  Backend API: http://localhost:$BACKEND_PORT" -ForegroundColor Cyan
Write-Host "  API Docs:    http://localhost:$BACKEND_PORT/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "  IMPORTANT: Configure the database connection:" -ForegroundColor Yellow
Write-Host "  Edit: $BACKEND_PATH\.env" -ForegroundColor Yellow
Write-Host "  Then restart the backend app pool:" -ForegroundColor Yellow
Write-Host "  Restart-WebAppPool -Name TradeMonitorBackend" -ForegroundColor Yellow
Write-Host ""
