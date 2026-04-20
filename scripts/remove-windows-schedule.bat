@echo off
setlocal

set "TASK_NAME=Nero_Fetch_Reddit_Signals"

schtasks /Delete /TN "%TASK_NAME%" /F

if errorlevel 1 (
  echo Failed to delete scheduled task: %TASK_NAME%
  exit /b 1
)

echo Scheduled task removed: %TASK_NAME%

endlocal
