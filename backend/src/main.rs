use axum::{
    extract::{Path, Query, DefaultBodyLimit},
    http::{StatusCode, Method, header},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tower_http::cors::CorsLayer;

#[derive(Serialize, Deserialize, Clone)]
struct Conversation {
    id: String,
    title: String,
    last_modified: String,
    size: u64,
}

#[derive(Deserialize)]
struct SearchQuery {
    q: Option<String>,
}

fn get_antigravity_base_dir() -> PathBuf {
    // Se estiver rodando no Docker ou com caminho customizado
    if let Ok(dir) = std::env::var("ANTIGRAVITY_DATA_DIR") {
        return PathBuf::from(dir);
    }

    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .expect("Não foi possível encontrar o diretório home");
    
    PathBuf::from(home).join(".gemini").join("antigravity")
}

async fn list_conversations(Query(params): Query<SearchQuery>) -> Json<Vec<Conversation>> {
    let base_dir = get_antigravity_base_dir();
    let conv_dir = base_dir.join("conversations");
    let mut list = Vec::new();

    println!("🔍 Escaneando diretório: {:?}", conv_dir);

    // Trocado std::fs por tokio::fs
    if let Ok(mut entries) = tokio::fs::read_dir(&conv_dir).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("pb") {
                let id = path.file_stem().unwrap().to_str().unwrap_or("unknown").to_string();
                let metadata = match tokio::fs::metadata(&path).await {
                    Ok(m) => m,
                    Err(_) => continue,
                };

                let brain_dir = base_dir.join("brain").join(&id);
                let title = get_title(brain_dir.to_str().unwrap_or("")).await.unwrap_or_else(|| "Conversa sem título".to_string());

                let last_modified: DateTime<Utc> = metadata.modified().map(|m| m.into()).unwrap_or(Utc::now());

                if let Some(query) = &params.q {
                    if !title.to_lowercase().contains(&query.to_lowercase()) && !id.contains(query) {
                        continue;
                    }
                }

                list.push(Conversation {
                    id,
                    title,
                    last_modified: last_modified.to_rfc3339(),
                    size: metadata.len(),
                });
            }
        }
    }

    list.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));
    println!("✅ Encontradas {} conversas.", list.len());
    Json(list)
}

async fn get_title(brain_dir: &str) -> Option<String> {
    let brain_path = PathBuf::from(brain_dir);
    let plan_path = brain_path.join("implementation_plan.md");
    let task_path = brain_path.join("task.md");

    if let Ok(content) = tokio::fs::read_to_string(plan_path).await {
        if let Some(line) = content.lines().find(|l| l.starts_with("# ")) {
            return Some(line.trim_start_matches("# ").trim().to_string());
        }
    }

    if let Ok(content) = tokio::fs::read_to_string(task_path).await {
        if let Some(line) = content.lines().find(|l| l.starts_with("# ")) {
            return Some(line.trim_start_matches("# ").trim().to_string());
        }
    }
    None
}

async fn get_conversation(Path(id): Path<String>) -> Result<Json<Vec<serde_json::Value>>, StatusCode> {
    // Segurança: Prevenir Path Traversal validando formato do ID (Fase 1)
    if !id.chars().all(|c| c.is_alphanumeric() || c == '-') {
        return Err(StatusCode::BAD_REQUEST);
    }

    let base_dir = get_antigravity_base_dir();
    let log_path = base_dir.join("brain").join(&id).join(".system_generated").join("logs").join("overview.txt");
    
    println!("📖 Lendo log de: {:?}", log_path);

    match tokio::fs::read_to_string(&log_path).await {
        Ok(content) => {
            let messages: Vec<serde_json::Value> = content.lines()
                .filter_map(|l| serde_json::from_str(l).ok())
                .collect();
            Ok(Json(messages))
        },
        Err(_) => Err(StatusCode::NOT_FOUND)
    }
}

async fn heal_conversation(Path(id): Path<String>) -> StatusCode {
    // Segurança: Prevenir Path Traversal validando formato do ID (Fase 1)
    if !id.chars().all(|c| c.is_alphanumeric() || c == '-') {
        return StatusCode::BAD_REQUEST;
    }

    let base_dir = get_antigravity_base_dir();
    let file_path = base_dir.join("conversations").join(format!("{}.pb", id));
    let temp_path = base_dir.join("conversations").join(format!("{}.pb.tmp", id));

    if tokio::fs::rename(&file_path, &temp_path).await.is_ok() {
        if tokio::fs::rename(&temp_path, &file_path).await.is_ok() {
            return StatusCode::OK;
        }
    }
    StatusCode::INTERNAL_SERVER_ERROR
}

#[tokio::main]
async fn main() {
    // CORS Restrito (Fase 1)
    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE])
        .allow_origin(tower_http::cors::Any); // Pode ser restrito na config

    let app = Router::new()
        .route("/api/conversations", get(list_conversations))
        .route("/api/conversations/:id", get(get_conversation))
        .route("/api/conversations/:id/heal", post(heal_conversation))
        .layer(cors)
        .layer(DefaultBodyLimit::max(1024 * 1024)); // 1MB limit (Fase 1)

    println!("🚀 Backend rodando em http://localhost:3001");
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_id_validation() {
        let valid_id = "f124a1bb-fcfe-4ebd-858d-a83082583490";
        assert!(valid_id.chars().all(|c| c.is_alphanumeric() || c == '-'));

        let invalid_id = "../../../etc/passwd";
        assert!(!invalid_id.chars().all(|c| c.is_alphanumeric() || c == '-'));
    }
}
