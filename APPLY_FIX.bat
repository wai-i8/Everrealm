@echo off
setlocal
cd /d "%~dp0"
python apply_everrealm_fix.py .
if errorlevel 1 (
  echo.
  echo FIX FAILED - see the message above.
  pause
  exit /b 1
)
echo.
echo FIX APPLIED.
pause
