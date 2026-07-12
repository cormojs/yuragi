import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://yuragi:yuragi@localhost:5432/yuragi",
  },
  migrations: {
    table: "__drizzle_migrations__",
    schema: "drizzle",
  },
  strict: true,
  verbose: true,
});
