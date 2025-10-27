import NEO from "@/core/Neo";
import type { Command } from "@core/types";
import config from "@core/config";

const plugin_category = "info";

// Formatting constants
const hline = "─";
const hlineBold = "━";
const padLength = 30;

// Text formatting helpers
function codeBlock(text: string): string {
  return `\`\`\`${text}\n\`\`\``;
}

function padAround(text: string, totalLength: number, hline: string): string {
  const textLength = text.length;
  const padding = totalLength - textLength;
  const padStart = Math.floor(padding / 2);
  const padEnd = padding - padStart;
  return `${hline.repeat(padStart)}${text}${hline.repeat(padEnd)}`;
}

const help: Command = {
  name: "help",
  category: plugin_category,
  pattern: "help(?:\\s+(-[pc])\\s+(.*))?$",
  info: {
    header: "Help Command",
    description: "Provides a list of available commands and their usage.",
    usage: [
      "{tr}help",
      "{tr}help -p <pluginName>",
      "{tr}help -c <commandName>",
    ],
    examples: ["{tr}help", "{tr}help -p tagall", "{tr}help -c ping"],
  },
  fromMe: true,
  run: async (ctx) => {
    const match = ctx.match;
    const flag = match?.[1];
    const name = match?.[2];

    if (flag && name) {
      if (flag === "-p") {
        const text = "To be implemented.";
        await ctx.client.sendMessage(ctx.jid, {
          text,
        });
      } else if (flag === "-c") {
        const command = NEO.getCommands().find(
          (cmd) => cmd.name.toLowerCase() === name.toLowerCase()
        );

        if (!command) {
          await ctx.client.sendMessage(ctx.jid, {
            text: `╭${hline.repeat(padLength)}╮\n│ _Command not found._\n╰${hline.repeat(padLength)}╯`,
          });
          return;
        }

        let text =
          `╭${padAround(` *${command.name}* Command `, padLength, hlineBold)}╮\n` +
          `│ *Category*    : _${command.category || "misc"}_\n` +
          `│ *Description* : ${command.info.description}\n`;
        if (command.info.usage) {
          text += `├${hline.repeat(padLength)}┤\n`;
          text += `│ *Usage:*\n`;
          command.info.usage.forEach((usage) => {
            text += `│ • \`${usage.replace("{tr}", config.PREFIX)}\`\n`;
          });
        }
        if (command.info.examples) {
          text += `├${hline.repeat(padLength)}┤\n`;
          text += `│ *Examples:*\n`;
          command.info.examples.forEach((example) => {
            text += `│ • \`${example.replace("{tr}", config.PREFIX)}\`\n`;
          });
        }
        text += `╰${hline.repeat(padLength)}╯`;

        await ctx.client.sendMessage(ctx.jid, {
          text: text,
        });
      }
      return;
    }

    const groups = NEO.getCommands().reduce<Record<string, Command[]>>(
      (g, c) => {
        (g[c.category || "misc"] = g[c.category || "misc"] || []).push(c);
        return g;
      },
      {}
    );

    const totalCommands = Object.values(groups).reduce(
      (sum, cmds) => sum + cmds.length,
      0
    );

    let text =
      `╭${padAround(` *${config.BOT_NAME}* Help Menu `, padLength, hlineBold)}╮\n` +
      `│\n` +
      `│ *Basic Usage:* \`${config.PREFIX}<command>\`\n` +
      `│\n` +
      `│ *Detailed Help:*\n` +
      `│ • \`${config.PREFIX}help -c <command>\`   _(Command info)_\n` +
      `│ • \`${config.PREFIX}help -p <plugin>\`    _(Plugin info)_\n` +
      `├${hline.repeat(padLength)}┤\n` +
      `│\n` +
      `│ *Available Commands:*\n`;

    for (const [cat, cmds] of Object.entries(groups)) {
      text += `│${padAround(` *${cat[0].toUpperCase() + cat.slice(1)}* `, padLength, hline)}│\n`;
      for (const cmd of cmds) {
        const cmdName =
          cmd.pattern === undefined ? cmd.name : `${config.PREFIX}${cmd.name}`;
        const cmdInfo = cmd.info.header || cmd.info.description;
        text += `│  ▸ ${"\`" + cmdName + "\`".padEnd(15)} _${cmdInfo}_\n`;
      }
      text += "│\n";
    }

    text += `╰${padAround(` *Total Commands: ${totalCommands}* `, padLength, hline)}╯`;

    await ctx.client.sendMessage(ctx.jid, { text });
  },
};

NEO.addCommand(help);
