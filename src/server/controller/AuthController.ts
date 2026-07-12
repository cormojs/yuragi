import { zValidator } from "@hono/zod-validator";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { Hono } from "hono";
import { z } from "zod";
import { getActorPath, getOrigin } from "../LocalActor";
import { authService, type AuthService } from "../service/AuthService";
import { actorService, type ActorService } from "../service/actorService";
import {
  federationService,
  type FederationService,
} from "../service/FederationService";

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

const statusIdParamSchema = z.object({ id: z.uuid() });

const updateCredentialsSchema = z
  .object({
    display_name: z.string().trim().max(30).optional(),
    note: z.string().trim().max(500).optional(),
    discoverable: z.boolean().optional(),
    indexable: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((item) => item !== undefined));

function validationError() {
  return { error: "Invalid request body" };
}

export function createAuthController(
  authentication: AuthService = authService,
  actors: ActorService = actorService,
  federation: FederationService = federationService,
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
    .patch(
      "/api/v1/accounts/update_credentials",
      zValidator("json", updateCredentialsSchema, (result, ctx) => {
        if (!result.success) return ctx.json(validationError(), 422);
      }),
      async (ctx) => {
        const actor = await authentication.getSessionActor(
          getCookie(ctx, sessionCookieName),
        );
        if (actor == null) return ctx.json({ error: "Unauthorized" }, 401);

        const body = ctx.req.valid("json");
        const updated = await actors.updateActorProfile(actor.id, {
          ...(body.display_name == null ? {} : { name: body.display_name }),
          ...(body.note == null ? {} : { summary: body.note }),
          ...(body.discoverable == null
            ? {}
            : { discoverable: body.discoverable }),
          ...(body.indexable == null ? {} : { indexable: body.indexable }),
        });
        if (updated == null) return ctx.json({ error: "Record not found" }, 404);

        return ctx.json(
          await actors.toMastodonAccount(updated, getOrigin(ctx.req.raw)),
        );
      },
    )
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
        await federation.deliverCreate({ actor, note, origin });
        return ctx.json(await actors.toMastodonStatus(note, actor, origin), 201);
      },
    )
    .post(
      "/api/v1/statuses/:id/favourite",
      zValidator("param", statusIdParamSchema, (result, ctx) => {
        if (!result.success) return ctx.json({ error: "Invalid status ID" }, 400);
      }),
      async (ctx) => {
        const actor = await authentication.getSessionActor(
          getCookie(ctx, sessionCookieName),
        );
        if (actor == null) return ctx.json({ error: "Unauthorized" }, 401);

        const { id } = ctx.req.valid("param");
        const note = await actors.findNoteById(id);
        if (note == null) return ctx.json({ error: "Record not found" }, 404);

        const origin = getOrigin(ctx.req.raw);
        const actorUri = new URL(getActorPath(actor.identifier), origin).href;
        let favourite = await actors.findFavouriteByNoteAndActor(note.id, actorUri);
        if (favourite == null) {
          favourite = await actors.createFavourite({
            noteId: note.id,
            actorUri,
            activityId: new URL(
              `${getActorPath(actor.identifier)}/activities/${crypto.randomUUID()}`,
              origin,
            ).href,
          });
          await federation.deliverLike({ actor, note, favourite, origin });
        }

        const noteActor = await actors.findActorById(note.actorId);
        if (noteActor == null) return ctx.json({ error: "Record not found" }, 404);
        return ctx.json(
          await actors.toMastodonStatus(note, noteActor, origin, actorUri),
        );
      },
    )
    .post(
      "/api/v1/statuses/:id/unfavourite",
      zValidator("param", statusIdParamSchema, (result, ctx) => {
        if (!result.success) return ctx.json({ error: "Invalid status ID" }, 400);
      }),
      async (ctx) => {
        const actor = await authentication.getSessionActor(
          getCookie(ctx, sessionCookieName),
        );
        if (actor == null) return ctx.json({ error: "Unauthorized" }, 401);

        const { id } = ctx.req.valid("param");
        const note = await actors.findNoteById(id);
        if (note == null) return ctx.json({ error: "Record not found" }, 404);

        const origin = getOrigin(ctx.req.raw);
        const actorUri = new URL(getActorPath(actor.identifier), origin).href;
        const favourite = await actors.findFavouriteByNoteAndActor(
          note.id,
          actorUri,
        );
        if (favourite != null) {
          await federation.deliverUndoLike({ actor, note, favourite, origin });
          await actors.deleteFavourite(favourite.id);
        }

        const noteActor = await actors.findActorById(note.actorId);
        if (noteActor == null) return ctx.json({ error: "Record not found" }, 404);
        return ctx.json(
          await actors.toMastodonStatus(note, noteActor, origin, actorUri),
        );
      },
    );
}

export const authController = createAuthController();
