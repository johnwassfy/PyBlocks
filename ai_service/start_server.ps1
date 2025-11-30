# PyBlocks AI Service Startup Script
# Sets UTF-8 encoding and starts the server

Write-Host "Setting console to UTF-8 encoding..." -ForegroundColor Cyan
chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Starting AI Service on port 8000..." -ForegroundColor Green
python -m uvicorn app.main:app --reload --port 8000
