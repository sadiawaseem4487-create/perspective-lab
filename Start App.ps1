# PerspectiveLab — Windows PowerShell starter
# Right-click → Run with PowerShell  (or: powershell -ExecutionPolicy Bypass -File ".\Start App.ps1")
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host ""
Write-Host "=========================================="
Write-Host "  PerspectiveLab"
Write-Host "  Starting... (first run may take 2-5 min)"
Write-Host "=========================================="
Write-Host ""

function Find-Python {
  foreach ($name in @("python", "python3", "py")) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
  }
  return $null
}

$py = Find-Python
if (-not $py) {
  Write-Host "ERROR: Python not found. Install from https://www.python.org (Add to PATH)."
  Read-Host "Press Enter to close"
  exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: Node.js / npm not found. Install LTS from https://nodejs.org"
  Read-Host "Press Enter to close"
  exit 1
}

Set-Location frontend
if (-not (Test-Path node_modules)) {
  Write-Host "[1/4] Installing frontend..."
  npm install
} else {
  Write-Host "[1/4] Frontend ready."
}
Write-Host "[2/4] Building interface..."
npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

Set-Location ..\backend
if (-not (Test-Path .venv)) {
  Write-Host "[3/4] Installing backend..."
  & $py -m venv .venv
}
& .\.venv\Scripts\Activate.ps1
pip install -q -r requirements.txt

if (-not (Test-Path .env) -and -not (Test-Path ..\.env)) {
  Copy-Item .env.example .env
  Write-Host "Created backend\.env — use Setup in the app to paste your API key."
}

Write-Host "[4/4] Starting server..."
Write-Host ""
Write-Host "  Open in browser:  http://localhost:8000"
Write-Host "  Keep this window OPEN. Press Ctrl+C to stop."
Write-Host ""

Start-Process "http://localhost:8000/setup"
& .\.venv\Scripts\Activate.ps1
uvicorn main:app --host 127.0.0.1 --port 8000
