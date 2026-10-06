import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { CATEGORY_LABELS, type HomeCategory } from "@/domain/types";
import { formatBRL } from "@/lib/format";

export const PIN_WIDTH = 1000;
export const PIN_HEIGHT = 1500; // 2:3, proporção recomendada do Pinterest

export interface PinImageInput {
  name: string;
  category: HomeCategory;
  priceCents: number;
  rating: number;
  ratingCount: number;
}

const THEME: Record<HomeCategory, { from: string; to: string; ink: string }> = {
  organizacao: { from: "#fde68a", to: "#f59e0b", ink: "#78350f" },
  cozinha: { from: "#fecaca", to: "#ef4444", ink: "#7f1d1d" },
  limpeza: { from: "#bae6fd", to: "#0ea5e9", ink: "#0c4a6e" },
  banheiro: { from: "#a7f3d0", to: "#10b981", ink: "#064e3b" },
  decoracao: { from: "#fbcfe8", to: "#ec4899", ink: "#831843" },
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Quebra por largura estimada (DejaVu Bold ≈ 0,62 × corpo). No máximo `maxLines`, com reticências. */
export function wrapText(text: string, fontSize: number, maxWidth: number, maxLines: number): string[] {
  const perLine = Math.max(1, Math.floor(maxWidth / (fontSize * 0.62)));
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
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    const last = kept[maxLines - 1]!;
    kept[maxLines - 1] = `${last.length >= perLine ? last.slice(0, perLine - 1) : last}…`;
    return kept;
  }
  return lines;
}

/** SVG do pin. Puro e determinístico. A comissão NUNCA aparece na imagem. */
export function buildPinSvg(input: PinImageInput): string {
  const t = THEME[input.category];
  const name = wrapText(input.name, 64, 840, 3);
  const showRating = input.ratingCount >= 10;
  const initial = esc(CATEGORY_LABELS[input.category].charAt(0));
  const nameY = 820;
  const nameSvg = name
    .map((l, i) => `<text x="80" y="${nameY + i * 78}" font-size="64" font-weight="700" fill="${t.ink}">${esc(l)}</text>`)
    .join("");
  const lastBaseline = nameY + (name.length - 1) * 78;
  const stars = showRating
    ? `<text x="80" y="${lastBaseline + 70}" font-size="40" fill="${t.ink}">★ ${input.rating.toFixed(1).replace(".", ",")} · ${new Intl.NumberFormat("pt-BR").format(input.ratingCount)} avaliações</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_WIDTH}" height="${PIN_HEIGHT}" viewBox="0 0 ${PIN_WIDTH} ${PIN_HEIGHT}" font-family="DejaVu Sans">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.from}"/><stop offset="1" stop-color="${t.to}"/></linearGradient></defs>
<rect width="${PIN_WIDTH}" height="${PIN_HEIGHT}" fill="url(#bg)"/>
<rect x="80" y="80" width="${64 + CATEGORY_LABELS[input.category].length * 27}" height="64" rx="32" fill="#ffffff" fill-opacity="0.85"/>
<text x="104" y="124" font-size="34" font-weight="700" fill="${t.ink}">${esc(CATEGORY_LABELS[input.category].toUpperCase())}</text>
<rect x="80" y="190" width="840" height="560" rx="40" fill="#ffffff" fill-opacity="0.9"/>
<circle cx="500" cy="440" r="150" fill="${t.to}" fill-opacity="0.35"/>
<text x="500" y="500" font-size="200" font-weight="700" text-anchor="middle" fill="${t.ink}" fill-opacity="0.6">${initial}</text>
<text x="500" y="715" font-size="26" text-anchor="middle" fill="${t.ink}" fill-opacity="0.6">imagem ilustrativa</text>
${nameSvg}
<text x="80" y="${lastBaseline + (showRating ? 200 : 140)}" font-size="110" font-weight="700" fill="${t.ink}">${esc(formatBRL(input.priceCents))}</text>
${stars}
<rect x="80" y="1290" width="520" height="100" rx="50" fill="${t.ink}"/>
<text x="340" y="1356" font-size="44" font-weight="700" text-anchor="middle" fill="#ffffff">Ver oferta</text>
<text x="80" y="1450" font-size="28" fill="${t.ink}" fill-opacity="0.8">Link de afiliado · preço pode variar na loja</text>
</svg>`;
}

const FONT_DIR = join(process.cwd(), "assets", "fonts");

/** PNG 1000×1500. Fonte embutida no repositório: não depende de fontes do sistema. */
export function renderPinPng(input: PinImageInput): Buffer {
  const resvg = new Resvg(buildPinSvg(input), {
    font: {
      fontFiles: [join(FONT_DIR, "DejaVuSans.ttf"), join(FONT_DIR, "DejaVuSans-Bold.ttf")],
      loadSystemFonts: false,
      defaultFontFamily: "DejaVu Sans",
    },
    fitTo: { mode: "width", value: PIN_WIDTH },
  });
  return resvg.render().asPng();
}
