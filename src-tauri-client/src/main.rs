#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod discovery;
mod server_url;

use tauri::WebviewWindowBuilder;

const DISCOVERY_TIMEOUT_MS: u64 = 30_000;
const CACHE_TTL_DAYS: u64 = 30;

#[tokio::main(flavor = "multi_thread", worker_threads = 2)]
async fn main() {
    let url = match server_url::read_cache() {
        Some(cached) => {
            println!("[client] usando URL cacheada: {}", cached.url);
            cached.url
        }
        None => match discovery::wait_for_server(DISCOVERY_TIMEOUT_MS).await {
            Ok(ann) => {
                let url = format!("http://{}:{}", ann.ip, ann.port);
                println!(
                    "[client] descubierto server {} ({}:{}) v{}",
                    ann.hostname, ann.ip, ann.port, ann.version
                );
                if let Err(e) = server_url::write_cache(&url, CACHE_TTL_DAYS) {
                    eprintln!("[client] error cacheando URL: {}", e);
                }
                url
            }
            Err(e) => {
                eprintln!("[client] discovery falló: {}", e);
                eprintln!(
                    "[client] no se encontró servidor Metalu. Verificá que esté encendido y en la misma red WiFi."
                );
                std::process::exit(1);
            }
        },
    };

    tauri::Builder::default()
        .setup(move |app| {
            let window = WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::External(url.parse().expect("URL inválida")),
            )
            .title("Metalu Cliente")
            .inner_size(1280.0, 800.0)
            .resizable(true)
            .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error al iniciar Tauri");
}