import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions";
import type { SessionUser } from "@/auth";
import type { Plan } from "@/billing/billing.service";
import { getContainer } from "@/lib/container";

export const BAND_STYLE: Record<string, string> = {
  Excelente: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  Boa: "bg-lime-100 text-lime-800 ring-lime-200",
  Mediana: "bg-amber-100 text-amber-800 ring-amber-200",
  Evitar: "bg-red-100 text-red-800 ring-red-200",
};

export function ScoreBadge({ score, band }: { score: number; band: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ring-1 ${BAND_STYLE[band] ?? ""}`}>
      <span className="tabular-nums">{score}</span>
      <span className="text-xs font-medium opacity-80">{band}</span>
    </span>
  );
}

export function Header({ user, plan }: { user: SessionUser | null; plan?: Plan }) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-brand">Radar de Afiliados</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/precos" className="hover:text-brand">Planos</Link>
          {user ? (
            <>
              <Link href="/radar" className="hover:text-brand">Radar</Link>
              <Link href="/gerador" className="hover:text-brand">Gerador</Link>
              <Link href="/conta" className="hover:text-brand">
                Conta {plan === "pro" && <span className="ml-1 rounded bg-brand px-1.5 py-0.5 text-xs text-white">PRO</span>}
              </Link>
              <form action={logoutAction}><button className="text-stone-500 hover:text-brand">Sair</button></form>
            </>
          ) : (
            <Link href="/login" className="rounded-lg bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-dark">Entrar</Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export async function DemoBanner() {
  if ((await getContainer()).env.DATA_SOURCE !== "mock") return null;
  return (
    <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">
      Dados de demonstração (fictícios). A conexão com a API oficial da Shopee vem antes do lançamento.
    </div>
  );
}

export function Shell({ user, plan, children }: { user: SessionUser | null; plan?: Plan; children: ReactNode }) {
  return (
    <>
      <DemoBanner />
      <Header user={user} plan={plan} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  );
}

export function Locked({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1 text-xs text-stone-500">🔒 {children}</span>;
}

export function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const w = 300;
  const h = 60;
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" role="img" aria-label="Vendas por dia nos últimos 30 dias">
      <polyline points={pts} fill="none" stroke="#ee4d2d" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
