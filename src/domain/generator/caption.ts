import { hashString } from "@/lib/hash";
import type { HomeCategory } from "../types";

export const TONES = ["direto", "beneficio", "lista"] as const;
export type Tone = (typeof TONES)[number];
export const TONE_LABELS: Record<Tone, string> = { direto: "Direto", beneficio: "Benefício", lista: "Lista" };

export interface CaptionInput {
  productId: string;
  name: string;
  category: HomeCategory;
  priceCents: number;
  rating: number;
  ratingCount: number;
  sales30d: number;
  tone: Tone;
}

export interface Caption {
  /** ≤ 100 caracteres (limite de título do Pinterest). */
  title: string;
  /** ≤ 500 caracteres (limite de descrição do Pinterest), já com o aviso de afiliado. */
  description: string;
  /** Sem o "#". */
  hashtags: string[];
}

export const LIMITS = { title: 100, description: 500, maxHashtags: 6 } as const;
/** Aviso obrigatório em toda legenda. */
export const DISCLOSURE = "Link de afiliado: posso receber comissão se você comprar, sem custo extra para você. #publi";

/** Limiares para só afirmar o que os dados sustentam. */
const MIN_RATING_COUNT_TO_CLAIM = 10;
const MIN_RATING_TO_CLAIM = 4.5;
const MIN_SALES_TO_CLAIM = 50;

const CATEGORY_COPY: Record<HomeCategory, { uso: string; beneficio: string; tags: string[] }> = {
  organizacao: { uso: "deixar a casa em ordem", beneficio: "mais espaço e menos bagunça", tags: ["organizacao", "casaorganizada", "organizacaodacasa", "dicasdeorganizacao"] },
  cozinha: { uso: "facilitar o dia a dia na cozinha", beneficio: "praticidade na hora de cozinhar", tags: ["cozinha", "utensiliosdecozinha", "cozinhapratica", "casaecozinha"] },
  limpeza: { uso: "facilitar a limpeza da casa", beneficio: "menos esforço na faxina", tags: ["limpeza", "faxina", "casalimpa", "dicasdelimpeza"] },
  banheiro: { uso: "arrumar o banheiro", beneficio: "um banheiro mais organizado", tags: ["banheiro", "organizacaodobanheiro", "decorbanheiro", "casaecia"] },
  decoracao: { uso: "dar um up na decoração", beneficio: "um ambiente mais aconchegante", tags: ["decoracao", "decoracaodecasa", "decorfacil", "casadecorada"] },
};
const COMMON_TAGS = ["achadinhosshopee", "shopee"];

const brl = (cents: number) =>
  `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

/** "mais de 1.400": arredonda para baixo, então a frase é sempre verdadeira. */
function salesFloor(n: number): string {
  const step = n >= 1000 ? 100 : 10;
  return new Intl.NumberFormat("pt-BR").format(Math.floor(n / step) * step);
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).trimEnd()}…`;
}

const pick = <T>(xs: readonly T[], seed: number, salt: number): T => xs[(seed + salt) % xs.length]!;

export function generateCaption(input: CaptionInput): Caption {
  const seed = hashString(`${input.productId}:${input.tone}`);
  const copy = CATEGORY_COPY[input.category];
  const price = brl(input.priceCents);

  const facts: string[] = [];
  if (input.ratingCount >= MIN_RATING_COUNT_TO_CLAIM && input.rating >= MIN_RATING_TO_CLAIM) {
    facts.push(`Nota ${input.rating.toFixed(1).replace(".", ",")} de ${new Intl.NumberFormat("pt-BR").format(input.ratingCount)} avaliações`);
  }
  if (input.sales30d >= MIN_SALES_TO_CLAIM) {
    facts.push(`mais de ${salesFloor(input.sales30d)} vendidos nos últimos 30 dias`);
  }
  const factLine = facts.length ? `${facts.join(" e ")}.` : "";

  const titles: Record<Tone, string[]> = {
    direto: [`${input.name} por ${price}`, `${input.name}: ${price}`, `Olha esse achado: ${input.name}`],
    beneficio: [`${input.name}: ${copy.beneficio}`, `Para ${copy.uso}: ${input.name}`, `${copy.beneficio[0]!.toUpperCase()}${copy.beneficio.slice(1)} com ${input.name}`],
    lista: [`3 motivos para ter ${input.name}`, `${input.name}: por que vale a pena`, `Por que escolher ${input.name}`],
  };

  const bodies: Record<Tone, string[]> = {
    direto: [
      `${input.name} por ${price}. Ótimo para ${copy.uso}. ${factLine}`,
      `Achado para ${copy.uso}: ${input.name}, ${price}. ${factLine}`,
    ],
    beneficio: [
      `Quer ${copy.uso}? ${input.name} ajuda a ter ${copy.beneficio}. Por ${price}. ${factLine}`,
      `${copy.beneficio[0]!.toUpperCase()}${copy.beneficio.slice(1)}: é o que ${input.name} entrega. ${price}. ${factLine}`,
    ],
    lista: [
      `✔ Ajuda a ${copy.uso}\n✔ Por ${price}\n${facts.length ? facts.map((f) => `✔ ${f[0]!.toUpperCase()}${f.slice(1)}`).join("\n") : `✔ ${input.name}`}`,
      `✔ ${input.name}\n✔ ${copy.beneficio[0]!.toUpperCase()}${copy.beneficio.slice(1)}\n✔ ${price}${facts.length ? `\n✔ ${facts[0]![0]!.toUpperCase()}${facts[0]!.slice(1)}` : ""}`,
    ],
  };

  const hashtags = [...copy.tags.slice(0, 4), ...COMMON_TAGS].slice(0, LIMITS.maxHashtags);
  const tagLine = hashtags.map((h) => `#${h}`).join(" ");
  const tail = `Preço pode variar na loja.\n${DISCLOSURE}\n${tagLine}`;
  const room = LIMITS.description - tail.length - 2;
  const body = truncate(pick(bodies[input.tone], seed, 1).replace(/ +\n/g, "\n").trim(), room);

  return {
    title: truncate(pick(titles[input.tone], seed, 0), LIMITS.title),
    description: `${body}\n\n${tail}`,
    hashtags,
  };
}

export interface CaptionGenerator {
  generate(input: CaptionInput): Promise<Caption>;
}

/** Local, determinístico, sem custo. Um gerador por LLM (pago) entraria como outra implementação. */
export class TemplateCaptionGenerator implements CaptionGenerator {
  async generate(input: CaptionInput) {
    return generateCaption(input);
  }
}
