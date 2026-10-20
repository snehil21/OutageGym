import { createServer } from "node:http";

export const startHealthServer = async (
  host: string,
  port: number,
  ready: () => Promise<void>,
) => {
  const server = createServer(async (request, response) => {
    let statusCode = 404;
    let status = "not_found";

    if (request.url === "/health") {
      statusCode = 200;
      status = "ok";
    } else if (request.url === "/ready") {
      try {
        await ready();
        statusCode = 200;
        status = "ready";
      } catch {
        statusCode = 503;
        status = "not_ready";
      }
    }

    response.writeHead(statusCode, { "content-type": "application/json" });
    response.end(JSON.stringify({ status }));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  return {
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error === undefined ? resolve() : reject(error)));
      }),
  };
};
