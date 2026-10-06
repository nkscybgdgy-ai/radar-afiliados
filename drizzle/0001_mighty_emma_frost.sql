CREATE TABLE "generated_pins" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"day" date NOT NULL,
	"tone" text NOT NULL,
	"affiliate_url" text NOT NULL,
	"sub_ids" jsonb NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"hashtags" jsonb NOT NULL,
	"product_name" text NOT NULL,
	"category" text NOT NULL,
	"price_cents" integer NOT NULL,
	"rating_x10" integer NOT NULL,
	"rating_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generated_pins" ADD CONSTRAINT "generated_pins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "generated_pins_user_product_day_idx" ON "generated_pins" USING btree ("user_id","product_id","day");