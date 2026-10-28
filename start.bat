@echo off
chcp 65001 >nul
title 账房

:: Convert backslashes to forward slashes for URL
set "HTMLFILE=%~dp0index.html"
set "HTMLFILE=%HTMLFILE:\=/%"

:: Open in Edge app mode (no address bar, no file path visible)
start msedge --app="file:///%HTMLFILE%"

echo 账房 已启动！
echo 如果浏览器未自动打开，请手动打开 index.html
pause
