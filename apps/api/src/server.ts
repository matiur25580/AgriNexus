import mongoose from "mongoose";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

async function bootstrap() {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "AgriNexus API listening");
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down gracefully");
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

bootstrap().catch((error: unknown) => {
  logger.fatal({ err: error }, "Failed to start API");
  process.exit(1);
});
