import { cta, esc, fitHeadline, flame, FOOTER, headlineFor, photoLayer, priceParts, priceText, SHADOW_FILTER, socialProof, svgDoc, textWidth, wrapText, type PinDesignInput } from "./common";

interface Theme {
  bgFrom: string;
  bgTo: string;
  ink: string;
  muted: string;
  proofFill: string;
  proofText: string;
  flameFill: string;
  priceFill: string;
  priceText: string;
  ctaFill: string;
  ctaText: string;
  photoBack: string;
}

const DARK: Theme = { bgFrom: "#1B2436", bgTo: "#0B1020", ink: "#FFFFFF", muted: "#9CA3AF", proofFill: "#FFD60A", proofText: "#2B1700", flameFill: "#E8590C", priceFill: "#E8590C", priceText: "#FFFFFF", ctaFill: "#FFFFFF", ctaText: "#0B1020", photoBack: "#0B1020" };
const LIGHT: Theme = { bgFrom: "#FFF8EF", bgTo: "#FFEBD2", ink: "#1F2937", muted: "#7C6F63", proofFill: "#FFD60A", proofText: "#2B1700", flameFill: "#E8590C", priceFill: "#E8590C", priceText: "#FFFFFF", ctaFill: "#1F2937", ctaText: "#FFFFFF", photoBack: "#EADFD0" };

/**
 * "Em alta" para o COMPRADOR: foto grande, uma prova social (vendas em 30 dias), título com benefício e preço.
 * Sem percentual de tendência e sem gráfico (isso é informação do afiliado e fica só na plataforma).
 * Só é oferecido quando o produto cumpre a regra de tendência da legenda (`claims(i).trendPct`).
 */
function build(i: PinDesignInput, t: Theme): string {
  const proof = socialProof(i) ?? "";
  const { lines: head, size: hs } = fitHeadline(headlineFor(i.category, i.productId, i.productName), 860, [78, 70, 62]);
  const hl = Math.round(hs * 1.15);
  const price = priceParts(i.priceCents);
  const photoY = 60;
  const photoH = 900;
  const photoBottom = photoY + photoH;
  const headY = photoBottom + 190;
  const proofW = textWidth(proof, 30) + 100;
  const defs = `${SHADOW_FILTER("sh", 14, 16, t === DARK ? 0.5 : 0.25)}<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.bgFrom}"/><stop offset="1" stop-color="${t.bgTo}"/></linearGradient>`;
  const body = `
<rect width="1000" height="1500" fill="url(#bg)"/>
<rect x="60" y="${photoY}" width="880" height="${photoH}" rx="44" fill="${t.photoBack}"/>
${photoLayer(i.photo, "ph", 60, photoY, 880, photoH, 44, "bl")}
${proof ? `<g filter="url(#sh)"><rect x="92" y="92" width="${proofW}" height="76" rx="38" fill="${t.proofFill}"/></g>
${flame(116, 106, 1.9, t.flameFill)}
<text x="172" y="141" font-size="30" font-weight="700" fill="${t.proofText}">${esc(proof)}</text>` : ""}
<g filter="url(#sh)"><rect x="570" y="${photoBottom - 58}" width="370" height="116" rx="58" fill="${t.priceFill}"/></g>
${priceText(755, photoBottom + 18, price, 68, t.priceText)}
${head.map((l, k) => `<text x="70" y="${headY + k * hl}" font-size="${hs}" font-weight="800" fill="${t.ink}">${esc(l)}</text>`).join("")}
${cta(70, 1340, { fill: t.ctaFill, text: t.ctaText, size: 36, w: 380, h: 90 })}
<text x="70" y="1470" font-size="23" font-weight="500" fill="${t.muted}">${FOOTER}</text>`;
  return svgDoc(body, defs);
}

export const emalta = (i: PinDesignInput) => build(i, DARK);
export const emaltaClaro = (i: PinDesignInput) => build(i, LIGHT);
