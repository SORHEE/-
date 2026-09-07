@echo off
cd /d "%~dp0"
echo =========================================
echo  서버를 시작합니다.
echo  아래에 "대시보드: http://localhost:3000" 라는 줄이 보이면,
echo  이 창은 그대로 두고 브라우저를 열어서
echo  http://localhost:3000 주소로 들어가세요.
echo  (이 창을 닫으면 서버도 꺼집니다)
echo =========================================
echo.
call npm start
echo.
echo 서버가 종료되었습니다. 위에 에러 메시지가 있다면 그대로 캡처해서 알려주세요.
pause
