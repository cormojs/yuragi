import { Hono } from "hono";
import { logger } from "hono/logger";
import { behindProxy } from "x-forwarded-fetch";
import { apiController } from "./controller/ApiController";
import { createFederationMiddleware } from "./controller/FederationController";
import { htmlController } from "./controller/HtmlController";

export async function startServer(): Promise<void> {
  const app = new Hono();
  app.use("*", logger());
  app.route("/", apiController);
  app.use("*", await createFederationMiddleware());

  app.use("*", async (ctx, next) => {
    const response = await htmlController.fetch(ctx.req.raw);
    if (response.status !== 404) return response;
    await next();
  });

  app.notFound((ctx) => ctx.text("Not Found", 404));

  const port = Number(Bun.env.PORT ?? 3000);
  const fetch = app.fetch.bind(app);
  const handler = Bun.env.BEHIND_PROXY === "true" ? behindProxy(fetch) : fetch;

  Bun.serve({
    port,
    fetch: handler,
  });

  console.log(`yuragi is listening on http://localhost:${port}`);
}
