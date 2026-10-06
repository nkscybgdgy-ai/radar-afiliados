import { claimsFor, type Claims } from "@/domain/generator/caption";
import { hashString } from "@/lib/hash";
import type { HomeCategory } from "@/domain/types";

export const W = 1000;
export const H = 1500; // 2:3, proporção recomendada do Pinterest

export const STYLE_IDS = ["minimalista", "vibrante", "achadinho", "antesdepois"] as const;
export type PinStyle = (typeof STYLE_IDS)[number];
export const STYLE_LABELS: Record<PinStyle, string> = {
  minimalista: "Minimalista claro",
  vibrante: "Colorido vibrante",
  achadinho: "Achadinho",
  antesdepois: "Antes e depois",
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
  photo: Photo | null;
  /** Foto "antes" (só o estilo antes/depois). */
  beforePhoto?: Photo | null;
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
export const headlineFor = (category: HomeCategory, productId: string) => {
  const list = HEADLINES[category];
  return list[hashString(productId) % list.length]!;
};

export function priceParts(cents: number): { int: string; dec: string } {
  const int = new Intl.NumberFormat("pt-BR").format(Math.floor(cents / 100));
  return { int, dec: String(cents % 100).padStart(2, "0") };
}

export const claims = (i: PinDesignInput): Claims => claimsFor({ rating: i.rating, ratingCount: i.ratingCount, sales30d: i.sales30d });

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
export const arrowDown = (x: number, y: number, len: number, color: string, w = 6) =>
  `<path d="M${x} ${y} V${y + len} M${x - len * 0.38} ${y + len - len * 0.38} L${x} ${y + len} L${x + len * 0.38} ${y + len - len * 0.38}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

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
  `<filter id="${id}" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="${dy}" stdDeviation="${blur}" flood-color="#000000" flood-opacity="${opacity}"/></filter>`;

/**
 * Camada da foto: recorta com cantos arredondados e preenche (slice) a área.
 * Sem foto, desenha uma foto PROVISÓRIA (frasco), claramente identificada.
 */
export function photoLayer(photo: Photo | null, id: string, x: number, y: number, w: number, h: number, rx: number, variant: "depois" | "antes" = "depois", label: "bl" | "tl" = "bl"): string {
  const clip = `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/></clipPath>`;
  if (photo) {
    return `${clip}<image xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${photo.dataUri}" href="${photo.dataUri}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`;
  }
  const cx = x + w / 2;
  const cy = y + h / 2;
  const s = Math.min(w, h);
  const jar = (jx: number, jy: number, k: number, tilt = 0) => `<g transform="rotate(${tilt} ${jx} ${jy})">
  <rect x="${jx - 0.17 * s * k}" y="${jy - 0.22 * s * k}" width="${0.34 * s * k}" height="${0.44 * s * k}" rx="${0.04 * s * k}" fill="#ffffff" fill-opacity="0.92"/>
  <rect x="${jx - 0.19 * s * k}" y="${jy - 0.29 * s * k}" width="${0.38 * s * k}" height="${0.08 * s * k}" rx="${0.02 * s * k}" fill="#8A94A6"/>
  <rect x="${jx - 0.1 * s * k}" y="${jy - 0.08 * s * k}" width="${0.2 * s * k}" height="${0.14 * s * k}" rx="${0.02 * s * k}" fill="#CBD2DE"/></g>`;
  const content =
    variant === "antes"
      ? jar(cx - 0.24 * s, cy + 0.05 * s, 0.75, -18) + jar(cx + 0.2 * s, cy - 0.02 * s, 0.65, 24) + jar(cx - 0.02 * s, cy + 0.14 * s, 0.55, 71)
      : jar(cx, cy - 0.02 * s, 1.1);
  const [c1, c2] = variant === "antes" ? ["#B9B4AC", "#8E8A83"] : ["#F4EFE8", "#DCD5CA"];
  return `${clip}<g clip-path="url(#${id})">
  <defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}g)"/>${content}
  <text x="${x + 28}" y="${label === "tl" ? y + 44 : y + h - 24}" font-family="Poppins" font-weight="600" font-size="20" letter-spacing="1" fill="#4B5563" fill-opacity="0.8">FOTO PROVISÓRIA</text></g>`;
}

export const FOOTER = "Link de afiliado · preço pode variar na loja";

export function svgDoc(body: string, defs = ""): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Poppins"><defs>${defs}</defs>${body}</svg>`;
}
