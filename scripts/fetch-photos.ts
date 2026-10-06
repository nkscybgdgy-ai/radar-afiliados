import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { jpegSize, MIN_PHOTO_WIDTH } from "../src/generator/photo-utils";

/**
 * Baixa as fotos de assets/photos/manifest.json (Pexels, licença livre) para assets/photos/<categoria>.jpg
 * e gera assets/photos/LICENSES.md. Só roda onde images.pexels.com é acessível.
 *   npm run photos:fetch            usa a foto principal (id)
 *   npm run photos:fetch -- --alt   usa a alternativa (alt)
 */
const dir = join(process.cwd(), "assets", "photos");
const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")) as {
  license: string;
  photos: { category: string; id: number; alt?: number; page: string; photographer: string | null }[];
};
const useAlt = process.argv.includes("--alt");
mkdirSync(dir, { recursive: true });

const rows: string[] = [];
for (const p of manifest.photos) {
  const id = useAlt && p.alt ? p.alt : p.id;
  const url = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${p.category}: ${res.status} ao baixar ${url}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const size = jpegSize(buf);
  if (!size || size.width < MIN_PHOTO_WIDTH) throw new Error(`${p.category}: JPEG inválido ou pequeno (${size?.width ?? "?"}px)`);
  writeFileSync(join(dir, `${p.category}.jpg`), buf);
  console.log(`${p.category}: ${size.width}x${size.height} (${Math.round(buf.length / 1024)} KB)`);
  rows.push(`| ${p.category} | \`${p.category}.jpg\` | Pexels #${id} | ${useAlt && p.alt ? "(alternativa: ver página no Pexels)" : p.photographer ?? "a confirmar"} | ${manifest.license} | https://www.pexels.com/photo/${id}/ | ${new Date().toISOString().slice(0, 10)} |`);
}
writeFileSync(
  join(dir, "LICENSES.md"),
  `# Licenças das fotos\n\nTodas vêm do Pexels, sob a **${manifest.license}**: uso livre, inclusive comercial, sem obrigação de atribuição, mas **não** é permitido vender a foto como está nem sugerir endosso de pessoas ou marcas que apareçam nela (https://www.pexels.com/license/).\nRevisar se alguma foto mostra marca registrada ou rosto reconhecível antes de usar em pin.\n\n| Categoria | Arquivo | Origem | Fotógrafo | Licença | Página | Baixada em |\n|---|---|---|---|---|---|---|\n${rows.join("\n")}\n`,
);
