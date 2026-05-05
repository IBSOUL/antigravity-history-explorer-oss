#!/bin/bash

# Antigravity History Explorer - Unix Launcher (Linux/macOS)
echo "🚀 Iniciando Antigravity History Explorer..."

# Verifica se npm esta instalado
if ! command -v npm &> /dev/null
then
    echo "❌ ERRO: npm não encontrado. Instale o Node.js para continuar."
    exit 1
fi

# Inicia via npm para usar concurrently
npm start
