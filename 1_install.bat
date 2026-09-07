@echo off
cd /d "%~dp0"
echo Installing... this can take a few minutes.
echo Please do not close this window.
echo.
call npm install
echo.
echo Step 2: Downloading Chromium for browser automation...
call npm run install-browsers
echo.
echo Done. Close this window, then double-click 2_start.bat next.
pause
