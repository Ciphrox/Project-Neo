import { WASocket, WAMessage, getContentType } from "@whiskeysockets/baileys";
import chalk from "chalk";
import config from "@core/config";
import NEO from "@core/Neo";

import type { Command, NeoContext } from "@core/types";

const checkIsMessageFromOwner = (m: WAMessage): boolean => {
  const jid = m.key.remoteJid!;
  const isMessageFromGroup = jid?.endsWith("@g.us");

  const senderNumber =
    isMessageFromGroup && !m.key.fromMe
      ? m.key.participantAlt?.split("@")[0]
      : jid?.split("@")[0];
  return m.key.fromMe || config.SUDO.includes(senderNumber) || false;
};

const handleMessageText = (m: WAMessage): string => {
  const messageType = getContentType(m.message!);
  switch (messageType) {
    case "conversation":
      return m.message!.conversation || "";
    case "extendedTextMessage":
      return m.message!.extendedTextMessage!.text || "";
    case "imageMessage":
      return m.message!.imageMessage!.caption || "";
    case "videoMessage":
      return m.message!.videoMessage!.caption || "";
    case "documentMessage":
      return m.message!.documentMessage!.caption || "";
  }
  return "";
};

export function canRun(
  cmd: Command,
  ctx: Pick<
    NeoContext,
    "fromMe" | "fromOthers" | "isOwner" | "isGroup" | "messageType"
  >
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

function logMessages(
  jid: string,
  isMessageFromMe: boolean,
  isMessageFromOwner: boolean,
  isMessageFromGroup: boolean,
  messageType: string,
  text?: string
) {
  const chatType = isMessageFromGroup ? "👥 GROUP" : "💬 PRIVATE";
  const senderType = isMessageFromMe
    ? "📤 ME"
    : isMessageFromOwner
      ? "👑 OWNER"
      : "📥 OTHER";

  const getChatColor = () => {
    if (isMessageFromGroup) return chalk.cyan;
    if (isMessageFromMe) return chalk.green;
    if (isMessageFromOwner) return chalk.yellow;
    return chalk.magenta;
  };

  const chatColor = getChatColor();

  console.log(`\n${chalk.bold("=".repeat(60))}`);
  console.log(
    `${chatColor.bold(chatType)} ${chalk.dim("|")} ${senderType} ${chalk.dim("|")} ${chalk.dim(`Type: ${messageType}`)}`
  );
  console.log(`${chalk.dim("From:")} ${chatColor(jid)}`);
  if (text) {
    console.log(
      `${chalk.dim("Message:")} ${chalk.bold(text.substring(0, 100))}${text.length > 100 ? "..." : ""}`
    );
  }
  console.log(`${chalk.bold("=".repeat(60))}\n`);
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

  for (const cmd of NEO.getCommands()) {
    const match = text.match(cmd.regexPattern!);
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

    if (config.ENABLE_LOGS) {
      logMessages(
        jid,
        isMessageFromMe,
        isMessageFromOwner,
        isMessageFromGroup,
        messageType,
        text
      );
    }

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
