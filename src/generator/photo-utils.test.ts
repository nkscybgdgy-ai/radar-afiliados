import { describe, expect, it } from "vitest";
import { jpegSize, jpegToPhoto } from "./photo-utils";

/** JPEG mínimo só com SOI + APP0 + SOF0 (suficiente para o leitor de dimensões). */
function fakeJpeg(w: number, h: number): Uint8Array {
  return Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xff, 0xd9,
  ]);
}

describe("photo-utils", () => {
  it("lê largura e altura", () => expect(jpegSize(fakeJpeg(1600, 1067))).toEqual({ width: 1600, height: 1067 }));
  it("recusa o que não é JPEG", () => {
    expect(jpegSize(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(() => jpegToPhoto(Uint8Array.from([1, 2, 3, 4]))).toThrow(/JPEG/);
  });
  it("recusa foto pequena demais (não ficaria nítida)", () => {
    expect(() => jpegToPhoto(fakeJpeg(600, 400))).toThrow(/pequena/);
  });
  it("gera data URI de foto grande", () => {
    expect(jpegToPhoto(fakeJpeg(1600, 1067)).dataUri.startsWith("data:image/jpeg;base64,")).toBe(true);
  });
});
