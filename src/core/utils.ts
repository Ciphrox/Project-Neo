export function packSession(creds): string {
  const base64 = Buffer.from(JSON.stringify(creds)).toString("base64");
  return "NEO_" + base64;
}

export function unpackSession(b64: string) {
  if (!b64.startsWith("NEO_")) throw new Error("Invalid session");
  return JSON.parse(Buffer.from(b64.slice("NEO_".length), "base64").toString());
}

export function makeJid(id: string): { jid: string; error: Error | null } {
  if (id.length === 0) return { jid: "", error: new Error("Invalid ID") };
  if (id.length <= 15) return { jid: `${id}@s.whatsapp.net`, error: null };
  if (id.length === 16) return { jid: `${id}@c.us`, error: null };
  return { jid: "", error: new Error("Invalid ID") };
}
