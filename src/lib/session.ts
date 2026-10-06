import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/auth";
import { getContainer } from "./container";

export const SESSION_COOKIE = "ra_session";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const c = await getContainer();
  const jar = await cookies();
  return c.auth.verifySession(jar.get(SESSION_COOKIE)?.value);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}
