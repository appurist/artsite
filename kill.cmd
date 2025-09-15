@echo off
setlocal enabledelayedexpansion

echo Stopping artsite.ca services...
echo ================================

:: Kill processes using port 5173 (frontend)
echo Stopping frontend (port 5173)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173"') do (
    echo Killing process %%a on port 5173
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill processes using port 8787 (backend)
echo Stopping backend (port 8787)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8787"') do (
    echo Killing process %%a on port 8787
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo Services stopped. You can now restart them with:
echo   Frontend: pnpm dev --port 5173
echo   Backend:  cd workers ^&^& wrangler dev --port 8787 --env="development"