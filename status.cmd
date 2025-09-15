@echo off
setlocal enabledelayedexpansion

rem echo artsite.ca Status Check
rem echo ========================

:: Check backend (port 8787)
rem echo Checking backend (port 8787)...
netstat -an | findstr ":8787" >nul 2>&1
if !errorlevel! equ 0 (
    echo Backend is running on port 8787
) else (
    echo Backend is NOT running on port 8787
)

:: Check frontend (port 5173)
rem echo Checking frontend (port 5173)...
netstat -an | findstr ":5173" >nul 2>&1
if !errorlevel! equ 0 (
    echo Frontend is running on port 5173
) else (
    echo Frontend is NOT running on port 5173
)

rem echo.
rem echo To start services:
rem echo   Frontend: pnpm dev
rem echo   Backend:  pnpm dev:backend
