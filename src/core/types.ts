import type { WAMessage, WASocket } from "@whiskeysockets/baileys";

export type Message = WAMessage["message"];
export type MessageType = keyof Message;

export type NeoContext = {
  client: WASocket;
  jid: string;
  pushName?: string;
  fromMe: boolean;
  fromOthers: boolean;
  isGroup: boolean;
  isOwner: boolean;
  text: string;
  message: WAMessage;
  messageType: MessageType;
  match: RegExpMatchArray | null;
};

type RequiredCommandOptions = Required<{
  fromMe: boolean;
}>;

type sudoCommandOptions =
  | { onlySudo: true; allowSudo: true }
  | { onlySudo: false; allowSudo: boolean };

type OptionalCommandOptions = {
  flags: ("i" | "m" | "s" | "g")[];
  fromOthers: boolean;
  onlyGroup: boolean;
  onlyPm: boolean;
  onlySudo: boolean;
  deleteCommand: boolean;
  allowPublic: boolean;
  allowSudo: boolean;
  disable: boolean;
  onType: MessageType;
  showInCommandList: boolean;
  isNSFW: boolean;
} & sudoCommandOptions;

export const DEFAULT_COMMAND_OPTIONS: OptionalCommandOptions = {
  flags: ["i"],
  fromOthers: false,
  onlyGroup: false,
  onlyPm: false,
  onlySudo: false,
  deleteCommand: false,
  allowPublic: true,
  allowSudo: true,
  disable: false,
  onType: undefined,
  showInCommandList: true,
  isNSFW: false,
};

type CommandOptions = RequiredCommandOptions & Partial<OptionalCommandOptions>;

export type Command = {
  name: string;
  category: string;
  pattern?: string;
  regexPattern?: RegExp;
  info: {
    header: string;
    description: string;
    usage: string[];
    examples: string[];
  };
  run: (ctx: NeoContext) => Promise<void>;
} & CommandOptions;
