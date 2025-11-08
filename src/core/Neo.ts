import { Command, DEFAULT_COMMAND_OPTIONS } from "@core/types";
import config from "@core/config";

const commands: Command[] = [];

export function addCommand(command: Command) {
  const c = { ...DEFAULT_COMMAND_OPTIONS, ...command } as Command;
  if (!c.pattern && !c.regexPattern) return;

  if (c.pattern) {
    c.regexPattern = new RegExp(
      `${config.TRIGGERS}${c.pattern}`,
      c.flags.join(""),
    );
  }

  if (c.isNSFW && !config.ALLOW_NSFW) {
    return;
  }
  
  commands.push(c);
}
export function getCommands() {
  return commands;
}

const NEO = {
  addCommand,
  getCommands,
};

export default NEO;
