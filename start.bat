@echo off
cd /d "%~dp0"

set PORT=8000

where python >nul 2>nul
if %errorlevel%==0 (
  set PY=python
) else (
  where py >nul 2>nul
  if errorlevel 1 (
    echo Python not found. Install Python and try again.
    pause
    exit /b 1
  )
  set PY=py
)

echo Site: http://localhost:%PORT%/
echo Press Ctrl+C to stop the server.
start "" "http://localhost:%PORT%/"
%PY% -m http.server %PORT%
