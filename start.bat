@echo off
title Skyline Student Association Platform Launcher
color 0b

echo =====================================================================
echo.
echo     SKYLINE STUDENT ASSOCIATION PLATFORM - FULL-STACK LAUNCHER
echo.
echo =====================================================================
echo.

:: Set root directory path safely (handling spaces)
set "ROOT_DIR=%~dp0"

echo [1/3] Preparing and launching Django Backend Server (Port 8000)...
start "Skyline Backend - Django (Port 8000)" cmd /k "cd /d "%ROOT_DIR%backend" && (if exist "venv\Scripts\activate.bat" (call "venv\Scripts\activate.bat") else if exist ".venv\Scripts\activate.bat" (call ".venv\Scripts\activate.bat") else if exist "..\\venv\Scripts\activate.bat" (call "..\\venv\Scripts\activate.bat")) && python manage.py migrate --noinput && echo Backend ready on port 8000 && python manage.py runserver 0.0.0.0:8000"

echo [2/3] Preparing and launching Vite Frontend Server (Port 5173)...
start "Skyline Frontend - Vite + React (Port 5173)" cmd /k "cd /d "%ROOT_DIR%frontend" && (if not exist "node_modules" (echo Installing frontend packages... && npm install)) && echo Starting Vite development server... && npm run dev"

echo [3/3] Opening browser at http://localhost:5173/...
timeout /t 4 /nobreak >nul
start http://localhost:5173/

echo.
echo =====================================================================
echo  Services launched successfully!
echo.
echo  * Frontend Portal: http://localhost:5173/
echo  * Backend API:     http://localhost:8000/api/
echo  * Admin Dashboard: http://localhost:8000/admin/
echo.
echo  Keep the opened terminal windows running while working.
echo  Close terminal windows to stop the servers.
echo =====================================================================
echo.
pause
