@echo off
title OmniStudio Canvas Launcher
echo ==============================================
echo    🚀 Launching OmniStudio Canvas Studio
echo ==============================================

:: Start Backend Server in a new window
start "OmniStudio Backend (Port 5000)" cmd /k "cd /d %~dp0 && node --watch server/index.js"

:: Start Frontend App in a new window
start "OmniStudio Frontend (Port 5173)" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo Both Backend and Frontend are starting!
echo Your app will be live at: http://localhost:5173
echo.