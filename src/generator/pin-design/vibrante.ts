import { claimInline, cta, claimLines, esc, FOOTER, headlineFor, PALETTE, photoLayer, priceParts, SHADOW_FILTER, svgDoc, wrapText, type PinDesignInput } from "./common";

/** Foto até a borda, base colorida inclinada, título branco enorme e selo de preço amarelo. */
export function vibrante(i: PinDesignInput): string {
  const p = PALETTE[i.category];
  const head = wrapText(headlineFor(i.category, i.productId, i.productName), 92, 860, 2, 0.52);
  const price = priceParts(i.priceCents);
  const lines = claimLines(i);
  const headY = 1090;
  const claimY = headY + (head.length - 1) * 102 + 74;
  const big = price.int.length > 3 ? 84 : 100;
  const defs = `${SHADOW_FILTER("sh", 16, 18, 0.35)}<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.grad[0]}"/><stop offset="1" stop-color="${p.grad[1]}"/></linearGradient>`;
  const body = `
<rect width="1000" height="1500" fill="url(#bg)"/>
${photoLayer(i.photo, "ph", 0, 0, 1000, 1000, 0, "tl")}
<polygon points="0,880 1000,780 1000,1500 0,1500" fill="url(#bg)"/>
<polygon points="0,880 1000,780 1000,798 0,898" fill="#ffffff" fill-opacity="0.28"/>
<g filter="url(#sh)"><circle cx="790" cy="790" r="172" fill="#FFD60A"/></g>
<circle cx="790" cy="790" r="152" fill="none" stroke="#1F2937" stroke-opacity="0.14" stroke-width="4" stroke-dasharray="3 14" stroke-linecap="round"/>
<text x="790" y="718" font-size="30" font-weight="800" text-anchor="middle" fill="#1F2937" letter-spacing="2">SÓ</text>
<text x="790" y="822" text-anchor="middle" fill="#1F2937" font-weight="800"><tspan font-size="34" font-weight="700">R$ </tspan><tspan font-size="${big}">${esc(price.int)}</tspan><tspan font-size="40" font-weight="700" dy="-34">,${price.dec}</tspan></text>
${head.map((l, k) => `<text x="70" y="${headY + k * 102}" font-size="92" font-weight="800" fill="#ffffff">${esc(l)}</text>`).join("")}
${lines.map((c, k) => claimInline(c, 70, claimY + k * 48, 32, "#ffffff", "#FFD60A").svg).join("")}
${cta(70, 1345, { fill: "#ffffff", text: p.deep, size: 38, w: 390, h: 92 })}
<text x="70" y="1475" font-size="24" font-weight="500" fill="#ffffff" fill-opacity="0.85">${FOOTER}</text>`;
  return svgDoc(body, defs);
}
