import type { Photo } from "./pin-design";

/** Largura e altura de um JPEG (lê o marcador SOF). null se não for JPEG válido. */
export function jpegSize(buf: Uint8Array): { width: number; height: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1]!;
    if (marker === 0xff) { i++; continue; }
    // SOF0..SOF15, exceto DHT (C4), JPG (C8) e DAC (CC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: (buf[i + 5]! << 8) | buf[i + 6]!, width: (buf[i + 7]! << 8) | buf[i + 8]! };
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { i += 2; continue; }
    i += 2 + ((buf[i + 2]! << 8) | buf[i + 3]!);
  }
  return null;
}

export const MIN_PHOTO_WIDTH = 1000;

/** Transforma os bytes de um JPEG em `Photo` (data URI), exigindo largura mínima para ficar nítida. */
export function jpegToPhoto(buf: Uint8Array): Photo {
  const size = jpegSize(buf);
  if (!size) throw new Error("arquivo não é um JPEG válido");
  if (size.width < MIN_PHOTO_WIDTH) throw new Error(`foto pequena demais (${size.width}px; mínimo ${MIN_PHOTO_WIDTH}px)`);
  return { dataUri: `data:image/jpeg;base64,${Buffer.from(buf).toString("base64")}` };
}
