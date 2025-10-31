import NEO from "@/core/Neo";
import { makeJid } from "@/core/utils";
import type { Command } from "@core/types";

const plugin_category = "utils";

const cmd: Command = {
  name: "@",
  category: plugin_category,
  fromMe: false,
  pattern: "@(.*)",
  info: {
    header: "Mention by number",
    description: "Mention a user by providing their phone number.",
    usage: ["@ 1234567890", "@447700900123"],
    examples: ["@1234567890"],
  },
  run: async (ctx) => {
    const number = ctx.match?.[1];
    if (!number) {
      await ctx.client.sendMessage(ctx.jid, {
        text: "Please provide a number to search.",
      });
      return;
    }

    const cleanNumber = number.replace(/\D/g, "");

    const { jid, error } = makeJid(cleanNumber);
    if (error) {
      await ctx.client.sendMessage(ctx.jid, {
        text: "Invalid number format.",
      });
      return;
    }
    await ctx.client.sendMessage(ctx.jid, {
      text: `@${cleanNumber}`,
      mentions: [jid],
    });
  },
};

NEO.addCommand(cmd);
