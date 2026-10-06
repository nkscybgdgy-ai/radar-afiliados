import { date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** status: pending | active | overdue | canceled */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    provider: text("provider").notNull(),
    providerCustomerId: text("provider_customer_id").notNull(),
    providerSubscriptionId: text("provider_subscription_id").notNull(),
    status: text("status").notNull(),
    billingType: text("billing_type").notNull(),
    priceCents: integer("price_cents").notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("subscriptions_provider_sub_idx").on(t.provider, t.providerSubscriptionId), index("subscriptions_user_idx").on(t.userId)],
);

/** Idempotência dos webhooks: o mesmo evento nunca é processado duas vezes. */
export const billingEvents = pgTable("billing_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Uma linha por usuário/produto/dia: base do limite diário de fichas do plano grátis. */
export const sheetViews = pgTable(
  "sheet_views",
  {
    userId: text("user_id").notNull().references(() => users.id),
    productId: text("product_id").notNull(),
    day: date("day").notNull(),
  },
  (t) => [uniqueIndex("sheet_views_unique_idx").on(t.userId, t.productId, t.day)],
);

/** Snapshot diário do produto (a API entrega só o acumulado; o histórico é nosso). */
export const productSnapshots = pgTable(
  "product_snapshots",
  {
    productId: text("product_id").notNull(),
    day: date("day").notNull(),
    salesTotal: integer("sales_total").notNull(),
    priceCents: integer("price_cents").notNull(),
    commissionRate: integer("commission_bp").notNull(), // pontos-base: 12% = 1200
    ratingStar: integer("rating_x10").notNull(), // 4.7 = 47
    ratingCount: integer("rating_count").notNull(),
    source: text("source").notNull(),
  },
  (t) => [uniqueIndex("product_snapshots_unique_idx").on(t.productId, t.day)],
);

export const jobRuns = pgTable("job_runs", {
  id: text("id").primaryKey(),
  job: text("job").notNull(),
  day: date("day").notNull(),
  status: text("status").notNull(), // ok | error
  detail: text("detail"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Pins gerados. Um por usuário/produto/dia (trocar o tom no mesmo dia atualiza a linha).
 * Guarda um retrato do produto no momento da geração: a imagem é regenerada sempre igual a
 * partir desta linha (rota /api/pin/[id]), sem serviço de armazenamento.
 */
export const generatedPins = pgTable(
  "generated_pins",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    productId: text("product_id").notNull(),
    day: date("day").notNull(),
    tone: text("tone").notNull(),
    affiliateUrl: text("affiliate_url").notNull(),
    subIds: jsonb("sub_ids").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    hashtags: jsonb("hashtags").notNull(),
    productName: text("product_name").notNull(),
    category: text("category").notNull(),
    priceCents: integer("price_cents").notNull(),
    ratingX10: integer("rating_x10").notNull(),
    ratingCount: integer("rating_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("generated_pins_user_product_day_idx").on(t.userId, t.productId, t.day)],
);
