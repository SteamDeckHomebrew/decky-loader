use std::fmt::{Debug, Display, Formatter};
use std::fs;
use hyper::{Client, Uri};
use hyper::body::Buf;
use serde::{ Serialize, Deserialize };
use serde_json;
use tungstenite::Message;

type TokioResult<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

enum AppError {
    ContentNotFound
}

impl Debug for AppError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let message = match self {
            AppError::ContentNotFound => "Content not found"
        };

        write!(f, "{}", message)
    }
}

impl Display for AppError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self)
    }
}

unsafe impl Send for AppError { }
unsafe impl Sync for AppError { }

impl std::error::Error for AppError { }

#[allow(non_snake_case)]
#[allow(dead_code)]
#[derive(Deserialize)]
struct WebContent {
    description: String,
    devtoolsFrontendUrl: String,
    id: String,
    title: String,
    r#type: String,
    url: String,
    webSocketDebuggerUrl: String
}

#[allow(non_snake_case)]
#[allow(dead_code)]
#[derive(Serialize)]
struct DebuggerCommandParams {
    expression: String,
    userGesture: bool
}

#[allow(non_snake_case)]
#[allow(dead_code)]
#[derive(Serialize)]
struct DebuggerCommand {
    id: u32,
    method: String,
    params: DebuggerCommandParams
}

/// Downloads all content from a website
async fn get_web_content(url: Uri) -> TokioResult<Vec<WebContent>> {
    let client = Client::new();
    let response = client.get(url).await?;
    let body = hyper::body::aggregate(response).await?;

    let data = String::from(std::str::from_utf8(body.chunk())?);

    Ok(serde_json::from_str(data.as_str())?)
}

/// Loads plugins
fn load_plugins() -> String {
    let paths = fs::read_dir("./plugins");
    if let Ok(paths) = paths {

        let mut result = String::new();

        for entry in paths {
            if let Ok(entry) = entry {
                if let Ok(file_type) = entry.file_type() {
                    if file_type.is_file() {
                        if let Ok(content) = fs::read_to_string(entry.path()) {
                            result.push_str(format!("plugins.push(new {});", content).as_str());
                        }
                    }
                }
            }
        }

        result
    } else {
        String::from("")
    }
}

#[tokio::main]
async fn main() -> TokioResult<()> {
    // If CEF Debugging is enabled, it will be accessible through port 8080
    let url = "http://127.0.0.1:8080/json".parse::<hyper::Uri>().unwrap();

    // Load all available tabs that can be debugged
    let contents = get_web_content(url).await?;

    // Find QuickAccess tab (sidebar menu) and get the debugger websocket interface url
    let mut quick_access_debug_url: Option<String> = None;
    for content in &contents {
        if content.title == "QuickAccess" {
            quick_access_debug_url = Some(content.webSocketDebuggerUrl.clone());
        }
    }

    if let Some(url) = quick_access_debug_url {

        // Connect to debugger websocket
        let (mut socket, _) = tungstenite::connect(url)?;

        // Create a inject command to send to the debugger
        let command = DebuggerCommand {
            id: 1,
            method: String::from("Runtime.evaluate"),
            params: DebuggerCommandParams {
                expression: String::from(include_str!("plugin_page.js").replace("{{ PLUGINS }}", load_plugins().as_str())),
                userGesture: true
            }
        };

        // Send command to debugger
        socket.write_message(Message::Text(serde_json::to_string(&command)?))?;

        // Print response
        let response = socket.read_message()?;
        println!("{}", response);
        
        socket.close(None)?;

    } else {
        return Err(AppError::ContentNotFound.into());
    }


    Ok(())
}
