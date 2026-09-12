@echo off
setlocal
where /q bun
if %ERRORLEVEL%==0 (
    bun "%~dp0init-project.ts" %*
    exit /b
)
echo [init-project] Bun required. Nirvana-OS runs on it.
echo   powershell -c "irm bun.sh/install.ps1 ^| iex"
echo Already installed? Open a new terminal so the PATH picks it up.
exit /b 4
