import "dotenv/config";
import { z } from "zod";
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default("/api/v1"),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/agrinexus"),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  ACCESS_TOKEN_SECRET: z.string().min(32).default("local-development-secret-change-before-deploy-0001"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  REFRESH_COOKIE_NAME: z.string().default("agrinexus_refresh"),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) { console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors); process.exit(1); }
if (parsed.data.NODE_ENV === "production" && parsed.data.ACCESS_TOKEN_SECRET === "local-development-secret-change-before-deploy-0001") throw new Error("ACCESS_TOKEN_SECRET must be configured in production.");
export const env = parsed.data;
