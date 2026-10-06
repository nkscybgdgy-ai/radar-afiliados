CREATE TABLE "billing_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"job" text NOT NULL,
	"day" date NOT NULL,
	"status" text NOT NULL,
	"detail" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_snapshots" (
	"product_id" text NOT NULL,
	"day" date NOT NULL,
	"sales_total" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"commission_bp" integer NOT NULL,
	"rating_x10" integer NOT NULL,
	"rating_count" integer NOT NULL,
	"source" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sheet_views" (
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"day" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_customer_id" text NOT NULL,
	"provider_subscription_id" text NOT NULL,
	"status" text NOT NULL,
	"billing_type" text NOT NULL,
	"price_cents" integer NOT NULL,
	"current_period_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "sheet_views" ADD CONSTRAINT "sheet_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_snapshots_unique_idx" ON "product_snapshots" USING btree ("product_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "sheet_views_unique_idx" ON "sheet_views" USING btree ("user_id","product_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_provider_sub_idx" ON "subscriptions" USING btree ("provider","provider_subscription_id");--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");