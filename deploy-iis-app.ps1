#Requires -RunAsAdministrator
# Deploy TradeMonitor as IIS sub-application under Default Web Site
# URL: http://localhost/TradeMonitor

$LOG = "C:\Claude\Projects\TradeMonitor\deploy-result.txt"
$ROOT = "C:\Claude\Projects\TradeMonitor"
$FRONTEND = "$ROOT\frontend"
$BACKEND = "$ROOT\backend"
$DEPLOY_PATH = "C:\inetpub\wwwroot\TradeMonitor"

"[$(Get-Date)] Starting deployment" | Tee-Object $LOG

Import-Module WebAdministration -ErrorAction Stop

# Create deploy folder
New-Item -Path $DEPLOY_PATH -ItemType Directory -Force | Out-Null
New-Item -Path "$DEPLOY_PATH\logs" -ItemType Directory -Force | Out-Null
"[INFO] Created $DEPLOY_PATH" | Tee-Object $LOG -Append

# Copy frontend standalone build
$standalone = "$FRONTEND\.next\standalone"
Copy-Item "$standalone\*" "$DEPLOY_PATH\" -Recurse -Force
Copy-Item "$FRONTEND\.next\static" "$DEPLOY_PATH\.next\" -Recurse -Force
"[INFO] Copied frontend build" | Tee-Object $LOG -Append

# Write start-next.js wrapper (maps ASPNETCORE_PORT -> PORT for Next.js)
"process.env.PORT = process.env.ASPNETCORE_PORT || process.env.PORT || '3000';`nrequire('./server.js');" | Set-Content "$DEPLOY_PATH\start-next.js" -Encoding UTF8
"[INFO] Written start-next.js wrapper" | Tee-Object $LOG -Append

# Write frontend web.config (AspNetCoreModuleV2 OutOfProcess for Node.js)
@'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModuleV2" resourceType="Unspecified" />
    </handlers>
    <aspNetCore processPath="node"
                arguments="start-next.js"
                stdoutLogEnabled="true"
                stdoutLogFile="C:\inetpub\wwwroot\TradeMonitor\logs\stdout"
                hostingModel="OutOfProcess">
      <environmentVariables>
        <environmentVariable name="NODE_ENV" value="production" />
      </environmentVariables>
    </aspNetCore>
  </system.webServer>
</configuration>
'@ | Set-Content "$DEPLOY_PATH\web.config" -Encoding UTF8
"[INFO] Frontend web.config written" | Tee-Object $LOG -Append

# Write backend web.config (AspNetCoreModuleV2 OutOfProcess for Python/uvicorn)
@'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModuleV2" resourceType="Unspecified" />
    </handlers>
    <aspNetCore processPath="C:\Claude\Projects\TradeMonitor\backend\venv\Scripts\python.exe"
                arguments="-m uvicorn main:app --port %ASPNETCORE_PORT% --host 127.0.0.1 --workers 1"
                stdoutLogEnabled="true"
                stdoutLogFile="C:\Claude\Projects\TradeMonitor\backend\logs\stdout"
                hostingModel="OutOfProcess">
      <environmentVariables>
        <environmentVariable name="PYTHONPATH" value="C:\Claude\Projects\TradeMonitor\backend" />
        <environmentVariable name="PYTHONUNBUFFERED" value="1" />
      </environmentVariables>
    </aspNetCore>
  </system.webServer>
</configuration>
'@ | Set-Content "$DEPLOY_PATH\api\web.config" -Encoding UTF8
"[INFO] Backend web.config written" | Tee-Object $LOG -Append

# Create log directory
New-Item -Path "$DEPLOY_PATH\logs" -ItemType Directory -Force | Out-Null

# Create App Pool (No Managed Code - required for non-ASP.NET)
$poolName = "TradeMonitor"
if (Test-Path "IIS:\AppPools\$poolName") { Remove-WebAppPool $poolName }
New-WebAppPool -Name $poolName
Set-ItemProperty "IIS:\AppPools\$poolName" managedRuntimeVersion ""
Set-ItemProperty "IIS:\AppPools\$poolName" startMode "AlwaysRunning"
Set-ItemProperty "IIS:\AppPools\$poolName" processModel.idleTimeout "00:00:00"
"[INFO] App pool '$poolName' created" | Tee-Object $LOG -Append

# Create IIS Application under Default Web Site
$appPath = "/TradeMonitor"
if (Test-Path "IIS:\Sites\Default Web Site\TradeMonitor") {
    Remove-WebApplication -Name "TradeMonitor" -Site "Default Web Site"
}
New-WebApplication -Name "TradeMonitor" -Site "Default Web Site" `
    -PhysicalPath $DEPLOY_PATH -ApplicationPool $poolName
"[INFO] IIS Application created at Default Web Site/TradeMonitor" | Tee-Object $LOG -Append

# Remove any stale /api sub-application (Next.js rewrites proxy to localhost:8000 instead)
if (Test-Path "IIS:\Sites\Default Web Site\TradeMonitor\api") {
    Remove-WebApplication -Name "TradeMonitor/api" -Site "Default Web Site"
    "[INFO] Removed stale TradeMonitor/api sub-app" | Tee-Object $LOG -Append
}

# Set permissions
$acl = Get-Acl $DEPLOY_PATH
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "IIS AppPool\$poolName", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.SetAccessRule($rule)
Set-Acl $DEPLOY_PATH $acl
"[INFO] Permissions set" | Tee-Object $LOG -Append

# Start app pool
Start-WebAppPool -Name $poolName

"[SUCCESS] Deployed!" | Tee-Object $LOG -Append
"  URL: http://localhost/TradeMonitor" | Tee-Object $LOG -Append
"  API: http://localhost/TradeMonitor/api" | Tee-Object $LOG -Append
