import { getContainer } from "@/lib/container";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const c = await getContainer();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "json inválido" }, { status: 400 });
  }
  const result = await c.billing.handleWebhook((n) => req.headers.get(n), body);
  if (result === "unauthorized") return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ result });
}
