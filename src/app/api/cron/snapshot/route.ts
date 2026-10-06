import { getContainer } from "@/lib/container";

export const dynamic = "force-dynamic";

/** Chamado pelo cron da plataforma (produção) ou manualmente: Authorization: Bearer $CRON_SECRET. */
async function handle(req: Request) {
  const c = await getContainer();
  if (req.headers.get("authorization") !== `Bearer ${c.env.CRON_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json(await c.snapshotJob.run());
}

export const GET = handle;
export const POST = handle;
