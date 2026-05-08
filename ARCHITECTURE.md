# Arquitetura - Antigravity History Explorer

## Componentes

### 1. Frontend (React + Vite)

- **Local Mode**: Usa a `File System Access API` para ler diretórios locais diretamente no navegador.
- **API Mode**: Consome endpoints do backend Rust para listar conversas sincronizadas.
- **Sync Engine (SaaS)**: Intercepta a leitura local e envia fragmentos (chunks) para o backend de analytics codificados em Base64.

### 2. Backend (Rust - Axum)

- **Analytics Service**: Recebe eventos e, se for do tipo `history_sync`, salva o conteúdo no diretório de dados.
- **Storage**: Sistema de arquivos simples organizado por `user_token`.
- **Security**: Validação de IDs para impedir Path Traversal.

## Estratégia de Segregação

- **OSS**: O backend é removido ou simplificado para não conter lógica de coleta. O frontend remove os hooks de analytics.
- **SaaS**: Backend completo com suporte a JWT para Admin e coleta de eventos.

## Fluxo de Dados (Cloud Sync)

1. Browser lê arquivo local.
2. Browser envia `history_sync` event com `user_token`.
3. Backend salva em `data/user_token-id.json`.
4. Usuário solicita lista de conversas com `user_token`.
5. Backend filtra arquivos que terminam com o token.
