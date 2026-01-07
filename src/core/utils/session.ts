import { AuthenticationCreds } from "@whiskeysockets/baileys";

export function packSession(creds : AuthenticationCreds): string {
  const base64 = Buffer.from(JSON.stringify(creds)).toString("base64");
  return "NEO_" + base64;
}

export function unpackSession(b64: string) {
  if (!b64.startsWith("NEO_")) throw new Error("Invalid session");
  return JSON.parse(Buffer.from(b64.slice("NEO_".length), "base64").toString());
}