@echo off
cd /d "%~dp0"
chcp 65001 >nul
echo Starting the server...
echo When you see a line like "dashboard: http://localhost:3000" below,
echo leave this window open and open that address in your web browser.
echo Closing this window stops the server.
echo.
call npm start
echo.
echo Server stopped. If there is an error message above, please take a screenshot and share it.
pause
