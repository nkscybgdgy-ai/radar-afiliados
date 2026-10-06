import { z } from "zod";

const bool = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const EnvSchema = z.object({
  DATA_SOURCE: z.enum(["mock", "shopee"]).default("mock"),
  AUTH_PROVIDER: z.enum(["dev", "supabase"]).default("dev"),
  BILLING_PROVIDER: z.enum(["mock", "asaas"]).default("mock"),
  DB_DRIVER: z.enum(["pglite", "postgres"]).default("pglite"),

  /** Regra do projeto: nenhum serviço que gere custo até o lançamento. */
  ALLOW_PAID_SERVICES: bool,

  /** Preço da assinatura mensal em centavos. Padrão: R$ 39,00. */
  PLAN_PRICE_CENTS: z.coerce.number().int().positive().default(3900),
  FREE_RADAR_LIMIT: z.coerce.number().int().positive().default(10),
  FREE_SHEETS_PER_DAY: z.coerce.number().int().positive().default(5),

  PGLITE_DIR: z.string().default(".data/pglite"),
  DATABASE_URL: z.string().optional(),

  AUTH_SECRET: z.string().min(16).default("dev-only-secret-change-me-0000"),
  CRON_SECRET: z.string().min(8).default("dev-cron-secret"),

  ASAAS_API_KEY: z.string().optional(),
  ASAAS_BASE_URL: z.string().default("https://sandbox.asaas.com/api/v3"),
  ASAAS_WEBHOOK_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

/** Providers que dependem de serviço externo potencialmente pago. */
export function paidProviders(e: Pick<Env, "AUTH_PROVIDER" | "BILLING_PROVIDER" | "DB_DRIVER">): string[] {
  const out: string[] = [];
  if (e.AUTH_PROVIDER !== "dev") out.push(`AUTH_PROVIDER=${e.AUTH_PROVIDER}`);
  if (e.BILLING_PROVIDER !== "mock") out.push(`BILLING_PROVIDER=${e.BILLING_PROVIDER}`);
  if (e.DB_DRIVER !== "pglite") out.push(`DB_DRIVER=${e.DB_DRIVER}`);
  return out;
}

export const loadEnv = (raw: Record<string, string | undefined> = process.env): Env => {
  const env = EnvSchema.parse(raw);
  const paid = paidProviders(env);
  if (paid.length > 0 && !env.ALLOW_PAID_SERVICES) {
    throw new Error(
      `Serviço externo bloqueado antes do lançamento (${paid.join(", ")}). ` +
        "Veja LANCAMENTO.md; só defina ALLOW_PAID_SERVICES=true quando for conectar de verdade.",
    );
  }
  return env;
};
