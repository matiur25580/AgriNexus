import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: ["req.headers.authorization", "*.password", "*.refreshToken", "*.token"],
    censor: "[REDACTED]",
  },
  ...(env.NODE_ENV === "development"
    ? { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } } }
    : {}),
});
