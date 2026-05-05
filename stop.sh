#!/bin/bash

# Antigravity History Explorer - Stop Script

echo "🛑 Desligando Antigravity History Explorer..."

# Mata processos pelo nome do binário e do vite
pkill -f "target/debug/backend"
pkill -f "node_modules/.bin/vite"

echo "✅ Todos os processos foram encerrados."
