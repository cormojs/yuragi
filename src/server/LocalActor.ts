export const localActor = {
  identifier: "yuragi",
  name: "yuragi",
  summary: "A small Fediverse SNS server built with Bun, Hono, and Fedify.",
};

export function getOrigin(request: Request): string {
  const configuredOrigin = Bun.env.YURAGI_ORIGIN;
  if (configuredOrigin != null && configuredOrigin !== "") {
    return configuredOrigin.replace(/\/$/, "");
  }

  const url = new URL(request.url);
  return url.origin;
}

export function isLocalActor(identifier: string): boolean {
  return identifier === localActor.identifier;
}

export function getActorPath(identifier = localActor.identifier): string {
  return `/users/${identifier}`;
}
