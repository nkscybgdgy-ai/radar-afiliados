import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { buildPinSvgByStyle, PIN_HEIGHT, PIN_WIDTH, type PinDesignInput, type PinStyle } from "./pin-design";

export { PIN_HEIGHT, PIN_WIDTH };

const FONT_DIR = join(process.cwd(), "assets", "fonts");
const FONT_FILES = ["Poppins_500Medium", "Poppins_600SemiBold", "Poppins_700Bold", "Poppins_800ExtraBold", "Pacifico_400Regular"].map((f) => join(FONT_DIR, `${f}.ttf`));

/** PNG 1000×1500 no estilo escolhido. Fontes embutidas no repositório: não dependem de fontes do sistema. */
export function renderPinPng(style: PinStyle, input: PinDesignInput): Buffer {
  const resvg = new Resvg(buildPinSvgByStyle(style, input), {
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: "Poppins" },
    fitTo: { mode: "width", value: PIN_WIDTH },
  });
  return resvg.render().asPng();
}
