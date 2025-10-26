import { handleMessage } from "@/core/handler.js";
import { loadPlugins } from "@core/loader.js";

import {
  createSocket,
  handleQRCode,
  handleDisconnection,
  handleConnection,
} from "@core/connection.js";

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

  sock.ev.on("messages.upsert", ({ messages }) => {
    messages.forEach((m) => {
      handleMessage(sock, m);
    });
  });
}
