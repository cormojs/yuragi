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

When running behind a trusted reverse proxy or `fedify tunnel`, set
`BEHIND_PROXY=true` so the public protocol and host are taken from the
`X-Forwarded-*` headers. Do not enable it when the server is directly exposed
to untrusted clients.

## TLS with Caddy

Use the included `Caddyfile` to terminate TLS and proxy requests to yuragi.
Point the domain's A/AAAA records to the Caddy host and allow inbound port
8080. For Caddy to obtain and renew a publicly trusted certificate, also allow
ports 80 and 443 or forward them to Caddy's HTTP and HTTPS listeners. Then run
the application only behind Caddy:

```bash
BEHIND_PROXY=true YURAGI_ORIGIN=https://social.example.com:8080 bun run src/index.ts
YURAGI_DOMAIN=social.example.com caddy run --config Caddyfile --adapter caddyfile
```

Caddy automatically obtains and renews the certificate, redirects HTTP to
HTTPS, and sets the `X-Forwarded-*` headers consumed by yuragi.

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
