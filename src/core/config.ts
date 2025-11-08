import dotenv from "dotenv";

dotenv.config();

const envConfig = {
  NEO_SESSION: process.env.NEO_SESSION,
  TRIGGERS: process.env.TRIGGERS || "!",
  PREFIX: process.env.DEFAULT_PREFIX || ".",
  BOT_NAME: process.env.BOT_NAME || "Neo",
  ENVIRONMENT: process.env.ENVIRONMENT?.toUpperCase() || "PROD",
  ACCESS_MODE: process.env.ACCESS_MODE?.toUpperCase() || "PRIVATE",
  ALLOW_NSFW: process.env.ALLOW_NSFW?.toLowerCase() === "true" || false,
  ENABLE_LOGS: process.env.ENABLE_LOGS?.toLowerCase() === "true" || false,
  SUDO: process.env.SUDO?.split(",") || [],

  // API KEYS
  OLLAMA_API_KEY: process.env.OLLAMA_API_KEY || "",
};

if (!envConfig.NEO_SESSION) {
  throw new Error("NEO_SESSION is not defined in environment variables.");
}

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
