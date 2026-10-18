import { randomUUID } from "node:crypto";

import Fastify, { type FastifyInstance } from "fastify";

import {
  registerOrderRoute,
  type OrderRouteDependencies,
} from "./order-route.js";

interface AppDependencies extends OrderRouteDependencies {
  checkReady(): Promise<void>;
}

export const buildApp = (
  dependencies: AppDependencies,
): FastifyInstance => {
  const app = Fastify({
    genReqId: () => randomUUID(),
    logger: true,
  });

  app.get("/health", async () => ({ status: "ok" }));
  app.get("/ready", async (_request, reply) => {
    try {
      await dependencies.checkReady();
      return { status: "ready" };
    } catch {
      return reply.code(503).send({ status: "not_ready" });
    }
  });
  registerOrderRoute(app, dependencies);

  return app;
};
