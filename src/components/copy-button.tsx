"use client";

import { useState } from "react";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* sem permissão de área de transferência: o texto continua selecionável */
        }
      }}
      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-100"
    >
      {done ? "Copiado ✓" : label}
    </button>
  );
}
