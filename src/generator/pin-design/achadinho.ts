import { claimInline, cta, claimLines, esc, fitHeadline, FOOTER, headlineFor, photoLayer, priceParts, SHADOW_FILTER, svgDoc, type PinDesignInput } from "./common";

const burst = (cx: number, cy: number, r1: number, r2: number, n: number) =>
  Array.from({ length: n * 2 }, (_, k) => {
    const a = (Math.PI * k) / n - Math.PI / 2;
    const r = k % 2 === 0 ? r1 : r2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");

/** Estilo "achadinho": fita, adesivo com foto, selo de preço em estrela. */
export function achadinho(i: PinDesignInput): string {
  const { lines: head, size: hs } = fitHeadline(headlineFor(i.category, i.productId, i.productName), 860, [78, 70, 62]);
  const hl = Math.round(hs * 1.15);
  const price = priceParts(i.priceCents);
  const lines = claimLines(i);
  const headY = 1165;
  const claimY = headY + (head.length - 1) * hl + 64;
  const big = price.int.length > 3 ? 54 : 64;
  const dots = Array.from({ length: 30 }, (_, k) => `<circle cx="${(k * 137) % 1000}" cy="${(k * 251) % 1500}" r="${6 + (k % 3) * 4}" fill="#ffffff" fill-opacity="0.22"/>`).join("");
  const defs = `${SHADOW_FILTER("sh", 14, 14, 0.3)}<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE066"/><stop offset="1" stop-color="#FF9F1C"/></linearGradient>`;
  // Estrela menor, ancorada no canto inferior direito do adesivo: só uma faixa da borda da foto fica coberta.
  const starPts = burst(850, 960, 132, 108, 14);
  const body = `
<rect width="1000" height="1500" fill="url(#bg)"/>${dots}
<g transform="rotate(-4 500 110)" filter="url(#sh)"><rect x="-20" y="55" width="1040" height="112" fill="#E63946"/></g>
<g transform="rotate(-4 500 110)"><text x="500" y="138" font-family="Pacifico" font-size="76" text-anchor="middle" fill="#ffffff">Achadinho da casa</text></g>
<g transform="rotate(-2.5 500 560)" filter="url(#sh)"><rect x="90" y="215" width="820" height="690" rx="40" fill="#ffffff"/></g>
<g transform="rotate(-2.5 500 560)">${photoLayer(i.photo, "ph", 118, 243, 764, 634, 24, "bl")}</g>
<g filter="url(#sh)"><polygon points="${starPts}" fill="#E63946"/></g>
<text x="850" y="915" font-size="24" font-weight="800" text-anchor="middle" fill="#FFD60A" letter-spacing="1">POR SÓ</text>
<text x="850" y="982" text-anchor="middle" fill="#ffffff" font-weight="800"><tspan font-size="24" font-weight="700">R$ </tspan><tspan font-size="${big}">${esc(price.int)}</tspan><tspan font-size="28" font-weight="700" dy="-24">,${price.dec}</tspan></text>
${head.map((l, k) => `<text x="70" y="${headY + k * hl}" font-size="${hs}" font-weight="800" fill="#3B1F0B">${esc(l)}</text>`).join("")}
${lines.map((c, k) => claimInline(c, 70, claimY + k * 44, 32, "#3B1F0B", "#E63946").svg).join("")}
${cta(70, 1385, { fill: "#3B1F0B", text: "#FFD60A", size: 34, w: 370, h: 80 })}
<text x="70" y="1488" font-size="22" font-weight="500" fill="#3B1F0B" fill-opacity="0.75">${FOOTER}</text>`;
  return svgDoc(body, defs);
}
