use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedServerUrl {
    pub url: String,
    pub cached_at: u64,
    pub expires_at: u64,
}

#[derive(Debug)]
pub enum CacheError {
    Io(std::io::Error),
    Parse(serde_json::Error),
}

impl std::fmt::Display for CacheError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CacheError::Io(e) => write!(f, "io error: {}", e),
            CacheError::Parse(e) => write!(f, "parse error: {}", e),
        }
    }
}

impl std::error::Error for CacheError {}

fn cache_path() -> PathBuf {
    let appdata = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(appdata)
        .join("metalu-client")
        .join("server-url.json")
}

pub fn read_cache() -> Option<CachedServerUrl> {
    let path = cache_path();
    let raw = fs::read_to_string(&path).ok()?;
    let cached: CachedServerUrl = serde_json::from_str(&raw).ok()?;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    if cached.expires_at > now {
        Some(cached)
    } else {
        None
    }
}

pub fn write_cache(url: &str, ttl_days: u64) -> Result<(), CacheError> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let cached = CachedServerUrl {
        url: url.to_string(),
        cached_at: now,
        expires_at: now + (ttl_days * 86_400),
    };
    let path = cache_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(CacheError::Io)?;
    }
    let json = serde_json::to_string_pretty(&cached).map_err(CacheError::Parse)?;
    fs::write(&path, json).map_err(CacheError::Io)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_path() -> PathBuf {
        let mut p = std::env::temp_dir();
        p.push(format!("metalu-cache-test-{}.json", std::process::id()));
        p
    }

    #[test]
    fn write_then_read_returns_same_url() {
        let _ = std::env::set_var("APPDATA", std::env::temp_dir().to_str().unwrap());
        write_cache("http://192.168.1.5:3000", 30).unwrap();
        let cached = read_cache();
        // Clean up before assertions so failure doesn't leak
        let _ = fs::remove_file(cache_path());
        let cached = cached.expect("expected cached url");
        assert_eq!(cached.url, "http://192.168.1.5:3000");
        assert!(cached.expires_at > cached.cached_at);
    }

    #[test]
    fn expired_cache_returns_none() {
        let _ = std::env::set_var("APPDATA", std::env::temp_dir().to_str().unwrap());
        // ttl_days = 0 → expires immediately (well, 0s past cached_at)
        write_cache("http://old:3000", 0).unwrap();
        // Force read to see expiration
        std::thread::sleep(std::time::Duration::from_secs(1));
        let cached = read_cache();
        let _ = fs::remove_file(cache_path());
        assert!(cached.is_none(), "expired cache must return None");
    }

    #[test]
    fn missing_cache_returns_none() {
        let _ = std::env::set_var("APPDATA", "/nonexistent-metalu-test-path-zzz");
        assert!(read_cache().is_none());
    }
}
