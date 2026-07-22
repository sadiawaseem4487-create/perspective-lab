@echo off
REM Start PerspectiveLab backend (serves UI + API) on Windows.
set ROOT=%~dp0..
cd /d "%ROOT%\frontend"
if not exist node_modules npm install
call npm run build

cd /d "%ROOT%\backend"
if not exist .venv python -m venv .venv
call .venv\Scripts\activate.bat
pip install -q -r requirements.txt

if not exist .env if not exist "%ROOT%\.env" copy .env.example .env

echo Starting PerspectiveLab at http://127.0.0.1:8000
uvicorn main:app --host 127.0.0.1 --port 8000
