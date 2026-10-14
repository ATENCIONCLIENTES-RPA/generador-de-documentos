@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Asistente Documental

:: ── Node.js ────────────────────────────────────────────────────────────────
if exist "%~dp0runtime\node.exe" set "PATH=%~dp0runtime;%PATH%"
where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo  [ERROR] Node.js no encontrado. Descarga en: https://nodejs.org
  echo.
  pause & exit /b 1
)

:: ── Dependencias ───────────────────────────────────────────────────────────
if not exist "node_modules\vite" (
  echo  Instalando dependencias...
  call npm install
  if errorlevel 1 ( echo  [ERROR] Fallo npm install. & pause & exit /b 1 )
)

:: ── Build ──────────────────────────────────────────────────────────────────
:: Se compila siempre para que cualquier cambio de configuracion quede reflejado.
echo  Compilando la aplicacion...
call npm run build
if errorlevel 1 ( echo  [ERROR] Fallo el build. & pause & exit /b 1 )

:: ── Puerto ─────────────────────────────────────────────────────────────────
:: Liberamos el puerto 4173 si esta ocupado y lo reservamos con --strictPort.
set "PORT=4173"
powershell -NoProfile -Command "$p=(Get-NetTCPConnection -LocalPort %PORT% -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1; if($p){ Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 600 }"

:: ── Abrir navegador (espera 3 s a que Vite arranque) ──────────────────────
start /B powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:%PORT%/'"

echo.
echo  Aplicacion en: http://localhost:%PORT%/
echo  Cierra esta ventana para detener el servidor.
echo.

:: ── Servidor ───────────────────────────────────────────────────────────────
call npm run preview -- --port %PORT% --strictPort

echo.
echo  Servidor detenido.
pause
endlocal
