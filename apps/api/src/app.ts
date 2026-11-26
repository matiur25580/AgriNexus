import compression from "compression";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(pinoHttp({ logger }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false }));

app.get(`${env.API_PREFIX}/health`, (_req, res) => {
  res.status(200).json({
    success: true,
    data: { status: "ok", service: "agrinexus-api", timestamp: new Date().toISOString() },
  });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "The requested resource was not found." } });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err: error }, "Unhandled request error");
  res.status(500).json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." } });
});
