mod handler;

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

    let bot = Bot::builder()
        .with_backend(SqliteStore::new("neo_session.db").await?)
        .with_transport_factory(TokioWebSocketTransportFactory::new())
        .with_http_client(UreqHttpClient::new())
        .with_runtime(TokioRuntime)
        .on_event(|event, client| async move {
            handler::on_event(event, client).await;
        })
        .build()
        .await?;

    tracing::info!("Bot is running. Press Ctrl+C to stop.");
    bot.run().await;

    Ok(())
}
