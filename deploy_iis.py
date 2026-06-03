"""
Deploy TradeMonitor to IIS using ctypes UAC elevation.
Runs the PS deployment script with admin token.
"""
import subprocess
import ctypes
import sys
import os
import time

ROOT = r"C:\Claude\Projects\TradeMonitor"
LOG = os.path.join(ROOT, "deploy-result.txt")
SCRIPT = os.path.join(ROOT, "deploy-iis-app.ps1")

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def run_as_admin():
    """Re-launch this script with admin rights via ShellExecuteEx."""
    params = f'"{sys.executable}" "{__file__}"'
    ret = ctypes.windll.shell32.ShellExecuteW(
        None, "runas", sys.executable, f'"{__file__}"', None, 1
    )
    return ret > 32

def deploy():
    print("[1] Copying frontend build to wwwroot...")
    deploy_path = r"C:\inetpub\wwwroot\TradeMonitor"
    frontend = os.path.join(ROOT, "frontend")
    standalone = os.path.join(frontend, ".next", "standalone")

    os.makedirs(deploy_path, exist_ok=True)
    os.makedirs(os.path.join(deploy_path, "logs"), exist_ok=True)

    # Copy standalone
    subprocess.run(f'robocopy "{standalone}" "{deploy_path}" /E /NFL /NDL /NJH /NJS /NC /NS', shell=True)
    # Copy static assets
    static_src = os.path.join(frontend, ".next", "static")
    static_dst = os.path.join(deploy_path, ".next", "static")
    os.makedirs(static_dst, exist_ok=True)
    subprocess.run(f'robocopy "{static_src}" "{static_dst}" /E /NFL /NDL /NJH /NJS /NC /NS', shell=True)

    # Write web.config
    wc = '''<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModuleV2" resourceType="Unspecified" />
    </handlers>
    <aspNetCore processPath="node" arguments="server.js"
                stdoutLogEnabled="true"
                stdoutLogFile="C:\\inetpub\\wwwroot\\TradeMonitor\\logs\\stdout"
                hostingModel="OutOfProcess">
      <environmentVariables>
        <environmentVariable name="NODE_ENV" value="production" />
        <environmentVariable name="HOSTNAME" value="127.0.0.1" />
        <environmentVariable name="PORT" value="%ASPNETCORE_PORT%" />
      </environmentVariables>
    </aspNetCore>
  </system.webServer>
</configuration>'''
    with open(os.path.join(deploy_path, "web.config"), "w") as f:
        f.write(wc)
    print("[2] web.config written")

    # Use Microsoft.Web.Administration via PowerShell
    ps_script = f'''
Add-Type -Path "C:\\Windows\\System32\\inetsrv\\Microsoft.Web.Administration.dll"
$sm = New-Object Microsoft.Web.Administration.ServerManager

# Create App Pool
$poolName = "TradeMonitor"
if ($sm.ApplicationPools[$poolName]) {{ $sm.ApplicationPools.Remove($sm.ApplicationPools[$poolName]) }}
$pool = $sm.ApplicationPools.Add($poolName)
$pool.ManagedRuntimeVersion = ""
$pool.StartMode = [Microsoft.Web.Administration.StartMode]::AlwaysRunning
$pool.ProcessModel.IdleTimeout = [TimeSpan]::Zero

# Create App under Default Web Site
$site = $sm.Sites["Default Web Site"]
$existing = $site.Applications["/TradeMonitor"]
if ($existing) {{ $site.Applications.Remove($existing) }}
$app = $site.Applications.Add("/TradeMonitor", "{deploy_path}")
$app.ApplicationPoolName = $poolName
$sm.CommitChanges()
Write-Host "SUCCESS: http://localhost/TradeMonitor"
'''
    result = subprocess.run(
        ["powershell.exe", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
        capture_output=True, text=True
    )
    print(result.stdout)
    if result.returncode != 0:
        print("STDERR:", result.stderr[:500])

    # Set ACLs
    subprocess.run(f'icacls "{deploy_path}" /grant "IIS_IUSRS:(OI)(CI)F" /T /Q', shell=True)
    subprocess.run(f'icacls "{deploy_path}" /grant "IIS AppPool\\TradeMonitor:(OI)(CI)F" /T /Q', shell=True)
    print("[3] Permissions set")

    with open(LOG, "w") as f:
        f.write(f"Deployed to: http://localhost/TradeMonitor\n")
        f.write(f"Path: {deploy_path}\n")

    print("\n=== DONE ===")
    print(f"App URL:     http://localhost/TradeMonitor")
    print(f"API:         http://localhost:8000/docs")
    input("\nPress Enter to close...")

if __name__ == "__main__":
    if is_admin():
        deploy()
    else:
        print("Requesting admin elevation...")
        run_as_admin()
