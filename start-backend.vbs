Set oShell = CreateObject("WScript.Shell")
oShell.Run "powershell.exe -ExecutionPolicy Bypass -NonInteractive -WindowStyle Hidden -File ""C:\Claude\Projects\TradeMonitor\start-backend.ps1""", 0, False
