# yuragi

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run build
bun run src/index.ts
```

## Local accounts

Generate and apply the migration, then create a local account. Only the account
identifier is required. Supply an optional display name and password with flags,
or omit the password to generate one that is printed once.

```bash
bun run db:migrate
bun run create-account -- alice --name "Alice" --password "use-a-long-unique-password"
bun run create-account -- bob
```

The account identifier must be 1–30 lowercase letters, digits, `_`, or `-`.
Log in at `/login`. The session cookie is HTTP-only, `SameSite=Lax`, and lasts
30 days.

Change a password by supplying a new one, or omit it to generate one. Account
deletion removes the actor and its sessions and posts; it requires `--yes`.

```bash
bun run change-password -- alice "another-long-unique-password"
bun run change-password -- alice
bun run delete-account -- alice --yes
```

This project was created using `bun init` in bun v1.2.19. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
