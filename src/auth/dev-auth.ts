import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { schema, type Db } from "@/db";
import type { AuthProvider, SessionUser } from "./provider";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sign = (value: string, secret: string) => createHmac("sha256", secret).update(value).digest("base64url");

/**
 * Autenticação SIMULADA, só para desenvolvimento: qualquer e-mail válido entra, sem senha.
 * O token é `userId.assinatura`. Nunca usar em produção (o guard de env impede AUTH_PROVIDER real
 * sem ALLOW_PAID_SERVICES, e o inverso é responsabilidade do LANCAMENTO.md).
 */
export class DevAuthProvider implements AuthProvider {
  readonly kind = "dev" as const;
  constructor(
    private readonly db: Db,
    private readonly secret: string,
  ) {}

  async signIn(rawEmail: string) {
    const email = rawEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new Error("E-mail inválido");
    const existing = await this.db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    let row = existing[0];
    if (!row) {
      const [created] = await this.db
        .insert(schema.users)
        .values({ id: randomUUID(), email, name: email.split("@")[0] ?? null })
        .returning();
      row = created!;
    }
    const user: SessionUser = { id: row.id, email: row.email, name: row.name };
    return { user, token: `${user.id}.${sign(user.id, this.secret)}` };
  }

  async verifySession(token: string | undefined): Promise<SessionUser | null> {
    if (!token) return null;
    const i = token.lastIndexOf(".");
    if (i < 1) return null;
    const id = token.slice(0, i);
    const given = Buffer.from(token.slice(i + 1));
    const expected = Buffer.from(sign(id, this.secret));
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    const rows = await this.db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    const u = rows[0];
    return u ? { id: u.id, email: u.email, name: u.name } : null;
  }
}
