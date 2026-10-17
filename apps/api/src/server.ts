import fastify, { FastifyInstance, FastifyServerOptions } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import { getConfig } from "./config/env.js";
import { logger } from "./infrastructure/logging/logger.js";
import { correlationIdPlugin } from "./presentation/middleware/correlation-id.js";
import {
  errorHandler,
  notFoundHandler,
} from "./presentation/middleware/error-handler.js";
import { healthRoutes } from "./presentation/routes/health.routes.js";
import { tradeRoutes } from "./presentation/routes/trade.routes.js";

export async function buildServer(
  options: FastifyServerOptions = {},
): Promise<FastifyInstance> {
  const config = getConfig();

  const server = fastify({
    loggerInstance: logger,
    requestIdHeader: "x-correlation-id",
    ...options,
  });

  // 1. Correlation ID Middleware
  await server.register(correlationIdPlugin);

  // 2. Security Headers via Helmet
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });

  // 3. Strict CORS
  await server.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. mobile apps, curl) in non-production
      if (!origin && config.NODE_ENV !== "production") {
        return cb(null, true);
      }
      if (
        origin === config.CORS_ORIGIN ||
        origin?.endsWith(".loca.lt") ||
        origin?.includes("loca.lt") ||
        origin?.endsWith(".vercel.app") ||
        origin?.includes("vercel.app") ||
        config.NODE_ENV !== "production"
      ) {
        return cb(null, true);
      }
      return cb(new Error("CORS origin not allowed"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Correlation-ID",
      "Idempotency-Key",
      "X-Requested-With",
    ],
  });

  // 4. Secure Cookie Parser
  await server.register(cookie, {
    secret: config.COOKIE_SECRET,
    hook: "onRequest",
  });

  // 5. Rate Limiting (Brute-force protection on API surface)
  await server.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // 6. Multipart Form/File Upload Support (50MB limit, up to 10 files per request)
  await server.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024,
      files: 10,
    },
  });

  // 7. Global Error and Not Found Handlers
  server.setNotFoundHandler(notFoundHandler);
  server.setErrorHandler(errorHandler);

  // 8. Register API Routes under /api/v1
  await server.register(healthRoutes, { prefix: "/api/v1" });
  await server.register(tradeRoutes, { prefix: "/api/v1" });

  return server;
}
