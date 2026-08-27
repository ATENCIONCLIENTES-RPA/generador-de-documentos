@echo off
chcp 65001 >nul
title Generador Documental ESSA

cd /d "%~dp0"

echo ========================================
echo  GENERADOR DOCUMENTAL ESSA - Inicio rapido
echo ========================================
echo.

:: Verificar si existe node_modules
if not exist "node_modules" (
    echo [1/3] Instalando dependencias (solo la primera vez)...
    npm install
    if errorlevel 1 (
        echo ERROR: Fallo npm install. Verifica que Node.js este instalado.
        pause
        exit /b 1
    )
    echo.
)

:: Verificar si existe build o forzar rebuild
if not exist "dist" (
    echo [2/3] Construyendo aplicacion...
    npm run build
    if errorlevel 1 (
        echo ERROR: Fallo el build.
        pause
        exit /b 1
    )
    echo.
) else (
    echo [2/3] Build ya existe. Saltando... (borra la carpeta 'dist' para reconstruir)
    echo.
)

echo [3/3] Iniciando servidor local...
echo.
echo La app se abrira en: http://localhost:3000
echo Presiona Ctrl+C para cerrar.
echo.

:: Iniciar preview de Vite (sirve la carpeta dist)
npx vite preview --port 3000 --host 0.0.0.0