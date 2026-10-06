const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatBRL = (cents: number) => brl.format(cents / 100);
export const formatPct = (fraction: number) => `${(fraction * 100).toFixed(0).replace(".", ",")}%`;
export const formatInt = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
