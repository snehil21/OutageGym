import Fastify from "fastify";

const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? "3000");

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok" }));

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  app.log.info({ signal }, "Shutdown requested");
  await app.close();
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error, "Order API failed to start");
  process.exitCode = 1;
}
