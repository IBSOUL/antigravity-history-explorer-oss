@echo off
TITLE Antigravity History Explorer - Windows Launcher
echo 🚀 Iniciando Antigravity History Explorer...

REM Verifica se npm esta instalado
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ ERRO: npm nao encontrado. Instale o Node.js para continuar.
    pause
    exit /b
)

REM Inicia via npm para usar concurrently
npm start
pause
