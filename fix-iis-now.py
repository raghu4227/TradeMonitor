"""
Deletes the stale IIS api directory that causes 500 errors.
Runs elevated via UAC prompt.
"""
import ctypes, sys, subprocess, os, time

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def fix():
    api_dir = r"C:\inetpub\wwwroot\TradeMonitor\api"
    result_file = r"C:\Claude\Projects\TradeMonitor\fix-result.txt"

    lines = []
    if os.path.exists(api_dir):
        try:
            import shutil
            shutil.rmtree(api_dir)
            lines.append(f"[OK] Deleted {api_dir}")
        except Exception as e:
            lines.append(f"[ERROR] Could not delete {api_dir}: {e}")
    else:
        lines.append(f"[INFO] {api_dir} already gone")

    with open(result_file, "w") as f:
        f.write("\n".join(lines) + "\n")

    print("\n".join(lines))

if __name__ == "__main__":
    if is_admin():
        fix()
    else:
        # Re-launch elevated — user will see UAC prompt
        ret = ctypes.windll.shell32.ShellExecuteW(
            None, "runas", sys.executable, f'"{__file__}"', None, 1
        )
        if ret <= 32:
            print("UAC elevation failed or was denied")
        else:
            print("Waiting for elevated process to complete...")
            time.sleep(5)
            result_file = r"C:\Claude\Projects\TradeMonitor\fix-result.txt"
            if os.path.exists(result_file):
                print(open(result_file).read())
