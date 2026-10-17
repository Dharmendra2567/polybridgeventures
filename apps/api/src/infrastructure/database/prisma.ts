import { PrismaClient } from "../../generated/client/index.js";
import { logger } from "../logging/logger.js";

const globalForPrisma = globalThis as unknown as {
  prismaInstance: PrismaClient | undefined;
};

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prismaInstance) {
    globalForPrisma.prismaInstance = new PrismaClient({
      log: [
        { emit: "event", level: "query" },
        { emit: "event", level: "error" },
        { emit: "event", level: "info" },
        { emit: "event", level: "warn" },
      ],
    });

    globalForPrisma.prismaInstance.$on("error" as never, (e: unknown) => {
      logger.error({ err: e }, "[Database] Prisma query error encountered");
    });
  }

  return globalForPrisma.prismaInstance;
}

export async function disconnectPrisma(): Promise<void> {
  if (globalForPrisma.prismaInstance) {
    await globalForPrisma.prismaInstance.$disconnect();
    globalForPrisma.prismaInstance = undefined;
    logger.info("[Database] Prisma client successfully disconnected");
  }
}
