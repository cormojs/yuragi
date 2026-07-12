export function getOrigin(request: Request): string {
  const configuredOrigin = Bun.env.YURAGI_ORIGIN;
  if (configuredOrigin != null && configuredOrigin !== "") {
    return configuredOrigin.replace(/\/$/, "");
  }

  const url = new URL(request.url);
  return url.origin;
}

export function getActorPath(identifier: string): string {
  return `/users/${identifier}`;
}
