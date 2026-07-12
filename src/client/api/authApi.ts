type AuthenticatedAccount = {
  username: string;
};

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return typeof body?.error === "string" ? body.error : "Authentication failed.";
}

export async function login(identifier: string, password: string): Promise<AuthenticatedAccount> {
  const response = await fetch("/api/v1/auth/login", {
    body: JSON.stringify({ identifier, password }),
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<AuthenticatedAccount>;
}

export async function logout(): Promise<void> {
  const response = await fetch("/api/v1/auth/logout", {
    credentials: "same-origin",
    method: "POST",
  });
  if (!response.ok) throw new Error(await readError(response));
}

export async function getCurrentAccount(): Promise<AuthenticatedAccount | null> {
  const response = await fetch("/api/v1/auth/me", {
    credentials: "same-origin",
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<AuthenticatedAccount>;
}
