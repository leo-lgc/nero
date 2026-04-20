@echo off
setlocal

set "ROOT=%~sdp0.."
set "LOG_DIR=%ROOT%\logs"
set "LOG_FILE=%LOG_DIR%\fetch-reddit.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo [%DATE% %TIME%] Start fetch >> "%LOG_FILE%"
node "%ROOT%\scripts\fetch-reddit-signals.js" >> "%LOG_FILE%" 2>&1

if errorlevel 1 (
  echo [%DATE% %TIME%] Fetch failed with exit code %ERRORLEVEL% >> "%LOG_FILE%"
) else (
  echo [%DATE% %TIME%] Fetch done >> "%LOG_FILE%"
)

endlocal
