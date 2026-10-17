import { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { v4 as uuidv4 } from "uuid";

const correlationIdPluginAsync: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  fastify.addHook("onRequest", async (req, reply) => {
    const headerValue = req.headers["x-correlation-id"];
    const correlationId =
      typeof headerValue === "string" && headerValue.trim().length > 0
        ? headerValue.trim()
        : uuidv4();

    // Attach correlation ID to request and response header
    req.id = correlationId;
    reply.header("x-correlation-id", correlationId);
  });
};

export const correlationIdPlugin = fp(correlationIdPluginAsync, {
  name: "correlation-id-plugin",
});
