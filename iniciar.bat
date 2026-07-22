@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo   METALU v0.2.0 LAN - Iniciando
echo ========================================
echo.

REM Check Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js no esta instalado.
    echo Descargalo desde https://nodejs.org ^(version 20 LTS o superior^)
    pause
    exit /b 1
)

for /f "delims=" %%v in ('node -v') do set NODE_VERSION=%%v
echo Node.js detectado: %NODE_VERSION%
echo.

REM First-time install
if not exist "node_modules" (
    echo Instalando dependencias ^(puede tardar 2-3 minutos^)...
    call npm install
    if errorlevel 1 (
        echo ERROR: fallo npm install
        pause
        exit /b 1
    )
    echo.
)

REM Prisma generate (idempotent, fast)
echo Generando Prisma client...
call npx prisma generate
if errorlevel 1 (
    echo ERROR: fallo prisma generate
    pause
    exit /b 1
)
echo.

REM Create and reuse a per-installation Auth.js secret
node -e "const fs=require('node:fs'),crypto=require('node:crypto'),p='.metalu-auth-secret';let s='';try{s=fs.readFileSync(p,'utf8').trim()}catch{}if(!/^[0-9a-f]{64}$/.test(s)){s=crypto.randomBytes(32).toString('hex');fs.writeFileSync(p,s)}"
if errorlevel 1 (
    echo ERROR: no se pudo generar el secreto de autenticacion
    pause
    exit /b 1
)
for /f "usebackq delims=" %%s in (".metalu-auth-secret") do set "AUTH_SECRET=%%s"
if not defined AUTH_SECRET (
    echo ERROR: el secreto de autenticacion esta vacio
    pause
    exit /b 1
)
set "NEXTAUTH_SECRET=%AUTH_SECRET%"

REM Start the dev server with PGlite (no Postgres needed)
echo Iniciando Metalu en http://localhost:3000
echo Usuario inicial: admin / admin123
echo.
echo Presiona Ctrl+C para detener el servidor.
echo ========================================
echo.

set METALU_RUNTIME=tauri
call npm run dev

endlocal
