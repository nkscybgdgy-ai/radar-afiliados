import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  // Só necessário para `db:migrate` contra o Postgres real (o PGlite local migra sozinho).
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
