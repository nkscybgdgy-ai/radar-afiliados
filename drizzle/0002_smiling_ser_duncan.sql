ALTER TABLE "generated_pins" ADD COLUMN "style" text DEFAULT 'minimalista' NOT NULL;--> statement-breakpoint
ALTER TABLE "generated_pins" ADD COLUMN "sales_30d" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "generated_pins" ADD COLUMN "sales_7d" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "generated_pins" ADD COLUMN "image_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "generated_pins" ADD COLUMN "product_source" text DEFAULT 'mock' NOT NULL;