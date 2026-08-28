mod handler;

use neo_sdk::ConfigStore;
use std::sync::Arc;

use tracing_subscriber::EnvFilter;
use whatsapp_rust::TokioRuntime;
use whatsapp_rust::bot::Bot;
use whatsapp_rust::store::SqliteStore;
use whatsapp_rust_tokio_transport::TokioWebSocketTransportFactory;
use whatsapp_rust_ureq_http_client::UreqHttpClient;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    let store = Arc::new(ConfigStore::load()?);
    let config = store.snapshot();

    tracing::info!("Starting {}", config.bot_name);
    let bot = Bot::builder()
        .with_backend(SqliteStore::new(&config.neo_session).await?)
        .with_transport_factory(TokioWebSocketTransportFactory::new())
        .with_http_client(UreqHttpClient::new())
        .with_runtime(TokioRuntime)
        .on_event(move |event, client| {
            let store = store.clone();
            async move {
                handler::on_event(event, client, &store).await;
            }
        })
        .build()
        .await?;

    tracing::info!("Bot is running. Press Ctrl+C to stop.");
    bot.run().await;

    Ok(())
}
