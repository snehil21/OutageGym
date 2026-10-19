import { randomUUID } from "node:crypto";

import type { Meter } from "@opentelemetry/api";
import Fastify, { type FastifyInstance } from "fastify";

import {
  registerOrderRoute,
  type OrderRouteDependencies,
} from "./order-route.js";

interface AppDependencies extends OrderRouteDependencies {
  checkReady(): Promise<void>;
  meter: Meter;
}

export const buildApp = (
  dependencies: AppDependencies,
): FastifyInstance => {
  const requestCount = dependencies.meter.createCounter(
    "outagegym.api.request.count",
    {
      description: "Number of HTTP requests handled by the Order API",
    },
  );
  const requestDuration = dependencies.meter.createHistogram(
    "outagegym.api.request.duration",
    {
      description: "Order API HTTP request duration",
      unit: "s",
      advice: {
        explicitBucketBoundaries: [
          0.005,
          0.01,
          0.025,
          0.05,
          0.1,
          0.25,
          0.5,
          1,
          2.5,
          5,
        ],
      },
    },
  );
  const requestStartTimes = new WeakMap<object, bigint>();
  const app = Fastify({
    genReqId: () => randomUUID(),
    logger: true,
  });

  app.addHook("onRequest", async (request) => {
    requestStartTimes.set(request, process.hrtime.bigint());
  });
  app.addHook("onResponse", async (request, reply) => {
    const startedAt = requestStartTimes.get(request);

    if (startedAt === undefined) {
      return;
    }

    const attributes = {
      "http.request.method": request.method,
      "http.response.status_code": reply.statusCode,
      "http.route": request.routeOptions.url,
    };
    const durationSeconds =
      Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;

    requestCount.add(1, attributes);
    requestDuration.record(durationSeconds, attributes);
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
