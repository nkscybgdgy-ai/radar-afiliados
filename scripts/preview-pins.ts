/**
 * Gera PNGs de exemplo de cada estilo de pin com dados do mock.
 *   npx tsx scripts/preview-pins.ts <pasta-saida> [pasta-fotos] [id-produto ...]
 * Com pasta-fotos, usa <categoria>.jpg de lá (ver assets/photos); sem ela, usa a foto provisória.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MockProductSource } from "../src/data/mock/mock-source";
import { claimsFor } from "../src/domain/generator/caption";
import { STYLE_IDS } from "../src/generator/pin-design";
import { renderPinPng } from "../src/generator/pin-image";
import type { Photo } from "../src/generator/pin-design";

const out = process.argv[2]!;
const photosDir = process.argv[3]; // opcional: pasta com fotos por categoria (<categoria>.jpg)
const src = new MockProductSource();
const ids = process.argv.slice(4).length ? process.argv.slice(4) : ["coz-011"];
for (const id of ids) {
  const p = (await src.getProduct(id))!;
  const h = await src.getSalesHistory(id, 30);
  const series = h.map((d) => d.sales);
  const s30 = series.reduce((a, b) => a + b, 0);
  const s7 = series.slice(-7).reduce((a, b) => a + b, 0);
  let photo: Photo | null = null;
  if (photosDir) photo = { dataUri: `data:image/jpeg;base64,${readFileSync(join(photosDir, `${p.category}.jpg`)).toString("base64")}` };
  const input = { productId: p.id, productName: p.name, category: p.category, priceCents: p.priceCents, rating: p.ratingStar, ratingCount: p.ratingCount, sales30d: s30, sales7d: s7, photo };
  console.log(id, p.name, { s30, s7 }, claimsFor({ rating: p.ratingStar, ratingCount: p.ratingCount, sales30d: s30, sales7d: s7 }));
  for (const style of STYLE_IDS) {
    const png = renderPinPng(style, input);
    writeFileSync(join(out, `${id}-${style}.png`), png);
  }
}
