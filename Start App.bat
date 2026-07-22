@echo off
REM Windows CMD starter — works on Windows 10/11
title PerspectiveLab
cd /d "%~dp0"

echo.
echo ==========================================
echo   PerspectiveLab
echo   Starting... (first run may take 2-5 min)
echo ==========================================
echo.

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js / npm not found. Install LTS from https://nodejs.org
  pause
  exit /b 1
)

set PY=
where python >nul 2>&1 && set PY=python
if "%PY%"=="" where py >nul 2>&1 && set PY=py
if "%PY%"=="" where python3 >nul 2>&1 && set PY=python3
if "%PY%"=="" (
  echo ERROR: Python not found. Install from https://www.python.org ^(Add to PATH^).
  pause
  exit /b 1
)

cd frontend
if not exist node_modules (
  echo [1/4] Installing frontend...
  call npm install
) else (
  echo [1/4] Frontend ready.
)
echo [2/4] Building interface...
call npm run build
if errorlevel 1 goto :fail

cd ..\backend
if not exist .venv (
  echo [3/4] Installing backend...
  %PY% -m venv .venv
)
call .venv\Scripts\activate.bat
pip install -q -r requirements.txt

if not exist .env if not exist "..\.env" (
  copy .env.example .env >nul
  echo Created backend\.env — use Setup in the app to paste your API key.
)

echo [4/4] Starting server...
echo.
echo   Open in browser:  http://localhost:8000
echo   First time? Use the Setup page to add your API key.
echo   Keep this window OPEN. Press Ctrl+C to stop.
echo.

timeout /t 2 /nobreak >nul
start "" "http://localhost:8000/setup"

call .venv\Scripts\activate.bat
uvicorn main:app --host 127.0.0.1 --port 8000
goto :eof

:fail
echo.
echo Build failed. Install Node.js LTS from https://nodejs.org and try again.
pause
exit /b 1
