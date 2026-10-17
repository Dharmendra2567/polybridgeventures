import { pino, LoggerOptions } from "pino";
import { getConfig } from "../../config/env.js";

export const REDACTED_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'req.headers["x-csrf-token"]',
  "password",
  "passwordHash",
  "password_hash",
  "token",
  "sessionToken",
  "session_token",
  "mfaSecret",
  "mfa_secret",
  "secret",
  "*.password",
  "*.token",
];

export function createLogger(options?: Partial<LoggerOptions>) {
  const config = getConfig();

  const loggerOptions: LoggerOptions = {
    level: config.LOG_LEVEL,
    redact: {
      paths: REDACTED_PATHS,
      censor: "[REDACTED]",
    },
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...options,
  };

  return pino(loggerOptions);
}

export const logger = createLogger();
