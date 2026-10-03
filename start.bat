@echo off
title Skyline Club Platform Launcher
color 0b

echo ===================================================
echo     Starting Skyline Student Association Platform
echo ===================================================
echo.

:: Get root directory of project
set ROOT_DIR=%~dp0

:: 1. Launch Backend (Django 5) in a new window
echo [1/3] Launching Django Backend Server on port 8000...
start "Skyline Backend - Django (Port 8000)" cmd /k "cd /d "%ROOT_DIR%backend" && call "venv\Scripts\activate.bat" 2>nul || call ".venv\Scripts\activate.bat" 2>nul && python manage.py runserver 8000"

:: 2. Launch Frontend (Vite + React) in a new window
echo [2/3] Launching Vite Frontend Dev Server on port 5173...
start "Skyline Frontend - Vite (Port 5173)" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

:: 3. Wait a moment and launch default browser
echo [3/3] Opening browser at http://localhost:5173/...
timeout /t 3 /nobreak >nul
start http://localhost:5173/

echo.
echo ===================================================
echo  All services started successfully!
echo  - Backend API:  http://localhost:8000/api/
echo  - Frontend App: http://localhost:5173/
echo ===================================================
echo.
pause
