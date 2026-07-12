import { getActorPath } from "./server/LocalActor";
import { authService, isValidAccountIdentifier } from "./server/service/AuthService";
import { actorService } from "./server/service/actorService";

const [identifier, ...options] = Bun.argv.slice(2);
const origin = (Bun.env.YURAGI_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");

function generatePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getOption(name: "--name" | "--password"): string | undefined {
  const index = options.indexOf(name);
  if (index === -1) return undefined;

  const value = options[index + 1];
  if (value == null || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

if (
  identifier == null ||
  !isValidAccountIdentifier(identifier) ||
  options.some((option, index) =>
    index % 2 === 0 ? option !== "--name" && option !== "--password" : false,
  )
) {
  throw new Error(
    "Usage: bun run create-account -- <identifier> [--name <display-name>] [--password <password>]",
  );
}
const name = getOption("--name") ?? identifier;
const suppliedPassword = getOption("--password");
const password = suppliedPassword ?? generatePassword();
if (password.length < 8) {
  throw new Error("Passwords must be at least 8 characters long.");
}

try {
  await actorService.createAccountActor({
    identifier,
    name,
    origin,
  });
  const actor = await authService.setInitialPassword({ identifier, password });
  if (actor == null) {
    throw new Error(`An account named ${identifier} already has a password.`);
  }

  console.log(
    `Created @${actor.identifier}: ${new URL(getActorPath(actor.identifier), origin).href}`,
  );
  if (suppliedPassword == null) {
    console.log(`Generated password (save it now): ${password}`);
  }
} finally {
  await queryClient.end();
}
import { queryClient } from "./db/client";
