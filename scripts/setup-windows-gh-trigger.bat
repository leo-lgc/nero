@echo off
setlocal

set "TASK_NAME=Nero_Trigger_GitHub_Actions"
for %%I in ("%~dp0run-gh-workflow-trigger.bat") do set "RUNNER=%%~fI"
set "TASK_CMD=cmd.exe /c \"\"%RUNNER%\"\""

schtasks /Create /SC MINUTE /MO 10 /TN "%TASK_NAME%" /TR "%TASK_CMD%" /F

if errorlevel 1 (
  echo Failed to create scheduled task: %TASK_NAME%
  exit /b 1
)

echo Scheduled task created: %TASK_NAME%
echo Runs every 10 minutes while PC is on.

endlocal
