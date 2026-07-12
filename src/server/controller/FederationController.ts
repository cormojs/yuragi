import { createFederation, MemoryKvStore } from "@fedify/fedify";
import type { Context as HonoContext, MiddlewareHandler } from "hono";
import { federation as fedifyMiddleware } from "@fedify/hono";
import { Activity, Follow } from "@fedify/vocab";
import { getOrigin } from "../LocalActor";
import {
  federationService,
  type FederationContextData,
  type FederationService,
} from "../service/FederationService";

const serverName = "yuragi";

export async function createFederationMiddleware(
  service: FederationService = federationService,
): Promise<MiddlewareHandler> {
  const federation = createFederation<FederationContextData>({
    kv: new MemoryKvStore(),
    userAgent: {
      software: `${serverName}/0.1.0`,
    },
  });

  federation.setNodeInfoDispatcher("/nodeinfo/2.1", () =>
    service.getNodeInfo(),
  );

  federation
    .setActorDispatcher("/users/{identifier}", (ctx, identifier) =>
      service.getActor(ctx, identifier),
    )
    .setKeyPairsDispatcher((ctx, identifier) =>
      service.getActorKeyPairs(ctx, identifier),
    );

  federation
    .setInboxListeners("/users/{identifier}/inbox", "/inbox")
    .on(Follow, async (ctx, follow) => {
      console.log("received Follow", ctx.recipient, follow.actorId?.href);
    })
    .on(Activity, async (ctx, activity) => {
      console.log(
        "received Activity",
        activity.constructor.name,
        ctx.recipient,
        activity.id?.href,
      );
    })
    .onError((ctx, error) => {
      console.error("inbox error", ctx.data.origin, error);
    });

  federation.setInboxDispatcher(
    "/users/{identifier}/inbox",
    (ctx, identifier) => service.getInbox(ctx, identifier),
  );

  federation
    .setOutboxDispatcher("/users/{identifier}/outbox", (ctx, identifier) =>
      service.getOutbox(ctx, identifier),
    )
    .setCounter((ctx, identifier) => service.countOutbox(ctx, identifier));

  federation
    .setFollowersDispatcher(
      "/users/{identifier}/followers",
      (ctx, identifier) => service.getFollowers(ctx, identifier),
    )
    .setCounter((ctx, identifier) => service.countFollowers(ctx, identifier));

  federation
    .setFollowingDispatcher(
      "/users/{identifier}/following",
      (ctx, identifier) => service.getFollowing(ctx, identifier),
    )
    .setCounter((ctx, identifier) => service.countFollowing(ctx, identifier));

  return fedifyMiddleware(federation, (ctx: HonoContext) => ({
    origin: getOrigin(ctx.req.raw),
  }));
}
