@echo off
cd /d "%~dp0"
chcp 65001 >nul

set "PF86=%ProgramFiles(x86)%"
set "NODE_EXE="

for /f "delims=" %%i in ('where node') do if not defined NODE_EXE set "NODE_EXE=%%i"

if not defined NODE_EXE (
    if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
)
if not defined NODE_EXE (
    if exist "%PF86%\nodejs\node.exe" set "NODE_EXE=%PF86%\nodejs\node.exe"
)
if not defined NODE_EXE (
    if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"
)
if not defined NODE_EXE (
    echo Could not find Node.js on this computer.
    echo Please install it from https://nodejs.org and try again.
    pause
    exit /b 1
)

echo Starting the server...
echo When you see a line like "dashboard: http://localhost:3000" below,
echo leave this window open and open that address in your web browser.
echo Closing this window stops the server.
echo.
call "%NODE_EXE%" "src\server.js"
echo.
echo Server stopped. If there is an error message above, please take a screenshot and share it.
pause
