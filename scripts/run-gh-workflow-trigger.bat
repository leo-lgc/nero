@echo off
setlocal

set "ROOT=%~sdp0.."
set "LOG_DIR=%ROOT%\logs"
set "LOG_FILE=%LOG_DIR%\gh-workflow-trigger.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo [%DATE% %TIME%] Trigger start >> "%LOG_FILE%"
gh workflow run update-signals.yml --repo leo-lgc/nero --ref main >> "%LOG_FILE%" 2>&1

if errorlevel 1 (
  echo [%DATE% %TIME%] Trigger failed with exit code %ERRORLEVEL% >> "%LOG_FILE%"
) else (
  echo [%DATE% %TIME%] Trigger sent >> "%LOG_FILE%"
)

endlocal
