import NEO from "@/core/Neo";
import type { Command } from "@/core/types";
const plugin_category = "ai";
import { Ollama } from "ollama";
import { randInt } from "@/core/utils";
import config from "@/core/config";

import models from "./models.json";

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

        const query = ctx.match?.[1];

        const response = await ollama.chat({
          model: model.modelName,
          messages: [
            {
              role: "SYSTEM",
              content: model.SYSTEM_PROMPT || "",
            },
            { role: "user", content: query },
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
