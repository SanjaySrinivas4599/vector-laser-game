@echo off
title VECTOR_VOID Launcher
cd /d "%~dp0"

echo ===================================================
echo   VECTOR_VOID — Optical Laser Physics Simulator
echo ===================================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js detected.
    echo Starting HTTP server on http://localhost:3000 ...
    start "" "http://localhost:3000"
    node server.js
) else (
    echo [INFO] Node.js not found in PATH.
    echo Opening index.html directly in default browser...
    start "" "index.html"
)
pause
