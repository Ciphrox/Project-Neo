use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Config {
    pub neo_session: String,
    pub show_online: bool,
    pub triggers: String,
    pub prefix: String,
    pub bot_name: String,
    pub access_mode: AccessMode,
    pub allow_nsfw: bool,
    pub enable_logs: bool,
    pub sudo: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AccessMode {
    Public,
    #[default]
    Private,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            neo_session: default_session_path().unwrap_or_else(|_| "neo_session.db".to_string()),
            show_online: false,
            triggers: r"^[.!;]".to_string(),
            prefix: ".".to_string(),
            bot_name: "Neo".to_string(),
            access_mode: AccessMode::default(),
            allow_nsfw: false,
            enable_logs: false,
            sudo: Vec::new(),
        }
    }
}

pub struct ConfigStore {
    current: RwLock<Arc<Config>>,
    path: PathBuf,
}

impl ConfigStore {
    pub fn load() -> anyhow::Result<Self> {
        let path = config_path()?;
        let cfg = if path.exists() {
            toml::from_str(&fs::read_to_string(&path)?)?
        } else {
            let cfg = Config::default();
            fs::write(&path, toml::to_string_pretty(&cfg)?)?;
            cfg
        };

        Ok(Self {
            current: RwLock::new(Arc::new(cfg)),
            path,
        })
    }

    pub fn snapshot(&self) -> Arc<Config> {
        self.current.read().unwrap().clone()
    }

    pub fn update(&self, f: impl FnOnce(&mut Config)) -> anyhow::Result<()> {
        let mut cfg = self.snapshot().as_ref().clone();
        f(&mut cfg);

        let cfg = Arc::new(cfg);
        fs::write(&self.path, toml::to_string_pretty(&cfg)?)?;
        *self.current.write().unwrap() = cfg;

        Ok(())
    }
}

fn config_dir() -> anyhow::Result<PathBuf> {
    let home = std::env::var("HOME").map_err(|_| anyhow::anyhow!("HOME not set"))?;
    let dir = PathBuf::from(home)
        .join(".local")
        .join("share")
        .join("project-neo");
    fs::create_dir_all(&dir)?;

    Ok(dir)
}

fn config_path() -> anyhow::Result<PathBuf> {
    Ok(config_dir()?.join("config.toml"))
}

fn default_session_path() -> anyhow::Result<String> {
    Ok(config_dir()?
        .join("neo_session.db")
        .to_string_lossy()
        .into_owned())
}
