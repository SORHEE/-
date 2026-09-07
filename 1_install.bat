@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo =========================================
echo  설치를 시작합니다. 몇 분 정도 걸릴 수 있어요.
echo  창을 닫지 말고 끝날 때까지 기다려주세요.
echo =========================================
echo.
call npm install
echo.
echo (2/2) 브라우저 자동화용 크롬을 내려받는 중입니다...
call npm run install-browsers
echo.
echo =========================================
echo  설치가 끝났습니다!
echo  이 창을 닫고 "2_start.bat"를 더블클릭하세요.
echo =========================================
pause
