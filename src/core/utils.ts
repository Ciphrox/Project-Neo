export function makeJid(id: string): { jid: string; error: Error | null } {
  if (id.length === 0) return { jid: "", error: new Error("Invalid ID") };
  if (id.length <= 15) return { jid: `${id}@s.whatsapp.net`, error: null };
  if (id.length === 16) return { jid: `${id}@c.us`, error: null };
  return { jid: "", error: new Error("Invalid ID") };
}
