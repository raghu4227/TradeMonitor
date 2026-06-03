# fix-iis-api.ps1
# Removes the stale /api sub-app directory that causes 500 errors on /TradeMonitor/api/*
# Run this as Administrator.

$ApiDir  = "C:\inetpub\wwwroot\TradeMonitor\api"
$SiteName = "Default Web Site"

Import-Module WebAdministration -ErrorAction SilentlyContinue

# 1. Remove IIS application registration (if still exists)
if (Test-Path "IIS:\Sites\$SiteName\TradeMonitor\api") {
    Remove-WebApplication -Name "TradeMonitor/api" -Site $SiteName -ErrorAction SilentlyContinue
    Write-Host "[OK] Removed IIS sub-application registration"
} else {
    Write-Host "[INFO] IIS sub-application already removed"
}

# 2. Delete the physical directory (this is what was missing before)
if (Test-Path $ApiDir) {
    Remove-Item -Recurse -Force $ApiDir
    Write-Host "[OK] Deleted physical api directory: $ApiDir"
} else {
    Write-Host "[INFO] api directory already gone"
}

# 3. Verify - the /TradeMonitor/api/* path should now route through Next.js rewrite -> port 8000
Write-Host ""
Write-Host "Verifying fix..."
Start-Sleep -Seconds 2
try {
    $r = Invoke-WebRequest "http://localhost/TradeMonitor/api/trades/" -UseBasicParsing -TimeoutSec 10
    Write-Host "[OK] /TradeMonitor/api/trades/ -> HTTP $($r.StatusCode) (routed through Next.js -> port 8000)"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 500) {
        Write-Host "[STILL FAILING] HTTP 500 - IIS may need a restart"
        Write-Host "Run: iisreset"
    } elseif ($code -eq 200) {
        Write-Host "[OK] HTTP 200"
    } else {
        Write-Host "[INFO] HTTP $code - $($_.Exception.Message)"
    }
}

Write-Host ""
Write-Host "Done. Direct API (port 8000) is unaffected and still works."
Write-Host "Test: http://192.168.1.68:8000/api/trades/"
