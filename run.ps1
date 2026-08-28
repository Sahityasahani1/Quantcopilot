# QuantCopilot AI - PowerShell Startup Script

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   Starting QuantCopilot AI Services     " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Activate Virtual Environment
if (Test-Path ".\.venv\Scripts\Activate.ps1") {
    Write-Host "[+] Activating virtual environment (.venv)..." -ForegroundColor Green
    & .\.venv\Scripts\Activate.ps1
}

# 2. Start Backend (FastAPI) in background job or new process
Write-Host "[+] Starting Backend (FastAPI) on http://localhost:8000 ..." -ForegroundColor Green
$backendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; & ..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -PassThru

# Wait 2 seconds for backend to start
Start-Sleep -Seconds 2

# 3. Start Frontend (Next.js) in background job or new process
Write-Host "[+] Starting Frontend (Next.js) on http://localhost:3000 ..." -ForegroundColor Green
$frontendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -PassThru

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Backend:  http://localhost:8000" -ForegroundColor Yellow
Write-Host " API Docs: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host " Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host " Backend and Frontend windows launched." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
