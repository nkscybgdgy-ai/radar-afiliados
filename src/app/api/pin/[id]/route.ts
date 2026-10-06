import { CATEGORY_LABELS, type HomeCategory } from "@/domain/types";
import { renderPinPng } from "@/generator/pin-image";
import { getContainer } from "@/lib/container";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PNG do pin, regenerado a partir da linha salva. Só o dono acessa. `?download=1` força o download. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("não autenticado", { status: 401 });
  const c = await getContainer();
  const pin = await c.generator.getOwnedPin(user.id, id);
  if (!pin) return new Response("não encontrado", { status: 404 });

  const png = renderPinPng({
    name: pin.productName,
    category: pin.category as HomeCategory,
    priceCents: pin.priceCents,
    rating: pin.ratingX10 / 10,
    ratingCount: pin.ratingCount,
  });
  const download = new URL(req.url).searchParams.get("download") === "1";
  const file = `pin-${CATEGORY_LABELS[pin.category as HomeCategory].toLowerCase()}-${pin.id.slice(0, 8)}.png`;
  return new Response(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": "private, max-age=300",
      ...(download ? { "content-disposition": `attachment; filename="${file}"` } : {}),
    },
  });
}
