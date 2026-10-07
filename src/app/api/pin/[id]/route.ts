import { CATEGORY_LABELS, type HomeCategory } from "@/domain/types";
import { isPinStyle } from "@/generator/pin-design";
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

  const category = pin.category as HomeCategory;
  // Produto real: a foto vem da Shopee. Se não estiver disponível, NÃO desenhamos foto provisória num pin de verdade.
  let photo;
  try {
    photo = await c.photos.getPhoto({ productSource: pin.productSource as "mock" | "shopee", imageUrl: pin.imageUrl, category });
  } catch {
    return new Response("foto do produto indisponível", { status: 502 });
  }
  const style = isPinStyle(pin.style) ? pin.style : "minimalista";
  const png = renderPinPng(style, {
    productId: pin.productId,
    productName: pin.productName,
    category,
    priceCents: pin.priceCents,
    rating: pin.ratingX10 / 10,
    ratingCount: pin.ratingCount,
    sales30d: pin.sales30d,
    sales7d: pin.sales7d,
    photo,
  });
  const download = new URL(req.url).searchParams.get("download") === "1";
  const file = `pin-${CATEGORY_LABELS[category].toLowerCase()}-${pin.id.slice(0, 8)}.png`;
  return new Response(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": "private, max-age=300",
      ...(download ? { "content-disposition": `attachment; filename="${file}"` } : {}),
    },
  });
}
