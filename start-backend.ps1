# Start the Trade Monitor backend
Set-Location "$PSScriptRoot\backend"

# Create virtual environment if it doesn't exist
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate and install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
& ".\venv\Scripts\pip.exe" install -r requirements.txt --quiet

# Copy .env.example to .env if not present
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host ".env created from .env.example — please configure your settings!" -ForegroundColor Red
}

Write-Host "Starting FastAPI backend on http://localhost:8000 ..." -ForegroundColor Green
& ".\venv\Scripts\uvicorn.exe" main:app --host 0.0.0.0 --port 8000 --reload
