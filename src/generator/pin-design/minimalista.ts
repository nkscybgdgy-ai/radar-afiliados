import { CATEGORY_LABELS } from "@/domain/types";
import { claimInline, cta, claimLines, esc, FOOTER, headlineFor, PALETTE, photoLayer, priceParts, priceText, SHADOW_FILTER, svgDoc, wrapText, type PinDesignInput } from "./common";

/** Fundo creme, foto grande com cantos suaves, preço em pílula, tipografia limpa. */
export function minimalista(i: PinDesignInput): string {
  const p = PALETTE[i.category];
  const head = wrapText(headlineFor(i.category, i.productId, i.productName), 82, 860, 2, 0.52);
  const price = priceParts(i.priceCents);
  const lines = claimLines(i);
  const photoH = head.length === 1 ? 860 : 780;
  const photoBottom = 120 + photoH;
  const headY = photoBottom + 150;
  const afterHead = headY + (head.length - 1) * 94;
  const name = wrapText(i.productName, 34, 860, 1, 0.5)[0] ?? "";
  let cx = 70;
  const chips = lines
    .map((c) => {
      const inline = claimInline(c, 0, 0, 26, p.deep, p.strong);
      const w = inline.width + 52;
      const g = `<g transform="translate(${cx} ${afterHead + 92})"><rect width="${w}" height="58" rx="29" fill="${p.soft}"/><g transform="translate(26 39)">${inline.svg}</g></g>`;
      cx += w + 16;
      return g;
    })
    .join("");
  const body = `
<rect width="1000" height="1500" fill="#FBF8F3"/>
<text x="70" y="92" font-size="26" font-weight="700" letter-spacing="4" fill="${p.strong}">${esc(CATEGORY_LABELS[i.category].toUpperCase())}</text>
<rect x="70" y="120" width="860" height="${photoH}" rx="44" fill="#E9E3D8"/>
${photoLayer(i.photo, "ph", 70, 120, 860, photoH, 44)}
<g filter="url(#sh)"><rect x="570" y="${photoBottom - 60}" width="360" height="120" rx="60" fill="${p.strong}"/></g>
${priceText(750, photoBottom + 22, price, 70, "#ffffff")}
${head.map((l, k) => `<text x="70" y="${headY + k * 94}" font-size="82" font-weight="800" fill="#1F2937">${esc(l)}</text>`).join("")}
<text x="70" y="${afterHead + 52}" font-size="32" font-weight="500" fill="#6B7280">${esc(name)}</text>
${chips}
${cta(70, 1330, { fill: "#1F2937", text: "#ffffff", size: 34, w: 360, h: 86 })}
<text x="70" y="1464" font-size="24" font-weight="500" fill="#9CA3AF">${FOOTER}</text>`;
  return svgDoc(body, SHADOW_FILTER("sh", 12, 14, 0.25));
}
