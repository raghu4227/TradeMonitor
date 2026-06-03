  # One-time: grant your user write access so future deploys don't need elevation
  icacls "C:\inetpub\StockDetailsApp" /grant "sudhe:(OI)(CI)F" /T

  # Deploy now
  $appcmd = "C:\Windows\System32\inetsrv\appcmd.exe"
  & $appcmd stop apppool /apppool.name:StockDetailsApp
  Start-Sleep -Seconds 3

  $src  = "C:\temp\StockDetailsApp_publish"
  $dest = "C:\inetpub\StockDetailsApp"
  Get-ChildItem $src -File | Where-Object { $_.Name -ne "web.config" } | ForEach-Object {
      Copy-Item $_.FullName -Destination "$dest\$($_.Name)" -Force
  }
  if (Test-Path "$src\runtimes") { Copy-Item "$src\runtimes" "$dest\runtimes" -Recurse -Force }
  if (!(Test-Path "$dest\logs")) { New-Item -ItemType Directory "$dest\logs" | Out-Null }

  & $appcmd start apppool /apppool.name:StockDetailsApp
  Write-Host "Done. DLL timestamp:" (Get-Item "$dest\StockDetailsApp.dll").LastWriteTime