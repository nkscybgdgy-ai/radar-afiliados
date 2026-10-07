import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { HomeCategory } from "@/domain/types";
import type { Env } from "@/lib/env";
import { jpegToPhoto } from "./photo-utils";
import type { Photo } from "./pin-design";

export interface PinPhotoRef {
  productSource: "mock" | "shopee";
  /** URL da foto do produto na fonte (Shopee). `mock:<id>` nos produtos de demonstração. */
  imageUrl: string;
  category: HomeCategory;
}

/** De onde vem a foto do pin. Produção: a foto do produto na Shopee. Local: fotos de TESTE internas. */
export interface PhotoProvider {
  readonly kind: "test" | "shopee";
  /** null = sem foto (o desenho mostra uma foto provisória identificada). */
  getPhoto(ref: PinPhotoRef): Promise<Photo | null>;
}

const TEST_PHOTO_DIR = join(process.cwd(), "assets", "photos");

/**
 * Fotos de TESTE (assets/photos, ver LICENSES.md): uso interno apenas, nunca em nada público.
 * Só servem para produtos de demonstração; com produto real a chamada falha de propósito.
 */
export class TestPhotoProvider implements PhotoProvider {
  readonly kind = "test" as const;
  constructor(private readonly dir: string = TEST_PHOTO_DIR) {}
  async getPhoto(ref: PinPhotoRef): Promise<Photo | null> {
    if (ref.productSource !== "mock") {
      throw new Error("As fotos de teste (assets/photos) só podem ser usadas com produtos de demonstração.");
    }
    const file = join(this.dir, `${ref.category}.jpg`);
    return existsSync(file) ? jpegToPhoto(readFileSync(file)) : null;
  }
}

/** Stub: baixar `imageUrl` da Shopee, validar (JPEG ≥ 1000 px) e devolver. Ver LANCAMENTO.md. */
export class ShopeePhotoProvider implements PhotoProvider {
  readonly kind = "shopee" as const;
  getPhoto(): never {
    throw new Error("Foto do produto da Shopee ainda não conectada: aguardando acesso à API. Use DATA_SOURCE=mock.");
  }
}

export function createPhotoProvider(env: Pick<Env, "DATA_SOURCE">): PhotoProvider {
  return env.DATA_SOURCE === "shopee" ? new ShopeePhotoProvider() : new TestPhotoProvider();
}
