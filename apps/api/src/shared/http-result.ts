import type { FastifyReply } from "fastify";

export type HttpResult = {
  status: number;
  body: unknown;
};

export function sendResult(reply: FastifyReply, result: HttpResult) {
  return reply.status(result.status).send(result.body);
}
