import { claimsFor, type Claims } from "@/domain/generator/caption";
import { hashString } from "@/lib/hash";
import { CATEGORY_LABELS, type HomeCategory } from "@/domain/types";

export const W = 1000;
export const H = 1500; // 2:3, proporção recomendada do Pinterest

export const STYLE_IDS = ["minimalista", "vibrante", "achadinho", "emalta", "emaltaclaro"] as const;
export type PinStyle = (typeof STYLE_IDS)[number];
/** Estilos "em alta" só são oferecidos quando a regra de tendência da legenda é cumprida. */
export const TREND_STYLES: readonly PinStyle[] = ["emalta", "emaltaclaro"];
export const styleAvailable = (style: PinStyle, c: Claims): boolean => !TREND_STYLES.includes(style) || c.trendPct !== undefined;
export const availableStyles = (c: Claims): PinStyle[] => STYLE_IDS.filter((s) => styleAvailable(s, c));

export const STYLE_LABELS: Record<PinStyle, string> = {
  minimalista: "Minimalista claro",
  vibrante: "Colorido vibrante",
  achadinho: "Achadinho",
  emalta: "Em alta (escuro)",
  emaltaclaro: "Em alta (claro)",
};

/** Foto embutida (data URI). `null` = foto provisória desenhada (só em demonstração). */
export interface Photo {
  dataUri: string;
}

export interface PinDesignInput {
  productId: string;
  productName: string;
  category: HomeCategory;
  priceCents: number;
  rating: number;
  ratingCount: number;
  sales30d: number;
  /** Vendas dos últimos 7 dias (habilita a regra de "em alta"). */
  sales7d?: number;
  photo: Photo | null;
}

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Quebra por largura estimada (`em` = largura média do caractere em múltiplos do corpo). */
export function wrapText(text: string, fontSize: number, maxWidth: number, maxLines: number, em = 0.62): string[] {
  const perLine = Math.max(1, Math.floor(maxWidth / (fontSize * em)));
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length <= perLine) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = word.length > perLine ? `${word.slice(0, perLine - 1)}…` : word;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length === 2) {
    // Equilibra as duas linhas (evita uma palavra sozinha na segunda).
    const words = text.split(/\s+/).filter(Boolean);
    let best = lines;
    let bestMax = Math.max(lines[0]!.length, lines[1]!.length);
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(" ");
      const b = words.slice(k).join(" ");
      const m = Math.max(a.length, b.length);
      if (m <= perLine && m < bestMax) { best = [a, b]; bestMax = m; }
    }
    return best;
  }
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    const last = kept[maxLines - 1]!;
    kept[maxLines - 1] = `${last.length >= perLine ? last.slice(0, perLine - 1) : last}…`;
    return kept;
  }
  return lines;
}

/** Títulos curtos focados em benefício (sem promessas que não podemos provar). */
const HEADLINES: Record<HomeCategory, string[]> = {
  organizacao: ["Casa em ordem", "Mais espaço pra você", "Tudo no seu lugar"],
  cozinha: ["Cozinha mais prática", "Facilita o seu dia", "Achado pra cozinha"],
  limpeza: ["Limpeza mais prática", "Facilite a faxina", "Casa limpa e leve"],
  banheiro: ["Banheiro organizado", "Banheiro mais prático", "Tudo à mão no banho"],
  decoracao: ["Dê um up na casa", "Casa mais aconchegante", "Decoração que encanta"],
};
/** Benefício por tipo de produto (palavra-chave no nome), em linguagem suave: sem promessas que não dá para provar. */
const KEYWORD_HEADLINES: [RegExp, string][] = [
  [/hermetic|pote/, "Tudo bem guardado"],
  [/organizador|colmeia|caixa organizadora/, "Tudo no seu lugar"],
  [/cabide|armario/, "Guarda-roupa em ordem"],
  [/escorredor/, "Louça no lugar, bancada livre"],
  [/faca|ralador|descascador|espremedor/, "Preparo mais prático"],
  [/balanca/, "Receitas na medida certa"],
  [/fritadeira|air fryer/, "Mais praticidade na cozinha"],
  [/mop|rodo|vassoura|esponja|pano|escova/, "Limpeza mais prática"],
  [/tapete|box|cortina de box/, "Banho mais organizado"],
  [/luminaria|fita led|abajur/, "Luz que deixa a casa aconchegante"],
  [/almofada|manta/, "Sofá mais aconchegante"],
  [/vaso|quadro|espelho|relogio|porta-retrato|planta/, "Um charme pro seu canto"],
];
const stripAccents = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const headlineFor = (category: HomeCategory, productId: string, productName = "") => {
  const n = stripAccents(productName);
  const hit = KEYWORD_HEADLINES.find(([re]) => re.test(n));
  if (hit) return hit[1];
  const list = HEADLINES[category];
  return list[hashString(productId) % list.length]!;
};

/**
 * Escolhe o maior corpo (da lista) em que o título cabe em até 2 linhas, sem reticências.
 * `em` ≈ largura média do caractere da Poppins ExtraBold (0,58 do corpo).
 */
export function fitHeadline(text: string, maxWidth: number, sizes: number[], em = 0.58): { lines: string[]; size: number } {
  for (const size of sizes) {
    const lines = wrapText(text, size, maxWidth, 2, em);
    if (lines.length <= 2 && !lines.some((l) => l.endsWith("…"))) return { lines, size };
  }
  const size = sizes[sizes.length - 1]!;
  return { lines: wrapText(text, size, maxWidth, 2, em), size };
}

export function priceParts(cents: number): { int: string; dec: string } {
  const int = new Intl.NumberFormat("pt-BR").format(Math.floor(cents / 100));
  return { int, dec: String(cents % 100).padStart(2, "0") };
}

export const claims = (i: PinDesignInput): Claims => claimsFor({ rating: i.rating, ratingCount: i.ratingCount, sales30d: i.sales30d, sales7d: i.sales7d });

export interface ClaimLine {
  kind: "rating" | "sales";
  text: string;
}

export function claimLines(i: PinDesignInput): ClaimLine[] {
  const c = claims(i);
  const out: ClaimLine[] = [];
  if (c.rating) out.push({ kind: "rating", text: `${c.rating.value.toFixed(1).replace(".", ",")} · ${new Intl.NumberFormat("pt-BR").format(c.rating.count)} avaliações` });
  if (c.sales30d) out.push({ kind: "sales", text: `+${new Intl.NumberFormat("pt-BR").format(c.sales30d)} vendidos em 30 dias` });
  return out;
}

/** Largura estimada de um texto Poppins 600 (para chips). */
export const textWidth = (t: string, size: number) => Math.ceil(t.length * size * 0.57);

export const starIcon = (cx: number, cy: number, r: number, fill: string) => {
  const pts = Array.from({ length: 10 }, (_, k) => {
    const a = (Math.PI * k) / 5 - Math.PI / 2;
    const rr = k % 2 === 0 ? r : r * 0.42;
    return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  return `<polygon points="${pts}" fill="${fill}"/>`;
};

/** Seta desenhada (a fonte não tem "→"). */
export const arrowRight = (x: number, y: number, len: number, color: string, w = 5) =>
  `<path d="M${x} ${y} H${x + len} M${x + len - len * 0.38} ${y - len * 0.38} L${x + len} ${y} L${x + len - len * 0.38} ${y + len * 0.38}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
/** Linha de destaque: estrela desenhada (nota) ou só texto (vendas). Devolve o SVG e a largura. */
export function claimInline(c: ClaimLine, x: number, y: number, size: number, color: string, star: string) {
  const icon = c.kind === "rating";
  const off = icon ? size * 1.15 : 0;
  return {
    svg: `${icon ? starIcon(x + size * 0.45, y - size * 0.34, size * 0.5, star) : ""}<text x="${x + off}" y="${y}" font-size="${size}" font-weight="600" fill="${color}">${esc(c.text)}</text>`,
    width: off + textWidth(c.text, size),
  };
}

/** Preço "R$ 89,90" com centavos pequenos (tspans). */
export const priceText = (x: number, y: number, p: { int: string; dec: string }, big: number, color: string, anchor: "start" | "middle" = "middle") =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" font-weight="800"><tspan font-size="${Math.round(big * 0.38)}" font-weight="700">R$ </tspan><tspan font-size="${big}">${esc(p.int)}</tspan><tspan font-size="${Math.round(big * 0.46)}" font-weight="700" dy="${-Math.round(big * 0.36)}">,${p.dec}</tspan></text>`;

/** Paleta por categoria: cor forte (acento), tom escuro (texto) e tom suave (fundo). */
export const PALETTE: Record<HomeCategory, { strong: string; deep: string; soft: string; grad: [string, string] }> = {
  organizacao: { strong: "#0F9D8A", deep: "#0B4F47", soft: "#E3F5F1", grad: ["#13B5A0", "#0B6E78"] },
  cozinha: { strong: "#E8512F", deep: "#6B1F0E", soft: "#FDEBE4", grad: ["#FF7A4D", "#C73A1B"] },
  limpeza: { strong: "#2F7BF5", deep: "#0E2F6B", soft: "#E4EEFE", grad: ["#4F9BFF", "#1F4FC4"] },
  banheiro: { strong: "#7C5CE6", deep: "#2E1F6B", soft: "#EEE9FD", grad: ["#9B7BFF", "#5236C2"] },
  decoracao: { strong: "#D9487F", deep: "#6B1B3A", soft: "#FCE7EF", grad: ["#F26B9D", "#B02A5E"] },
};

export const SHADOW_FILTER = (id: string, dy = 14, blur = 16, opacity = 0.28) =>
  `<filter id="${id}" x="-30%" y="-80%" width="160%" height="260%"><feDropShadow dx="0" dy="${dy}" stdDeviation="${blur}" flood-color="#000000" flood-opacity="${opacity}"/></filter>`;

/**
 * Camada da foto: recorta com cantos arredondados e preenche (slice) a área.
 * Sem foto, desenha uma foto PROVISÓRIA (frasco), claramente identificada.
 */
export function photoLayer(photo: Photo | null, id: string, x: number, y: number, w: number, h: number, rx: number, label: "bl" | "tl" = "bl"): string {
  const clip = `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/></clipPath>`;
  if (photo) {
    return `${clip}<image xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${photo.dataUri}" href="${photo.dataUri}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`;
  }
  const cx = x + w / 2;
  const cy = y + h / 2;
  const s = Math.min(w, h);
  const k = 1.1;
  return `${clip}<g clip-path="url(#${id})">
  <defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4EFE8"/><stop offset="1" stop-color="#DCD5CA"/></linearGradient></defs>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}g)"/>
  <rect x="${cx - 0.17 * s * k}" y="${cy - 0.02 * s - 0.22 * s * k}" width="${0.34 * s * k}" height="${0.44 * s * k}" rx="${0.04 * s * k}" fill="#ffffff" fill-opacity="0.92"/>
  <rect x="${cx - 0.19 * s * k}" y="${cy - 0.02 * s - 0.29 * s * k}" width="${0.38 * s * k}" height="${0.08 * s * k}" rx="${0.02 * s * k}" fill="#8A94A6"/>
  <rect x="${cx - 0.1 * s * k}" y="${cy - 0.02 * s - 0.08 * s * k}" width="${0.2 * s * k}" height="${0.14 * s * k}" rx="${0.02 * s * k}" fill="#CBD2DE"/>
  <text x="${x + 28}" y="${label === "tl" ? y + 44 : y + h - 24}" font-family="Poppins" font-weight="600" font-size="20" letter-spacing="1" fill="#4B5563" fill-opacity="0.8">FOTO PROVISÓRIA</text></g>`;
}

/** Prova social simples para o comprador: só vendas (regra do claimsFor, arredondadas para baixo). */
export function socialProof(i: PinDesignInput): string | null {
  const v = claims(i).sales30d;
  return v ? `+${new Intl.NumberFormat("pt-BR").format(v)} vendidos em 30 dias` : null;
}

/** Chama desenhada (a fonte não tem emoji). Caixa de 24×24 escalada por `k`. */
export const flame = (x: number, y: number, k: number, fill: string) =>
  `<path transform="translate(${x} ${y}) scale(${k})" d="M12 1C12 1 5 7.5 5 14a7 7 0 0 0 14 0c0-2.4-1-4.6-2.4-6.2-.2 2-1.2 3.4-2.6 3.8C13.4 8.2 12.8 4 12 1z" fill="${fill}"/>`;

/**
 * Botão "Ver oferta": largura fixa, texto centrado na área da esquerda e seta na direita.
 * Posições determinísticas (sem depender de medir a fonte): o texto nunca sai do botão.
 */
export function cta(x: number, y: number, o: { fill: string; text: string; size?: number; w?: number; h?: number }): string {
  const size = o.size ?? 36;
  const w = o.w ?? 380;
  const h = o.h ?? 90;
  const textCx = x + (w - 70) / 2;
  const ay = y + h / 2;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${o.fill}"/>
<text x="${textCx}" y="${ay + size * 0.35}" font-size="${size}" font-weight="800" text-anchor="middle" fill="${o.text}">Ver oferta</text>
${arrowRight(x + w - 78, ay, 36, o.text, 6)}`;
}

export const CATEGORY_LABELS_UP: Record<HomeCategory, string> = Object.fromEntries(Object.entries(CATEGORY_LABELS).map(([k, v]) => [k, v.toUpperCase()])) as Record<HomeCategory, string>;

export const FOOTER = "Link de afiliado · preço pode variar na loja";

export function svgDoc(body: string, defs = ""): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Poppins"><defs>${defs}</defs>${body}</svg>`;
}
