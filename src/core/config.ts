import dotenv from "dotenv";

dotenv.config();

const envConfig = {
  TRIGGERS: process.env.TRIGGERS || "!",
  SUDO: process.env.SUDO?.split(",") || [],
  PREFIX: process.env.DEFAULT_PREFIX || ".",
  BOT_NAME: process.env.BOT_NAME || "Neo",
  ENVIRONMENT: process.env.ENVIRONMENT.toUpperCase() || "PROD",
  ACCESS_MODE: process.env.ACCESS_MODE.toUpperCase() || "PRIVATE",
};

const config = {
  ...envConfig,
  sessions: {
    path: "./sessions",
  },
  socket: {
    browser: process.env.BROWSER
      ? (process.env.BROWSER.split(",") as [string, string, string])
      : (["Neo", "Ubuntu", "69.0.0"] as [string, string, string]),
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    markOnlineOnConnect: process.env.SHOW_ONLINE === "true" || false,
    keepAliveIntervalMs: 30_000,
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 60_000,
    retryRequestDelayMs: 250,
    maxMsgRetryCount: 5,
    fireInitQueries: true,
  },
  logger: {
    level: process.env.ENVIRONMENT == "dev" ? "debug" : ("silent" as const),
  },
} as const;

export default config;
