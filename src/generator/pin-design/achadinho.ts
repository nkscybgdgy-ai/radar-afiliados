import { arrowRight, claimInline, claimLines, esc, FOOTER, headlineFor, photoLayer, priceParts, SHADOW_FILTER, svgDoc, wrapText, type PinDesignInput } from "./common";

const burst = (cx: number, cy: number, r1: number, r2: number, n: number) =>
  Array.from({ length: n * 2 }, (_, k) => {
    const a = (Math.PI * k) / n - Math.PI / 2;
    const r = k % 2 === 0 ? r1 : r2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");

/** Estilo "achadinho": fita, adesivo com foto, selo de preço em estrela. */
export function achadinho(i: PinDesignInput): string {
  const head = wrapText(headlineFor(i.category, i.productId), 78, 860, 2, 0.52);
  const price = priceParts(i.priceCents);
  const lines = claimLines(i);
  const headY = 1150;
  const claimY = headY + (head.length - 1) * 90 + 70;
  const big = price.int.length > 3 ? 78 : 92;
  const dots = Array.from({ length: 30 }, (_, k) => `<circle cx="${(k * 137) % 1000}" cy="${(k * 251) % 1500}" r="${6 + (k % 3) * 4}" fill="#ffffff" fill-opacity="0.22"/>`).join("");
  const defs = `${SHADOW_FILTER("sh", 14, 14, 0.3)}<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE066"/><stop offset="1" stop-color="#FF9F1C"/></linearGradient>`;
  const starPts = burst(812, 430, 188, 156, 14);
  const body = `
<rect width="1000" height="1500" fill="url(#bg)"/>${dots}
<g transform="rotate(-4 500 130)" filter="url(#sh)"><rect x="-20" y="70" width="1040" height="130" fill="#E63946"/></g>
<g transform="rotate(-4 500 130)"><text x="500" y="162" font-family="Pacifico" font-size="84" text-anchor="middle" fill="#ffffff">Achadinho da casa</text></g>
<g transform="rotate(-2.5 500 600)" filter="url(#sh)"><rect x="90" y="270" width="820" height="720" rx="40" fill="#ffffff"/></g>
<g transform="rotate(-2.5 500 600)">${photoLayer(i.photo, "ph", 118, 298, 764, 664, 24, "depois", "bl")}</g>
<g filter="url(#sh)"><polygon points="${starPts}" fill="#E63946"/></g>
<text x="812" y="368" font-size="30" font-weight="800" text-anchor="middle" fill="#FFD60A" letter-spacing="1">POR SÓ</text>
<text x="812" y="462" text-anchor="middle" fill="#ffffff" font-weight="800"><tspan font-size="30" font-weight="700">R$ </tspan><tspan font-size="${big}">${esc(price.int)}</tspan><tspan font-size="38" font-weight="700" dy="-32">,${price.dec}</tspan></text>
${head.map((l, k) => `<text x="70" y="${headY + k * 90}" font-size="78" font-weight="800" fill="#3B1F0B">${esc(l)}</text>`).join("")}
${lines.map((c, k) => claimInline(c, 70, claimY + k * 46, 32, "#3B1F0B", "#E63946").svg).join("")}
<rect x="70" y="1340" width="350" height="90" rx="45" fill="#3B1F0B"/>
<text x="212" y="1399" font-size="36" font-weight="800" text-anchor="middle" fill="#FFD60A">Ver oferta</text>
${arrowRight(325, 1386, 40, "#FFD60A", 6)}
<text x="70" y="1470" font-size="24" font-weight="500" fill="#3B1F0B" fill-opacity="0.75">${FOOTER}</text>`;
  return svgDoc(body, defs);
}
