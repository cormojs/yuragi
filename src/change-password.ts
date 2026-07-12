import { queryClient } from "./db/client";
import { authService, isValidAccountIdentifier } from "./server/service/AuthService";

const [identifier, suppliedPassword] = Bun.argv.slice(2);

function generatePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

if (identifier == null || !isValidAccountIdentifier(identifier)) {
  throw new Error("Usage: bun run change-password -- <identifier> [password]");
}

const password = suppliedPassword ?? generatePassword();
if (password.length < 8) {
  throw new Error("Passwords must be at least 8 characters long.");
}

try {
  const actor = await authService.changePassword({ identifier, password });
  if (actor == null) throw new Error(`No account named ${identifier} exists.`);

  console.log(`Changed password for @${actor.identifier}.`);
  if (suppliedPassword == null) {
    console.log(`Generated password (save it now): ${password}`);
  }
} finally {
  await queryClient.end();
}
