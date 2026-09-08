@echo off
cd /d "%~dp0"
chcp 65001 >nul

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
echo Starting the server...
echo When you see a line like "dashboard: http://localhost:3000" below,
echo leave this window open and open that address in your web browser.
echo Closing this window stops the server.
echo.
call "%NPM_CMD%" start
echo.
echo Server stopped. If there is an error message above, please take a screenshot and share it.
pause
