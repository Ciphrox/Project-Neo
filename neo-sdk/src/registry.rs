use crate::config::Config;
use crate::gates::can_run;
use crate::types::{Command, CommandContext, DispatchCtx, Pattern, RegexMatch};

use regex::{Captures, Regex, RegexBuilder};
use std::sync::Arc;
use tracing::warn;

pub struct Registry {
    commands: Vec<RegisteredCommand>,
    config: Arc<Config>,
}

pub struct RegisteredCommand {
    command: &'static Command,
    regex: Regex,
}

pub struct Match<'s> {
    pub command: &'s RegisteredCommand,
    pub matches: Vec<RegexMatch>,
}

impl Registry {
    pub fn new(config: Arc<Config>) -> Self {
        Self {
            commands: Vec::new(),
            config,
        }
    }

    pub fn add(&mut self, cmd: &'static Command) {
        if cmd.is_nsfw && !self.config.allow_nsfw {
            warn!(name = cmd.name, "NSFW command skipped (disabled in config)");
            return;
        }

        let regex_string = match cmd.pattern {
            Pattern::Trigger(p) => format!("{}{}", self.config.triggers, p),
            Pattern::Raw(r) => r.to_string(),
        };
        let regex = match RegexBuilder::new(&regex_string)
            .case_insensitive(true)
            .build()
        {
            Ok(r) => r,
            Err(e) => {
                warn!(name = cmd.name, error = %e, "Invalid command regex");
                return;
            }
        };

        let name = cmd.name;
        self.commands.push(RegisteredCommand {
            command: cmd,
            regex,
        });

        tracing::info!("Registered command: {name}");
    }

    pub fn commands(&self) -> impl Iterator<Item = &RegisteredCommand> + '_ {
        self.commands.iter()
    }

    pub fn match_and_check(&self, text: &str, dctx: &DispatchCtx) -> Option<Match<'_>> {
        for cmd in &self.commands {
            let matches = match cmd.command.pattern {
                Pattern::Raw(_) => find_all(&cmd.regex, text),
                Pattern::Trigger(_) => capture_first(&cmd.regex, text),
            };
            let Some(matches) = matches else {
                continue;
            };

            if can_run(cmd.command, dctx) {
                return Some(Match {
                    command: cmd,
                    matches,
                });
            }
        }
        None
    }
}

fn find_all(re: &Regex, text: &str) -> Option<Vec<RegexMatch>> {
    let caps: Vec<Captures> = re.captures_iter(text).collect();
    if caps.is_empty() {
        return None;
    }
    Some(caps.iter().map(to_match).collect())
}

fn capture_first(re: &Regex, text: &str) -> Option<Vec<RegexMatch>> {
    let caps = re.captures(text)?;
    Some(vec![to_match(&caps)])
}

fn to_match(caps: &Captures<'_>) -> RegexMatch {
    let whole = caps
        .get(0)
        .map(|m| m.as_str().to_string())
        .unwrap_or_default();
    let groups: Vec<String> = caps
        .iter()
        .skip(1)
        .flatten()
        .map(|m| m.as_str().to_string())
        .collect();

    RegexMatch { whole, groups }
}

impl RegisteredCommand {
    pub fn meta(&self) -> &'static Command {
        self.command
    }
    pub async fn run(&self, ctx: CommandContext) -> anyhow::Result<()> {
        (self.command.run)(ctx).await
    }
}
