import NEO from "@/core/Neo";
import type { Command, WAMessage } from "@/core/types";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { randInt } from "@/core/utils";
import config from "@/core/config";

import { Ollama } from "ollama";
import models from "./models.json";

const plugin_category = "ai";

const ollama = new Ollama({
  host: "https://ollama.com",
  headers: {
    Authorization: `Bearer ${config.OLLAMA_API_KEY}`,
  },
});

let commands: Command[] = [];

for (const model of models) {
  if (model.modelName && model.commands) {
    const cmd: Command = {
      name: model.commandName,
      category: plugin_category,
      pattern: `(?:${model.commands.join("|")})\\s+([\\S\\s]*)$`,
      fromMe: true,
      info: {
        header: `${model.commands[0]} AI`,
        description: `Interact with the ${model.commands[0]} AI.`,
        usage: model.commands.map((cmdName) => `{tr}${cmdName} <query>`),
        examples: model.commands.map(
          (cmdName) => `{tr}${cmdName} What is the meaning of life?`
        ),
      },
      isNSFW: model.isNSFW || false,
      run: async (ctx) => {
        if (!config.OLLAMA_API_KEY) {
          await ctx.client.sendMessage(
            ctx.jid,
            {
              text: "Ollama API key is not configured. Please set the OLLAMA_API_KEY environment variable.",
            },
            { quoted: ctx.message }
          );
        }

        const quotedImage = ctx.quoted?.message?.imageMessage;
        const quotedText = ctx.quoted?.message?.conversation;

        if (!model.imageSupport && quotedImage) {
          await ctx.client.sendMessage(
            ctx.jid,
            {
              text: "This model does not support image inputs.",
            },
            { quoted: ctx.message }
          );
          return;
        }

        let images: string[] = [];
        if (quotedImage) {
          const messageStub: WAMessage = {
            key: {
              remoteJid: ctx.jid,
              id: ctx.quoted.jid,
            },
            message: ctx.quoted.message,
          };
          const buffer = await downloadMediaMessage(messageStub, "buffer", {});
          const base64 = buffer.toString("base64");
          images = [base64];
        }

        const query = ctx.match?.[1];
        const queryContent = quotedText
          ? `Replied message: ${quotedText}\n\nQuery: ${query}`
          : query;

        const response = await ollama.chat({
          model: model.modelName,
          messages: [
            {
              role: "SYSTEM",
              content: model.SYSTEM_PROMPT || "",
            },
            {
              role: "user",
              content: queryContent,
              images,
            },
          ],
          stream: true,
        });

        let messageResponse = "";
        let lastUpdateTime = 0;
        const minUpdateInterval = ctx.isGroup ? 750 : 200;
        const maxUpdateInterval = ctx.isGroup ? 1100 : 500;

        const responseMessage = await ctx.client.sendMessage(
          ctx.jid,
          { text: "Generating response..." },
          { quoted: ctx.message }
        );

        for await (const chunk of response) {
          // process.stdout.write(chunk.message.content);
          messageResponse += chunk.message.content;
          const currentTime = Date.now();

          if (
            currentTime - lastUpdateTime >=
            randInt(minUpdateInterval, maxUpdateInterval)
          ) {
            await ctx.client.sendMessage(
              ctx.jid,
              { text: messageResponse, edit: responseMessage.key },
              { quoted: ctx.message }
            );
            lastUpdateTime = currentTime;
          }
        }

        // Final update to ensure the complete message is sent
        await ctx.client.sendMessage(
          ctx.jid,
          { text: messageResponse, edit: responseMessage.key },
          { quoted: ctx.message }
        );
      },
    };
    commands.push(cmd);
  }
}

for (const cmd of commands) {
  NEO.addCommand(cmd);
}
