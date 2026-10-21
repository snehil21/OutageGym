import { createServer, type Server, type ServerResponse } from "node:http";

export interface HealthServerOptions {
  host: string;
  port: number;
  checkReady(): Promise<void>;
}

export interface HealthServer {
  close(): Promise<void>;
}

const respond = (
  response: ServerResponse,
  statusCode: number,
  body: { status: string },
): void => {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
};

export const startHealthServer = async (
  options: HealthServerOptions,
): Promise<HealthServer> => {
  const server: Server = createServer(async (request, response) => {
    if (request.url === "/health") {
      respond(response, 200, { status: "ok" });
      return;
    }

    if (request.url === "/ready") {
      try {
        await options.checkReady();
        respond(response, 200, { status: "ready" });
      } catch {
        respond(response, 503, { status: "not_ready" });
      }
      return;
    }

    respond(response, 404, { status: "not_found" });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  return {
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error === undefined) {
            resolve();
          } else {
            reject(error);
          }
        });
      }),
  };
};
