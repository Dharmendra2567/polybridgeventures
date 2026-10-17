import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ApiErrorResponse } from "@polybridge/contracts";
import { getConfig } from "../../config/env.js";

export function notFoundHandler(req: FastifyRequest, reply: FastifyReply) {
  const correlationId = (req.id as string) || "unknown-correlation-id";
  const timestamp = new Date().toISOString();

  const responsePayload: ApiErrorResponse = {
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method}:${req.url} not found`,
      correlationId,
      timestamp,
    },
  };

  return reply.status(404).send(responsePayload);
}

export function errorHandler(
  error: FastifyError,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const config = getConfig();
  const correlationId = (req.id as string) || "unknown-correlation-id";
  const timestamp = new Date().toISOString();

  // Log error using structured logger
  req.log.error(
    {
      err: error,
      correlationId,
      url: req.raw.url,
      method: req.raw.method,
    },
    "[Request Error Handler]",
  );

  // 1. Fastify Schema Validation Error
  if (error.validation) {
    const responsePayload: ApiErrorResponse = {
      error: {
        code: "VALIDATION_ERROR",
        message: "The request payload or parameters failed validation",
        correlationId,
        timestamp,
        details: error.validation.map((v) => ({
          field:
            v.instancePath ||
            (v.params?.missingProperty as string) ||
            undefined,
          message: v.message || "Invalid value",
        })),
      },
    };
    return reply.status(400).send(responsePayload);
  }

  // 2. Explicit HTTP status codes (e.g. 401, 403, 404, 409, 429)
  const statusCode =
    error.statusCode && error.statusCode >= 400 && error.statusCode < 600
      ? error.statusCode
      : 500;

  // 3. For 500 errors in production, mask details to prevent information disclosure
  const isProduction = config.NODE_ENV === "production";
  const message =
    statusCode === 500 && isProduction
      ? "An unexpected internal server error occurred. Please contact support with the correlation ID."
      : error.message;

  const code =
    error.code && error.code.startsWith("FST_")
      ? error.code
      : statusCode === 404
        ? "NOT_FOUND"
        : statusCode === 401
          ? "UNAUTHORIZED"
          : statusCode === 403
            ? "FORBIDDEN"
            : statusCode === 409
              ? "CONFLICT"
              : statusCode === 429
                ? "RATE_LIMIT_EXCEEDED"
                : "INTERNAL_SERVER_ERROR";

  const responsePayload: ApiErrorResponse = {
    error: {
      code,
      message,
      correlationId,
      timestamp,
    },
  };

  return reply.status(statusCode).send(responsePayload);
}
