import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl =
  Bun.env.DATABASE_URL ?? "postgresql://yuragi:yuragi@localhost:5432/yuragi";

export const queryClient = postgres(databaseUrl);
export const db = drizzle(queryClient, { schema });

export type Database = typeof db;
