$log = "C:\Claude\Projects\TradeMonitor\deploy-result.txt"
"[$(Get-Date -Format 'HH:mm:ss')] Starting MWA deployment" | Out-File $log -Force

try {
    Add-Type -Path "C:\Windows\System32\inetsrv\Microsoft.Web.Administration.dll"
    $sm = New-Object Microsoft.Web.Administration.ServerManager
    $sites = $sm.Sites
    "[INFO] Sites found: $($sites.Count)" | Add-Content $log
    foreach ($s in $sites) { "[SITE] $($s.Name)" | Add-Content $log }
} catch {
    "[ERROR] $($_.Exception.Message)" | Add-Content $log
}

$ROOT = "C:\Claude\Projects\TradeMonitor"
$FRONTEND = "$ROOT\frontend"
$DEPLOY_PATH = "C:\inetpub\wwwroot\TradeMonitor"

try {
    # Copy standalone build
    New-Item $DEPLOY_PATH -ItemType Directory -Force | Out-Null
    New-Item "$DEPLOY_PATH\logs" -ItemType Directory -Force | Out-Null
    Copy-Item "$FRONTEND\.next\standalone\*" $DEPLOY_PATH -Recurse -Force
    Copy-Item "$FRONTEND\.next\static" "$DEPLOY_PATH\.next\" -Recurse -Force
    "[INFO] Frontend copied to $DEPLOY_PATH" | Add-Content $log

    # Write web.config using ANCM
    $wc = @'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModuleV2" resourceType="Unspecified" />
    </handlers>
    <aspNetCore processPath="node" arguments="server.js"
                stdoutLogEnabled="true"
                stdoutLogFile="C:\inetpub\wwwroot\TradeMonitor\logs\stdout"
                hostingModel="OutOfProcess">
      <environmentVariables>
        <environmentVariable name="NODE_ENV" value="production" />
        <environmentVariable name="HOSTNAME" value="127.0.0.1" />
        <environmentVariable name="PORT" value="%ASPNETCORE_PORT%" />
      </environmentVariables>
    </aspNetCore>
  </system.webServer>
</configuration>
'@
    $wc | Out-File "$DEPLOY_PATH\web.config" -Encoding utf8
    "[INFO] web.config written" | Add-Content $log

    # Create App Pool via MWA
    $poolName = "TradeMonitor"
    if ($sm.ApplicationPools[$poolName]) { $sm.ApplicationPools.Remove($sm.ApplicationPools[$poolName]) }
    $pool = $sm.ApplicationPools.Add($poolName)
    $pool.ManagedRuntimeVersion = ""
    $pool.StartMode = [Microsoft.Web.Administration.StartMode]::AlwaysRunning
    $pool.ProcessModel.IdleTimeout = [TimeSpan]::Zero

    # Create Application under Default Web Site
    $site = $sm.Sites["Default Web Site"]
    $existingApp = $site.Applications["/TradeMonitor"]
    if ($existingApp) { $site.Applications.Remove($existingApp) }
    $app = $site.Applications.Add("/TradeMonitor", $DEPLOY_PATH)
    $app.ApplicationPoolName = $poolName
    $sm.CommitChanges()
    "[SUCCESS] App created: http://localhost/TradeMonitor" | Add-Content $log
} catch {
    "[ERROR] $($_.Exception.Message)" | Add-Content $log
    "[STACK] $($_.Exception.StackTrace)" | Add-Content $log
}

# Set permissions
try {
    $acl = Get-Acl $DEPLOY_PATH
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule("IIS_IUSRS","FullControl","ContainerInherit,ObjectInherit","None","Allow")
    $acl.SetAccessRule($rule)
    Set-Acl $DEPLOY_PATH $acl
    "[INFO] Permissions granted" | Add-Content $log
} catch {
    "[WARN] Permission error: $($_.Exception.Message)" | Add-Content $log
}

Get-Content $log
