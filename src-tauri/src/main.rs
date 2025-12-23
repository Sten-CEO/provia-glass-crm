// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::error::Error;

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub success: bool,
    pub data: Option<serde_json::Value>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpResponse {
    pub status: u16,
    pub body: String,
    pub success: bool,
    pub error: Option<String>,
}

// Generic HTTP request command that bypasses WKWebView restrictions
#[tauri::command]
async fn http_request(
    url: String,
    method: String,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<HttpResponse, String> {
    println!("[RUST] http_request called: {} {}", method, url);

    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let mut request = match method.to_uppercase().as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        "PATCH" => client.patch(&url),
        _ => return Err(format!("Unsupported HTTP method: {}", method)),
    };

    // Add headers
    for (key, value) in headers {
        request = request.header(&key, &value);
    }

    // Add body if present
    if let Some(body_content) = body {
        request = request.body(body_content);
    }

    println!("[RUST] Sending request...");

    let response = request
        .send()
        .await
        .map_err(|e| {
            println!("[RUST] Request failed: {}", e);
            format!("Request failed: {}", e)
        })?;

    let status = response.status().as_u16();
    println!("[RUST] Response status: {}", status);

    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    println!("[RUST] Response body length: {} chars", body.len());

    Ok(HttpResponse {
        status,
        body,
        success: status >= 200 && status < 300,
        error: None,
    })
}

// Convenience command for Supabase auth sign in
#[tauri::command]
async fn supabase_sign_in(
    supabase_url: String,
    supabase_key: String,
    email: String,
    password: String,
) -> Result<AuthResponse, String> {
    println!("[RUST] supabase_sign_in called for: {}", email);

    let url = format!("{}/auth/v1/token?grant_type=password", supabase_url);

    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let body = serde_json::json!({
        "email": email,
        "password": password
    });

    println!("[RUST] Sending sign in request to: {}", url);

    let response = client
        .post(&url)
        .header("apikey", &supabase_key)
        .header("Authorization", format!("Bearer {}", supabase_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            // Get detailed error information
            let mut error_details = format!("Request error: {}", e);
            if e.is_connect() {
                error_details.push_str(" [CONNECTION ERROR]");
            }
            if e.is_timeout() {
                error_details.push_str(" [TIMEOUT]");
            }
            if e.is_request() {
                error_details.push_str(" [REQUEST BUILD ERROR]");
            }
            if let Some(source) = e.source() {
                error_details.push_str(&format!(" | Source: {}", source));
                if let Some(source2) = source.source() {
                    error_details.push_str(&format!(" | Inner: {}", source2));
                }
            }
            println!("[RUST] DETAILED ERROR: {}", error_details);
            error_details
        })?;

    let status = response.status();
    println!("[RUST] Sign in response status: {}", status);

    let response_body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if status.is_success() {
        println!("[RUST] Sign in successful");
        Ok(AuthResponse {
            success: true,
            data: Some(response_body),
            error: None,
        })
    } else {
        let error_msg = response_body
            .get("error_description")
            .or_else(|| response_body.get("msg"))
            .or_else(|| response_body.get("message"))
            .and_then(|v| v.as_str())
            .unwrap_or("Authentication failed")
            .to_string();

        println!("[RUST] Sign in failed: {}", error_msg);
        Ok(AuthResponse {
            success: false,
            data: None,
            error: Some(error_msg),
        })
    }
}

// Convenience command for Supabase auth sign up
#[tauri::command]
async fn supabase_sign_up(
    supabase_url: String,
    supabase_key: String,
    email: String,
    password: String,
) -> Result<AuthResponse, String> {
    println!("[RUST] supabase_sign_up called for: {}", email);

    let url = format!("{}/auth/v1/signup", supabase_url);

    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let body = serde_json::json!({
        "email": email,
        "password": password
    });

    println!("[RUST] Sending sign up request to: {}", url);

    let response = client
        .post(&url)
        .header("apikey", &supabase_key)
        .header("Authorization", format!("Bearer {}", supabase_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            println!("[RUST] Sign up request failed: {}", e);
            format!("Sign up request failed: {}", e)
        })?;

    let status = response.status();
    println!("[RUST] Sign up response status: {}", status);

    let response_body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    if status.is_success() {
        println!("[RUST] Sign up successful");
        Ok(AuthResponse {
            success: true,
            data: Some(response_body),
            error: None,
        })
    } else {
        let error_msg = response_body
            .get("error_description")
            .or_else(|| response_body.get("msg"))
            .or_else(|| response_body.get("message"))
            .and_then(|v| v.as_str())
            .unwrap_or("Sign up failed")
            .to_string();

        println!("[RUST] Sign up failed: {}", error_msg);
        Ok(AuthResponse {
            success: false,
            data: None,
            error: Some(error_msg),
        })
    }
}

// Test network connectivity
#[tauri::command]
async fn test_network() -> Result<HttpResponse, String> {
    println!("[RUST] test_network called");

    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get("https://www.google.com")
        .send()
        .await
        .map_err(|e| {
            println!("[RUST] Network test failed: {}", e);
            format!("Network test failed: {}", e)
        })?;

    let status = response.status().as_u16();
    println!("[RUST] Network test status: {}", status);

    Ok(HttpResponse {
        status,
        body: "Network OK".to_string(),
        success: true,
        error: None,
    })
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            http_request,
            supabase_sign_in,
            supabase_sign_up,
            test_network
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
