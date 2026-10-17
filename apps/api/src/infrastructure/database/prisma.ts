import { PrismaClient } from "../../generated/client/index.js";
import { logger } from "../logging/logger.js";

let prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: [
        { emit: "event", level: "query" },
        { emit: "event", level: "error" },
        { emit: "event", level: "info" },
        { emit: "event", level: "warn" },
      ],
    });

    prismaInstance.$on("error" as never, (e: unknown) => {
      logger.error({ err: e }, "[Database] Prisma query error encountered");
    });
  }

  return prismaInstance;
}

export async function disconnectPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
    logger.info("[Database] Prisma client successfully disconnected");
  }
}
