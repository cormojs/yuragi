import { Hono } from "hono";
import { apiController } from "./controller/ApiController";
import { authController } from "./controller/AuthController";
import { createFederationMiddleware } from "./controller/FederationController";
import { htmlController } from "./controller/HtmlController";

export async function startServer(): Promise<void> {
  const app = new Hono();
  app.route("/", apiController);
  app.route("/", authController);
  app.use("*", await createFederationMiddleware());

  app.use("*", async (ctx, next) => {
    const response = await htmlController.fetch(ctx.req.raw);
    if (response.status !== 404) return response;
    await next();
  });

  app.notFound((ctx) => ctx.text("Not Found", 404));

  const port = Number(Bun.env.PORT ?? 3000);

  Bun.serve({
    port,
    fetch: app.fetch,
  });

  console.log(`yuragi is listening on http://localhost:${port}`);
}
