import type { Db } from "@/db";
import type { Env } from "@/lib/env";
import { DevAuthProvider } from "./dev-auth";
import type { AuthProvider } from "./provider";
import { SupabaseAuthProvider } from "./supabase-auth";

export type { AuthProvider, SessionUser } from "./provider";

export function createAuthProvider(env: Pick<Env, "AUTH_PROVIDER" | "AUTH_SECRET">, db: Db): AuthProvider {
  return env.AUTH_PROVIDER === "supabase" ? new SupabaseAuthProvider() : new DevAuthProvider(db, env.AUTH_SECRET);
}
