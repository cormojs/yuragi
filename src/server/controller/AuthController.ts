import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { Hono } from "hono";
import { getOrigin } from "../LocalActor";
import { authService, type AuthService } from "../service/AuthService";
import { actorService, type ActorService } from "../service/actorService";

const sessionCookieName = "yuragi_session";
const sessionMaxAge = 60 * 60 * 24 * 30;

type LoginBody = {
  identifier?: unknown;
  password?: unknown;
};

export function createAuthController(
  authentication: AuthService = authService,
  actors: ActorService = actorService,
) {
  return new Hono()
    .get("/api/v1/auth/me", async (ctx) => {
      const actor = await authentication.getSessionActor(
        getCookie(ctx, sessionCookieName),
      );
      if (actor == null) return ctx.json({ error: "Unauthorized" }, 401);

      return ctx.json(await actors.toMastodonAccount(actor, getOrigin(ctx.req.raw)));
    })
    .post("/api/v1/auth/login", async (ctx) => {
      let body: LoginBody;
      try {
        body = await ctx.req.json<LoginBody>();
      } catch {
        return ctx.json({ error: "Invalid JSON body" }, 400);
      }
      if (typeof body.identifier !== "string" || typeof body.password !== "string") {
        return ctx.json({ error: "Identifier and password are required" }, 400);
      }

      const result = await authentication.login({
        identifier: body.identifier,
        password: body.password,
      });
      if (result == null) return ctx.json({ error: "Invalid credentials" }, 401);

      setCookie(ctx, sessionCookieName, result.token, {
        httpOnly: true,
        maxAge: sessionMaxAge,
        path: "/",
        sameSite: "Lax",
        secure: new URL(ctx.req.url).protocol === "https:",
      });
      return ctx.json(await actors.toMastodonAccount(result.actor, getOrigin(ctx.req.raw)));
    })
    .post("/api/v1/auth/logout", async (ctx) => {
      await authentication.logout(getCookie(ctx, sessionCookieName));
      deleteCookie(ctx, sessionCookieName, { path: "/" });
      return ctx.body(null, 204);
    });
}

export const authController = createAuthController();
