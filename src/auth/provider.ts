export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Provedor de identidade. O app guarda o `token` num cookie httpOnly e o devolve em `verifySession`.
 * Local: login só com e-mail (dev). Real (Supabase Auth): adapter novo atrás desta interface.
 */
export interface AuthProvider {
  readonly kind: "dev" | "supabase";
  signIn(email: string): Promise<{ user: SessionUser; token: string }>;
  verifySession(token: string | undefined): Promise<SessionUser | null>;
}
