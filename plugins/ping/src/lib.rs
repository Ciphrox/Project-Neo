use neo_sdk::registry::Registry;
use neo_sdk::types::{Command, CommandContext, CommandInfo, Pattern, RunFuture};
use neo_sdk::wa::waproto::whatsapp as wa;

static PING: Command = Command::new(
    "ping",
    "info",
    Pattern::Trigger(r"ping$"),
    CommandInfo {
        header: "Ping Command",
        description: "Responds with Pong and the response time.",
        usage: &[".ping"],
        examples: &[".ping"],
    },
    ping_run,
);

fn ping_run(ctx: CommandContext) -> RunFuture {
    Box::pin(async move {
        ctx.client
            .send_reaction(ctx.chat_jid.clone(), ctx.message_key, "🏓")
            .await?;

        let ms = ctx.received_at.elapsed().as_millis();
        let msg = wa::Message {
            conversation: Some(format!("Pong in {ms} ms")),
            ..Default::default()
        };

        ctx.client.send_message(ctx.chat_jid, msg).await?;
        Ok(())
    })
}

pub fn register(reg: &mut Registry) {
    reg.add(&PING);
}
