import { arrowDown, claimInline, claimLines, esc, FOOTER, PALETTE, photoLayer, priceParts, SHADOW_FILTER, svgDoc, wrapText, type PinDesignInput } from "./common";

const TITLES = { organizacao: "Antes e depois da organização", cozinha: "Antes e depois na cozinha", limpeza: "Antes e depois da limpeza", banheiro: "Antes e depois no banheiro", decoracao: "Antes e depois na decoração" } as const;

/** Duas fotos empilhadas (ANTES escurecida, DEPOIS viva) com seta e selo de preço. Precisa de 2 fotos. */
export function antesdepois(i: PinDesignInput): string {
  const p = PALETTE[i.category];
  const head = wrapText(TITLES[i.category], 70, 860, 2, 0.52);
  const price = priceParts(i.priceCents);
  const lines = claimLines(i);
  const top = 80 + head.length * 84 + 20;
  const hPanel = 470;
  const y1 = top;
  const y2 = y1 + hPanel + 40;
  const defs = SHADOW_FILTER("sh", 12, 12, 0.3);
  const pill = (txt: string, x: number, y: number, fill: string) => `<rect x="${x}" y="${y}" width="${40 + txt.length * 22}" height="64" rx="32" fill="${fill}"/><text x="${x + (40 + txt.length * 22) / 2}" y="${y + 43}" font-size="30" font-weight="800" text-anchor="middle" fill="#ffffff" letter-spacing="2">${txt}</text>`;
  const body = `
<rect width="1000" height="1500" fill="#FBF8F3"/>
${head.map((l, k) => `<text x="70" y="${96 + k * 84}" font-size="70" font-weight="800" fill="#1F2937">${esc(l)}</text>`).join("")}
${photoLayer(i.beforePhoto ?? null, "pa", 70, y1, 860, hPanel, 36, "antes")}
<rect x="70" y="${y1}" width="860" height="${hPanel}" rx="36" fill="#1F2937" fill-opacity="0.28"/>
${pill("ANTES", 100, y1 + 26, "#6B7280")}
${photoLayer(i.photo, "pd", 70, y2, 860, hPanel, 36, "depois")}
${pill("DEPOIS", 100, y2 + 26, p.strong)}
<g filter="url(#sh)"><circle cx="500" cy="${y1 + hPanel + 20}" r="46" fill="#ffffff"/></g>
${arrowDown(500, y1 + hPanel - 2, 44, p.strong, 8)}
<g filter="url(#sh)"><rect x="590" y="${y2 + hPanel - 70}" width="340" height="110" rx="55" fill="${p.strong}"/></g>
<text x="760" y="${y2 + hPanel - 4}" text-anchor="middle" fill="#ffffff" font-weight="800"><tspan font-size="26" font-weight="700">R$ </tspan><tspan font-size="66">${esc(price.int)}</tspan><tspan font-size="32" font-weight="700" dy="-24">,${price.dec}</tspan></text>
${lines.map((c, k) => claimInline(c, 70, y2 + hPanel + 82 + k * 44, 30, p.deep, p.strong).svg).join("")}
<text x="70" y="1470" font-size="24" font-weight="500" fill="#9CA3AF">${FOOTER}</text>`;
  return svgDoc(body, defs);
}
