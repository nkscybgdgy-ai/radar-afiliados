import { z } from "zod";

const EnvSchema = z.object({
  DATA_SOURCE: z.enum(["mock", "shopee"]).default("mock"),
  /** Preço da assinatura mensal em centavos. Padrão: R$ 39,00. */
  PLAN_PRICE_CENTS: z.coerce.number().int().positive().default(3900),
});

export type Env = z.infer<typeof EnvSchema>;

export const loadEnv = (raw: Record<string, string | undefined> = process.env): Env =>
  EnvSchema.parse(raw);
