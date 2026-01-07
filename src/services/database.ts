import config from "@/core/config";
import { WAMessage } from "@whiskeysockets/baileys";
import { Database } from "bun:sqlite";
import fs from "fs";

const DB_PATH = config.STORAGE_PATH || "./data/db";
if (!fs.existsSync(DB_PATH)) {
  fs.mkdirSync(DB_PATH);
}

const db = new Database(`${DB_PATH}/db.sqlite`);

db.run("PRAGMA foreign_keys = ON;");

db.run(`
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    pushName TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remoteJid TEXT,
    senderJid TEXT,
    messageText TEXT,
    timestamp INTEGER,
    FOREIGN KEY (senderJid) REFERENCES contacts(id)
  )
`);

const upsertContact = db.prepare(`
    INSERT INTO contacts (id, pushName) VALUES ($id, $pushName)
    ON CONFLICT(id) DO UPDATE SET pushName = excluded.pushName
`);

const insertMessage = db.prepare(`
    INSERT INTO messages (remoteJid, senderJid, messageText, timestamp)
    VALUES ($remoteJid, $senderJid, $messageText, $timestamp)
`);

export async function saveMessage(msg: WAMessage, text: string, myJid: string) {
  try {
    const remoteJid = msg.key.remoteJid;
    let sender = msg.key.participant || msg.key.remoteJid;

    if (msg.key.fromMe) {
      sender = myJid.split(":")[0] + "@s.whatsapp.net";
    }

    const pushName =
      msg.pushName || (msg.key.fromMe ? "Neo" : msg.pushName || "Unknown");
    const timestamp = msg.messageTimestamp || Date.now();

    db.transaction(() => {
      upsertContact.run({
        $id: sender,
        $pushName: pushName,
      });

      insertMessage.run({
        $remoteJid: remoteJid,
        $senderJid: sender,
        $messageText: text,
        $timestamp: Number(timestamp),
      });
    })();
  } catch (error) {
    console.error("Failed to save message to DB:", error);
  }
}

export function getMessages(count: number, chatId: string) {
  const search = db.prepare(`
        SELECT contacts.pushName, messages.messageText 
        FROM messages, contacts 
        WHERE 
                messages.senderJid = contacts.id 
            AND 
                messages.remoteJid = $chatId
        ORDER BY messages.timestamp DESC 
        LIMIT $count;
    `);
  return search.all({ $count: count, $chatId: chatId });
}
