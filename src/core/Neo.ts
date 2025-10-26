import { Command, DEFAULT_COMMAND_OPTIONS } from "@core/types";
import config from "@core/config";

export const commands: Command[] = [];

export function addCommand(command: Command) {
  const c = { ...DEFAULT_COMMAND_OPTIONS, ...command } as Command;

  if (c.pattern) {
    c.regexPattern = new RegExp(
      `${config.TRIGGERS}${c.pattern}`,
      c.flags.join(""),
    );
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
