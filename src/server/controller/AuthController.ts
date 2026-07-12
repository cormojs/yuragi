import { zValidator } from "@hono/zod-validator";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { Hono } from "hono";
import { z } from "zod";
import { getOrigin } from "../LocalActor";
import { authService, type AuthService } from "../service/AuthService";
import { actorService, type ActorService } from "../service/actorService";

const sessionCookieName = "yuragi_session";
const sessionMaxAge = 60 * 60 * 24 * 30;

const loginSchema = z
  .object({
    identifier: z.string().min(1).max(30),
    password: z.string().min(1),
  })
  .strict();

const createStatusSchema = z
  .object({
    content: z.string().trim().min(1).max(500),
    visibility: z.literal("public").optional(),
  })
  .strict();

function validationError() {
  return { error: "Invalid request body" };
}

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
    .post(
      "/api/v1/auth/login",
      zValidator("json", loginSchema, (result, ctx) => {
        if (!result.success) return ctx.json(validationError(), 400);
      }),
      async (ctx) => {
        const body = ctx.req.valid("json");

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
        return ctx.json(
          await actors.toMastodonAccount(result.actor, getOrigin(ctx.req.raw)),
        );
      },
    )
    .post("/api/v1/auth/logout", async (ctx) => {
      await authentication.logout(getCookie(ctx, sessionCookieName));
      deleteCookie(ctx, sessionCookieName, { path: "/" });
      return ctx.body(null, 204);
    })
    .post(
      "/api/v1/statuses",
      zValidator("json", createStatusSchema, (result, ctx) => {
        if (!result.success) return ctx.json(validationError(), 422);
      }),
      async (ctx) => {
        const actor = await authentication.getSessionActor(
          getCookie(ctx, sessionCookieName),
        );
        if (actor == null) return ctx.json({ error: "Unauthorized" }, 401);

        const origin = getOrigin(ctx.req.raw);
        const note = await actors.createPublicNote({
          actor,
          content: ctx.req.valid("json").content,
          origin,
        });
        return ctx.json(await actors.toMastodonStatus(note, actor, origin), 201);
      },
    );
}

export const authController = createAuthController();
