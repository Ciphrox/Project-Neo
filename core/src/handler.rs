use qrcode::render::unicode::Dense1x2;
use std::sync::Arc;
use tracing::{error, info, warn};

use wacore::proto_helpers::MessageExt;
use wacore::types::{events::Event, message::MessageInfo};
use wacore_binary::jid::JidExt;
use whatsapp_rust::Client;
use whatsapp_rust::waproto::whatsapp as wa;

pub async fn on_event(event: Arc<Event>, _client: Arc<Client>) {
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
                on_message(&incoming.message, &incoming.info);
            }
        }
        _ => {}
    }
}

fn on_message(msg: &Arc<wa::Message>, info: &MessageInfo) {
    let Some(text) = text_content(msg) else {
        return;
    };
    let tag = if info.source.chat.is_group() {
        "GROUP"
    } else {
        "DM"
    };
    info!("[{tag}] {}: {text}", info.source.sender);
}

fn text_content(msg: &wa::Message) -> Option<String> {
    let base = msg.get_base_message();
    if let Some(text) = &base.conversation
        && !text.is_empty()
    {
        return Some(text.clone());
    }
    if let Some(ext) = base.extended_text_message.as_option()
        && let Some(text) = &ext.text
    {
        return Some(text.clone());
    }
    None
}
