import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  WASocket,
} from "@whiskeysockets/baileys";
import { pino } from "pino";
import qrcode from "qrcode-terminal";
import config from "@core/config";

export async function createSocket(): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState(
    config.sessions.path,
  );
  const { version } = await fetchLatestBaileysVersion();
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

  sock.ev.on("creds.update", saveCreds);

  return sock;
}

export function handleQRCode(qr: string): void {
  console.log("QR Code received, scan it!");
  qrcode.generate(qr, { small: true });
}

export function handleDisconnection(
  lastDisconnect: any,
  onReconnect: () => void,
): void {
  const isBoom = (err: any): err is { output: { statusCode: number } } =>
    err &&
    typeof err === "object" &&
    "output" in err &&
    "statusCode" in err.output;

  const statusCode = lastDisconnect?.error?.output?.statusCode;
  const shouldReconnect = isBoom(lastDisconnect?.error)
    ? statusCode !== DisconnectReason.loggedOut
    : true;

  // console.log(
  //   "Disconnected:",
  //   lastDisconnect?.error,
  //   "Reconnect?",
  //   shouldReconnect
  // );

  if (shouldReconnect) {
    setTimeout(() => onReconnect(), 3000);
  }
}

export function handleConnection(sock: WASocket): void {
  console.log(
    `\x1b[32m Connected to WhatsApp!\x1b[0m with [\x1b[36m${sock.user?.name}\x1b[0m] - [\x1b[36m${sock.user?.id}\x1b[0m]`,
  );
  console.log(
    `\x1b[33m Command handler:\x1b[0m \x1b[96m${config.TRIGGERS}\x1b[0m`,
  );
  console.log(
    `\x1b[35m Access mode:\x1b[0m \x1b[96m${config.ACCESS_MODE}\x1b[0m`,
  );
}
