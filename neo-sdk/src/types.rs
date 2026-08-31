use crate::config::Config;
use crate::message::MessageType;
use crate::registry::Registry;

use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::time::Instant;

use whatsapp_rust::Client;
use whatsapp_rust::Jid;
use whatsapp_rust::waproto::whatsapp as wa;

pub type RunFuture = Pin<Box<dyn Future<Output = anyhow::Result<()>> + Send>>;

pub type RunFn = fn(CommandContext) -> RunFuture;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Access {
    FollowsMode,
    Owner,
    Sudo,
    Everyone,
}

impl Access {
    pub const fn default() -> Self {
        Self::FollowsMode
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Chat {
    Any,
    Group,
    Pm,
}

impl Chat {
    pub const fn default() -> Self {
        Self::Any
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Pattern {
    Trigger(&'static str),
    Raw(&'static str),
}

#[derive(Debug)]
pub struct CommandInfo {
    pub header: &'static str,
    pub description: &'static str,
    pub usage: &'static [&'static str],
    pub examples: &'static [&'static str],
}

#[derive(Debug)]
pub struct RegexMatch {
    pub whole: String,       // group 0, the full matched text
    pub groups: Vec<String>, // group 1+, the captures
}

pub struct DispatchCtx {
    pub from_me: bool,
    pub is_owner: bool,
    pub is_group: bool,
    pub message_type: Option<MessageType>,
    pub is_public: bool,
}

pub struct Command {
    pub name: &'static str,
    pub category: &'static str,
    pub pattern: Pattern,
    pub info: CommandInfo,
    pub access: Access,
    pub chat: Chat,
    pub on_type: Option<MessageType>,
    pub show_in_list: bool,
    pub is_nsfw: bool,
    pub run: RunFn,
}

impl Command {
    pub const fn new(
        name: &'static str,
        category: &'static str,
        pattern: Pattern,
        info: CommandInfo,
        run: RunFn,
    ) -> Self {
        Self {
            name,
            category,
            pattern,
            info,
            access: Access::default(),
            chat: Chat::default(),
            on_type: None,
            show_in_list: true,
            is_nsfw: false,
            run,
        }
    }
}

pub struct CommandContext {
    pub client: Arc<Client>,
    pub config: Arc<Config>,
    pub registry: Arc<Registry>,
    pub chat_jid: Jid,
    pub sender_jid: Jid,
    pub is_from_me: bool,
    pub is_owner: bool,
    pub is_group: bool,
    pub text: String,
    pub matches: Vec<RegexMatch>,
    pub message: Arc<wa::Message>,
    pub message_key: wa::MessageKey,
    pub received_at: Instant,
}
