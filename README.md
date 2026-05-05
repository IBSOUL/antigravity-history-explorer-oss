# Antigravity History Explorer (OSS)

Explore e organize o histórico das suas conversas com IAs locais (Gemini, Claude, GPT, etc.) de forma simples e elegante.

> **Versão Open Source** — Licença MIT. Para a versão SaaS com recursos avançados (tradução via Gemini AI, painel administrativo, rate limiting), consulte o repositório privado.

## ✨ Funcionalidades
- Leitura e organização automática de arquivos markdown de logs de conversa.
- UI moderna e rápida (Vite + React + Tailwind).
- Backend leve em Rust (Axum + Tokio).
- Proteção contra Path Traversal embutida.
- Deploy local com um único `docker compose up`.

## 🚀 Como Usar

### Pré-requisitos
- Docker e Docker Compose instalados.

### Rodando Localmente
```bash
# Clone o repositório
git clone https://github.com/filipeyuri/antigravity-history-explorer-oss.git
cd antigravity-history-explorer-oss

# Configure o diretório onde estão seus arquivos de conversa
# (edite o ANTIGRAVITY_DATA_DIR no docker-compose.yml)

# Suba a stack completa
docker compose up -d
```
A interface estará disponível em `http://localhost:5173` e o backend em `http://localhost:3001`.

## 🗂 Estrutura do Projeto
```
.
├── backend/         # API Rust (Axum)
├── frontend/        # UI React (Vite + Tailwind)
└── docker-compose.yml
```

## 🛠 Tecnologias
- **Backend:** Rust, Axum, Tokio
- **Frontend:** React, Vite, Tailwind CSS
- **Infra:** Docker, Docker Compose, Nginx

## 📄 Licença
MIT © [IBSOUL](https://ibsoul.com)
