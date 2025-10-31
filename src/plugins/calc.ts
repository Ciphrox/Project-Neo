import NEO from "@core/Neo";
import type { Command } from "@core/types.js";

import { evaluate } from "mathjs";

const plugin_category = "utility";

const calc: Command = {
  name: "calc",
  category: plugin_category,
  pattern: "calc(.*)",
  flags: ["m", "s"],
  info: {
    header: "Calculator Command",
    description: "Evaluates a mathematical expression.",
    usage: ["{tr}calc <expression>"],
    examples: ["{tr}calc 2+2", "{tr}calc (5*3)/2", "{tr}calc \n3+5\n12/4"],
  },
  fromMe: true,
  run: async (ctx) => {
    try {
      const expressions =
        ctx.match?.[1].split(/\n+/g).map((expr) => expr.trim()) || [];

      const filteredExpressions = expressions.filter((expr) => expr.length > 0);

      if (!filteredExpressions.length) {
        await ctx.client.sendMessage(ctx.jid, {
          text: "Please provide a mathematical expression to evaluate.",
        });
        return;
      }
      const result = evaluate(filteredExpressions);
      const cleanedResult = result.map((res: any) => {
        return typeof res === "function" ? "[Function]" : res;
      });

      let resultString = "";

      for (let i = 0; i < filteredExpressions.length; i++) {
        resultString += `*Equation:* \`${filteredExpressions[i]}\`\n*Result:* \`${cleanedResult[i] || result}\`\n\n`;
      }

      await ctx.client.sendMessage(ctx.jid, {
        text: resultString.trim(),
      });
    } catch (error) {
      await ctx.client.sendMessage(ctx.jid, {
        text: "Error in calculation. Please check your expression.",
      });
    }
  },
};

export const inlineMath: Command = {
  name: "inline math",
  category: plugin_category,
  regexPattern: /\{\{(.*?)\}\}/g,
  info: {
    header: "Calculator Plugin",
    description:
      "Evaluates mathematical expressions found in the message text.",
    usage: ["{{2+2}}", "{{(5*3)/2}}"],
    examples: ["{{2+2}}", "{{(5*3)/2}}"],
  },
  fromMe: true,

  run: async (ctx) => {
    const { match } = ctx;

    let text = ctx.text;

    for (const m of match) {
      const expr = m.replace(/{{|}}/g, "").trim();
      let ans: string;
      try {
        ans = String(evaluate(expr));
      } catch {
        console.error(`Failed to evaluate ${expr}`);
        return;
      }

      text = text.replace(m, `\`${ans}\``);
    }
    await ctx.client.sendMessage(ctx.jid, { text, edit: ctx.message.key });
  },
};

NEO.addCommand(calc);
NEO.addCommand(inlineMath);
