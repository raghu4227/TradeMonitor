Set-Location "C:\Claude\Projects\TradeMonitor\frontend"
$proc = Start-Process -FilePath "node_modules\.bin\next.cmd" -ArgumentList "build" -NoNewWindow -PassThru -RedirectStandardOutput "C:\Claude\Projects\TradeMonitor\build.log" -RedirectStandardError "C:\Claude\Projects\TradeMonitor\build-err.log" -Wait
Write-Host "Build exit: $($proc.ExitCode)"
Get-Content "C:\Claude\Projects\TradeMonitor\build.log" | Select-Object -Last 25
