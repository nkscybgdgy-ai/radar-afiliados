import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { Env } from "@/lib/env";
import * as schema from "./schema";

export { schema };
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface DbHandle {
  db: Db;
  close(): Promise<void>;
}

/**
 * Local (padrão): PGlite, um Postgres de verdade em WASM, sem servidor e sem custo,
 * com o mesmo schema Drizzle do Postgres real. `dataDir` omitido = memória (testes).
 * Real (DB_DRIVER=postgres): node-postgres em DATABASE_URL; migrações com `npm run db:migrate`.
 */
export async function createDb(
  env: Pick<Env, "DB_DRIVER" | "PGLITE_DIR" | "DATABASE_URL">,
  opts: { inMemory?: boolean } = {},
): Promise<DbHandle> {
  if (env.DB_DRIVER === "postgres") {
    if (!env.DATABASE_URL) throw new Error("DATABASE_URL é obrigatório com DB_DRIVER=postgres");
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    return { db: drizzle(pool, { schema }) as unknown as Db, close: () => pool.end() };
  }
  if (!opts.inMemory) mkdirSync(env.PGLITE_DIR, { recursive: true });
  const client = opts.inMemory ? new PGlite() : new PGlite(env.PGLITE_DIR);
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: "./drizzle" });
  return { db: db as unknown as Db, close: () => client.close() };
}
