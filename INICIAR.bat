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

:: ── Puerto ─────────────────────────────────────────────────────────────────
:: Liberamos el puerto 4173 si esta ocupado y lo reservamos con --strictPort.
set "PORT=4173"
powershell -NoProfile -Command "$p=(Get-NetTCPConnection -LocalPort %PORT% -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1; if($p){ Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 600 }"

:: ── IP local (para abrir desde otros dispositivos de la red) ──────────────
set "LANIP="
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.*' -and $_.IPAddress -ne '127.0.0.1' } | Select-Object -First 1).IPAddress" 2^>nul') do set "LANIP=%%i"

:: ── Abrir navegador en esta máquina (espera 3 s a que Vite arranque) ───────
start /B powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:%PORT%/'"

echo.
echo  Asistente Documental · modo LIVE (desarrollo)
echo.
echo  En esta PC    : http://localhost:%PORT%/
if defined LANIP (
  echo  En la red     : http://%LANIP%:%PORT%/
  echo.
  echo  Abre esa URL desde otro dispositivo (celular / otra PC)
  echo  conectado a la misma red Wi-Fi o cable.
)
echo.
echo  Nota: si otro equipo no puede entrar, agrega una excepcion de firewall
echo  para "Node.js" en el puerto %PORT% (Puerto entrante TCP %PORT%).
echo.
echo  Recarga automatica al guardar cambios.
echo  Cierra esta ventana para detener el servidor.
echo.

:: ── Servidor de desarrollo escuchando en TODA la red (--host) ─────────────
call npm run dev -- --port %PORT% --strictPort --host

echo.
echo  Servidor detenido.
pause
endlocal
