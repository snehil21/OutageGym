import { randomUUID } from "node:crypto";

import Fastify, { type FastifyInstance } from "fastify";

import {
  registerOrderRoute,
  type OrderRouteDependencies,
} from "./order-route.js";

export const buildApp = (
  dependencies: OrderRouteDependencies,
): FastifyInstance => {
  const app = Fastify({
    genReqId: () => randomUUID(),
    logger: true,
  });

  app.get("/health", async () => ({ status: "ok" }));
  registerOrderRoute(app, dependencies);

  return app;
};
