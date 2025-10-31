import NEO from "@/core/Neo";
import type { Command } from "@core/types";

const plugin_category = "group";

export const cmd: Command = {
  name: "tagall",
  category: plugin_category,
  pattern: "tagall(.*)?",
  info: {
    header: "Tag All Command",
    description: "Tags all group members with a hidden mention.",
    usage: ["{tr}tagall"],
    examples: ["{tr}tagall"],
  },
  fromMe: true,
  onlyGroup: true,
  run: async (ctx) => {
    const groupMetadata = await ctx.client.groupMetadata(ctx.jid);
    const groupParticipants = groupMetadata.participants;
    if (!groupParticipants) {
      await ctx.client.sendMessage(ctx.jid, {
        text: "Could not fetch group participants.",
      });
      return;
    }
    const jids = groupParticipants.map((p) => p.id);

    const displayText = ctx.match?.[1] || "📢 Attention";

    await ctx.client.sendMessage(ctx.jid, {
      text: displayText,
      mentions: jids,
    });
  },
};

NEO.addCommand(cmd);
