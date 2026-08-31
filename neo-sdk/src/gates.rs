use crate::types::{Access, Chat, Command, DispatchCtx};

pub fn can_run(cmd: &Command, dctx: &DispatchCtx) -> bool {
    let in_chat = match cmd.chat {
        Chat::Any => true,
        Chat::Group => dctx.is_group,
        Chat::Pm => !dctx.is_group,
    };
    if !in_chat {
        return false;
    }

    if let Some(t) = cmd.on_type
        && Some(t) != dctx.message_type
    {
        return false;
    }

    match cmd.access {
        Access::Owner => dctx.from_me,
        Access::Sudo => dctx.is_owner,
        Access::FollowsMode => dctx.is_owner || dctx.is_public,
        Access::Everyone => true,
    }
}
