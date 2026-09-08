@echo off
cd /d "%~dp0"

set "PF86=%ProgramFiles(x86)%"
set "NPM_CMD=npm"

where npm >nul 2>nul
if not errorlevel 1 goto npm_found

if exist "%ProgramFiles%\nodejs\npm.cmd" (
    set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
    goto npm_found
)
if exist "%PF86%\nodejs\npm.cmd" (
    set "NPM_CMD=%PF86%\nodejs\npm.cmd"
    goto npm_found
)
if exist "%LocalAppData%\Programs\nodejs\npm.cmd" (
    set "NPM_CMD=%LocalAppData%\Programs\nodejs\npm.cmd"
    goto npm_found
)

echo Could not find npm anywhere on this computer.
echo Please reinstall Node.js from https://nodejs.org and try again.
pause
exit /b 1

:npm_found
echo Installing... this can take a few minutes.
echo Please do not close this window.
echo.
call "%NPM_CMD%" install
echo.
echo Step 2: Downloading Chromium for browser automation...
call "%NPM_CMD%" run install-browsers
echo.
echo Done. Close this window, then double-click 2_start.bat next.
pause
