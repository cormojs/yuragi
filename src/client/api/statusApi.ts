async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return typeof body?.error === "string" ? body.error : "Failed to publish post.";
}

export async function createStatus(content: string): Promise<void> {
  const response = await fetch("/api/v1/statuses", {
    body: JSON.stringify({ content, visibility: "public" }),
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (!response.ok) throw new Error(await readError(response));
}
