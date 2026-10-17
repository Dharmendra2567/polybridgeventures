import { getConfig } from "./config/env.js";
import { logger } from "./infrastructure/logging/logger.js";
import { disconnectPrisma } from "./infrastructure/database/prisma.js";
import { buildServer } from "./server.js";

async function main() {
  const config = getConfig();
  const server = await buildServer();

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    logger.info(
      { signal },
      "[Server] Received termination signal. Initiating graceful shutdown...",
    );
    try {
      await server.close();
      await disconnectPrisma();
      logger.info("[Server] Graceful shutdown completed. Exiting process.");
      process.exit(0);
    } catch (err) {
      logger.error(
        { err },
        "[Server] Error encountered during graceful shutdown.",
      );
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  try {
    await server.listen({
      port: config.PORT,
      host: config.HOST,
    });
    logger.info(
      { port: config.PORT, host: config.HOST, env: config.NODE_ENV },
      `[Server] Polybridge Trading API running at http://${config.HOST}:${config.PORT}/api/v1`,
    );
  } catch (err) {
    logger.fatal(
      { err },
      "[Server] Fatal error during startup. Exiting process.",
    );
    process.exit(1);
  }
}

main();
