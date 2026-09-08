@echo off
cd /d "%~dp0"

echo %CD% | findstr /i "\\Temp\\" >nul
if not errorlevel 1 (
    echo =========================================
    echo  It looks like this file is running from
    echo  INSIDE the zip file, not from an extracted
    echo  folder. Please close this window and:
    echo   1. Find the downloaded .zip file
    echo   2. RIGHT-CLICK it and choose "Extract All..."
    echo   3. Open the NEW folder that appears
    echo   4. Double-click 1_install.bat from THAT folder
    echo =========================================
    pause
    exit /b 1
)

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

for %%i in ("%NODE_EXE%") do set "NODE_DIR=%%~dpi"
set "NPM_CLI_JS=%NODE_DIR%node_modules\npm\bin\npm-cli.js"

if not exist "%NPM_CLI_JS%" (
    echo Could not find npm next to Node.js at:
    echo   %NPM_CLI_JS%
    echo Please reinstall Node.js from https://nodejs.org and try again.
    pause
    exit /b 1
)

echo Installing... this can take a few minutes.
echo Please do not close this window.
echo.
call "%NODE_EXE%" "%NPM_CLI_JS%" install
echo.
echo Step 2: Downloading Chromium for browser automation...
call "%NODE_EXE%" "%NPM_CLI_JS%" run install-browsers
echo.
echo Done. Close this window, then double-click 2_start.bat next.
pause
