import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { authController } from "./AuthController";
import { getOrigin } from "../LocalActor";
import { actorService, type ActorService } from "../service/actorService";

const mastodonNotFound = { error: "Record not found" };
const accountLookupQuerySchema = z.object({
  acct: z.string().trim().min(1).max(255),
});
const accountIdParamSchema = z.object({ id: z.uuid() });

export function createApiController(service: ActorService = actorService) {
  return new Hono()
    .get("/api/v1/instance", async (ctx) => {
      const origin = getOrigin(ctx.req.raw);

      return ctx.json(
        {
          uri: new URL(origin).host,
          title: "yuragi",
          short_description:
            "A small Fediverse SNS server built with Bun, Hono, and Fedify.",
          description:
            "A small Fediverse SNS server built with Bun, Hono, and Fedify.",
          email: "",
          version: "4.2.0 (compatible; yuragi 0.1.0)",
          urls: {
            streaming_api: origin,
          },
          stats: {
            user_count: 1,
            status_count: 1,
            domain_count: 1,
          },
          thumbnail: null,
          languages: ["en"],
          registrations: false,
          approval_required: true,
          invites_enabled: false,
          configuration: {
            accounts: {
              max_featured_tags: 0,
            },
            statuses: {
              max_characters: 500,
              max_media_attachments: 0,
              characters_reserved_per_url: 23,
            },
            media_attachments: {
              supported_mime_types: [],
              image_size_limit: 0,
              image_matrix_limit: 0,
              video_size_limit: 0,
              video_frame_rate_limit: 0,
              video_matrix_limit: 0,
            },
            polls: {
              max_options: 0,
              max_characters_per_option: 0,
              min_expiration: 0,
              max_expiration: 0,
            },
          },
        },
        200,
      );
    })
    .get(
      "/api/v1/accounts/lookup",
      zValidator("query", accountLookupQuerySchema, (result, ctx) => {
        if (!result.success) {
          return ctx.json({ error: "The acct query parameter is required" }, 400);
        }
      }),
      async (ctx) => {
        const origin = getOrigin(ctx.req.raw);
        const { acct } = ctx.req.valid("query");

        const actor = await service.findActorByAcct(acct);
        if (actor == null) return ctx.json(mastodonNotFound, 404);

        return ctx.json(await service.toMastodonAccount(actor, origin), 200);
      },
    )
    .get(
      "/api/v1/accounts/:id",
      zValidator("param", accountIdParamSchema, (result, ctx) => {
        if (!result.success) return ctx.json({ error: "Invalid account ID" }, 400);
      }),
      async (ctx) => {
        const origin = getOrigin(ctx.req.raw);
        const { id } = ctx.req.valid("param");

        const actor = await service.findActorById(id);
        if (actor == null) return ctx.json(mastodonNotFound, 404);

        return ctx.json(await service.toMastodonAccount(actor, origin), 200);
      },
    )
    .get(
      "/api/v1/accounts/:id/statuses",
      zValidator("param", accountIdParamSchema, (result, ctx) => {
        if (!result.success) return ctx.json({ error: "Invalid account ID" }, 400);
      }),
      async (ctx) => {
        const origin = getOrigin(ctx.req.raw);
        const { id } = ctx.req.valid("param");

        const actor = await service.findActorById(id);
        if (actor == null) return ctx.json(mastodonNotFound, 404);

        const actorNotes = await service.listNotesForActor(actor.id);
        return ctx.json(
          await Promise.all(
            actorNotes.map((note) =>
              service.toMastodonStatus(note, actor, origin),
            ),
          ),
          200,
        );
      },
    )
    .get("/api/v1/timelines/public", async (ctx) => {
      const origin = getOrigin(ctx.req.raw);

      const onlyLocal = ctx.req.query("local") === "true";
      if (!onlyLocal) {
        return ctx.json(
          { error: "Only the local public timeline is available" },
          400,
        );
      }

      const rows = await service.listPublicLocalNotes();
      return ctx.json(
        await Promise.all(
          rows.map(({ actor, note }) =>
            service.toMastodonStatus(note, actor, origin),
          ),
        ),
        200,
      );
    });
}

export const apiController = createApiController().route("/", authController);
export type AppType = typeof apiController;
