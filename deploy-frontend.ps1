# deploy-frontend.ps1 — copies Next.js standalone build to IIS wwwroot
$src = "C:\Claude\Projects\TradeMonitor\frontend\.next\standalone"
$dst = "C:\inetpub\wwwroot\TradeMonitor"
$result = "C:\Claude\Projects\TradeMonitor\deploy-frontend-result.txt"

Import-Module WebAdministration -ErrorAction SilentlyContinue

# Stop app pool so files aren't locked
try { Stop-WebAppPool -Name "TradeMonitor" -ErrorAction SilentlyContinue; Start-Sleep 2 } catch {}

# Copy standalone build
robocopy $src $dst /E /NFL /NDL /NJH /NJS /NC /NS /NP *>&1 | Out-Null

# Copy static assets
$staticSrc = "C:\Claude\Projects\TradeMonitor\frontend\.next\static"
$staticDst = "$dst\.next\static"
New-Item -Path $staticDst -ItemType Directory -Force | Out-Null
robocopy $staticSrc $staticDst /E /NFL /NDL /NJH /NJS /NC /NS /NP *>&1 | Out-Null

"[OK] Frontend deployed to $dst" | Set-Content $result

# Restart app pool
try { Start-WebAppPool -Name "TradeMonitor" -ErrorAction SilentlyContinue } catch {}
"[OK] App pool restarted" | Add-Content $result
Write-Host (Get-Content $result)
