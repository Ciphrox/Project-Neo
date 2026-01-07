import { handleMessage } from "@/core/handler.js";
import { loadPlugins } from "@core/loader.js";

import {
  createSocket,
  handleQRCode,
  handleDisconnection,
  handleConnection,
} from "@core/connection.js";
import { saveMessage } from "@/services/database";

export async function start() {
  console.log(`Neo is starting...`);
  const sock = await createSocket();

  sock.ev.on("connection.update", (update) => {
    const { lastDisconnect, connection, qr } = update;

    if (qr) {
      handleQRCode(qr);
    }

    if (connection === "close") {
      handleDisconnection(lastDisconnect, start);
    } else if (connection === "open") {
      handleConnection(sock);
    }
  });

  loadPlugins();

  sock.ev.on("messages.upsert", ({ messages, type }) => {
    messages.forEach((m) => {
      const text =
        m.message?.conversation || m.message?.extendedTextMessage?.text || "";

      if (text) saveMessage(m, text, sock.user?.id);
      if (type !== "notify") return;
      
      handleMessage(sock, m);
    });
  });
}
