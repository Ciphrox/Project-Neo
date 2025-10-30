import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  delay,
  DisconnectReason,
} from "@whiskeysockets/baileys";

import qrcode from "qrcode-terminal";
import config from "@core/config";
import { packSession } from "./core/utils";
import pino from "pino";
import fs from "fs";

const args = process.argv.slice(2);
const wantQR = args.includes("--qr");
const phoneArg = args.find((a) => a.startsWith("--pair="));
const phoneRaw = phoneArg ? phoneArg.split("=")[1] : null;

if (!wantQR && !phoneRaw) {
  console.log("Usage:");
  console.log("  npx tsx src/generateSession.ts --qr");
  // console.log("  npx tsx src/generateSession.ts --pair=911234567890");
  process.exit(0);
}

async function generateSession() {
  const { state, saveCreds } = await useMultiFileAuthState(
    config.sessions.path,
  );

  const logger = pino({
    level: config.logger.level,
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        ignore: "pid, hostname",
        translateTime: "SYS:standard",
        messageFormat: "\x1b[96m[{module}]\x1b[0m {msg}",
      },
    },
  });

  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    logger,
    auth: state,
    browser: config.socket.browser,
    generateHighQualityLinkPreview:
      config.socket.generateHighQualityLinkPreview,
    syncFullHistory: config.socket.syncFullHistory,
    markOnlineOnConnect: config.socket.markOnlineOnConnect,
    keepAliveIntervalMs: config.socket.keepAliveIntervalMs,
    connectTimeoutMs: config.socket.connectTimeoutMs,
    defaultQueryTimeoutMs: config.socket.defaultQueryTimeoutMs,
    retryRequestDelayMs: config.socket.retryRequestDelayMs,
    maxMsgRetryCount: config.socket.maxMsgRetryCount,
    fireInitQueries: config.socket.fireInitQueries,
    shouldSyncHistoryMessage: () => false,
    shouldIgnoreJid: (jid) => jid === "status@broadcast",
    getMessage: async () => ({}) as any,
  });

  /* ----------  QR mode  ---------- */
  sock.ev.on("connection.update", async (upd) => {
    const { lastDisconnect, connection, qr } = upd;
    if (wantQR && qr) {
      console.log("\nScan QR below:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const isBoom = (err: any): err is { output: { statusCode: number } } =>
        err &&
        typeof err === "object" &&
        "output" in err &&
        "statusCode" in err.output;

      const statusCode = isBoom(lastDisconnect?.error)
        ? lastDisconnect?.error?.output?.statusCode
        : undefined;

      const shouldReconnect = isBoom(lastDisconnect?.error)
        ? statusCode !== DisconnectReason.loggedOut
        : true;

      if (shouldReconnect) {
        console.log("🔁 Connection closed — restarting...");
        generateSession();
      } else {
        console.log(`❌ Connection closed — reason: ${statusCode} `);
        await delay(5000);
        // process.exit(0);
      }
    } else if (connection === "open") {
      console.log("✅ Connected successfully!");

      const creds = JSON.parse(
        fs.readFileSync(`${config.sessions.path}/creds.json`, "utf-8"),
      );

      const NEO_SESSION = packSession(creds);

      console.log("\n----- COPY BELOW SESSION STRING -----\n");
      console.log(NEO_SESSION);
      console.log("----- COPY ABOVE SESSION STRING -----\n");

      const myJid = sock.user!.id.replace(/:[^@]*/g, "");
      await sock.sendMessage(myJid, {
        text: "✅ NEO Session generated! Please Don't share your session.\n Your NEO session string is:",
      });
      await sock.sendMessage(myJid, {
        text: NEO_SESSION,
      });
      await delay(3000);
      process.exit(0);
    }
  });
  sock.ev.on("creds.update", async () => {
    saveCreds();
  });
}

generateSession();
