import { createAuthProvider, type AuthProvider } from "@/auth";
import { BillingService } from "@/billing/billing.service";
import { createBillingProvider } from "@/billing";
import { createProductSource, type ProductSource } from "@/data";
import { createDb, type Db, type DbHandle } from "@/db";
import { EntitlementsService } from "@/entitlements/entitlements.service";
import { SnapshotJob } from "@/jobs/daily-snapshot";
import { RadarService } from "@/services/radar.service";
import { loadEnv, type Env } from "./env";

export interface Container {
  env: Env;
  db: Db;
  auth: AuthProvider;
  billing: BillingService;
  source: ProductSource;
  radar: RadarService;
  entitlements: EntitlementsService;
  snapshotJob: SnapshotJob;
  close(): Promise<void>;
}

/** Monta todas as dependências. Único lugar que escolhe mock/real por variável de ambiente. */
export async function buildContainer(
  raw: Record<string, string | undefined> = process.env,
  opts: { inMemoryDb?: boolean; now?: () => Date } = {},
): Promise<Container> {
  const env = loadEnv(raw);
  const handle: DbHandle = await createDb(env, { inMemory: opts.inMemoryDb });
  const source = createProductSource(env);
  const now = opts.now ?? (() => new Date());
  return {
    env,
    db: handle.db,
    auth: createAuthProvider(env, handle.db),
    billing: new BillingService(handle.db, createBillingProvider(env), env.PLAN_PRICE_CENTS, now),
    source,
    radar: new RadarService(source),
    entitlements: new EntitlementsService(
      handle.db,
      { freeRadarLimit: env.FREE_RADAR_LIMIT, freeSheetsPerDay: env.FREE_SHEETS_PER_DAY },
      now,
    ),
    snapshotJob: new SnapshotJob(handle.db, source, now),
    close: handle.close,
  };
}

const g = globalThis as unknown as { __container?: Promise<Container> };

/** Singleton do processo (sobrevive ao hot reload do Next em dev). */
export function getContainer(): Promise<Container> {
  return (g.__container ??= buildContainer());
}
