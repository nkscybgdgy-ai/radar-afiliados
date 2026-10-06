import { achadinho } from "./achadinho";
import { emalta } from "./emalta";
import { STYLE_IDS, type PinDesignInput, type PinStyle } from "./common";
import { minimalista } from "./minimalista";
import { vibrante } from "./vibrante";

export { STYLE_IDS, STYLE_LABELS, W as PIN_WIDTH, H as PIN_HEIGHT, type PinDesignInput, type PinStyle, type Photo } from "./common";

const BUILDERS: Record<PinStyle, (i: PinDesignInput) => string> = { minimalista, vibrante, achadinho, emalta };
export const buildPinSvgByStyle = (style: PinStyle, i: PinDesignInput) => BUILDERS[style](i);
export const isPinStyle = (s: string): s is PinStyle => (STYLE_IDS as readonly string[]).includes(s);
