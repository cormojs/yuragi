import { queryClient } from "./db/client";
import { authService, isValidAccountIdentifier } from "./server/service/AuthService";

const [identifier, confirmation] = Bun.argv.slice(2);

if (identifier == null || !isValidAccountIdentifier(identifier) || confirmation !== "--yes") {
  throw new Error("Usage: bun run delete-account -- <identifier> --yes");
}

try {
  const actor = await authService.deleteAccount(identifier);
  if (actor == null) throw new Error(`No account named ${identifier} exists.`);

  console.log(`Deleted @${actor.identifier} and its sessions and posts.`);
} finally {
  await queryClient.end();
}
