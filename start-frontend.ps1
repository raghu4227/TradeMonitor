# Start the Trade Monitor frontend
Set-Location "$PSScriptRoot\frontend"

# Install dependencies if node_modules missing
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm packages..." -ForegroundColor Yellow
    npm install
}

Write-Host "Starting Next.js frontend on http://localhost:3000 ..." -ForegroundColor Green
npm run dev
