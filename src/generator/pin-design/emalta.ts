import { arrowRight, claimInline, claimLines, claims, CATEGORY_LABELS_UP, esc, FOOTER, headlineFor, photoLayer, priceParts, priceText, SHADOW_FILTER, svgDoc, wrapText, type PinDesignInput } from "./common";

const ACCENT = "#FF7A1A";
const GOLD = "#FFD60A";

/** Chama desenhada (a fonte não tem emoji). Caixa de 24×24 escalada por `k`. */
const flame = (x: number, y: number, k: number, fill: string) =>
  `<path transform="translate(${x} ${y}) scale(${k})" d="M12 1C12 1 5 7.5 5 14a7 7 0 0 0 14 0c0-2.4-1-4.6-2.4-6.2-.2 2-1.2 3.4-2.6 3.8C13.4 8.2 12.8 4 12 1z" fill="${fill}"/>`;

/** Mini gráfico de vendas por dia (área + linha + ponto final). */
function sparkline(values: number[], x: number, y: number, w: number, h: number): string {
  const max = Math.max(1, ...values);
  const pts = values.map((v, k) => [x + (k / (values.length - 1)) * w, y + h - (v / max) * (h - 12) - 4] as const);
  const line = pts.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1]!;
  return `<polygon points="${x},${y + h} ${line} ${x + w},${y + h}" fill="url(#area)"/>
<polyline points="${line}" fill="none" stroke="${ACCENT}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
<circle cx="${last[0]}" cy="${last[1]}" r="11" fill="${GOLD}" stroke="#111827" stroke-width="5"/>`;
}

/**
 * Destaque "em alta": só faz sentido quando a regra de tendência da legenda é atendida
 * (`claims(i).trendPct`). Sem ela devolve null e o gerador não oferece o estilo.
 */
export function emalta(i: PinDesignInput): string {
  const c = claims(i);
  const pct = c.trendPct ?? 0;
  const head = wrapText(headlineFor(i.category, i.productId), 66, 860, 2, 0.52);
  const price = priceParts(i.priceCents);
  const lines = claimLines(i);
  const series = i.salesSeries && i.salesSeries.length >= 7 ? i.salesSeries : null;
  const headY = 905;
  const statY = headY + (head.length - 1) * 78 + 60;
  const defs = `${SHADOW_FILTER("sh", 14, 16, 0.45)}<linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ACCENT}" stop-opacity="0.55"/><stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/></linearGradient><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B2436"/><stop offset="1" stop-color="#0B1020"/></linearGradient><linearGradient id="hot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${GOLD}"/><stop offset="1" stop-color="${ACCENT}"/></linearGradient>`;
  const pillW = 250;
  const body = `
<rect width="1000" height="1500" fill="url(#bg)"/>
<rect x="70" y="56" width="${pillW}" height="62" rx="31" fill="url(#hot)"/>
${flame(98, 66, 1.7, "#7A2E00")}
<text x="${70 + 80}" y="98" font-size="30" font-weight="800" fill="#3B1500" letter-spacing="1.5">EM ALTA</text>
<text x="930" y="98" font-size="24" font-weight="700" letter-spacing="3" text-anchor="end" fill="#9CA3AF">${esc(CATEGORY_LABELS_UP[i.category])}</text>
<rect x="70" y="140" width="860" height="590" rx="40" fill="#0B1020"/>
${photoLayer(i.photo, "ph", 70, 140, 860, 590, 40, "bl")}
<g filter="url(#sh)"><rect x="560" y="670" width="370" height="116" rx="58" fill="${ACCENT}"/></g>
${priceText(745, 746, price, 68, "#ffffff")}
${head.map((l, k) => `<text x="70" y="${headY + k * 78}" font-size="66" font-weight="800" fill="#ffffff">${esc(l)}</text>`).join("")}
<rect x="70" y="${statY}" width="860" height="${series ? 230 : 150}" rx="32" fill="#ffffff" fill-opacity="0.07"/>
<text x="100" y="${statY + 120}" font-size="124" font-weight="800" fill="url(#hot)">+${pct}%</text>
<text x="104" y="${statY + 168}" font-size="26" font-weight="600" fill="#D1D5DB">ritmo de vendas na última semana</text>
<text x="104" y="${statY + 202}" font-size="26" font-weight="500" fill="#9CA3AF">vs. média dos últimos 30 dias</text>
${series ? sparkline(series, 620, statY + 34, 280, 140) : ""}
${lines.map((l, k) => claimInline(l, 70, statY + (series ? 230 : 150) + 62 + k * 44, 30, "#E5E7EB", GOLD).svg).join("")}
<rect x="70" y="1352" width="340" height="88" rx="44" fill="#ffffff"/>
<text x="188" y="1410" font-size="36" font-weight="800" text-anchor="middle" fill="#0B1020">Ver oferta</text>
${arrowRight(298, 1396, 40, "#0B1020", 6)}
<text x="70" y="1476" font-size="23" font-weight="500" fill="#9CA3AF">${FOOTER}</text>`;
  return svgDoc(body, defs);
}
