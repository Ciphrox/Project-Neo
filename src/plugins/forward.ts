import NEO from "@/core/Neo";
import type { Command } from "@core/types";

import { proto } from "@whiskeysockets/baileys";

function makeWAMessageStub(
  key: proto.IMessageKey,
  message: proto.IMessage,
): proto.IWebMessageInfo & { key: proto.IMessageKey } {
  return { key, message } as proto.IWebMessageInfo & { key: proto.IMessageKey };
}

const plugin_category = "media";

const forward: Command = {
  name: "forward",
  category: plugin_category,
  pattern: "forward",
  info: {
    header: "Forward Command",
    description: "Forwards a message to a specified chat.",
    usage: ["{tr}forward [reply to message]"],
    examples: ["{tr}forward"],
  },
  fromMe: true,
  run: async (ctx) => {
    const quotedKey =
      ctx.message.message?.extendedTextMessage?.contextInfo?.stanzaId;
    const quotedRemote =
      ctx.message.message?.extendedTextMessage?.contextInfo?.participant ||
      ctx.message.key.remoteJid;
    const quotedMsg =
      ctx.message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quotedKey || !quotedMsg)
      await ctx.client.sendMessage(ctx.jid, {
        text: "No quoted message",
      });

    const stub = makeWAMessageStub(
      { remoteJid: quotedRemote, fromMe: false, id: quotedKey },
      quotedMsg,
    );

    await ctx.client.sendMessage(ctx.jid, {
      forward: stub,
      force: true,
    });
  },
};

NEO.addCommand(forward);
