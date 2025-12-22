// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::error::Error;
use std::time::Duration;

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpResponse {
    pub status: u16,
    pub body: String,
    pub headers: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpRequest {
    pub url: String,
    pub method: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
}

#[tauri::command]
async fn http_request(request: HttpRequest) -> Result<HttpResponse, String> {
    // Create client with browser-like settings
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15")
        .timeout(Duration::from_secs(30))
        .connect_timeout(Duration::from_secs(10))
        .pool_max_idle_per_host(0) // Disable connection pooling
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let method = match request.method.to_uppercase().as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "DELETE" => reqwest::Method::DELETE,
        "PATCH" => reqwest::Method::PATCH,
        "HEAD" => reqwest::Method::HEAD,
        "OPTIONS" => reqwest::Method::OPTIONS,
        _ => return Err(format!("Unsupported HTTP method: {}", request.method)),
    };

    let mut req_builder = client.request(method, &request.url);

    // Add headers
    for (key, value) in &request.headers {
        req_builder = req_builder.header(key.as_str(), value.as_str());
    }

    // Add body if present
    if let Some(body) = request.body {
        req_builder = req_builder.body(body);
    }

    let response = req_builder
        .send()
        .await
        .map_err(|e| {
            let source_err = e.source().map(|s| format!("{:?}", s)).unwrap_or_default();
            format!("Request failed: {} - {}", e, source_err)
        })?;

    let status = response.status().as_u16();

    let mut headers = HashMap::new();
    for (key, value) in response.headers() {
        if let Ok(v) = value.to_str() {
            headers.insert(key.to_string(), v.to_string());
        }
    }

    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    Ok(HttpResponse {
        status,
        body,
        headers,
    })
}

// Test command to verify network works from Rust
#[tauri::command]
async fn test_network() -> Result<String, String> {
    let client = reqwest::Client::new();

    // Test 1: httpbin
    let result1 = match client.get("https://httpbin.org/get").send().await {
        Ok(r) => format!("httpbin: OK ({})", r.status()),
        Err(e) => format!("httpbin: FAIL ({})", e),
    };

    // Test 2: Google DNS (simple)
    let result2 = match client.get("https://www.google.com").send().await {
        Ok(r) => format!("google: OK ({})", r.status()),
        Err(e) => format!("google: FAIL ({})", e),
    };

    // Test 3: Supabase direct
    let result3 = match client.get("https://supabase.com").send().await {
        Ok(r) => format!("supabase.com: OK ({})", r.status()),
        Err(e) => format!("supabase.com: FAIL ({})", e),
    };

    Ok(format!("{}\n{}\n{}", result1, result2, result3))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![http_request, test_network])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
