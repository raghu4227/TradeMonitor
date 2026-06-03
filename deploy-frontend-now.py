"""
Deploys Next.js build to IIS with UAC elevation.
"""
import ctypes, sys, subprocess, os, time, shutil

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def deploy():
    src = r"C:\Claude\Projects\TradeMonitor\frontend\.next\standalone"
    static_src = r"C:\Claude\Projects\TradeMonitor\frontend\.next\static"
    dst = r"C:\inetpub\wwwroot\TradeMonitor"
    result_file = r"C:\Claude\Projects\TradeMonitor\deploy-frontend-result.txt"
    lines = []

    # Stop IIS app pool
    subprocess.run(["powershell", "-Command", "Stop-WebAppPool -Name TradeMonitor -ErrorAction SilentlyContinue"],
                   capture_output=True)
    time.sleep(2)

    # Copy standalone build
    try:
        for item in os.listdir(src):
            s = os.path.join(src, item)
            d = os.path.join(dst, item)
            if os.path.isdir(s):
                shutil.copytree(s, d, dirs_exist_ok=True)
            else:
                shutil.copy2(s, d)
        lines.append(f"[OK] Copied standalone build to {dst}")
    except Exception as e:
        lines.append(f"[ERROR] Copy failed: {e}")

    # Copy static assets
    try:
        static_dst = os.path.join(dst, ".next", "static")
        shutil.copytree(static_src, static_dst, dirs_exist_ok=True)
        lines.append(f"[OK] Copied static assets")
    except Exception as e:
        lines.append(f"[ERROR] Static copy failed: {e}")

    # Restart app pool
    subprocess.run(["powershell", "-Command", "Start-WebAppPool -Name TradeMonitor -ErrorAction SilentlyContinue"],
                   capture_output=True)
    lines.append("[OK] App pool restarted")

    with open(result_file, "w") as f:
        f.write("\n".join(lines) + "\n")
    print("\n".join(lines))

if __name__ == "__main__":
    if is_admin():
        deploy()
    else:
        ret = ctypes.windll.shell32.ShellExecuteW(
            None, "runas", sys.executable, f'"{__file__}"', None, 1
        )
        if ret <= 32:
            print("UAC elevation failed or was denied")
        else:
            print("Waiting for elevated process to complete...")
            time.sleep(10)
            result_file = r"C:\Claude\Projects\TradeMonitor\deploy-frontend-result.txt"
            if os.path.exists(result_file):
                print(open(result_file).read())
