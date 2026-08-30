use whatsapp_rust::wacore::proto_helpers::MessageExt;
use whatsapp_rust::waproto::whatsapp::Message;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MessageType {
    Conversation,
    ExtendedText,
    Image,
    Video,
    Document,
}

pub fn message_type(msg: &Message) -> Option<MessageType> {
    let base = msg.get_base_message();
    if base.conversation.is_some() {
        Some(MessageType::Conversation)
    } else if base.extended_text_message.is_set() {
        Some(MessageType::ExtendedText)
    } else if msg.image_message.is_set() {
        Some(MessageType::Image)
    } else if msg.video_message.is_set() {
        Some(MessageType::Video)
    } else if msg.document_message.is_set() {
        Some(MessageType::Document)
    } else {
        None
    }
}

pub fn text_content(msg: &Message) -> Option<String> {
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
    if let Some(img) = msg.image_message.as_option()
        && let Some(c) = &img.caption
    {
        return Some(c.clone());
    }
    if let Some(vid) = msg.video_message.as_option()
        && let Some(c) = &vid.caption
    {
        return Some(c.clone());
    }
    if let Some(doc) = msg.document_message.as_option()
        && let Some(c) = &doc.caption
    {
        return Some(c.clone());
    }
    None
}
