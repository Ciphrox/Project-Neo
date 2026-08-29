use neo_sdk::config::{AccessMode, ConfigStore};
use neo_sdk::message::{message_type, text_content};
use neo_sdk::registry::Registry;
use neo_sdk::types::{CommandContext, DispatchCtx};

use qrcode::render::unicode::Dense1x2;
use std::sync::Arc;
use tracing::{error, info, warn};

use wacore::types::{events::Event, message::MessageInfo};
use wacore_binary::jid::JidExt;
use whatsapp_rust::Client;
use whatsapp_rust::waproto::whatsapp as wa;

pub async fn on_event(
    event: Arc<Event>,
    client: Arc<Client>,
    store: &Arc<ConfigStore>,
    registry: &Arc<Registry>,
) {
    match event.as_ref() {
        Event::Connected(_) => info!("Connected to WhatsApp"),
        Event::Disconnected(_) => warn!("Disconnected, reconnecting..."),
        Event::LoggedOut(info) => error!("Logged out: {:?}", info),
        Event::ConnectFailure(err) => error!("Connection failed: {:?}", err),
        Event::StreamError(err) => error!("Stream error: {:?}", err),
        Event::PairingQrCode(qr) => {
            info!("Scan QR to pair:");
            match qrcode::QrCode::new(qr.code.as_bytes()) {
                Ok(render_qr) => {
                    let qr_code = render_qr.render::<Dense1x2>().build();
                    println!("{}", qr_code);
                }
                Err(e) => {
                    warn!("QR encode failed: {e}");
                    println!("{}", qr.code);
                }
            }
        }
        Event::PairSuccess(info) => info!("Pairing successful: {:?}", info),
        Event::Messages(batch) => {
            for incoming in batch.messages.iter() {
                on_message(&incoming.message, &incoming.info, &client, store, registry).await;
            }
        }
        _ => {}
    }
}

async fn on_message(
    msg: &Arc<wa::Message>,
    info: &MessageInfo,
    client: &Arc<Client>,
    store: &Arc<ConfigStore>,
    registry: &Arc<Registry>,
) {
    let config = store.snapshot();
    let Some(text) = text_content(msg) else {
        return;
    };
    let chat = &info.source.chat;
    let sender = &info.source.sender;
    let is_group = chat.is_group();
    let is_from_me = info.source.is_from_me;
    let sender_num = sender.user();
    let is_owner = is_from_me
        || config.sudo.iter().any(|s| {
            s == sender_num
                || info
                    .source
                    .sender_alt
                    .as_ref()
                    .is_some_and(|alt| s == alt.user())
        });
    if config.enable_logs {
        let tag = if is_group { "GROUP" } else { "DM" };
        info!("[{tag}] {sender}: {text}");
    }

    let dctx = DispatchCtx {
        from_me: is_from_me,
        is_owner,
        is_group,
        message_type: message_type(msg),
        is_public: config.access_mode != AccessMode::Private,
    };
    let Some(m) = registry.match_and_check(&text, &dctx) else {
        return;
    };

    let ctx = CommandContext {
        client: client.clone(),
        chat_jid: chat.clone(),
        sender_jid: sender.clone(),
        is_from_me,
        is_owner,
        is_group,
        text: text.clone(),
        matches: m.matches,
        message: Arc::clone(msg),
        config: config.clone(),
    };
    if let Err(e) = m.command.run(ctx).await {
        error!(command = m.command.meta().name, error = %e);
        let reply = wa::Message {
            conversation: Some(format!("Command failed: {e}")),
            ..Default::default()
        };
        let _ = client.send_message(chat.clone(), reply).await;
    }
}
