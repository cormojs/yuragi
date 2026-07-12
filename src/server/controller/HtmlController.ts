import { join, normalize } from "node:path";
import { Hono } from "hono";

const clientDistDir = "dist/client";
const indexHtmlPath = join(clientDistDir, "index.html");

function resolveClientAssetPath(pathname: string): string | null {
  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const relativePath = normalize(decodedPathname).replace(/^[/\\]+/, "");
  if (relativePath.split(/[\\/]/).includes("..")) return null;

  return join(clientDistDir, relativePath);
}

function isAssetRequest(pathname: string): boolean {
  return pathname.includes(".");
}

async function respondWithFile(filePath: string): Promise<Response | null> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) return null;

  return new Response(file, {
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
  });
}

export const htmlController = new Hono();

htmlController.get("*", async (ctx, next) => {
  const url = new URL(ctx.req.url);

  if (isAssetRequest(url.pathname)) {
    const filePath = resolveClientAssetPath(url.pathname);
    if (filePath == null) return ctx.text("Bad Request", 400);

    const response = await respondWithFile(filePath);
    if (response != null) return response;

    return ctx.notFound();
  }

  const response = await respondWithFile(indexHtmlPath);
  if (response != null) return response;

  await next();
});
