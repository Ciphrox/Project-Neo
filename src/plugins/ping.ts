import NEO from "@/core/Neo";
import type { Command } from "@core/types";

const plugin_category = "utility";

const ping: Command = {
  name: "ping",
  category: plugin_category,
  pattern: "ping$",
  info: {
    header: "Ping Command",
    description: "Responds with Pong and the response time.",
    usage: ["{tr}ping"],
    examples: ["{tr}ping"],
  },
  fromMe: true,
  run: async (ctx) => {
    const t1 = Date.now();
    await ctx.client.sendMessage(ctx.jid, {
      react: {
        text: "🏓",
        key: ctx.message.key,
      },
    });
    await ctx.client.sendMessage(ctx.jid, {
      text: `Pong in ${Date.now() - t1} ms`,
    });
  },
};

NEO.addCommand(ping);
