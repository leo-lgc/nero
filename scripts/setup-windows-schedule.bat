@echo off
setlocal

set "TASK_NAME=Nero_Fetch_Reddit_Signals"
set "RUNNER=%~sdp0run-fetch-reddit.bat"
set "TASK_CMD=%RUNNER%"

schtasks /Create /SC MINUTE /MO 30 /TN "%TASK_NAME%" /TR "%TASK_CMD%" /F

if errorlevel 1 (
  echo Failed to create scheduled task: %TASK_NAME%
  exit /b 1
)

echo Scheduled task created: %TASK_NAME%
echo Runs every 30 minutes.

endlocal
