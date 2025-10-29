import { WASocket, WAMessage, getContentType } from "@whiskeysockets/baileys";
import config from "@core/config";
import { commands } from "@core/Neo";

import type { Command, NeoContext } from "@core/types";

const checkIsMessageFromOwner = (m: WAMessage): boolean => {
  const jid = m.key.remoteJid!;
  const isMessageFromGroup = jid.endsWith("@g.us");

  const senderNumber =
    isMessageFromGroup && !m.key.fromMe
      ? m.key.participant?.split("@")[0]
      : jid.split("@")[0];
  return m.key.fromMe || config.SUDO.includes(senderNumber) || false;
};

const handleMessageText = (m: WAMessage): string => {
  const messageType = getContentType(m.message!);
  let text = "";
  if (messageType === "conversation") {
    text = m.message!.conversation;
  } else if (messageType === "extendedTextMessage") {
    text = m.message!.extendedTextMessage!.text;
  } else if (messageType === "imageMessage") {
    text = m.message!.imageMessage!.caption;
  } else if (messageType === "videoMessage") {
    text = m.message!.videoMessage!.caption;
  } else if (messageType === "documentMessage") {
    text = m.message!.documentMessage!.caption;
  }
  return text || "";
};

export function canRun(
  cmd: Command,
  ctx: Pick<
    NeoContext,
    "fromMe" | "fromOthers" | "isOwner" | "isGroup" | "messageType"
  >,
): boolean {
  if (cmd.disable) return false;

  const isPublic = config.ACCESS_MODE === "PUBLIC";
  const allowedForOthers = isPublic && cmd.allowPublic;

  /* Sudo Gates */
  if (cmd.onlySudo) {
    return ctx.isOwner;
  } else {
    if (cmd.allowSudo && ctx.isOwner) return true;
  }

  /* Chat-type/Media Gates */
  if (cmd.onlyGroup && !ctx.isGroup) return false;

  if (cmd.onlyPm && ctx.isGroup) return false;
  if (cmd.onType && cmd.onType !== ctx.messageType) return false;

  /* Sender Gates */
  if (ctx.fromMe && cmd.fromMe) return true;
  if (cmd.fromOthers && ctx.fromOthers) return true;
  if (ctx.fromOthers && allowedForOthers) return true;

  return false;
}

/* Message Handler */
export async function handleMessage(waContext: WASocket, m: WAMessage) {
  const jid = m.key.remoteJid!;
  const isMessageFromMe = m.key.fromMe;
  const isMessageFromOthers = jid && !m.key.fromMe;
  const isMessageFromGroup = jid.endsWith("@g.us");
  const isMessageFromOwner = checkIsMessageFromOwner(m);
  const text = handleMessageText(m);
  const messageType = getContentType(m.message!);

  console.log("text:", text);

  const lower = text.toLowerCase();

  for (const cmd of commands) {
    const match = lower.match(cmd.regexPattern!);
    if (!match) continue;

    if (
      !canRun(cmd, {
        fromMe: isMessageFromMe,
        fromOthers: isMessageFromOthers,
        isOwner: isMessageFromOwner,
        isGroup: isMessageFromGroup,
        messageType,
      })
    )
      continue;

    waContext.readMessages([m.key]);
    const ctx: NeoContext = {
      client: waContext,
      jid,
      fromMe: isMessageFromMe,
      fromOthers: !isMessageFromMe,
      isGroup: isMessageFromGroup,
      isOwner: isMessageFromOwner,
      text,
      message: m,
      messageType,
      match,
    };

    await cmd.run(ctx);

    if (m.key.fromMe && cmd.deleteCommand) {
      await waContext.sendMessage(jid, {
        delete: {
          remoteJid: jid,
        },
      });
    }

    break;
  }
}
