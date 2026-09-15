@echo off
pushd "%~dp0"
title Generador ESSA - No cerrar esta ventana
color 0B

echo ========================================================
echo  GENERADOR DE DOCUMENTOS - ESSA
echo  Si esta ventana se cierra sola, toma foto del error
echo ========================================================
echo.
echo Directorio actual: %CD%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js NO encontrado en PATH
  echo Instala Node.js LTS de https://nodejs.org/
  echo.
  pause
  goto :fin
)
echo [OK] Node encontrado:
where node
node --version
echo.
where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm NO encontrado
  pause
  goto :fin
)
echo [OK] npm encontrado:
where npm
call npm --version
echo.

if not exist "node_modules\" (
  echo [INFO] Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install fallo
    pause
    goto :fin
  )
)

echo.
echo [INFO] Iniciando servidor en http://localhost:5173
echo        No cierres esta ventana mientras uses la herramienta
echo        El navegador debe abrirse solo en unos segundos
echo        Si no abre, abre manualmente http://localhost:5173
echo        Para detener: presiona Ctrl+C en esta ventana
echo.
echo --- Salida de Vite a continuacion ---
echo.

call npm run dev -- --host --open

echo.
echo --------------------------------------------------------
echo  El servidor se detuvo (codigo %errorlevel%)
echo  Si se cerro solo, copia el error de arriba
echo  Prueba manual alternativa:
echo    1. Abre cmd.exe
echo    2. Escribe: cd /d "%~dp0"
echo    3. Escribe: npm run dev -- --host --open
echo --------------------------------------------------------
pause

:fin
popd
pause
