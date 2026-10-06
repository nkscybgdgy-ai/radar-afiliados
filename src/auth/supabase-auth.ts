import type { AuthProvider } from "./provider";

const NOT_READY = "Supabase Auth ainda não conectado. Siga LANCAMENTO.md (seção Autenticação).";

/** Stub: implementar quando a conta Supabase existir (e ALLOW_PAID_SERVICES=true). */
export class SupabaseAuthProvider implements AuthProvider {
  readonly kind = "supabase" as const;
  signIn(): never { throw new Error(NOT_READY); }
  verifySession(): never { throw new Error(NOT_READY); }
}
