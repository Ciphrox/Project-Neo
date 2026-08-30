use neo_sdk::config::Config;
use neo_sdk::registry::{RegisteredCommand, Registry};
use neo_sdk::types::{Access, Chat, Command, CommandContext, CommandInfo, Pattern, RunFuture};
use neo_sdk::wa::waproto::whatsapp as wa;
use std::collections::BTreeMap;

static HELP: Command = Command::new(
    "help",
    "info",
    Pattern::Trigger(r"help(?:\s+(\S+)(?:\s+(\S+))?)?"),
    CommandInfo {
        header: "Help Command",
        description: "Lists all commands, or details one.",
        usage: &[
            "{tr}help",
            "{tr}help <command>",
            "{tr}help -p <plugin>",
            "{tr}help -c <category>",
        ],
        examples: &[".help", ".help ping", ".help -p calc", ".help -c info"],
    },
    help_run,
);

fn help_run(ctx: CommandContext) -> RunFuture {
    Box::pin(async move {
        let groups = ctx
            .matches
            .first()
            .map(|m| m.groups.clone())
            .unwrap_or_default();
        let args: Vec<String> = groups.into_iter().take_while(|g| !g.is_empty()).collect();
        let text = resolve(&ctx.config, &ctx.registry, &args);
        let msg = wa::Message {
            conversation: Some(text),
            ..Default::default()
        };

        ctx.client.send_message(ctx.chat_jid, msg).await?;
        Ok(())
    })
}

pub fn register(reg: &mut Registry) {
    reg.add(&HELP);
}

fn resolve(config: &Config, registry: &Registry, args: &[String]) -> String {
    let p = &config.prefix;
    match args {
        [] => menu(config, registry),
        [word] if word != "-p" && word != "-c" => registry
            .commands()
            .find(|rc| rc.meta().name.eq_ignore_ascii_case(word))
            .map(|rc| detail(config, rc.meta()))
            .unwrap_or_else(|| {
                format!("_No command \"{p}{word}\"._\n\n{p}help lists all commands.")
            }),
        [flag, word] if flag == "-p" => {
            let cmds: Vec<&RegisteredCommand> = registry
                .commands()
                .filter(|rc| rc.plugin().eq_ignore_ascii_case(word))
                .collect();

            if cmds.is_empty() {
                format!("_No plugin \"{word}\"._\n\n{p}help lists all commands.")
            } else {
                list_view(&capitalize(word), config, &cmds)
            }
        }
        [flag, word] if flag == "-c" => {
            let cmds: Vec<&RegisteredCommand> = registry
                .commands()
                .filter(|rc| rc.meta().category.eq_ignore_ascii_case(word))
                .collect();

            if cmds.is_empty() {
                format!("_No category \"{word}\"._\n\n{p}help lists all commands.")
            } else {
                list_view(&capitalize(word), config, &cmds)
            }
        }
        _ => format!(
            "Usage:\n  `{p}help`\n  `{p}help <command>`\n  `{p}help -p <plugin>`\n  `{p}help -c <category>`"
        ),
    }
}

fn menu(config: &Config, registry: &Registry) -> String {
    let mut by_cat: BTreeMap<&str, Vec<&Command>> = BTreeMap::new();
    for rc in registry.commands() {
        let cmd = rc.meta();
        if cmd.show_in_list {
            by_cat.entry(cmd.category).or_default().push(cmd);
        }
    }
    let total: usize = by_cat.values().map(|v| v.len()).sum();

    let mut out = format!("*{}* · Commands\n", config.bot_name);
    for (cat, cmds) in &by_cat {
        out.push_str(&format!("\n*{}*\n", capitalize(cat)));
        for cmd in cmds {
            out.push_str(&format!(
                "  {} - {}\n",
                display(&config.prefix, cmd),
                cmd.info.description
            ));
        }
    }

    out.push_str(&format!(
        "\n_{total} {}_ · {p}help <name> for details",
        plural(total),
        p = config.prefix
    ));
    out
}

fn detail(config: &Config, cmd: &Command) -> String {
    let mut out = format!(
        "*{}*\n{}\n",
        display(&config.prefix, cmd),
        cmd.info.description
    );
    if !cmd.info.usage.is_empty() {
        out.push_str("\n*Usage*\n");
        for u in cmd.info.usage {
            out.push_str(&format!("  `{}`\n", u.replace("{tr}", &config.prefix)));
        }
    }
    if !cmd.info.examples.is_empty() {
        out.push_str("\n*Examples*\n");
        for e in cmd.info.examples {
            out.push_str(&format!("  `{}`\n", e.replace("{tr}", &config.prefix)));
        }
    }

    out.push_str(&format!(
        "\n_Access: {} · {}_",
        access_label(cmd.access),
        chat_label(cmd.chat),
    ));
    out
}

fn list_view(title: &str, config: &Config, cmds: &[&RegisteredCommand]) -> String {
    let mut out = format!("*{title}* · {} {}\n", cmds.len(), plural(cmds.len()));
    for rc in cmds {
        out.push_str(&format!(
            "\n{} - {}\n",
            display(&config.prefix, rc.meta()),
            rc.meta().info.description
        ));
    }

    out.push_str(&format!("\n{p}help <name> for details", p = config.prefix));
    out
}

fn display(prefix: &str, cmd: &Command) -> String {
    match cmd.pattern {
        Pattern::Trigger(_) => format!("{prefix}{}", cmd.name),
        Pattern::Raw(_) => cmd.name.to_string(),
    }
}

fn access_label(access: Access) -> &'static str {
    match access {
        Access::Owner => "owner only",
        Access::Sudo => "sudo users",
        Access::FollowsMode => "sudo, everyone in public mode",
        Access::Everyone => "everyone",
    }
}

fn chat_label(chat: Chat) -> &'static str {
    match chat {
        Chat::Any => "any chat",
        Chat::Group => "groups only",
        Chat::Pm => "DMs only",
    }
}

fn capitalize(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
        None => String::new(),
    }
}

fn plural(n: usize) -> &'static str {
    if n == 1 { "command" } else { "commands" }
}
