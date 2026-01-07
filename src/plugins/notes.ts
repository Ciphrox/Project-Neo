import NEO from "@/core/Neo";
import type { Command, WAMessage } from "@/core/types";
import { FileManager as NoteStorage } from "@/core/utils";
import { downloadMediaMessage } from "@whiskeysockets/baileys";

import fs from "fs";

NoteStorage.setDirName("notes");
const plugin_category = "tools";

const set: Command = {
  name: "set",
  category: plugin_category,
  pattern: "set (\\w+)",
  info: {
    header: "Set Notes",
    description: "Sets a note with the given key",
    usage: ["{tr}set <key> <value>"],
    examples: ["{tr}set test this is a note"],
  },
  fromMe: true,
  run: async (ctx) => {
    const key = ctx.match?.[1];
    const isImage = !!ctx.quoted?.message.imageMessage;
    const isText = !!ctx.quoted?.message.conversation;

    if (!ctx.quoted || (!isImage && !isText)) {
      await ctx.client.sendMessage(ctx.jid, {
        text: "Please reply to a text or image message to save as a note.",
      });
      return;
    }

    if (isImage) {
      const messageStub: WAMessage = {
        key: {
          remoteJid: ctx.jid,
          id: ctx.quoted.jid,
        },
        message: ctx.quoted.message,
      };

      const chatId = ctx.jid;

      const noteName = `${chatId}_note_${key}.jpg`;

      const noteFile = NoteStorage.createFile(noteName);
      const buffer = await downloadMediaMessage(messageStub, "buffer", {});
      noteFile.writeFile(buffer);
    } else if (isText) {
      const chatId = ctx.jid;
      const noteName = `${chatId}_note_${key}.txt`;
      const noteFile = NoteStorage.createFile(noteName);
      noteFile.writeFile(ctx.quoted.message.conversation || "");
    }

    await ctx.client.sendMessage(ctx.jid, {
      text: `Note saved with key: ${key}`,
    });
  },
};

const get: Command = {
  name: "get",
  category: plugin_category,
  pattern: "get (\\w+)",
  info: {
    header: "Get Notes",
    description: "Gets a note with the given key",
    usage: ["{tr}get <key>"],
    examples: ["{tr}get test"],
  },
  fromMe: true,
  run: async (ctx) => {
    const key = ctx.match?.[1];
    const chatId = ctx.jid;

    const imgNoteName = `${chatId}_note_${key}.jpg`;
    const noteName = `${chatId}_note_${key}.txt`;

    if (
      !NoteStorage.fileExists(imgNoteName) &&
      !NoteStorage.fileExists(noteName)
    ) {
      await ctx.client.sendMessage(ctx.jid, {
        text: `No note found for key: ${key}`,
      });
      return;
    }

    if (NoteStorage.fileExists(noteName)) {
      const noteContent = fs.readFileSync(NoteStorage.dir + "/" + noteName, {
        encoding: "utf-8",
      });
      await ctx.client.sendMessage(ctx.jid, {
        text: `Note for key: ${key}\n\n${noteContent}`,
      });
      return;
    }

    await ctx.client.sendMessage(ctx.jid, {
      image: { url: NoteStorage.dir + "/" + imgNoteName },
      caption: `Note for key: ${key}`,
    });
  },
};

const del: Command = {
  name: "del",
  category: plugin_category,
  pattern: "del (\\w+)",
  info: {
    header: "Delete Notes",
    description: "Deletes a note with the given key",
    usage: ["{tr}del <key>"],
    examples: ["{tr}del test"],
  },
  fromMe: true,
  run: async (ctx) => {
    const key = ctx.match?.[1];
    const chatId = ctx.jid;

    const imageNoteName = `${chatId}_note_${key}.jpg`;
    const txtNoteName = `${chatId}_note_${key}.txt`;
    console.log("Looking to delete note:", txtNoteName);

    if (
      !NoteStorage.fileExists(txtNoteName) &&
      !NoteStorage.fileExists(imageNoteName)
    ) {
      await ctx.client.sendMessage(ctx.jid, {
        text: `No note found for key: ${key}`,
      });
      return;
    }

    NoteStorage.cleanupFiles([
      NoteStorage.createFile(txtNoteName),
      NoteStorage.createFile(imageNoteName),
    ]);

    await ctx.client.sendMessage(ctx.jid, {
      text: `Note deleted for key: ${key}`,
    });
  },
};

const notes: Command = {
  name: "notes",
  category: plugin_category,
  pattern: "notes",
  info: {
    header: "List Notes",
    description: "Lists all notes for the current chat",
    usage: ["{tr}notes"],
    examples: ["{tr}notes"],
  },
  fromMe: true,
  run: async (ctx) => {
    const chatId = ctx.jid;
    const files = await fs.readdirSync(NoteStorage.dir);
    const noteKeys = files
      .filter((file) => file.startsWith(`${chatId}_note_`))
      .map((file) => file.replace(`${chatId}_note_`, "").replace(".jpg", ""));

    if (noteKeys.length === 0) {
      await ctx.client.sendMessage(ctx.jid, {
        text: "No notes found for this chat.",
      });
      return;
    }

    await ctx.client.sendMessage(ctx.jid, {
      text: `Notes for this chat:\n- ${noteKeys.join("\n- ")}`,
    });
  },
};

NEO.addCommand(set);
NEO.addCommand(get);
NEO.addCommand(del);
NEO.addCommand(notes);
